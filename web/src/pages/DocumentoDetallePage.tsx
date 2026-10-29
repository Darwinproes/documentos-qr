import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EstadoIndicador, EtiquetaEstado } from '../components/EtiquetaEstado';
import { LayoutPanel } from '../components/LayoutPanel';
import { useAuth } from '../context/AuthContext';
import {
  abreviarSha256,
  esFechaVencida,
  esPorVencer30Dias,
  formatearFechaCorta,
  formatearFechaHoraMX,
  formatearValorCampo
} from '../lib/formato';
import { supabase } from '../lib/supabase';
import { CampoEsquema, DocumentoPanel, RegistroBitacora } from '../lib/tipos';
import { useCargaDiferida, useTituloDocumento } from '../lib/useCargaDiferida';

function resolverEstadoIndicador(doc: DocumentoPanel): EstadoIndicador {
  if (doc.estado === 'cancelado') return 'cancelado';
  if (doc.estado === 'pendiente') return 'pendiente';
  if (doc.vigente_hasta && esFechaVencida(doc.vigente_hasta)) return 'vencido';
  if (doc.vigente_hasta && esPorVencer30Dias(doc.vigente_hasta)) return 'por_vencer';
  return 'vigente';
}

function etiquetaAccionBitacora(reg: RegistroBitacora): string {
  const actor = reg.actor_nombre || 'Usuario interno';
  const area = reg.actor_area ? ` (${reg.actor_area})` : '';
  switch (reg.accion) {
    case 'emitido':
      return `Emitido por ${actor}${area}`;
    case 'pdf_generado':
      return `PDF generado por ${actor}${area}`;
    case 'cancelado':
      return `Cancelado por ${actor}${area}`;
    case 'reserva_folio':
      return `Reserva de folio por ${actor}${area}`;
    default:
      return `${reg.accion} por ${actor}${area}`;
  }
}

function renderizarDetalleBitacora(detalle: Record<string, unknown>): React.ReactNode {
  const entradas = Object.entries(detalle || {}).filter(
    ([, v]) => v !== null && v !== undefined && String(v).trim() !== ''
  );
  if (entradas.length === 0) return null;

  return (
    <p className="audit-detail">
      {entradas.map(([clave, valor], idx) => {
        const separador = idx > 0 ? <span aria-hidden="true"> · </span> : null;
        if (clave === 'folio') {
          return (
            <React.Fragment key={clave}>
              {separador}
              <span>
                Folio <strong className="mono-text audit-folio-inline">{String(valor)}</strong>
              </span>
            </React.Fragment>
          );
        }
        if (clave === 'motivo') {
          return (
            <React.Fragment key={clave}>
              {separador}
              <span>Motivo: {String(valor)}</span>
            </React.Fragment>
          );
        }
        if (clave === 'pdf_sha256') {
          return (
            <React.Fragment key={clave}>
              {separador}
              <span>
                Huella PDF: <span className="mono-text">{abreviarSha256(String(valor))}</span>
              </span>
            </React.Fragment>
          );
        }
        if (clave === 'pdf_path') {
          return (
            <React.Fragment key={clave}>
              {separador}
              <span>Archivo registrado en almacenamiento</span>
            </React.Fragment>
          );
        }
        const etiquetaLimpia =
          clave.charAt(0).toUpperCase() + clave.slice(1).replace(/_/g, ' ');
        const valorFormateado = formatearValorCampo(valor) ?? String(valor);
        return (
          <React.Fragment key={clave}>
            {separador}
            <span>
              {etiquetaLimpia}: {valorFormateado}
            </span>
          </React.Fragment>
        );
      })}
    </p>
  );
}

interface ErroresModalCancelar {
  motivo?: string;
  confirmacion?: string;
}

