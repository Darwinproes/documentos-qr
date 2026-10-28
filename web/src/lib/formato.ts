import { EstadoDocumento, EstadoVisualDocumento } from './tipos';

const REGEX_TOKEN = /^[A-Za-z0-9_-]{43}$/;
const REGEX_FOLIO = /^[A-Za-z0-9]{2,10}-\d{4}-\d{6}$/;
const REGEX_SHA256 = /^[0-9a-f]{64}$/i;

export function validarFormatoToken(token: string): boolean {
  return REGEX_TOKEN.test(token);
}

export function normalizarFolio(folio: string): string {
  return folio.trim().toUpperCase().replace(/\s+/g, '');
}

/**
 * Normaliza el código manual según el alfabeto Crockford del contrato:
 * mayúsculas, sin guiones ni espacios, O -> 0, I/L -> 1.
 */
export function normalizarCodigo(codigo: string): string {
  return codigo
    .toUpperCase()
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1')
    .replace(/[^0-9A-Z]/g, '');
}

export function formatearCodigoVisual(codigo: string): string {
  const limpio = normalizarCodigo(codigo).slice(0, 10);
  if (limpio.length <= 5) return limpio;
  return `${limpio.slice(0, 5)}-${limpio.slice(5, 10)}`;
}

export function validarFormatoFolio(folio: string): boolean {
  return REGEX_FOLIO.test(normalizarFolio(folio));
}

export function validarFormatoCodigo(codigo: string): boolean {
  return normalizarCodigo(codigo).length === 10;
}

export function validarFormatoSha256(hash: string): boolean {
  return REGEX_SHA256.test(hash.trim());
}

/**
 * Formatea una fecha ISO (AAAA-MM-DD o timestamp ISO) como dd/mm/aaaa.
 */
export function formatearFecha(iso: string | null | undefined): string {
  if (!iso) return 'Sin vencimiento';
  const soloFecha = iso.slice(0, 10);
  const partes = soloFecha.split('-');
  if (partes.length === 3 && partes[0].length === 4) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const anio = fecha.getFullYear();
  return `${dia}/${mes}/${anio}`;
}

/**
 * Formatea un timestamp ISO como dd/mm/aaaa hh:mm en hora de México.
 */
export function formatearFechaHora(iso: string | null | undefined): string {
  if (!iso) return '—';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  try {
    const partes = new Intl.DateTimeFormat('es-MX', {
      timeZone: 'America/Mexico_City',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(fecha);
    const mapa: Record<string, string> = {};
    for (const p of partes) {
      mapa[p.type] = p.value;
    }
    return `${mapa.day}/${mapa.month}/${mapa.year} ${mapa.hour}:${mapa.minute}`;
  } catch {
    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const anio = fecha.getFullYear();
    const horas = String(fecha.getHours()).padStart(2, '0');
    const mins = String(fecha.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${anio} ${horas}:${mins}`;
  }
}

/**
 * Obtiene la fecha de hoy en America/Mexico_City en formato AAAA-MM-DD.
 */
export function hoyLocalIso(): string {
  try {
    const partes = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Mexico_City',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date());
    const mapa: Record<string, string> = {};
    for (const p of partes) {
      mapa[p.type] = p.value;
    }
    return `${mapa.year}-${mapa.month}-${mapa.day}`;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export function sumarDiasIso(dias: number): string {
  const hoy = hoyLocalIso();
  const [y, m, d] = hoy.split('-').map(Number);
  const fecha = new Date(Date.UTC(y, m - 1, d + dias));
  return fecha.toISOString().slice(0, 10);
}

/**
 * Calcula el estado visual del documento ("vencido" se calcula en el cliente con vigente_hasta).
 */
export function calcularEstadoVisual(
  estado: EstadoDocumento,
  vigenteHasta: string | null | undefined
): EstadoVisualDocumento {
  if (estado === 'cancelado') return 'cancelado';
  if (estado === 'pendiente') return 'pendiente';
  if (vigenteHasta && vigenteHasta.slice(0, 10) < hoyLocalIso()) {
    return 'vencido';
  }
  return 'vigente';
}

/**
 * Calcula el SHA-256 en hexadecimal (minúsculas) de un archivo o ArrayBuffer en el navegador.
 */
export async function calcularSha256Archivo(archivo: File): Promise<string> {
  const buffer = await archivo.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const bytes = new Uint8Array(hashBuffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
