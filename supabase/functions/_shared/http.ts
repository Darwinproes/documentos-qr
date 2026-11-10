import { respuestaError } from "./errores.ts";
import { leerCuerpoLimitado, objeto } from "./validacion.ts";

export type ResultadoJson =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; respuesta: Response };

export async function leerJson(request: Request): Promise<ResultadoJson> {
  const leido = await leerCuerpoLimitado(request);
  if (!leido.ok) {
    return {
      ok: false,
      respuesta: respuestaError(request, 400, "VALIDACION", leido.error),
    };
  }
  try {
    const value: unknown = JSON.parse(leido.texto);
    if (!objeto(value)) throw new Error("El cuerpo debe ser un objeto JSON válido");
    return { ok: true, body: value };
  } catch {
    return {
      ok: false,
      respuesta: respuestaError(request, 400, "VALIDACION", "El cuerpo debe ser un objeto JSON válido"),
    };
  }
}
