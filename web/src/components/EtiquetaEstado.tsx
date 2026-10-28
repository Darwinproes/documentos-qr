import { EstadoVisualDocumento } from '../lib/tipos';

const ETIQUETA_ESTADO: Record<EstadoVisualDocumento, string> = {
  vigente: 'Vigente',
  vencido: 'Vencido',
  cancelado: 'Cancelado',
  pendiente: 'Pendiente'
};

export function EtiquetaEstado({ estado }: { estado: EstadoVisualDocumento }) {
  const renderizarIcono = () => {
    switch (estado) {
      case 'vigente':
        return (
          <svg
            className="badge-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
        );
      case 'vencido':
        return (
          <svg
            className="badge-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
        );
      case 'cancelado':
        return (
          <svg
            className="badge-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
        );
      case 'pendiente':
        return (
          <svg
            className="badge-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
            />
          </svg>
        );
    }
  };

  return (
    <span className={`badge badge-with-icon badge-estado-${estado}`}>
      {renderizarIcono()}
      <span>{ETIQUETA_ESTADO[estado]}</span>
    </span>
  );
}
