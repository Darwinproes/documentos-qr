import { EstadoVisualDocumento } from '../lib/tipos';

export type EstadoLed = EstadoVisualDocumento | 'por_vencer';
export type EstadoVisualLed = EstadoLed;

const ETIQUETA_LED: Record<EstadoLed, string> = {
  vigente: 'Vigente',
  por_vencer: 'Por vencer',
  vencido: 'Vencido',
  cancelado: 'Cancelado',
  pendiente: 'Pendiente'
};

interface LedEstadoProps {
  estado: EstadoLed;
  etiqueta?: string;
  mostrarTexto?: boolean;
}

export function LedEstado({ estado, etiqueta, mostrarTexto = true }: LedEstadoProps) {
  const texto = etiqueta ?? ETIQUETA_LED[estado];
  return (
    <span className={`led-estado led-${estado}`}>
      <span className="led-punto" aria-hidden="true" />
      {mostrarTexto && <span className="led-texto">{texto}</span>}
    </span>
  );
}
