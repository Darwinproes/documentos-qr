import { esFechaVencida, esPorVencer30Dias } from '../lib/formato';
import { DocumentoResumen, EstadoVisualDocumento } from '../lib/tipos';

export type EstadoIndicador = EstadoVisualDocumento | 'por_vencer';

const ETIQUETA_ESTADO: Record<EstadoIndicador, string> = {
  vigente: 'Vigente',
  por_vencer: 'Por vencer',
  vencido: 'Vencido',
  cancelado: 'Cancelado',
  pendiente: 'Pendiente'
};

export function resolverEstadoIndicador(
  doc: Pick<DocumentoResumen, 'estado' | 'vigente_hasta'>
): EstadoIndicador {
  if (doc.estado === 'cancelado') return 'cancelado';
  if (doc.estado === 'pendiente') return 'pendiente';
  if (doc.vigente_hasta && esFechaVencida(doc.vigente_hasta)) return 'vencido';
  if (doc.vigente_hasta && esPorVencer30Dias(doc.vigente_hasta)) return 'por_vencer';
  return 'vigente';
}

interface EtiquetaEstadoProps {
  estado: EstadoIndicador;
  etiqueta?: string;
  mostrarTexto?: boolean;
}

export function EtiquetaEstado({ estado, etiqueta, mostrarTexto = true }: EtiquetaEstadoProps) {
  const texto = etiqueta ?? ETIQUETA_ESTADO[estado];
  return (
    <span className={`estado-institucional estado-${estado}`}>
      <span className="estado-punto" aria-hidden="true" />
      {mostrarTexto && <span className="estado-texto">{texto}</span>}
    </span>
  );
}
