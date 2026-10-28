import { clienteServicio } from "../_shared/cliente.ts";
import { corsHeaders, responderOptions } from "../_shared/cors.ts";
import { sha256Hex } from "../_shared/hash.ts";
import { desdeErrorPostgres, respuestaError } from "../_shared/errores.ts";
import { CODIGO_RE, FOLIO_RE, leerCuerpoLimitado, normalizarCodigo, objeto, SHA256_RE, TOKEN_RE } from "../_shared/validacion.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return responderOptions(request);
  if (request.method !== "POST") return respuestaError(request, 405, "METODO_NO_PERMITIDO", "Método HTTP no permitido");
  const readResult = await leerCuerpoLimitado(request);
  if (readResult.error) return respuestaError(request, 400, "VALIDACION", readResult.error);
  const raw = readResult.texto;
  let body: Record<string, unknown>;
  try { const value: unknown = JSON.parse(raw); if (!objeto(value)) throw new Error(); body = value; }
  catch { return respuestaError(request, 400, "VALIDACION", "El cuerpo debe ser un objeto JSON válido"); }
  const method = body.metodo;
  if (method !== "qr" && method !== "manual" && method !== "archivo") return respuestaError(request, 400, "VALIDACION", "Método de verificación no válido");
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
  const { data, error } = await clienteServicio().rpc("verificar_documento", rpcArgs);
  if (error) return desdeErrorPostgres(request, error);
  const result = data as Record<string, unknown>;
  return Response.json(result, { status: result.resultado === "limite_excedido" ? 429 : 200,
    headers: { ...corsHeaders(request), "Cache-Control": "no-store" } });
});
