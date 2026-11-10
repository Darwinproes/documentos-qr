import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EtiquetaEstado, resolverEstadoIndicador } from '../components/EtiquetaEstado';
import { LayoutPanel } from '../components/LayoutPanel';
import { BitacoraDocumento } from '../components/panel/BitacoraDocumento';
import { ModalCancelarDocumento } from '../components/panel/ModalCancelarDocumento';
import { useAuth } from '../context/AuthContext';
import {
  abreviarSha256,
  formatearFecha,
  formatearFechaHora,
  formatearValorCampo
} from '../lib/formato';
import { useCargaDiferida, useTituloDocumento } from '../lib/hooks';
import { obtenerBitacora, obtenerDocumento, urlDescargaPdf } from '../lib/panel';
import { DefinicionCampo, DocumentoDetalle, RegistroBitacora } from '../lib/tipos';

export function DocumentoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const { perfil } = useAuth();
  const esAdmin = perfil?.rol === 'admin';

  const [documento, setDocumento] = useState<DocumentoDetalle | null>(null);
  const [bitacora, setBitacora] = useState<RegistroBitacora[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const mostrarEsqueleto = useCargaDiferida(cargando, 200);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [descargandoPdf, setDescargandoPdf] = useState<boolean>(false);
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null);
  const [hashCopiado, setHashCopiado] = useState<boolean>(false);

  const [mostrarModalCancelar, setMostrarModalCancelar] = useState<boolean>(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const botonAbrirModalRef = useRef<HTMLButtonElement | null>(null);

  const cerrarModalCancelar = useCallback(() => {
    setMostrarModalCancelar(false);
    setTimeout(() => {
      botonAbrirModalRef.current?.focus();
    }, 0);
  }, []);

  useTituloDocumento(documento ? `Panel · ${documento.folio}` : 'Panel · Detalle de documento');

  const cargarDetalle = useCallback(async () => {
    if (!id) return;
    setCargando(true);
    setErrorCarga(null);

    try {
      const [docData, bitacoraData] = await Promise.all([
        obtenerDocumento(id),
        obtenerBitacora(id)
      ]);
      setDocumento(docData);
      setBitacora(bitacoraData);
    } catch {
      setErrorCarga('No se encontró el documento solicitado o no tiene permiso para consultarlo.');
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => {
    void cargarDetalle();
  }, [cargarDetalle]);

  const manejarDescargarPdf = async () => {
    if (!documento?.pdf_path) return;
    setDescargandoPdf(true);
    setErrorDescarga(null);

    try {
      const signedUrl = await urlDescargaPdf(documento.pdf_path);
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
    } catch {
      setErrorDescarga('No fue posible generar el enlace de descarga del PDF.');
    } finally {
      setDescargandoPdf(false);
    }
  };

  const copiarHash = async () => {
    if (!documento?.pdf_sha256) return;
    try {
      await navigator.clipboard.writeText(documento.pdf_sha256);
      setHashCopiado(true);
      setTimeout(() => setHashCopiado(false), 2500);
    } catch {
      // Fallback silencioso
    }
  };

  const tipoObj = documento
    ? Array.isArray(documento.tipos_documento)
      ? documento.tipos_documento[0]
      : documento.tipos_documento
    : null;
  const esquemaCampos: DefinicionCampo[] = tipoObj?.campos || [];

  return (
    <LayoutPanel>
      <div className="breadcrumb-row">
        <Link to="/panel" className="back-link-inline">
          <svg
            className="back-arrow-icon"
            viewBox="0 0 20 20"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12.5 15 7.5 10l5-5" />
          </svg>
          <span>Volver a documentos emitidos</span>
        </Link>
      </div>

      {cargando && mostrarEsqueleto && (
        <div className="card" role="status" aria-live="polite">
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-row" />
          <div className="skeleton skeleton-row" />
          <p className="sr-only">Cargando detalle del documento…</p>
        </div>
      )}

      {!cargando && errorCarga && (
        <div className="card alert alert-error" role="alert">
          <h1 className="section-title">No se pudo cargar el documento</h1>
          <p>{errorCarga}</p>
          <div className="mt-md">
            <Link to="/panel" className="btn btn-secondary">
              Regresar al listado
            </Link>
          </div>
        </div>
      )}

      {!cargando && documento && (
        <>
          <div className="panel-header-row">
            <div>
              <div className="detail-header-badges">
                <EtiquetaEstado estado={resolverEstadoIndicador(documento)} />
                {tipoObj && <span className="tipo-clave-chip mono-text">{tipoObj.clave}</span>}
              </div>
              <h1 className="panel-page-title mono-text">{documento.folio}</h1>
              <p className="panel-page-subtitle">
                Destinatario: <strong>{documento.destinatario}</strong>
              </p>
            </div>

            <div className="header-actions">
              {documento.pdf_path && (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={descargandoPdf}
                  onClick={manejarDescargarPdf}
                >
                  {descargandoPdf ? 'Generando enlace…' : 'Descargar PDF'}
                </button>
              )}

              {esAdmin && documento.estado === 'vigente' && (
                <button
                  ref={botonAbrirModalRef}
                  type="button"
                  className="btn btn-danger"
                  onClick={() => setMostrarModalCancelar(true)}
                >
                  Cancelar documento
                </button>
              )}
            </div>
          </div>

          {mensajeExito && (
            <div className="alert alert-success" role="status" aria-live="polite">
              {mensajeExito}
            </div>
          )}

          {errorDescarga && (
            <div className="alert alert-error" role="alert">
              {errorDescarga}
            </div>
          )}

          <div className="card">
            <h2 className="section-title">Datos generales</h2>
            <dl className="renglones-panel-grid">
              <div className="renglon-panel-fila">
                <dt className="renglon-panel-dt">Tipo de documento</dt>
                <dd className="renglon-panel-dd">
                  {tipoObj ? `${tipoObj.nombre} (${tipoObj.clave})` : `Tipo #${documento.tipo_id}`}
                </dd>
              </div>
              <div className="renglon-panel-fila">
                <dt className="renglon-panel-dt">Fecha de emisión</dt>
                <dd className="renglon-panel-dd">{formatearFechaHora(documento.emitido_en)}</dd>
              </div>
              <div className="renglon-panel-fila">
                <dt className="renglon-panel-dt">Vigencia</dt>
                <dd className="renglon-panel-dd">
                  {documento.vigente_hasta
                    ? formatearFecha(documento.vigente_hasta)
                    : 'Sin vencimiento'}
                </dd>
              </div>
              <div className="renglon-panel-fila">
                <dt className="renglon-panel-dt">Confirmado en almacenamiento</dt>
                <dd className="renglon-panel-dd">
                  {documento.confirmado_en
                    ? formatearFechaHora(documento.confirmado_en)
                    : 'Pendiente'}
                </dd>
              </div>
              {documento.pdf_sha256 && (
                <div className="renglon-panel-fila">
                  <dt className="renglon-panel-dt">Huella digital PDF (SHA-256)</dt>
                  <dd className="renglon-panel-dd sha-inline-row">
                    <code className="mono-text" title={documento.pdf_sha256}>
                      {abreviarSha256(documento.pdf_sha256)}
                    </code>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={copiarHash}
                      aria-label="Copiar huella digital SHA-256 completa"
                    >
                      {hashCopiado ? 'Copiado' : 'Copiar'}
                    </button>
                  </dd>
                </div>
              )}
            </dl>

            {documento.estado === 'cancelado' && (
              <div className="cancel-reason-box mt-md">
                <h3 className="subsection-title">Información de cancelación</h3>
                <p>
                  <strong>Cancelado el:</strong>{' '}
                  {documento.cancelado_en ? (
                    formatearFechaHora(documento.cancelado_en)
                  ) : (
                    <span className="text-muted">No capturado</span>
                  )}
                </p>
                <p>
                  <strong>Motivo:</strong>{' '}
                  {documento.motivo_cancelacion || <span className="text-muted">No capturado</span>}
                </p>
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="section-title">Campos del documento</h2>
            <p className="section-helper">
              Incluye tanto los campos públicos como los de uso interno.
            </p>
            {esquemaCampos.length === 0 && Object.keys(documento.datos || {}).length === 0 ? (
              <p className="text-muted">Este documento no contiene campos adicionales.</p>
            ) : (
              <dl className="renglones-panel-grid">
                {(esquemaCampos.length > 0
                  ? esquemaCampos.map((def) => ({
                      clave: def.clave,
                      etiqueta: def.etiqueta,
                      tipo: def.tipo,
                      publico: def.publico,
                      valor: documento.datos?.[def.clave]
                    }))
                  : Object.entries(documento.datos || {}).map(([clave, valor]) => ({
                      clave,
                      etiqueta: clave,
                      tipo: undefined,
                      publico: false,
                      valor
                    }))
                ).map((item) => {
                  const valorFormateado = formatearValorCampo(item.valor, item.tipo);
                  return (
                    <div key={item.clave} className="renglon-panel-fila">
                      <dt className="renglon-panel-dt">
                        {item.etiqueta}{' '}
                        <span
                          className={`visibility-tag ${
                            item.publico ? 'visibility-public' : 'visibility-private'
                          }`}
                        >
                          {item.publico ? 'Público' : 'Interno'}
                        </span>
                      </dt>
                      <dd className="renglon-panel-dd">
                        {valorFormateado !== null ? (
                          valorFormateado
                        ) : (
                          <span className="text-muted">No capturado</span>
                        )}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            )}
          </div>

          <BitacoraDocumento bitacora={bitacora} />

          {mostrarModalCancelar && (
            <ModalCancelarDocumento
              documento={documento}
              onCerrar={cerrarModalCancelar}
              onCancelado={async () => {
                setMostrarModalCancelar(false);
                setMensajeExito(
                  `El documento ${documento.folio} ha sido cancelado correctamente.`
                );
                await cargarDetalle();
              }}
            />
          )}
        </>
      )}
    </LayoutPanel>
  );
}
