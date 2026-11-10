import { manejarVerificacion } from "../functions/verificar/manejador.ts";

function post(body: string, headers: HeadersInit = {}) {
  return new Request("http://localhost/functions/v1/verificar", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
  });
}

async function error(response: Response, status: number, codigo = "VALIDACION") {
  if (response.status !== status) throw new Error(`Se esperaba HTTP ${status}, recibido ${response.status}`);
  const json = await response.json();
  if (json.error?.codigo !== codigo) throw new Error(`Código inesperado: ${json.error?.codigo}`);
  return json;
}

Deno.test("manejador verificar valida método, JSON, tamaño y datos antes de red", async () => {
  await error(await manejarVerificacion(new Request("http://localhost/", { method: "GET" })), 405, "METODO_NO_PERMITIDO");
  await error(await manejarVerificacion(post("{")), 400);
  const oversized = " ".repeat(32 * 1024 + 1);
  await error(await manejarVerificacion(post(oversized, { "content-length": String(oversized.length) })), 400);
  await error(await manejarVerificacion(post(JSON.stringify({ metodo: "desconocido" }))), 400);
  const token = await manejarVerificacion(post(JSON.stringify({ metodo: "qr", token: "1234567890" })));
  const cuerpoToken = await error(token, 400);
  if (cuerpoToken.error.mensaje !== "El enlace no es válido") throw new Error("Mensaje del token distinto al contrato");
  await error(await manejarVerificacion(post(JSON.stringify({ metodo: "manual", folio: "ABC", codigo: "1234567890" }))), 400);
  await error(await manejarVerificacion(post(JSON.stringify({ metodo: "archivo", pdf_sha256: "1234567890" }))), 400);
});

Deno.test("manejador verificar responde CORS solo al origen permitido", async () => {
  Deno.env.set("ALLOWED_ORIGINS", "https://permitido.example");
  const allowed = await manejarVerificacion(new Request("http://localhost/", {
    method: "OPTIONS",
    headers: { origin: "https://permitido.example" },
  }));
  if (allowed.status !== 204 || allowed.headers.get("access-control-allow-origin") !== "https://permitido.example") {
    throw new Error("El preflight permitido no devolvió el origen esperado");
  }
  const denied = await manejarVerificacion(new Request("http://localhost/", {
    method: "OPTIONS",
    headers: { origin: "https://ajeno.example" },
  }));
  if (denied.status !== 204 || denied.headers.has("access-control-allow-origin")) {
    throw new Error("El preflight no permitido anunció Access-Control-Allow-Origin");
  }
});
