const ALFABETO = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function generarToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return base64url(bytes);
}

export function generarCodigo(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (byte) => ALFABETO[byte & 31]).join("");
}

export function formatearCodigo(codigo: string): string {
  const clean = codigo.replace(/[\s-]/g, "").toUpperCase();
  return `${clean.slice(0, 5)}-${clean.slice(5)}`;
}
