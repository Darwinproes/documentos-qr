export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin");
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",").map((value) => value.trim()).filter(Boolean);
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Vary": "Origin",
  };
  if (origin && allowed.includes(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

export function responderOptions(request: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}
