import { Link } from 'react-router-dom';
import { CONTACTO_REPORTE, DOMINIO_OFICIAL, ORG_NOMBRE } from '../lib/supabase';
import { formatearFecha, formatearFechaHora } from '../lib/formato';
import { MetodoVerificacion, RespuestaVerificacion } from '../lib/tipos';

interface ResultadoVerificacionVistaProps {
  respuesta: RespuestaVerificacion;
  metodo?: MetodoVerificacion;
  onVerificarOtro?: () => void;
}

export function ResultadoVerificacionVista({
  respuesta,
  metodo,
  onVerificarOtro
}: ResultadoVerificacionVistaProps) {
  const { resultado, documento, verificado_en } = respuesta;

  const obtenerConfiguracion = () => {
    switch (resultado) {
      case 'valido':
        return {
          clase: 'status-banner status-valido',
          encabezado: 'DOCUMENTO VÁLIDO',
          texto: `Este documento fue emitido por ${ORG_NOMBRE} y está vigente. Compare los datos con el documento que tiene en sus manos: si algo no coincide, el documento fue alterado.`,
          icono: (
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
          )
        };
      case 'vencido':
        return {
          clase: 'status-banner status-vencido',
          encabezado: 'DOCUMENTO VENCIDO',
          texto: `Fue emitido por ${ORG_NOMBRE}, pero su vigencia terminó el ${formatearFecha(documento?.vigente_hasta)}.`,
          icono: (
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
                d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
          )
        };
      case 'cancelado':
        return {
          clase: 'status-banner status-cancelado',
          encabezado: 'DOCUMENTO CANCELADO',
          texto: `Fue cancelado el ${formatearFecha(documento?.cancelado_en)} y ya no tiene validez.`,
          icono: (
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
                d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
          )
        };
      case 'no_encontrado':
        return {
          clase: 'status-banner status-no-encontrado',
          encabezado: 'DOCUMENTO NO REGISTRADO',
          texto:
            metodo === 'archivo'
              ? 'Este archivo no coincide con ningún documento emitido. Si es una copia de un documento real, puede haber sido modificado.'
              : `No existe un documento de ${ORG_NOMBRE} con estos datos. Podría ser falso. Repórtelo a ${CONTACTO_REPORTE}.`,
          icono: (
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
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
          )
        };
      case 'limite_excedido':
        return {
          clase: 'status-banner status-limite',
          encabezado: 'Demasiadas consultas',
          texto: 'Espere un minuto e intente de nuevo.',
          icono: (
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
                d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
          )
        };
    }
  };

  const cfg = obtenerConfiguracion();

  return (
    <div className="verification-result-stack" aria-live="polite">
      {/* 1. Banda de estado a todo el ancho */}
      <section className="verification-result-card">
        <div className={cfg.clase} role="status">
          <div className="status-header-row">
            {cfg.icono}
            <h2 className="status-heading">{cfg.encabezado}</h2>
          </div>
          <p className="status-message">{cfg.texto}</p>
          {resultado === 'no_encontrado' && metodo === 'archivo' && (
            <p className="status-submessage">
              En caso de duda, repórtelo a <strong>{CONTACTO_REPORTE}</strong>.
            </p>
          )}
        </div>

        {/* 2. Tarjeta "Compare estos datos con su documento" */}
        {documento && (
          <div className="document-details-box">
            <h3 className="details-section-title">Compare estos datos con su documento</h3>
            <dl className="details-grid">
              <div className="details-item details-item-wide">
                <dt>Folio</dt>
                <dd className="mono-text folio-result-value">{documento.folio}</dd>
              </div>
              <div className="details-item">
                <dt>Tipo</dt>
                <dd>{documento.tipo}</dd>
              </div>
              <div className="details-item">
                <dt>Área emisora</dt>
                <dd>{documento.area_emisora || '—'}</dd>
              </div>
              <div className="details-item details-item-wide">
                <dt>Destinatario</dt>
                <dd className="destinatario-highlight">{documento.destinatario}</dd>
              </div>
              <div className="details-item">
                <dt>Emitido</dt>
                <dd>{formatearFecha(documento.emitido_en)}</dd>
              </div>
              <div className="details-item">
                <dt>Vigencia</dt>
                <dd>
                  {documento.vigente_hasta
                    ? formatearFecha(documento.vigente_hasta)
                    : 'Sin vencimiento'}
                </dd>
              </div>
              {documento.cancelado_en && (
                <div className="details-item">
                  <dt>Cancelado el</dt>
                  <dd>{formatearFecha(documento.cancelado_en)}</dd>
                </div>
              )}

              {documento.campos &&
                documento.campos.map((campo, idx) => (
                  <div
                    key={`${campo.etiqueta}-${idx}`}
                    className={
                      campo.tipo === 'texto_largo'
                        ? 'details-item details-item-wide'
                        : 'details-item'
                    }
                  >
                    <dt>{campo.etiqueta}</dt>
                    <dd>
                      {campo.tipo === 'fecha' ? formatearFecha(campo.valor) : String(campo.valor)}
                    </dd>
                  </div>
                ))}
            </dl>
          </div>
        )}
      </section>

      {/* 3. Bloque de dominio oficial destacado */}
      <div className="official-domain-box" role="note">
        <svg
          className="lock-icon"
          viewBox="0 0 24 24"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
          />
        </svg>
        <div className="official-domain-text">
          <p className="official-domain-main">
            Esta es la página oficial de verificación de {ORG_NOMBRE}:{' '}
            <strong>{DOMINIO_OFICIAL}</strong>
          </p>
          <p className="official-domain-time">
            Consultado el {formatearFechaHora(verificado_en)}
          </p>
        </div>
      </div>

      {/* 4. Botón secundario "Verificar otro documento" */}
      <div className="verify-another-bar">
        {onVerificarOtro ? (
          <button type="button" className="btn btn-secondary" onClick={onVerificarOtro}>
            Verificar otro documento
          </button>
        ) : (
          <Link to="/verificar" className="btn btn-secondary">
            Verificar otro documento
          </Link>
        )}
      </div>
    </div>
  );
}
