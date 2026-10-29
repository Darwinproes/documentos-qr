import { EstadoDocumento, EstadoVisualDocumento } from './tipos';

const REGEX_TOKEN = /^[A-Za-z0-9_-]{43}$/;
const REGEX_FOLIO = /^[A-Za-z0-9]{2,10}-\d{4}-\d{6}$/;
const REGEX_SHA256 = /^[0-9a-f]{64}$/i;
const REGEX_FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export const PATRON_FOLIO = REGEX_FOLIO;
export const PATRON_CODIGO_LIMPIO = /^[0-9A-HJ-NP-TV-Z]{10}$/;

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

export const limpiarCodigoVerificacion = normalizarCodigo;

export function formatearCodigoVisual(codigo: string): string {
  const limpio = normalizarCodigo(codigo).slice(0, 10);
  if (limpio.length <= 5) return limpio;
  return `${limpio.slice(0, 5)}-${limpio.slice(5, 10)}`;
}

export const normalizarCodigoConGuion = formatearCodigoVisual;

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
 * Abrevia una huella SHA-256 como a048…2c2d (F5, G5).
 */
export function abreviarSha256(hash: string | null | undefined): string {
  if (!hash) return 'No capturado';
  const limpio = hash.trim();
  if (limpio.length <= 12) return limpio;
  return `${limpio.slice(0, 4)}…${limpio.slice(-4)}`;
}

/**
 * Abrevia un enlace de verificación como dominio/v/…4chars (G5).
 */
export function abreviarEnlaceVerificacion(url: string | null | undefined): string {
  if (!url) return 'No capturado';
  const limpio = url.trim();
  try {
    const parsed = new URL(limpio);
    const partes = parsed.pathname.split('/').filter(Boolean);
    const token = partes[partes.length - 1] || '';
    const sufijo = token.length > 4 ? token.slice(-4) : token;
    return `${parsed.host}/v/…${sufijo}`;
  } catch {
    const idx = limpio.indexOf('/v/');
    if (idx !== -1) {
      const dominio = limpio.slice(0, idx).replace(/^https?:\/\//, '');
      const token = limpio.slice(idx + 3);
      const sufijo = token.length > 4 ? token.slice(-4) : token;
      return `${dominio}/v/…${sufijo}`;
    }
    return limpio;
  }
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

export const formatearFechaCorta = formatearFecha;

/**
 * Formatea un valor de campo dinámico: si es fecha ISO la convierte a dd/mm/aaaa;
 * si está vacío devuelve null para que la vista muestre «No capturado» (G6).
 */
export function formatearValorCampo(
  valor: unknown,
  tipoCampo?: string
): string | null {
  if (valor === null || valor === undefined) return null;
  const texto = String(valor).trim();
  if (!texto) return null;
  if (tipoCampo === 'fecha' || REGEX_FECHA_ISO.test(texto)) {
    return formatearFecha(texto);
  }
  return texto;
}

/**
 * Formatea un timestamp ISO como dd/mm/aaaa hh:mm en hora de México.
 */
export function formatearFechaHora(iso: string | null | undefined): string {
  if (!iso) return 'No capturado';
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

export const formatearFechaHoraMX = formatearFechaHora;

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

export const hoyIsoLocal = hoyLocalIso;

export function sumarDiasIso(dias: number): string {
  const hoy = hoyLocalIso();
  const [y, m, d] = hoy.split('-').map(Number);
  const fecha = new Date(Date.UTC(y, m - 1, d + dias));
  return fecha.toISOString().slice(0, 10);
}

export function esFechaVencida(vigenteHasta: string | null | undefined): boolean {
  if (!vigenteHasta) return false;
  return vigenteHasta.slice(0, 10) < hoyLocalIso();
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
  if (esFechaVencida(vigenteHasta)) {
    return 'vencido';
  }
  return 'vigente';
}

export function esPorVencer30Dias(
  fechaOEstado: string | null | undefined,
  vigenteHastaOpcional?: string | null | undefined
): boolean {
  const fechaIso = vigenteHastaOpcional !== undefined ? vigenteHastaOpcional : fechaOEstado;
  if (vigenteHastaOpcional !== undefined && fechaOEstado !== 'vigente') return false;
  if (!fechaIso) return false;
  const f = fechaIso.slice(0, 10);
  const hoy = hoyLocalIso();
  const limite = sumarDiasIso(30);
  return f >= hoy && f <= limite;
}

export function formatearTamanoBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
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
