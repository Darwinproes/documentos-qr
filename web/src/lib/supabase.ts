import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://usbacyllkozqrcwbbuok.supabase.co';

export const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

export const ORG_NOMBRE =
  import.meta.env.VITE_ORG_NOMBRE || 'PROESA Electrónica';

export const DOMINIO_OFICIAL =
  import.meta.env.VITE_DOMINIO_OFICIAL || 'documentos-qr.onrender.com';

export const CONTACTO_REPORTE =
  import.meta.env.VITE_CONTACTO || 'sistemasproesaelectronica@gmail.com';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});
