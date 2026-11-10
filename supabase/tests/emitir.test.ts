import { manejarEmision } from "../functions/emitir-documento/manejador.ts";

function post(body: unknown, headers: HeadersInit = {}) {
  return new Request("http://localhost/functions/v1/emitir-documento", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

async function error(response: Response, status: number, codigo = "VALIDACION") {
  if (response.status !== status) throw new Error(`Se esperaba HTTP ${status}, recibido ${response.status}`);
  const json = await response.json();
  if (json.error?.codigo !== codigo) throw new Error(`Código inesperado: ${json.error?.codigo}`);
}

Deno.test("manejador emitir valida método, JSON, tamaño, autenticación y solicitud antes de red", async () => {
  await error(await manejarEmision(new Request("http://localhost/", { method: "GET" })), 405, "METODO_NO_PERMITIDO");
  await error(await manejarEmision(new Request("http://localhost/", { method: "POST", body: "{" })), 400);
  const oversized = " ".repeat(32 * 1024 + 1);
  await error(await manejarEmision(new Request("http://localhost/", {
    method: "POST", headers: { "content-length": String(oversized.length) }, body: oversized,
  })), 400);
  const valido = { tipo_clave: "CONST", destinatario: "Juan Pérez", datos: { concepto: "Prueba" } };
  await error(await manejarEmision(post(valido)), 401, "NO_AUTENTICADO");
  await error(await manejarEmision(post({ ...valido, tipo_clave: "x" })), 400);
  await error(await manejarEmision(post({ ...valido, destinatario: "x".repeat(201) })), 400);
});

Deno.test("manejador emitir responde CORS solo al origen permitido", async () => {
  Deno.env.set("ALLOWED_ORIGINS", "https://permitido.example");
  const allowed = await manejarEmision(new Request("http://localhost/", {
    method: "OPTIONS", headers: { origin: "https://permitido.example" },
  }));
  if (allowed.status !== 204 || allowed.headers.get("access-control-allow-origin") !== "https://permitido.example") {
    throw new Error("El preflight permitido no devolvió el origen esperado");
  }
  const denied = await manejarEmision(new Request("http://localhost/", {
    method: "OPTIONS", headers: { origin: "https://ajeno.example" },
  }));
  if (denied.status !== 204 || denied.headers.has("access-control-allow-origin")) {
    throw new Error("El preflight no permitido anunció Access-Control-Allow-Origin");
  }
});
