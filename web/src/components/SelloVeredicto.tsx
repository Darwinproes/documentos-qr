import { useId } from 'react';
import { ResultadoVerificacion } from '../lib/tipos';

interface SelloVeredictoProps {
  resultado: ResultadoVerificacion;
}

const ETIQUETA_SELLO: Record<ResultadoVerificacion, string> = {
  valido: 'Sello de verificación: Documento válido y vigente',
  vencido: 'Sello de verificación: Documento vencido',
  cancelado: 'Sello de verificación: Documento cancelado',
  no_encontrado: 'Sello de verificación: Documento no registrado',
  limite_excedido: 'Sello de verificación: Demasiadas consultas'
};

const TEXTO_ANILLO: Record<ResultadoVerificacion, string> = {
  valido:
    'PROESA ELECTRÓNICA · REGISTRO CENTRAL DE DOCUMENTOS · FOLIO VERIFICADO · AUTENTICIDAD CONFIRMADA ·',
  vencido:
    'PROESA ELECTRÓNICA · REGISTRO CENTRAL DE DOCUMENTOS · VIGENCIA CONCLUIDA · CONSULTA OFICIAL ·',
  cancelado:
    'PROESA ELECTRÓNICA · REGISTRO CENTRAL DE DOCUMENTOS · FOLIO DADO DE BAJA · SIN VALIDEZ OFICIAL ·',
  no_encontrado:
    'PROESA ELECTRÓNICA · REGISTRO CENTRAL DE DOCUMENTOS · SIN COINCIDENCIA EN REGISTRO · VERIFIQUE ·',
  limite_excedido:
    'PROESA ELECTRÓNICA · REGISTRO CENTRAL DE DOCUMENTOS · CONTROL DE CONSULTAS · ESPERE UN MINUTO ·'
};

export function SelloVeredicto({ resultado }: SelloVeredictoProps) {
  const idUnico = useId().replace(/:/g, '');
  const idCamino = `sello-circulo-${idUnico}`;

  const renderizarSimboloCentral = () => {
    switch (resultado) {
      case 'valido':
        return (
          <path
            className="sello-icono-trazo"
            pathLength={100}
            d="M96 132 l22 22 l46 -48"
            stroke="currentColor"
            strokeWidth="9"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      case 'vencido':
        return (
          <g
            className="sello-icono-trazo"
            stroke="currentColor"
            strokeWidth="7.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="130" cy="130" r="36" pathLength={100} />
            <path d="M130 108 v24 l17 11" pathLength={100} />
          </g>
        );
      case 'cancelado':
        return (
          <g
            className="sello-icono-trazo"
            stroke="currentColor"
            strokeWidth="9"
            fill="none"
            strokeLinecap="round"
          >
            <path d="M104 104 l52 52" pathLength={100} />
            <path d="M156 104 l-52 52" pathLength={100} />
          </g>
        );
      case 'no_encontrado':
        return (
          <g
            className="sello-icono-trazo"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M114 112 c0 -12 10 -20 20 -18 c9 1 16 9 15 18 c-1 10 -13 13 -17 20 c-1 2 -2 5 -2 8" pathLength={100} />
            <circle cx="130" cy="156" r="2.5" fill="currentColor" />
          </g>
        );
      case 'limite_excedido':
        return (
          <g
            className="sello-icono-trazo"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
          >
            <circle cx="130" cy="130" r="34" pathLength={100} />
            <path d="M106 106 l48 48" pathLength={100} />
          </g>
        );
    }
  };

  return (
    <div
      className={`sello-veredicto-contenedor sello-${resultado}`}
      role="img"
      aria-label={ETIQUETA_SELLO[resultado]}
    >
      <svg className="sello-veredicto-svg" viewBox="0 0 260 260" aria-hidden="true">
        <defs>
          <path
            id={idCamino}
            d="M130,130 m-102,0 a102,102 0 1,1 204,0 a102,102 0 1,1 -204,0"
          />
        </defs>
        <circle
          cx="130"
          cy="130"
          r="120"
          className="sello-fondo"
          stroke="currentColor"
          strokeWidth="2.5"
        />
        <circle
          className="sello-anillo-exterior"
          cx="130"
          cy="130"
          r="114"
          fill="none"
        />
        <circle
          className="sello-anillo-interior"
          cx="130"
          cy="130"
          r="86"
          fill="none"
        />
        <text className="sello-microtexto" fontSize="12" fill="currentColor">
          <textPath href={`#${idCamino}`} textLength={636} lengthAdjust="spacing">{TEXTO_ANILLO[resultado]}</textPath>
        </text>
        {renderizarSimboloCentral()}
      </svg>
    </div>
  );
}
