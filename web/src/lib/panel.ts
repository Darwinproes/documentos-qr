import { hoyLocalIso, sumarDiasIso } from './formato';
import { supabase } from './supabase';
import {
  DocumentoDetalle,
  Perfil,
  RegistroBitacora,
  ResumenDocumentos,
  TipoDocumento
} from './tipos';

export const TAMANO_PAGINA = 25;

export type FiltroEstado =
  | ''
  | 'vigente'
  | 'por_vencer'
  | 'vencido'
  | 'cancelado'
  | 'pendiente';

export interface FiltrosListaDocumentos {
  busqueda?: string;
  estado?: FiltroEstado;
  tipoId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

const COLUMNAS_DOCUMENTO =
  'id,tipo_id,folio,estado,destinatario,emitido_por,emitido_en,vigente_hasta,datos,pdf_path,pdf_sha256,confirmado_en,cancelado_por,cancelado_en,motivo_cancelacion';

const COLUMNAS_TIPO =
  'id,clave,nombre,descripcion,prefijo_folio,vigencia_dias,campos,activo,creado_en';

export async function listarDocumentos(
  filtros: FiltrosListaDocumentos,
  pagina: number
): Promise<{ documentos: DocumentoDetalle[]; total: number }> {
  const desde = pagina * TAMANO_PAGINA;
  const hasta = desde + TAMANO_PAGINA - 1;
  const hoy = hoyLocalIso();
  const limite30 = sumarDiasIso(30);

  let query = supabase
    .from('documentos')
    .select(`${COLUMNAS_DOCUMENTO},tipos_documento(clave,nombre)`, { count: 'exact' })
    .order('emitido_en', { ascending: false })
    .range(desde, hasta);

  if (filtros.busqueda?.trim()) {
    const termino = filtros.busqueda.trim().replace(/[,%]/g, '');
    query = query.or(`folio.ilike.%${termino}%,destinatario.ilike.%${termino}%`);
  }

  if (filtros.tipoId) {
    query = query.eq('tipo_id', Number(filtros.tipoId));
  }

  if (filtros.estado === 'cancelado' || filtros.estado === 'pendiente') {
    query = query.eq('estado', filtros.estado);
  } else if (filtros.estado === 'vencido') {
    query = query.eq('estado', 'vigente').lt('vigente_hasta', hoy);
  } else if (filtros.estado === 'por_vencer') {
    query = query
      .eq('estado', 'vigente')
      .gte('vigente_hasta', hoy)
      .lte('vigente_hasta', limite30);
  } else if (filtros.estado === 'vigente') {
    query = query.eq('estado', 'vigente').or(`vigente_hasta.is.null,vigente_hasta.gte.${hoy}`);
  }

  if (filtros.fechaDesde) {
    query = query.gte('emitido_en', `${filtros.fechaDesde}T00:00:00.000Z`);
  }

  if (filtros.fechaHasta) {
    query = query.lte('emitido_en', `${filtros.fechaHasta}T23:59:59.999Z`);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error('No fue posible cargar la lista de documentos. Intente nuevamente.');
  }

  const documentos = (data || []) as unknown as DocumentoDetalle[];
  return {
    documentos,
    total: count ?? documentos.length
  };
}

export async function obtenerDocumento(id: string): Promise<DocumentoDetalle> {
  const { data, error } = await supabase
    .from('documentos')
    .select(`${COLUMNAS_DOCUMENTO},tipos_documento(clave,nombre,campos)`)
    .eq('id', id)
    .single();

  if (error || !data) {
    throw new Error('No se encontró el documento solicitado o no tiene permiso para consultarlo.');
  }

  return data as unknown as DocumentoDetalle;
}

export async function obtenerBitacora(id: string): Promise<RegistroBitacora[]> {
  const { data, error } = await supabase.rpc('bitacora_documento', { p_documento_id: id });
  if (error || !Array.isArray(data)) {
    return [];
  }
  return data as RegistroBitacora[];
}

export async function cancelarDocumento(id: string, motivo: string): Promise<void> {
  const { error } = await supabase.rpc('cancelar_documento', {
    p_documento_id: id,
    p_motivo: motivo
  });

  if (error) {
    throw new Error(error.message || 'No fue posible cancelar el documento.');
  }
}

export async function urlDescargaPdf(pdfPath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('documentos')
    .createSignedUrl(pdfPath, 300);

  if (error || !data?.signedUrl) {
    throw new Error('No fue posible generar el enlace de descarga del PDF.');
  }

  return data.signedUrl;
}

export async function resumenDocumentos(): Promise<ResumenDocumentos> {
  const { data } = await supabase.rpc('resumen_documentos');
  const r = (data && typeof data === 'object' ? data : {}) as Partial<ResumenDocumentos>;
  return {
    vigentes: Number(r.vigentes ?? 0),
    por_vencer: Number(r.por_vencer ?? 0),
    vencidos: Number(r.vencidos ?? 0),
    cancelados: Number(r.cancelados ?? 0),
    total: Number(r.total ?? 0)
  };
}

export async function listarTipos(): Promise<TipoDocumento[]> {
  const { data, error } = await supabase
    .from('tipos_documento')
    .select(COLUMNAS_TIPO)
    .order('id', { ascending: true });

  if (error) {
    throw new Error('No se pudieron cargar los tipos de documento.');
  }

  return (data || []) as TipoDocumento[];
}

export async function listarTiposActivos(): Promise<TipoDocumento[]> {
  const { data, error } = await supabase
    .from('tipos_documento')
    .select(COLUMNAS_TIPO)
    .eq('activo', true)
    .order('id', { ascending: true });

  if (error) {
    throw new Error('No se pudieron cargar los tipos de documento activos.');
  }

  return (data || []) as TipoDocumento[];
}

export async function crearTipo(
  datos: Omit<TipoDocumento, 'id' | 'creado_en'>
): Promise<void> {
  const { error } = await supabase.from('tipos_documento').insert(datos);
  if (error) {
    throw new Error(error.message || 'No fue posible crear el tipo de documento.');
  }
}

export async function actualizarTipo(
  id: number,
  datos: Pick<TipoDocumento, 'nombre' | 'descripcion' | 'vigencia_dias' | 'campos' | 'activo'>
): Promise<void> {
  const { error } = await supabase.from('tipos_documento').update(datos).eq('id', id);
  if (error) {
    throw new Error(error.message || 'No fue posible actualizar el tipo de documento.');
  }
}

export async function alternarTipoActivo(id: number, activo: boolean): Promise<void> {
  const { error } = await supabase
    .from('tipos_documento')
    .update({ activo })
    .eq('id', id);

  if (error) {
    throw new Error('No se pudo cambiar el estado del tipo de documento.');
  }
}

export async function listarPerfiles(): Promise<Perfil[]> {
  const { data, error } = await supabase
    .from('perfiles')
    .select('id,nombre,area,rol,activo,creado_en')
    .order('creado_en', { ascending: true });

  if (error) {
    throw new Error('No fue posible cargar la lista de perfiles de usuario.');
  }

  return (data || []) as Perfil[];
}

export async function actualizarPerfil(
  id: string,
  cambios: Pick<Perfil, 'nombre' | 'area' | 'rol' | 'activo'>
): Promise<void> {
  const { error } = await supabase.from('perfiles').update(cambios).eq('id', id);
  if (error) {
    throw new Error(error.message || 'No se pudo actualizar el perfil del usuario.');
  }
}
