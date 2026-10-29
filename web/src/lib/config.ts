export const SUPABASE_URL: string =
  import.meta.env.VITE_SUPABASE_URL || 'https://usbacyllkozqrcwbbuok.supabase.co';

export const SUPABASE_PUBLISHABLE_KEY: string =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

export const ORG_NOMBRE: string =
  import.meta.env.VITE_ORG_NOMBRE || 'PROESA Electrónica';

export const DOMINIO_OFICIAL: string =
  import.meta.env.VITE_DOMINIO_OFICIAL || 'documentos-qr.onrender.com';

export const CONTACTO_REPORTE: string =
  import.meta.env.VITE_CONTACTO || 'sistemasproesaelectronica@gmail.com';

export const USAR_API_SIMULADA: boolean =
  import.meta.env.VITE_API_SIMULADA === '1';
