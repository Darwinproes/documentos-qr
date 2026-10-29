import { Link } from 'react-router-dom';
import { CONTACTO_REPORTE, DOMINIO_OFICIAL, ORG_NOMBRE } from '../lib/config';
import { formatearFechaCorta, formatearFechaHoraMX } from '../lib/formato';
import { MetodoVerificacion, RespuestaVerificacion, ResultadoVerificacion } from '../lib/tipos';
import { SelloVeredicto } from './SelloVeredicto';
import { TramaSeguridad } from './TramaSeguridad';

interface ResultadoVerificacionVistaProps {
  respuesta: RespuestaVerificacion;
  metodo?: MetodoVerificacion;
  onVerificarOtro?: () => void;
}

interface ConfiguracionEstado {
  claseCertificado: string;
  titulo: string;
  explicacion: string;
  selloGoma?: string;
}

function obtenerConfiguracionEstado(resultado: ResultadoVerificacion): ConfiguracionEstado {
  switch (resultado) {
    case 'valido':
      return {
        claseCertificado: 'certificado-valido',
        titulo: 'Documento válido',
        explicacion: `Este documento fue emitido por ${ORG_NOMBRE} y se encuentra vigente.`
      };
    case 'vencido':
      return {
        claseCertificado: 'certificado-vencido',
        titulo: 'Documento vencido',
        explicacion: `Este documento fue emitido por ${ORG_NOMBRE}, pero su vigencia ha concluido.`,
        selloGoma: 'VENCIDO'
      };
    case 'cancelado':
      return {
        claseCertificado: 'certificado-cancelado',
        titulo: 'Documento cancelado',
        explicacion: `Este documento fue dejado sin efecto por ${ORG_NOMBRE} y ya no tiene validez.`,
        selloGoma: 'CANCELADO'
      };
    case 'no_encontrado':
      return {
        claseCertificado: 'certificado-no-encontrado',
        titulo: 'Documento no registrado',
        explicacion: `No existe ningún documento oficial en ${ORG_NOMBRE} con los datos proporcionados.`,
        selloGoma: 'SIN REGISTRO'
      };
    case 'limite_excedido':
      return {
        claseCertificado: 'certificado-limite',
        titulo: 'Demasiadas consultas',
        explicacion:
          'Se alcanzó el límite de consultas permitidas desde su conexión. Por favor espere un minuto antes de intentar nuevamente.'
      };
  }
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
  const config = obtenerConfiguracionEstado(resultado);
  const etiquetaMetodo = textoMetodo(metodo);

  return (
    <section
      className={`certificado ${config.claseCertificado}`}
      aria-labelledby="titulo-veredicto"
    >
      <div className="certificado-cabeza">
        <TramaSeguridad resultado={resultado} />
        <div className="certificado-cabeza-contenido">
          <SelloVeredicto resultado={resultado} />
          <h1 id="titulo-veredicto" className="certificado-titulo">
            {config.titulo}
          </h1>
          <p className="certificado-explicacion">{config.explicacion}</p>
          {config.selloGoma && (
            <div className="sello-goma-contenedor" aria-hidden="true">
              <span className="sello-goma">{config.selloGoma}</span>
            </div>
          )}
        </div>
      </div>

      <div className="certificado-cuerpo">
        {documento ? (
          <div className="cotejo-bloque">
            <div className="cotejo-encabezado">
              <h2 className="cotejo-titulo">Compare estos datos con su documento impreso</h2>
              {etiquetaMetodo && <span className="metodo-chip">{etiquetaMetodo}</span>}
            </div>

            <dl className="renglones-certificado">
              <div className="renglon-certificado">
                <dt className="renglon-etiqueta">Folio oficial</dt>
                <span className="puntos-guia" aria-hidden="true" />
                <dd className="renglon-valor renglon-valor-folio">{documento.folio}</dd>
              </div>

              <div className="renglon-certificado">
                <dt className="renglon-etiqueta">Destinatario</dt>
                <span className="puntos-guia" aria-hidden="true" />
                <dd className="renglon-valor renglon-valor-destinatario">
                  {documento.destinatario}
                </dd>
              </div>

              <div className="renglon-certificado">
                <dt className="renglon-etiqueta">Tipo de documento</dt>
                <span className="puntos-guia" aria-hidden="true" />
                <dd className="renglon-valor">{documento.tipo}</dd>
              </div>

              <div className="renglon-certificado">
                <dt className="renglon-etiqueta">Área emisora</dt>
                <span className="puntos-guia" aria-hidden="true" />
                <dd className="renglon-valor">{documento.area_emisora}</dd>
              </div>

              <div className="renglon-certificado">
                <dt className="renglon-etiqueta">Emitido</dt>
                <span className="puntos-guia" aria-hidden="true" />
                <dd className="renglon-valor">{formatearFechaCorta(documento.emitido_en)}</dd>
              </div>

              <div className="renglon-certificado">
                <dt className="renglon-etiqueta">Vigencia</dt>
                <span className="puntos-guia" aria-hidden="true" />
                <dd className="renglon-valor">
                  {documento.vigente_hasta
                    ? formatearFechaCorta(documento.vigente_hasta)
                    : 'Sin vencimiento'}
                </dd>
              </div>

              {resultado === 'cancelado' && documento.cancelado_en && (
                <div className="renglon-certificado renglon-certificado-alerta">
                  <dt className="renglon-etiqueta">Cancelado el</dt>
                  <span className="puntos-guia" aria-hidden="true" />
                  <dd className="renglon-valor">{formatearFechaCorta(documento.cancelado_en)}</dd>
                </div>
              )}

              {documento.campos &&
                documento.campos.map((campo, idx) => (
                  <div key={`${campo.etiqueta}-${idx}`} className="renglon-certificado">
                    <dt className="renglon-etiqueta">{campo.etiqueta}</dt>
                    <span className="puntos-guia" aria-hidden="true" />
                    <dd className="renglon-valor">{campo.valor || '—'}</dd>
                  </div>
                ))}
            </dl>
          </div>
        ) : (
          resultado === 'no_encontrado' && (
            <div className="alerta-no-registrado">
              <h2 className="alerta-no-registrado-titulo">¿Qué hacer ante este resultado?</h2>
              <ul className="alerta-no-registrado-lista">
                <li>
                  Revise que el <strong>folio</strong> y el <strong>código de verificación</strong>{' '}
                  coincidan letra por letra con los impresos debajo del código QR.
                </li>
                <li>
                  Si verificó mediante archivo PDF, asegúrese de subir el archivo original sin haberlo
                  impreso, escaneado ni vuelto a guardar.
                </li>
                <li>
                  Si el documento persiste sin aparecer en el registro, no lo acepte como válido y
                  repórtelo a{' '}
                  <a href={`mailto:${CONTACTO_REPORTE}`} className="inline-link">
                    {CONTACTO_REPORTE}
                  </a>
                </li>
              </ul>
            </div>
          )
        )}

        <div className="dominio-oficial-bloque" role="note" aria-label="Aviso de dominio oficial">
          <svg
            className="dominio-candado-icono"
            viewBox="0 0 24 24"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          <div className="dominio-oficial-texto">
            <p className="dominio-linea-principal">
              Verifique que la barra de direcciones de su navegador muestre{' '}
              <strong className="nowrap-domain">{DOMINIO_OFICIAL}</strong>
            </p>
            <p className="dominio-linea-hora">
              Consulta realizada el {formatearFechaHoraMX(verificado_en)}
            </p>
          </div>
        </div>

        <div className="certificado-acciones">
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
    </section>
  );
}

export function ResultadoVerificacionEsqueleto() {
  return (
    <div
      className="certificado certificado-esqueleto"
      role="status"
      aria-live="polite"
      aria-label="Consultando registro oficial de documentos"
    >
      <div className="certificado-cabeza">
        <div className="skeleton skeleton-seal" />
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-subtitle" />
      </div>
      <div className="certificado-cuerpo">
        <div className="skeleton skeleton-row" />
        <div className="skeleton skeleton-row" />
        <div className="skeleton skeleton-row" />
        <div className="skeleton skeleton-row" />
        <p className="sr-only">Verificando autenticidad del documento, por favor espere…</p>
      </div>
    </div>
  );
}
