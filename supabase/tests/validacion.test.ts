import { fechaValida, normalizarCodigo, CODIGO_RE, FOLIO_RE, SHA256_RE, TOKEN_RE } from "../functions/_shared/validacion.ts";
function assert(condition: unknown, message = "Aserción fallida"): asserts condition { if (!condition) throw new Error(message); }

Deno.test("valida token, folio, código y SHA-256", () => {
  assert(TOKEN_RE.test("A".repeat(43))); assert(!TOKEN_RE.test("A".repeat(42)));
  assert(FOLIO_RE.test("CONST-2026-000001")); assert(!FOLIO_RE.test("x-26-1"));
  assert(CODIGO_RE.test("7KQ2MXA9PD")); assert(!CODIGO_RE.test("7KQ2M-XA9P!"));
  assert(SHA256_RE.test("a".repeat(64))); assert(!SHA256_RE.test("a".repeat(63)));
});

Deno.test("valida fechas de calendario reales y normaliza Crockford", () => {
  assert(fechaValida("2024-02-29")); assert(!fechaValida("2025-02-29")); assert(!fechaValida("2026-13-01"));
  assert(normalizarCodigo(" 7kq2m-xa9pd ") === "7KQ2MXA9PD");
  assert(normalizarCodigo("OIL") === "011");
});
