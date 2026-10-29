import { createClient } from '@supabase/supabase-js';
import {
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  ORG_NOMBRE,
  DOMINIO_OFICIAL,
  CONTACTO_REPORTE,
  USAR_API_SIMULADA
} from './config';

export {
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  ORG_NOMBRE,
  DOMINIO_OFICIAL,
  CONTACTO_REPORTE,
  USAR_API_SIMULADA
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});
