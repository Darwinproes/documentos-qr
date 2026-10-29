import { EstadoVisualDocumento } from '../lib/tipos';

export type EstadoIndicador = EstadoVisualDocumento | 'por_vencer';

const ETIQUETA_ESTADO: Record<EstadoIndicador, string> = {
  vigente: 'Vigente',
  por_vencer: 'Por vencer',
  vencido: 'Vencido',
  cancelado: 'Cancelado',
  pendiente: 'Pendiente'
};

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
