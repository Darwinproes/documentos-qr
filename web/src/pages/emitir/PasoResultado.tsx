import { Link } from 'react-router-dom';
import {
  abreviarEnlaceVerificacion,
  abreviarSha256,
  formatearFecha
} from '../../lib/formato';
import { RespuestaEmitirDocumento } from '../../lib/tipos';

export type CampoCopiadoEmision = 'folio' | 'codigo' | 'enlace' | 'sha256' | null;

interface PasoResultadoProps {
  resultado: RespuestaEmitirDocumento;
  copiadoCampo: CampoCopiadoEmision;
  onCopiarValor: (tipo: Exclude<CampoCopiadoEmision, null>, texto: string) => void;
  onEmitirOtro: () => void;
}

export function PasoResultado({
  resultado,
  copiadoCampo,
  onCopiarValor,
  onEmitirOtro
}: PasoResultadoProps) {
  return (
    <section className="card emission-result-card" aria-live="polite">
      <div className="status-banner status-valido">
        <div className="status-header-row">
          <svg
            className="status-icon"
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
          <h2 className="status-heading">Documento emitido correctamente</h2>
        </div>
        <p className="status-message">
          El documento ha quedado registrado con estado vigente y su archivo PDF está listo.
        </p>
      </div>

      <div className="alert alert-warning mt-section" role="note">
        <strong>Aviso importante:</strong> El enlace y el código solo se muestran ahora. Ya quedan
        impresos en el PDF; para reimprimir, descargue el PDF desde el detalle del documento.
      </div>

      <div className="sr-only" aria-live="polite">
        {copiadoCampo ? 'Copiado al portapapeles' : ''}
      </div>

      <div className="credentials-highlight-grid mt-section">
        <div className="credential-card">
          <span className="credential-label">Folio asignado</span>
          <div className="credential-value-row">
            <strong className="mono-text credential-big-value">{resultado.folio}</strong>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => onCopiarValor('folio', resultado.folio)}
            >
              {copiadoCampo === 'folio' ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </div>

        <div className="credential-card">
          <span className="credential-label">Código de verificación</span>
          <div className="credential-value-row">
            <strong className="mono-text credential-big-value">
              {resultado.codigo_verificacion}
            </strong>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => onCopiarValor('codigo', resultado.codigo_verificacion)}
            >
              {copiadoCampo === 'codigo' ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </div>
      </div>

      <dl className="renglones-panel-grid mt-section">
        <div className="renglon-panel-fila">
          <dt className="renglon-panel-dt">Vigencia</dt>
          <dd className="renglon-panel-dd">
            {resultado.vigente_hasta
              ? formatearFecha(resultado.vigente_hasta)
              : 'Sin vencimiento'}
          </dd>
        </div>
        <div className="renglon-panel-fila">
          <dt className="renglon-panel-dt">Huella digital PDF (SHA-256)</dt>
          <dd className="renglon-panel-dd sha-inline-row">
            <code className="mono-text" title={resultado.pdf_sha256}>
              {abreviarSha256(resultado.pdf_sha256)}
            </code>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              aria-label="Copiar huella digital SHA-256"
              onClick={() => onCopiarValor('sha256', resultado.pdf_sha256)}
            >
              {copiadoCampo === 'sha256' ? 'Copiado' : 'Copiar huella'}
            </button>
          </dd>
        </div>
        <div className="renglon-panel-fila renglon-panel-wide">
          <dt className="renglon-panel-dt">Enlace de verificación (QR)</dt>
          <dd className="renglon-panel-dd sha-inline-row">
            <code className="mono-text nowrap-code" title={resultado.url_verificacion}>
              {abreviarEnlaceVerificacion(resultado.url_verificacion)}
            </code>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onCopiarValor('enlace', resultado.url_verificacion)}
            >
              {copiadoCampo === 'enlace' ? 'Copiado' : 'Copiar enlace'}
            </button>
          </dd>
        </div>
      </dl>

      <div className="emission-actions-bar">
        <Link to={`/panel/documentos/${resultado.documento_id}`} className="btn btn-secondary">
          Ver detalle del documento
        </Link>

        <button type="button" className="btn btn-secondary" onClick={onEmitirOtro}>
          Emitir otro documento
        </button>

        <a
          href={resultado.pdf_url}
          target="_blank"
          rel="noopener noreferrer"
          download={`${resultado.folio}.pdf`}
          className="btn btn-primary"
        >
          Descargar PDF
        </a>
      </div>
    </section>
  );
}
