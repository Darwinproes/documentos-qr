import { clienteServicio, clienteUsuario } from "../_shared/cliente.ts";
import { corsHeaders, responderOptions } from "../_shared/cors.ts";
import { generarCodigo, generarToken, formatearCodigo } from "../_shared/aleatorio.ts";
import { sha256Hex } from "../_shared/hash.ts";
import { generarPdf } from "../_shared/pdf.ts";
import { desdeErrorPostgres, respuestaError } from "../_shared/errores.ts";
import { fechaValida, objeto, leerCuerpoLimitado } from "../_shared/validacion.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return responderOptions(request);
  if (request.method !== "POST") return respuestaError(request, 405, "METODO_NO_PERMITIDO", "Método HTTP no permitido");
  const readResult = await leerCuerpoLimitado(request);
  if (readResult.error) return respuestaError(request, 400, "VALIDACION", readResult.error);
  const raw = readResult.texto;
  let body: Record<string, unknown>;
  try { const parsed: unknown = JSON.parse(raw); if (!objeto(parsed)) throw new Error(); body = parsed; }
  catch { return respuestaError(request, 400, "VALIDACION", "El cuerpo debe ser un objeto JSON válido"); }
  const tipo = body.tipo_clave, destinatario = body.destinatario, datos = body.datos;
  if (typeof tipo !== "string" || !/^[A-Za-z0-9]{2,10}$/.test(tipo)) return respuestaError(request, 400, "VALIDACION", "Tipo de documento inválido");
  if (typeof destinatario !== "string" || !destinatario.trim() || destinatario.length > 200) return respuestaError(request, 400, "VALIDACION", "El destinatario es obligatorio y debe tener máximo 200 caracteres");
  if (!objeto(datos) || Object.values(datos).some((v) => typeof v !== "string" || v.length > 2000)) return respuestaError(request, 400, "VALIDACION", "Los datos deben ser texto y cada valor debe tener máximo 2000 caracteres");
  if (body.vigente_hasta !== undefined && body.vigente_hasta !== null && !fechaValida(body.vigente_hasta)) return respuestaError(request, 400, "VALIDACION", "La fecha de vigencia no es válida");
  if (body.sin_vencimiento !== undefined && typeof body.sin_vencimiento !== "boolean") return respuestaError(request, 400, "VALIDACION", "sin_vencimiento debe ser verdadero o falso");
  const auth = request.headers.get("authorization") ?? "";
  const jwt = auth.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!jwt) return respuestaError(request, 401, "NO_AUTENTICADO", "Inicie sesión para emitir documentos");
  let baseUrl: URL;
  try { baseUrl = new URL(Deno.env.get("VERIFICACION_BASE_URL") ?? ""); }
  catch { return respuestaError(request, 500, "INTERNO", "Ocurrió un error, intente de nuevo"); }
  const service = clienteServicio();
  const { data: userResult, error: userError } = await clienteUsuario(jwt).auth.getUser(jwt);
  if (userError || !userResult.user) return respuestaError(request, 401, "NO_AUTENTICADO", "La sesión no es válida");
  const token = generarToken(), codigoRaw = generarCodigo(), codigo = formatearCodigo(codigoRaw);
  const { data: issued, error: issueError } = await service.rpc("emitir_documento", {
    p_actor: userResult.user.id, p_tipo_clave: tipo, p_destinatario: destinatario.trim(), p_datos: datos,
    p_token: token, p_codigo: codigoRaw,
    p_vigente_hasta: typeof body.vigente_hasta === "string" ? body.vigente_hasta : null,
    p_sin_vencimiento: body.sin_vencimiento === true,
  });
  if (issueError) return desdeErrorPostgres(request, issueError);
  const record = issued as Record<string, unknown>;
  const id = String(record.documento_id), folio = String(record.folio);
  const urlVerificacion = `${baseUrl.origin}/v/${token}`;
  const path = `${tipo.toUpperCase()}/${folio.split("-")[1]}/${folio}.pdf`;
  try {
    const campos = Array.isArray(record.campos) ? record.campos as { clave: string; etiqueta: string; tipo: string }[] : [];
    const pdf = await generarPdf({
      orgNombre: Deno.env.get("ORG_NOMBRE") ?? "PROESA Electrónica", tipoNombre: String(record.tipo_nombre), folio,
      destinatario: String(record.destinatario), campos, datos: (record.datos ?? {}) as Record<string, string>,
      emitidoEn: String(record.emitido_en), vigenteHasta: record.vigente_hasta ? String(record.vigente_hasta) : null,
      urlVerificacion, codigo, dominioOficial: baseUrl.host,
    });
    const pdfSha = await sha256Hex(pdf);
    const { error: uploadError } = await service.storage.from("documentos").upload(path, new Blob([pdf], { type: "application/pdf" }), { contentType: "application/pdf", upsert: false });
    if (uploadError) throw uploadError;
    const { error: confirmError } = await service.rpc("confirmar_documento", { p_actor: userResult.user.id, p_documento_id: id, p_pdf_path: path, p_pdf_sha256: pdfSha });
    if (confirmError) throw confirmError;
    const { data: signed, error: signedError } = await service.storage.from("documentos").createSignedUrl(path, 900);
    if (signedError || !signed?.signedUrl) throw signedError ?? new Error("No se pudo crear URL firmada");
    return Response.json({ documento_id: id, folio, url_verificacion: urlVerificacion, codigo_verificacion: codigo,
      vigente_hasta: record.vigente_hasta ?? null, pdf_sha256: pdfSha, pdf_url: signed.signedUrl },
      { headers: { ...corsHeaders(request), "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("No se pudo finalizar emisión", { documento_id: id, folio, error: error instanceof Error ? error.message : "error desconocido" });
    return respuestaError(request, 500, "INTERNO", "Ocurrió un error, intente de nuevo");
  }
});
