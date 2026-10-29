import React from 'react';
import { Link } from 'react-router-dom';
import { CONTACTO_REPORTE, DOMINIO_OFICIAL, ORG_NOMBRE } from '../lib/config';
import {
  formatearFechaCorta,
  formatearFechaHoraMX,
  formatearValorCampo
} from '../lib/formato';
import {
  DocumentoVerificado,
  MetodoVerificacion,
  RespuestaVerificacion,
  ResultadoVerificacion
} from '../lib/tipos';

interface ResultadoVerificacionVistaProps {
  respuesta: RespuestaVerificacion;
  metodo?: MetodoVerificacion;
  onVerificarOtro?: () => void;
}

function obtenerTituloEstado(resultado: ResultadoVerificacion): string {
  switch (resultado) {
    case 'valido':
      return 'Documento válido';
    case 'vencido':
      return 'Documento vencido';
    case 'cancelado':
      return 'Documento cancelado';
    case 'no_encontrado':
      return 'Documento no registrado';
    case 'limite_excedido':
      return 'Demasiadas consultas';
  }
}

function renderizarIconoVeredicto(resultado: ResultadoVerificacion): React.ReactNode {
  switch (resultado) {
    case 'valido':
      return (
        <svg
          width="40"
          height="40"
          viewBox="0 0 40 40"
          aria-hidden="true"
          className="veredicto-icono veredicto-icono-valido"
        >
          <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <path
            d="M12 20.5l5.5 5.5L28 15"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'vencido':
    case 'limite_excedido':
      return (
        <svg
          width="40"
          height="40"
          viewBox="0 0 40 40"
          aria-hidden="true"
          className="veredicto-icono veredicto-icono-vencido"
        >
          <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <path
            d="M20 11v9.5l6 3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'cancelado':
      return (
        <svg
          width="40"
          height="40"
          viewBox="0 0 40 40"
          aria-hidden="true"
          className="veredicto-icono veredicto-icono-cancelado"
        >
          <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <path
            d="M14 14l12 12M26 14L14 26"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'no_encontrado':
      return (
        <svg
          width="40"
          height="40"
          viewBox="0 0 40 40"
          aria-hidden="true"
          className="veredicto-icono veredicto-icono-cancelado"
        >
          <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <path
            d="M15.8 15.5a4.5 4.5 0 1 1 6.7 3.9c-1.5.9-2.5 1.8-2.5 3.6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <circle cx="20" cy="28.5" r="1.8" fill="currentColor" />
        </svg>
      );
  }
}

function renderizarOracionVeredicto(
  resultado: ResultadoVerificacion,
  documento: DocumentoVerificado | null
): React.ReactNode {
  if (resultado === 'valido' && documento) {
    return (
      <>
        Emitido por {ORG_NOMBRE} a nombre de <strong>{documento.destinatario}</strong>. Vigente.
      </>
    );
  }
  if (resultado === 'vencido' && documento) {
    const fechaFin = documento.vigente_hasta
      ? formatearFechaCorta(documento.vigente_hasta)
      : 'registro oficial';
    return (
      <>
        Emitido por {ORG_NOMBRE} a nombre de <strong>{documento.destinatario}</strong>. Vigencia
        concluida el {fechaFin}.
      </>
    );
  }
  if (resultado === 'cancelado' && documento) {
    const fechaCancelacion = documento.cancelado_en
      ? formatearFechaCorta(documento.cancelado_en)
      : 'registro oficial';
    return (
      <>
        Emitido por {ORG_NOMBRE} a nombre de <strong>{documento.destinatario}</strong>. Cancelado el{' '}
        {fechaCancelacion}.
      </>
    );
  }
  if (resultado === 'limite_excedido') {
    return 'Se alcanzó el límite de consultas permitidas desde su conexión. Por favor espere un minuto antes de intentar nuevamente.';
  }
  return 'No existe un documento de PROESA con esos datos.';
}

function textoMetodo(metodo?: MetodoVerificacion): string | null {
  if (!metodo) return null;
  switch (metodo) {
    case 'qr':
    case 'token':
      return 'Verificado por código QR';
    case 'manual':
      return 'Verificado por folio y código';
    case 'archivo':
      return 'Verificado por archivo PDF';
  }
}

export function ResultadoVerificacionVista({
  respuesta,
  metodo,
  onVerificarOtro
}: ResultadoVerificacionVistaProps) {
  const { resultado, documento, verificado_en } = respuesta;
  const titulo = obtenerTituloEstado(resultado);
  const etiquetaMetodo = textoMetodo(metodo);

  return (
    <section
      className="resultado-institucional"
      aria-labelledby="titulo-veredicto"
    >
      <p className="veredicto-meta">
        Resultado de la verificación · {formatearFechaHoraMX(verificado_en)}
        {etiquetaMetodo ? ` · ${etiquetaMetodo}` : ''}
      </p>

      <div className="veredicto-encabezado">
        {renderizarIconoVeredicto(resultado)}
        <div className="veredicto-textos">
          <h1 id="titulo-veredicto" className="veredicto-titulo">
            {titulo}
          </h1>
          <p className="veredicto-oracion">{renderizarOracionVeredicto(resultado, documento)}</p>
        </div>
      </div>

      {documento ? (
        <dl className="renglones-institucionales">
          <div className="renglon-fila">
            <dt className="renglon-dt">Folio</dt>
            <dd className="renglon-dd mono-text renglon-folio-valor">{documento.folio}</dd>
          </div>

          <div className="renglon-fila">
            <dt className="renglon-dt">Documento</dt>
            <dd className="renglon-dd">{documento.tipo}</dd>
          </div>

          <div className="renglon-fila">
            <dt className="renglon-dt">Destinatario</dt>
            <dd className="renglon-dd">{documento.destinatario}</dd>
          </div>

          <div className="renglon-fila">
            <dt className="renglon-dt">Área emisora</dt>
            <dd className="renglon-dd">
              {documento.area_emisora ? (
                documento.area_emisora
              ) : (
                <span className="text-muted">No capturado</span>
              )}
            </dd>
          </div>

          <div className="renglon-fila">
            <dt className="renglon-dt">Emitido</dt>
            <dd className="renglon-dd">{formatearFechaCorta(documento.emitido_en)}</dd>
          </div>

          <div className="renglon-fila">
            <dt className="renglon-dt">Vigencia</dt>
            <dd className="renglon-dd">
              {documento.vigente_hasta
                ? formatearFechaCorta(documento.vigente_hasta)
                : 'Sin vencimiento'}
            </dd>
          </div>

          {resultado === 'cancelado' && documento.cancelado_en && (
            <div className="renglon-fila renglon-fila-alerta">
              <dt className="renglon-dt">Cancelado el</dt>
              <dd className="renglon-dd">{formatearFechaCorta(documento.cancelado_en)}</dd>
            </div>
          )}

          {documento.campos &&
            documento.campos.map((campo, idx) => {
              const formateado = formatearValorCampo(campo.valor, campo.tipo);
              return (
                <div key={`${campo.etiqueta}-${idx}`} className="renglon-fila">
                  <dt className="renglon-dt">{campo.etiqueta}</dt>
                  <dd className="renglon-dd">
                    {formateado !== null ? (
                      formateado
                    ) : (
                      <span className="text-muted">No capturado</span>
                    )}
                  </dd>
                </div>
              );
            })}
        </dl>
      ) : (
        resultado === 'no_encontrado' && (
          <div className="alerta-no-registrado">
            <h2 className="alerta-no-registrado-titulo">¿Qué hacer ante este resultado?</h2>
            <ul className="alerta-no-registrado-lista">
              <li>
                Revise que el <strong>folio</strong> y el <strong>código de verificación</strong>{' '}
                coincidan con los impresos en el bloque de verificación del documento.
              </li>
              <li>
                Si verificó mediante archivo PDF, asegúrese de usar el archivo original sin haberlo
                impreso, escaneado ni vuelto a guardar.
              </li>
              <li>
                Si el documento no aparece en el registro, no lo acepte como válido y repórtelo a{' '}
                <a href={`mailto:${CONTACTO_REPORTE}`} className="inline-link">
                  {CONTACTO_REPORTE}
                </a>
              </li>
            </ul>
          </div>
        )
      )}

      <p className="aviso-dominio-institucional" role="note">
        Confirme que la dirección del navegador sea{' '}
        <strong className="nowrap-domain">{DOMINIO_OFICIAL}</strong>
      </p>

      <div className="resultado-acciones">
        {onVerificarOtro ? (
          <button type="button" className="btn btn-secondary btn-block-mobile" onClick={onVerificarOtro}>
            Verificar otro documento
          </button>
        ) : (
          <Link to="/verificar" className="btn btn-secondary btn-block-mobile">
            Verificar otro documento
          </Link>
        )}
      </div>
    </section>
  );
}

export function ResultadoVerificacionEsqueleto() {
  return (
    <div
      className="resultado-institucional"
      role="status"
      aria-live="polite"
      aria-label="Consultando registro oficial de documentos"
    >
      <div className="skeleton skeleton-subtitle" />
      <div className="veredicto-encabezado">
        <div className="skeleton skeleton-circle" />
        <div className="veredicto-textos">
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-subtitle" />
        </div>
      </div>
      <div>
        <div className="skeleton skeleton-row" />
        <div className="skeleton skeleton-row" />
        <div className="skeleton skeleton-row" />
        <div className="skeleton skeleton-row" />
        <p className="sr-only">Verificando autenticidad del documento, por favor espere…</p>
      </div>
    </div>
  );
}
