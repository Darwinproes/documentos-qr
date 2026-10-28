export const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
export const FOLIO_RE = /^[A-Za-z0-9]{2,10}-\d{4}-\d{6}$/;
export const CODIGO_RE = /^[0-9A-Z]{10}$/;
export const SHA256_RE = /^[a-fA-F0-9]{64}$/;
const FECHA_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
export const MAX_BODY_BYTES = 32 * 1024;

export function fechaValida(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = FECHA_RE.exec(value);
  if (!match) return false;
  const [, y, m, d] = match;
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(Number(y), Number(m) - 1, Number(d));
  return date.getUTCFullYear() === Number(y) && date.getUTCMonth() === Number(m) - 1 && date.getUTCDate() === Number(d);
}

export function normalizarCodigo(value: string): string {
  return value.replace(/[\s-]/g, "").toUpperCase().replace(/O/g, "0").replace(/[IL]/g, "1");
}

export async function leerCuerpoLimitado(request: Request): Promise<{ ok: true; texto: string } | { ok: false; error: string }> {
  const declaredHeader = request.headers.get("content-length");
  if (declaredHeader !== null) {
    if (!/^\d+$/.test(declaredHeader)) return { ok: false, error: "La longitud de la solicitud no es válida" };
    if (Number(declaredHeader) > MAX_BODY_BYTES) return { ok: false, error: "El cuerpo de la solicitud excede 32 KB" };
  }
  if (!request.body) return { ok: true, texto: "" };
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel();
        return { ok: false, error: "El cuerpo de la solicitud excede 32 KB" };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, error: "No se pudo leer la solicitud" };
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return { ok: true, texto: new TextDecoder().decode(bytes) };
}

export function objeto(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
