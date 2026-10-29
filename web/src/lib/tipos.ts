export type RolDocumentos = 'admin' | 'emisor' | 'consulta';
export type RolUsuario = RolDocumentos;

export type EstadoDocumento = 'pendiente' | 'vigente' | 'cancelado';

export type EstadoVisualDocumento = 'pendiente' | 'vigente' | 'vencido' | 'cancelado';

export type TipoCampo = 'texto' | 'texto_largo' | 'fecha' | 'numero';
export type TipoCampoEsquema = TipoCampo;

export interface DefinicionCampo {
  clave: string;
  etiqueta: string;
  tipo: TipoCampo;
  requerido: boolean;
  publico: boolean;
}
export type CampoEsquema = DefinicionCampo;

export interface CampoVerificado {
  etiqueta: string;
  tipo: TipoCampo;
  valor: string;
}

export type ResultadoVerificacion =
  | 'valido'
  | 'vencido'
  | 'cancelado'
  | 'no_encontrado'
  | 'limite_excedido';

export type MetodoVerificacion = 'qr' | 'token' | 'manual' | 'archivo';

export interface DocumentoVerificado {
  folio: string;
  tipo: string;
  destinatario: string;
  area_emisora: string | null;
  emitido_en: string;
  vigente_hasta: string | null;
  cancelado_en: string | null;
  campos: CampoVerificado[];
}

export interface RespuestaVerificacion {
  resultado: ResultadoVerificacion;
  documento: DocumentoVerificado | null;
  verificado_en: string;
}

export type SolicitudVerificar =
  | { metodo: 'qr' | 'token'; token: string }
  | { metodo: 'manual'; folio: string; codigo: string }
  | { metodo: 'archivo'; pdf_sha256: string };

export interface SolicitudEmitirDocumento {
  tipo_clave: string;
  destinatario: string;
  datos: Record<string, string>;
  vigente_hasta?: string | null;
  sin_vencimiento?: boolean;
}

export interface RespuestaEmitirDocumento {
  documento_id: string;
  folio: string;
  url_verificacion: string;
  codigo_verificacion: string;
  vigente_hasta: string | null;
  pdf_sha256: string;
  pdf_url: string;
}

export type CodigoErrorContrato =
  | 'VALIDACION'
  | 'NO_AUTENTICADO'
  | 'SIN_PERMISO'
  | 'METODO_NO_PERMITIDO'
  | 'LIMITE'
  | 'INTERNO';

export interface ErrorContratoCuerpo {
  error: {
    codigo: CodigoErrorContrato;
    mensaje: string;
  };
}

export class ErrorApi extends Error {
  readonly codigo: CodigoErrorContrato;
  readonly status: number;

  constructor(codigo: CodigoErrorContrato, mensaje: string, status = 400) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.codigo = codigo;
    this.status = status;
  }
}

export interface Perfil {
  id: string;
  nombre: string;
  area: string | null;
  rol: RolDocumentos;
  activo: boolean;
  creado_en?: string;
}

export interface TipoDocumento {
  id: number;
  clave: string;
  nombre: string;
  descripcion: string | null;
  prefijo_folio: string;
  vigencia_dias: number | null;
  campos: DefinicionCampo[];
  activo: boolean;
  creado_en?: string;
}

export interface TipoDocumentoRelacion {
  clave: string;
  nombre: string;
  campos?: DefinicionCampo[];
}

export interface DocumentoResumen {
  id: string;
  folio: string;
  estado: EstadoDocumento;
  destinatario: string;
  emitido_en: string;
  vigente_hasta: string | null;
  tipo_id: number;
  tipos_documento: TipoDocumentoRelacion | TipoDocumentoRelacion[] | null;
}

export interface DocumentoDetalle extends DocumentoResumen {
  datos: Record<string, string>;
  pdf_path: string | null;
  pdf_sha256: string | null;
  confirmado_en: string | null;
  emitido_por: string;
  cancelado_por: string | null;
  cancelado_en: string | null;
  motivo_cancelacion: string | null;
}
export type DocumentoPanel = DocumentoDetalle;

export interface ResumenDocumentos {
  vigentes: number;
  por_vencer: number;
  vencidos: number;
  cancelados: number;
  total: number;
}

export interface RegistroBitacora {
  id: number;
  documento_id?: string;
  accion: 'emitido' | 'pdf_generado' | 'cancelado' | 'reserva_folio' | string;
  actor?: string | null;
  actor_nombre?: string | null;
  actor_area?: string | null;
  detalle: Record<string, unknown>;
  creado_en: string;
}

export interface RegistroVerificacion {
  id: number;
  metodo: MetodoVerificacion;
  resultado: ResultadoVerificacion;
  creado_en: string;
}
