import { corsHeaders } from "./cors.ts";

export function respuestaError(
  request: Request,
  status: number,
  codigo: string,
  mensaje: string,
  extra: Record<string, string> = {},
): Response {
  return Response.json({ error: { codigo, mensaje } }, {
    status,
    headers: { ...corsHeaders(request), ...extra, "Cache-Control": "no-store" },
  });
}

export function desdeErrorPostgres(request: Request, err: { code?: string; message?: string }): Response {
  if (err.code === "42501") return respuestaError(request, 403, "SIN_PERMISO", "No tiene permiso para realizar esta acción");
  if (err.code === "22023") return respuestaError(request, 400, "VALIDACION", err.message ?? "Datos inválidos");
  console.error("Error interno de Postgres", err.code ?? "sin código", err.message ?? "sin detalle");
  return respuestaError(request, 500, "INTERNO", "Ocurrió un error, intente de nuevo");
}
