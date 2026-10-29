import { DOMINIO_OFICIAL } from '../lib/config';

export function EsquemaBloqueVerificacion() {
  return (
    <aside
      className="ayuda-verificacion-box"
      aria-label="Dónde están el folio y el código"
    >
      <h2 className="ayuda-verificacion-titulo">¿Dónde están el folio y el código?</h2>
      <p className="ayuda-verificacion-texto">
        Al pie de la última página, en el recuadro «Verificación de autenticidad». Si tiene el
        papel, basta con escanear el QR.
      </p>
      <div className="esquema-bloque-recuadro" aria-label="Esquema del bloque de verificación">
        <svg
          width="64"
          height="64"
          viewBox="0 0 25 25"
          aria-hidden="true"
          shapeRendering="crispEdges"
          className="esquema-qr-svg"
        >
          <defs>
            <pattern id="qr-patron-ayuda" width="3" height="3" patternUnits="userSpaceOnUse">
              <rect width="1" height="1" className="esquema-qr-tinta" />
              <rect x="2" y="1" width="1" height="1" className="esquema-qr-tinta" />
              <rect x="1" y="2" width="1" height="1" className="esquema-qr-tinta" />
            </pattern>
          </defs>
          <rect width="25" height="25" className="esquema-qr-fondo" />
          <rect width="25" height="25" fill="url(#qr-patron-ayuda)" />
          <rect width="8" height="8" className="esquema-qr-fondo" />
          <rect x="17" width="8" height="8" className="esquema-qr-fondo" />
          <rect y="17" width="8" height="8" className="esquema-qr-fondo" />
          <path
            fillRule="evenodd"
            className="esquema-qr-tinta"
            d="M0 0h7v7H0zM1 1v5h5V1zM2 2h3v3H2zM18 0h7v7h-7zM19 1v5h5V1zM20 2h3v3h-3zM0 18h7v7H0zM1 19v5h5v-5zM2 20h3v3H2z"
          />
        </svg>
        <div className="esquema-bloque-textos">
          <strong className="esquema-bloque-encabezado">Verificación de autenticidad</strong>
          <span>
            Folio <span className="mono-text esquema-dato-codigo">CONST-2026-000001</span>
          </span>
          <span>
            Código <span className="mono-text esquema-dato-codigo">7KQ2M-XA9PD</span>
          </span>
          <span className="esquema-dominio-nota">
            Dominio oficial: <span className="nowrap-domain">{DOMINIO_OFICIAL}</span>
          </span>
        </div>
      </div>
      <p className="ayuda-verificacion-nota">
        ¿Recibió el documento como archivo PDF? Use «Por archivo PDF»: el sistema detecta cualquier
        modificación.
      </p>
    </aside>
  );
}
