import { DOMINIO_OFICIAL } from '../lib/config';

export function EsquemaBloqueVerificacion() {
  return (
    <aside
      className="esquema-ayuda-contenedor"
      aria-label="Guía para ubicar los datos en su documento"
    >
      <details className="esquema-details" open>
        <summary className="esquema-summary">
          <svg
            className="esquema-summary-icono"
            viewBox="0 0 24 24"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M9.5 9.5a2.5 2.5 0 1 1 3.8 2.1c-.9.6-1.3 1-1.3 1.9" />
            <circle cx="12" cy="17" r="1" fill="currentColor" />
          </svg>
          <span>¿Dónde están el folio y el código en el documento?</span>
        </summary>
        <div className="esquema-cuerpo">
          <p className="esquema-intro">
            <strong>¿Tiene el documento en papel?</strong> Escanee el QR con la cámara de su celular
            para verificarlo al instante, o localice estos datos al pie de la última página:
          </p>

          <svg
            className="esquema-svg"
            viewBox="0 0 420 210"
            role="img"
            aria-label="Esquema del bloque inferior del documento PDF donde se muestran el código QR a la izquierda y el folio y código de verificación a la derecha"
          >
            <rect x="6" y="6" width="408" height="198" rx="6" className="esquema-marco" />
            <rect x="6" y="6" width="408" height="28" rx="6" className="esquema-banda" />
            <text x="20" y="24" className="esquema-banda-texto">
              VERIFICACIÓN DE AUTENTICIDAD
            </text>

            {/* Recuadro QR */}
            <rect x="24" y="48" width="96" height="96" rx="4" className="esquema-qr-caja" />
            <rect x="34" y="58" width="22" height="22" className="esquema-qr-pixel" />
            <rect x="88" y="58" width="22" height="22" className="esquema-qr-pixel" />
            <rect x="34" y="112" width="22" height="22" className="esquema-qr-pixel" />
            <rect x="64" y="88" width="16" height="16" className="esquema-qr-pixel" />

            <circle cx="24" cy="48" r="11" className="esquema-globo" />
            <text x="24" y="52" textAnchor="middle" className="esquema-globo-num">
              1
            </text>

            {/* Folio */}
            <text x="144" y="62" className="esquema-etiqueta-peq">
              FOLIO OFICIAL
            </text>
            <text x="144" y="82" className="esquema-valor-folio">
              CONST-2026-000001
            </text>
            <circle cx="388" cy="72" r="11" className="esquema-globo" />
            <text x="388" y="76" textAnchor="middle" className="esquema-globo-num">
              2
            </text>

            {/* Código */}
            <text x="144" y="114" className="esquema-etiqueta-peq">
              CÓDIGO DE VERIFICACIÓN
            </text>
            <text x="144" y="134" className="esquema-valor-codigo">
              7KQ2M-XA9PD
            </text>
            <circle cx="388" cy="124" r="11" className="esquema-globo" />
            <text x="388" y="128" textAnchor="middle" className="esquema-globo-num">
              3
            </text>

            <text x="24" y="182" className="esquema-etiqueta-peq">
              Dominio impreso: {DOMINIO_OFICIAL}
            </text>
          </svg>

          <ol className="esquema-leyenda">
            <li>
              <strong>Código QR:</strong> escanéelo con su cámara para abrir la verificación
              automática.
            </li>
            <li>
              <strong>Folio del documento:</strong> clave única con formato{' '}
              <code className="mono-text">PREFIJO-AAAA-NNNNNN</code>.
            </li>
            <li>
              <strong>Código de verificación:</strong> 10 caracteres alfanuméricos de seguridad.
            </li>
          </ol>
        </div>
      </details>
    </aside>
  );
}
