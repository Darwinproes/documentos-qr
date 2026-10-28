/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_ORG_NOMBRE?: string;
  readonly VITE_DOMINIO_OFICIAL?: string;
  readonly VITE_CONTACTO?: string;
  readonly VITE_API_SIMULADA?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
