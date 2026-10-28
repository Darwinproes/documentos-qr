import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const url = () => Deno.env.get("SUPABASE_URL")!;
const serviceKey = () => Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export function clienteServicio() {
  return createClient(url(), serviceKey(), { auth: { persistSession: false, autoRefreshToken: false } });
}

export function clienteUsuario(jwt: string) {
  return createClient(url(), Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
