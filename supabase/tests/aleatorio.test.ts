import { formatearCodigo, generarCodigo, generarToken } from "../functions/_shared/aleatorio.ts";
function assert(condition: unknown, message = "Aserción fallida"): asserts condition { if (!condition) throw new Error(message); }

Deno.test("genera tokens base64url de 43 caracteres", () => {
  for (let i = 0; i < 100; i++) assert(/^[A-Za-z0-9_-]{43}$/.test(generarToken()));
});

Deno.test("genera códigos Crockford y los presenta agrupados", () => {
  const codigo = generarCodigo();
  assert(codigo.length === 10);
  assert(/^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{10}$/.test(codigo));
  assert(formatearCodigo("7KQ2MXA9PD") === "7KQ2M-XA9PD");
});

Deno.test("mil tokens aleatorios no se repiten", () => {
  const tokens = new Set(Array.from({ length: 1000 }, generarToken));
  assert(tokens.size === 1000);
});
