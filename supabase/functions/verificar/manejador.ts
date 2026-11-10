import { clienteServicio } from "../_shared/cliente.ts";
import { corsHeaders, responderOptions } from "../_shared/cors.ts";
import { sha256Hex } from "../_shared/hash.ts";
import { desdeErrorPostgres, respuestaError } from "../_shared/errores.ts";
import { CODIGO_RE, FOLIO_RE, normalizarCodigo, SHA256_RE, TOKEN_RE, validarAccionVerificacion } from "../_shared/validacion.ts";
import { leerJson } from "../_shared/http.ts";

export async function manejarVerificacion(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") return responderOptions(request);
  if (request.method !== "POST") return respuestaError(request, 405, "METODO_NO_PERMITIDO", "Método HTTP no permitido");
  const lectura = await leerJson(request);
  if (!lectura.ok) return lectura.respuesta;
  const body = lectura.body;
  const method = body.metodo;
  if (method !== "qr" && method !== "manual" && method !== "archivo") return respuestaError(request, 400, "VALIDACION", "Método de verificación no válido");
  const accion = validarAccionVerificacion(body.accion);
  if (!accion) return respuestaError(request, 400, "VALIDACION", "La acción de verificación no es válida");
  if (method === "archivo" && accion === "descargar") {
    return respuestaError(request, 400, "VALIDACION", "La descarga solo está disponible con el QR o con folio y código");
  }
  const rpcArgs: Record<string, unknown> = { p_metodo: method };
  if (method === "qr") {
    if (typeof body.token !== "string" || !TOKEN_RE.test(body.token)) return respuestaError(request, 400, "VALIDACION", "El enlace no es válido");
    rpcArgs.p_token = body.token;
  } else if (method === "manual") {
    if (typeof body.folio !== "string" || !FOLIO_RE.test(body.folio) || typeof body.codigo !== "string") return respuestaError(request, 400, "VALIDACION", "El folio o el código no tienen un formato válido");
    const codigo = normalizarCodigo(body.codigo);
    if (!CODIGO_RE.test(codigo)) return respuestaError(request, 400, "VALIDACION", "El código debe contener 10 caracteres");
    rpcArgs.p_folio = body.folio.toUpperCase(); rpcArgs.p_codigo = codigo;
  } else {
    if (typeof body.pdf_sha256 !== "string" || !SHA256_RE.test(body.pdf_sha256)) return respuestaError(request, 400, "VALIDACION", "La huella del archivo no es válida");
    rpcArgs.p_pdf_sha256 = body.pdf_sha256.toLowerCase();
  }
  const salt = Deno.env.get("IP_SALT");
  if (!salt) return respuestaError(request, 500, "INTERNO", "Ocurrió un error, intente de nuevo");
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;
  rpcArgs.p_ip_hash = ip ? await sha256Hex(`${salt}${ip}`) : null;
  rpcArgs.p_user_agent = request.headers.get("user-agent") ?? null;
  const service = clienteServicio();
  if (accion === "descargar") {
    const { data, error } = await service.rpc("ruta_pdf_descarga", rpcArgs);
    if (error) return desdeErrorPostgres(request, error);
    const result = data as Record<string, unknown>;
    const resultado = String(result.resultado ?? "no_encontrado");
    let descarga: { url: string; nombre_archivo: string; expira_en: string } | null = null;
    if (resultado === "valido" && typeof result.pdf_path === "string" && typeof result.folio === "string") {
      const nombreArchivo = `${result.folio}.pdf`;
      const { data: signed, error: signedError } = await service.storage.from("documentos")
        .createSignedUrl(result.pdf_path, 120, { download: nombreArchivo });
      if (signedError || !signed?.signedUrl) {
        console.error("No se pudo crear la URL firmada de descarga");
        return respuestaError(request, 500, "INTERNO", "Ocurrió un error, intente de nuevo");
      }
      descarga = {
        url: signed.signedUrl,
        nombre_archivo: nombreArchivo,
        expira_en: new Date(Date.now() + 120_000).toISOString(),
      };
    }
    return Response.json({ resultado, descarga }, {
      status: resultado === "limite_excedido" ? 429 : 200,
      headers: { ...corsHeaders(request), "Cache-Control": "no-store" },
    });
  }
  const { data, error } = await service.rpc("verificar_documento", rpcArgs);
  if (error) return desdeErrorPostgres(request, error);
  const result = data as Record<string, unknown>;
  return Response.json(result, { status: result.resultado === "limite_excedido" ? 429 : 200,
    headers: { ...corsHeaders(request), "Cache-Control": "no-store" } });
}
