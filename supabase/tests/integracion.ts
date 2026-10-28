import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const env = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Falta la variable ${name}`);
  return value;
};
const url = env("SUPABASE_URL"), key = env("SUPABASE_PUBLISHABLE_KEY");
const base = `${url}/functions/v1`;
const emitClient = createClient(url, key), queryClient = createClient(url, key);
const rows: { caso: string; esperado: string; obtenido: string; ok: boolean }[] = [];
async function login(client: typeof emitClient, email: string, password: string) {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(`No se pudo iniciar sesión (${email}): ${error?.message ?? "sin sesión"}`);
  return data.session.access_token;
}
function record(caso: string, esperado: string, obtenido: string) { rows.push({ caso, esperado, obtenido, ok: esperado === obtenido || obtenido.startsWith("NO EVALUADO") }); }
async function functionCall(name: string, token: string | null, body: unknown) {
  const headers: Record<string, string> = { apikey: key, "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(`${base}/${name}`, { method: "POST", headers, body: JSON.stringify(body) });
  return { status: response.status, body: await response.json() as Record<string, any> };
}

const issuer = await login(emitClient, env("EMISOR_EMAIL"), env("EMISOR_PASSWORD"));
const viewer = await login(queryClient, env("CONSULTA_EMAIL"), env("CONSULTA_PASSWORD"));
const missing = await functionCall("emitir-documento", issuer, { tipo_clave: "CONST", destinatario: "Integración", datos: {} });
record("E2", "400 VALIDACION", `${missing.status} ${missing.body.error?.codigo ?? ""}`.trim());
const denied = await functionCall("emitir-documento", viewer, { tipo_clave: "CONST", destinatario: "Integración", datos: { concepto: "Prueba" } });
record("E3", "403 SIN_PERMISO", `${denied.status} ${denied.body.error?.codigo ?? ""}`.trim());
const noSession = await functionCall("emitir-documento", null, { tipo_clave: "CONST", destinatario: "Integración", datos: { concepto: "Prueba" } });
record("E4", "401 NO_AUTENTICADO", `${noSession.status} ${noSession.body.error?.codigo ?? ""}`.trim());
const issued = await functionCall("emitir-documento", issuer, { tipo_clave: "CONST", destinatario: "Prueba de integración", datos: { concepto: "Prueba automatizada" } });
record("E1", "200 con folio y PDF", issued.status === 200 && issued.body.folio && issued.body.pdf_url ? "200 con folio y PDF" : `${issued.status} emisión fallida`);
if (issued.status === 200) {
  const token = String(issued.body.url_verificacion).split("/v/")[1];
  const checks: [string, unknown, string][] = [
    ["V1", { metodo: "qr", token }, "valido"],
    ["V2", { metodo: "qr", token: "A".repeat(43) }, "no_encontrado"],
    ["V3", { metodo: "qr", token: "bad" }, "400 VALIDACION"],
    ["V4", { metodo: "manual", folio: issued.body.folio, codigo: String(issued.body.codigo_verificacion).toLowerCase().replace("-", "") }, "valido"],
    ["V5", { metodo: "manual", folio: issued.body.folio, codigo: "0000000000" }, "no_encontrado"],
  ];
  for (const [id, body, expected] of checks) {
    const result = await functionCall("verificar", null, body);
    const got = id === "V3" ? `${result.status} ${result.body.error?.codigo ?? ""}`.trim() : String(result.body.resultado ?? "");
    record(id, expected, got);
  }
  const unknownField = await functionCall("emitir-documento", issuer, { tipo_clave: "CONST", destinatario: "Prueba E5", datos: { concepto: "Campo permitido", campo_inventado: "No guardar" } });
  const { data: filtered } = unknownField.status === 200
    ? await emitClient.from("documentos").select("datos").eq("id", unknownField.body.documento_id).single()
    : { data: null };
  record("E5", "campo desconocido descartado", unknownField.status === 200 && filtered?.datos?.campo_inventado === undefined ? "campo desconocido descartado" : "campo desconocido guardado o emisión fallida");
  const parallel = await Promise.all([1, 2].map((n) => functionCall("emitir-documento", issuer, { tipo_clave: "CONST", destinatario: `Concurrencia ${n}`, datos: { concepto: "Prueba simultánea" } })));
  const nums = parallel.map((r) => Number(String(r.body.folio ?? "").split("-").at(-1))).sort((a, b) => a - b);
  record("E6", "folios únicos consecutivos", parallel.every((r) => r.status === 200) && nums[1] === nums[0] + 1 ? "folios únicos consecutivos" : "folios duplicados o emisión fallida");
  const pdfResponse = await fetch(String(issued.body.pdf_url));
  const pdfBytes = new Uint8Array(await pdfResponse.arrayBuffer());
  const downloadedHash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", pdfBytes)), (b) => b.toString(16).padStart(2, "0")).join("");
  record("E8", String(issued.body.pdf_sha256), downloadedHash);
  record("V6", "valido", (await functionCall("verificar", null, { metodo: "archivo", pdf_sha256: downloadedHash })).body.resultado ?? "");
  if (pdfBytes.length) pdfBytes[pdfBytes.length - 1] ^= 1;
  const alteredHash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", pdfBytes)), (b) => b.toString(16).padStart(2, "0")).join("");
  const altered = await functionCall("verificar", null, { metodo: "archivo", pdf_sha256: alteredHash });
  record("V7", "no_encontrado", String(altered.body.resultado ?? ""));
  const { data: doc } = await emitClient.from("documentos").select("estado,pdf_sha256").eq("id", issued.body.documento_id).single();
  record("E8 DB", String(issued.body.pdf_sha256), String(doc?.pdf_sha256 ?? ""));
  record("V11", "pendiente no se valida", "NO EVALUADO: requiere inyectar fallo entre emisión y confirmación");
}
const anonymous = createClient(url, key);
const anonRead = await anonymous.from("documentos").select("id").limit(1);
record("S1", "sin acceso a lecturas anon", anonRead.error || !anonRead.data?.length ? "sin acceso a lecturas anon" : "lectura anon permitida");
const hashes = await emitClient.from("documentos").select("token_hash").limit(1);
record("S2", "permission denied", hashes.error ? "permission denied" : "consulta inesperadamente permitida");
const directEmit = await emitClient.rpc("emitir_documento", { p_actor: "00000000-0000-0000-0000-000000000000", p_tipo_clave: "CONST", p_destinatario: "x", p_datos: {}, p_token: "A".repeat(43), p_codigo: "0123456789", p_vigente_hasta: null, p_sin_vencimiento: false });
const directVerify = await emitClient.rpc("verificar_documento", { p_metodo: "qr", p_token: "A".repeat(43), p_folio: null, p_codigo: null, p_pdf_sha256: null, p_ip_hash: null, p_user_agent: null });
record("S3", "permission denied", directEmit.error && directVerify.error ? "permission denied" : "RPC directa inesperadamente permitida");
console.log("caso | esperado | obtenido | OK/FALLA");
for (const row of rows) console.log(`${row.caso} | ${row.esperado} | ${row.obtenido} | ${row.obtenido.startsWith("NO EVALUADO") ? "OMITIDO" : row.ok ? "OK" : "FALLA"}`);
if (rows.some((row) => !row.ok)) Deno.exit(1);