export function DocumentoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const { perfil } = useAuth();
  const esAdmin = perfil?.rol === 'admin';

  const [documento, setDocumento] = useState<DocumentoPanel | null>(null);
  const [bitacora, setBitacora] = useState<RegistroBitacora[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const mostrarEsqueleto = useCargaDiferida(cargando, 200);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [descargandoPdf, setDescargandoPdf] = useState<boolean>(false);
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null);
  const [hashCopiado, setHashCopiado] = useState<boolean>(false);

  const [mostrarModalCancelar, setMostrarModalCancelar] = useState<boolean>(false);
  const [motivoCancelacion, setMotivoCancelacion] = useState<string>('');
  const [confirmacionCheck, setConfirmacionCheck] = useState<boolean>(false);
  const [erroresModal, setErroresModal] = useState<ErroresModalCancelar>({});
  const [errorServidorModal, setErrorServidorModal] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState<boolean>(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const botonAbrirModalRef = useRef<HTMLButtonElement | null>(null);
  const modalCardRef = useRef<HTMLDivElement | null>(null);
  const textareaMotivoRef = useRef<HTMLTextAreaElement | null>(null);
  const resumenModalRef = useRef<HTMLDivElement | null>(null);

  const cerrarModalCancelar = useCallback(() => {
    setMostrarModalCancelar(false);
    setTimeout(() => {
      botonAbrirModalRef.current?.focus();
    }, 0);
  }, []);

  useEffect(() => {
    if (!mostrarModalCancelar) return;

    const timer = window.setTimeout(() => {
      textareaMotivoRef.current?.focus();
    }, 10);

    const manejarKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !cancelando) {
        e.preventDefault();
        cerrarModalCancelar();
        return;
      }

      if (e.key === 'Tab' && modalCardRef.current) {
        const focusables = modalCardRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const primero = focusables[0];
        const ultimo = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === primero) {
          e.preventDefault();
          ultimo.focus();
        } else if (!e.shiftKey && document.activeElement === ultimo) {
          e.preventDefault();
          primero.focus();
        }
      }
    };

    document.addEventListener('keydown', manejarKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', manejarKeyDown);
    };
  }, [mostrarModalCancelar, cancelando, cerrarModalCancelar]);

  useTituloDocumento(documento ? `Panel · ${documento.folio}` : 'Panel · Detalle de documento');

  const cargarDetalle = useCallback(async () => {
    if (!id) return;
    setCargando(true);
    setErrorCarga(null);

    try {
      const [docRes, bitacoraRes] = await Promise.all([
        supabase
          .from('documentos')
          .select(
            'id,tipo_id,folio,estado,destinatario,emitido_por,emitido_en,vigente_hasta,datos,pdf_path,pdf_sha256,confirmado_en,cancelado_por,cancelado_en,motivo_cancelacion,tipos_documento(clave,nombre,campos)'
          )
          .eq('id', id)
          .single(),
        supabase.rpc('bitacora_documento', { p_documento_id: id })
      ]);

      if (docRes.error || !docRes.data) {
        setErrorCarga('No se encontró el documento solicitado o no tiene permiso para consultarlo.');
        return;
      }

      setDocumento(docRes.data as unknown as DocumentoPanel);

      if (Array.isArray(bitacoraRes.data)) {
        setBitacora(bitacoraRes.data as RegistroBitacora[]);
      }
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
      const { data, error } = await supabase.storage
        .from('documentos')
        .createSignedUrl(documento.pdf_path, 300);

      if (error || !data?.signedUrl) {
        setErrorDescarga('No fue posible generar el enlace de descarga del PDF.');
        return;
      }

      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
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

  const manejarConfirmarCancelacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documento) return;

    setErrorServidorModal(null);
    const motivoLimpio = motivoCancelacion.trim();
    const nuevosErrores: ErroresModalCancelar = {};

    if (motivoLimpio.length < 5) {
      nuevosErrores.motivo = 'Indique el motivo de la cancelación (mínimo 5 caracteres).';
    }

    if (!confirmacionCheck) {
      nuevosErrores.confirmacion =
        'Debe marcar la casilla de confirmación para cancelar el documento.';
    }

    setErroresModal(nuevosErrores);

    if (nuevosErrores.motivo || nuevosErrores.confirmacion) {
      setTimeout(() => {
        resumenModalRef.current?.focus();
      }, 0);
      return;
    }

    setCancelando(true);

    try {
      const { error } = await supabase.rpc('cancelar_documento', {
        p_documento_id: documento.id,
        p_motivo: motivoLimpio
      });

      if (error) {
        setErrorServidorModal(error.message || 'No fue posible cancelar el documento.');
        setTimeout(() => {
          resumenModalRef.current?.focus();
        }, 0);
        return;
      }

      setMostrarModalCancelar(false);
      setMotivoCancelacion('');
      setConfirmacionCheck(false);
      setErroresModal({});
      setMensajeExito(`El documento ${documento.folio} ha sido cancelado correctamente.`);
      await cargarDetalle();
    } finally {
      setCancelando(false);
    }
  };

  const tipoObj = documento
    ? Array.isArray(documento.tipos_documento)
      ? documento.tipos_documento[0]
      : documento.tipos_documento
    : null;
  const esquemaCampos: CampoEsquema[] = tipoObj?.campos || [];

  const listaErroresModal: { id: string; texto: string }[] = [];
  if (erroresModal.motivo) {
    listaErroresModal.push({ id: 'motivo-cancelacion', texto: erroresModal.motivo });
  }
  if (erroresModal.confirmacion) {
    listaErroresModal.push({
      id: 'check-confirmar-cancelacion',
      texto: erroresModal.confirmacion
    });
  }

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
                  onClick={() => {
                    setErroresModal({});
                    setErrorServidorModal(null);
                    setMotivoCancelacion('');
                    setConfirmacionCheck(false);
                    setMostrarModalCancelar(true);
                  }}
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

          {/* G9: Datos generales en renglones etiqueta/valor (2 columnas en escritorio, 1 en celular) */}
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
                <dd className="renglon-panel-dd">{formatearFechaHoraMX(documento.emitido_en)}</dd>
              </div>
              <div className="renglon-panel-fila">
                <dt className="renglon-panel-dt">Vigencia</dt>
                <dd className="renglon-panel-dd">
                  {documento.vigente_hasta
                    ? formatearFechaCorta(documento.vigente_hasta)
                    : 'Sin vencimiento'}
                </dd>
              </div>
              <div className="renglon-panel-fila">
                <dt className="renglon-panel-dt">Confirmado en almacenamiento</dt>
                <dd className="renglon-panel-dd">
                  {documento.confirmado_en
                    ? formatearFechaHoraMX(documento.confirmado_en)
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
                  {documento.cancelado_en ? formatearFechaHoraMX(documento.cancelado_en) : <span className="text-muted">No capturado</span>}
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

          {/* G9: Bitácora legible con nombres, fechas dd/mm/aaaa hh:mm y folio en Source Code Pro */}
          <div className="card">
            <h2 className="section-title">Bitácora de auditoría</h2>
            {bitacora.length === 0 ? (
              <p className="text-muted">Sin eventos registrados en bitácora.</p>
            ) : (
              <ul className="audit-timeline">
                {bitacora.map((reg) => (
                  <li key={reg.id} className="audit-item">
                    <div className="audit-item-head">
                      <strong>{etiquetaAccionBitacora(reg)}</strong>
                      <span className="audit-date">{formatearFechaHoraMX(reg.creado_en)}</span>
                    </div>
                    {reg.detalle && renderizarDetalleBitacora(reg.detalle)}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {mostrarModalCancelar && (
            <div
              className="modal-backdrop"
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-cancelar-titulo"
            >
              <div ref={modalCardRef} className="card modal-card">
                <h2 id="modal-cancelar-titulo" className="section-title">
                  Cancelar documento <span className="mono-text">{documento.folio}</span>
                </h2>
                <p className="text-muted">
                  Esta acción es irreversible. Al cancelar el documento, cualquier persona que
                  escanee su código QR verá el estado <strong>Documento cancelado</strong>.
                </p>

                {(errorServidorModal || listaErroresModal.length > 0) && (
                  <div
                    ref={resumenModalRef}
                    className="alert alert-error error-summary mt-md"
                    role="alert"
                    tabIndex={-1}
                  >
                    {errorServidorModal ? (
                      <p className="error-summary-title">{errorServidorModal}</p>
                    ) : (
                      <p className="error-summary-title">Revise los siguientes campos:</p>
                    )}
                    {listaErroresModal.length > 0 && (
                      <ul className="error-summary-list">
                        {listaErroresModal.map((item) => (
                          <li key={item.id}>
                            <a
                              href={`#${item.id}`}
                              onClick={(ev) => {
                                ev.preventDefault();
                                document.getElementById(item.id)?.focus();
                              }}
                            >
                              {item.texto}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                <form onSubmit={manejarConfirmarCancelacion} className="form-stack mt-md" noValidate>
                  <div className="form-group">
                    <label htmlFor="motivo-cancelacion" className="form-label">
                      Motivo de la cancelación (mínimo 5 caracteres) *
                    </label>
                    <textarea
                      ref={textareaMotivoRef}
                      id="motivo-cancelacion"
                      rows={3}
                      className={`form-textarea ${erroresModal.motivo ? 'form-input-invalid' : ''}`}
                      placeholder="Ej. Error en el nombre del destinatario; sustituido por nuevo folio."
                      value={motivoCancelacion}
                      aria-invalid={Boolean(erroresModal.motivo)}
                      aria-describedby={erroresModal.motivo ? 'error-motivo-cancelacion' : undefined}
                      onChange={(e) => {
                        setMotivoCancelacion(e.target.value);
                        if (erroresModal.motivo) {
                          setErroresModal((prev) => ({ ...prev, motivo: undefined }));
                        }
                      }}
                      required
                    />
                    {erroresModal.motivo && (
                      <span
                        id="error-motivo-cancelacion"
                        className="field-error-text"
                        role="alert"
                      >
                        {erroresModal.motivo}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="checkbox-row" htmlFor="check-confirmar-cancelacion">
                      <input
                        id="check-confirmar-cancelacion"
                        type="checkbox"
                        checked={confirmacionCheck}
                        aria-invalid={Boolean(erroresModal.confirmacion)}
                        aria-describedby={
                          erroresModal.confirmacion ? 'error-check-cancelacion' : undefined
                        }
                        onChange={(e) => {
                          setConfirmacionCheck(e.target.checked);
                          if (erroresModal.confirmacion) {
                            setErroresModal((prev) => ({ ...prev, confirmacion: undefined }));
                          }
                        }}
                      />
                      <span>
                        Confirmo que deseo cancelar definitivamente el documento{' '}
                        <strong className="mono-text">{documento.folio}</strong>.
                      </span>
                    </label>
                    {erroresModal.confirmacion && (
                      <span
                        id="error-check-cancelacion"
                        className="field-error-text"
                        role="alert"
                      >
                        {erroresModal.confirmacion}
                      </span>
                    )}
                  </div>

                  <div className="modal-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={cancelando}
                      onClick={cerrarModalCancelar}
                    >
                      Volver sin cancelar
                    </button>
                    <button type="submit" className="btn btn-danger" disabled={cancelando}>
                      {cancelando ? 'Cancelando…' : 'Confirmar cancelación'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </LayoutPanel>
  );
}
