import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LayoutPanel } from '../components/LayoutPanel';
import { EstadoVisualLed, LedEstado } from '../components/LedEstado';
import { useAuth } from '../context/AuthContext';
import {
  abreviarSha256,
  esFechaVencida,
  esPorVencer30Dias,
  formatearFechaCorta,
  formatearFechaHoraMX
} from '../lib/formato';
import { supabase } from '../lib/supabase';
import { CampoEsquema, DocumentoPanel, RegistroBitacora } from '../lib/tipos';
import { useCargaDiferida, useTituloDocumento } from '../lib/useCargaDiferida';

function resolverEstadoLed(doc: DocumentoPanel): EstadoVisualLed {
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
    case 'cancelado':
      return `Cancelado por ${actor}${area}`;
    case 'reserva_folio':
      return `Reserva de folio por ${actor}${area}`;
    default:
      return `${reg.accion} por ${actor}${area}`;
  }
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
  const [errorMotivo, setErrorMotivo] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState<boolean>(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const botonAbrirModalRef = useRef<HTMLButtonElement | null>(null);
  const modalCardRef = useRef<HTMLDivElement | null>(null);
  const textareaMotivoRef = useRef<HTMLTextAreaElement | null>(null);

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
          'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
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

    const motivoLimpio = motivoCancelacion.trim();
    if (motivoLimpio.length < 5) {
      setErrorMotivo('Indique el motivo de la cancelación (mínimo 5 caracteres).');
      return;
    }

    if (!confirmacionCheck) {
      setErrorMotivo('Debe marcar la casilla de confirmación para cancelar el documento.');
      return;
    }

    setCancelando(true);
    setErrorMotivo(null);

    try {
      const { error } = await supabase.rpc('cancelar_documento', {
        p_documento_id: documento.id,
        p_motivo: motivoLimpio
      });

      if (error) {
        setErrorMotivo(error.message || 'No fue posible cancelar el documento.');
        return;
      }

      setMostrarModalCancelar(false);
      setMotivoCancelacion('');
      setConfirmacionCheck(false);
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
                <LedEstado estado={resolverEstadoLed(documento)} />
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
                    setErrorMotivo(null);
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

          {/* F5: Datos generales sin repetir Folio, Estado ni UUID interno */}
          <div className="card">
            <h2 className="section-title">Datos generales</h2>
            <dl className="data-grid">
              <div className="data-item">
                <dt className="data-term">Tipo de documento</dt>
                <dd className="data-desc">
                  {tipoObj ? `${tipoObj.nombre} (${tipoObj.clave})` : `Tipo #${documento.tipo_id}`}
                </dd>
              </div>
              <div className="data-item">
                <dt className="data-term">Fecha de emisión</dt>
                <dd className="data-desc">{formatearFechaHoraMX(documento.emitido_en)}</dd>
              </div>
              <div className="data-item">
                <dt className="data-term">Vigencia</dt>
                <dd className="data-desc">
                  {documento.vigente_hasta
                    ? formatearFechaCorta(documento.vigente_hasta)
                    : 'Sin vencimiento'}
                </dd>
              </div>
              <div className="data-item">
                <dt className="data-term">Confirmado en almacenamiento</dt>
                <dd className="data-desc">
                  {documento.confirmado_en
                    ? formatearFechaHoraMX(documento.confirmado_en)
                    : 'Pendiente'}
                </dd>
              </div>
              {documento.pdf_sha256 && (
                <div className="data-item">
                  <dt className="data-term">Huella digital PDF (SHA-256)</dt>
                  <dd className="data-desc sha-inline-row">
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
                  {documento.cancelado_en ? formatearFechaHoraMX(documento.cancelado_en) : '—'}
                </p>
                <p>
                  <strong>Motivo:</strong> {documento.motivo_cancelacion || 'No especificado'}
                </p>
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="section-title">Campos del documento</h2>
            <p className="section-helper">
              Incluye tanto los campos públicos como los de uso interno.
            </p>
            {Object.keys(documento.datos || {}).length === 0 ? (
              <p className="text-muted">Este documento no contiene campos adicionales.</p>
            ) : (
              <dl className="data-grid">
                {Object.entries(documento.datos).map(([clave, valor]) => {
                  const def = esquemaCampos.find((c) => c.clave === clave);
                  const etiqueta = def?.etiqueta || clave;
                  const esPublico = def ? def.publico : false;
                  return (
                    <div key={clave} className="data-item">
                      <dt className="data-term">
                        {etiqueta}{' '}
                        <span
                          className={`visibility-tag ${esPublico ? 'visibility-public' : 'visibility-private'}`}
                        >
                          {esPublico ? 'Público' : 'Interno'}
                        </span>
                      </dt>
                      <dd className="data-desc">{String(valor ?? '—')}</dd>
                    </div>
                  );
                })}
              </dl>
            )}
          </div>

          {/* F5: Bitácora con nombre y área del actor mediante bitacora_documento */}
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
                    {reg.detalle && Object.keys(reg.detalle).length > 0 && (
                      <p className="audit-detail">
                        {Object.entries(reg.detalle)
                          .map(([k, v]) => `${k}: ${String(v)}`)
                          .join(' · ')}
                      </p>
                    )}
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
                  Cancelar documento {documento.folio}
                </h2>
                <p className="text-muted">
                  Esta acción es irreversible. Al cancelar el documento, cualquier persona que
                  escanee su código QR verá el estado <strong>DOCUMENTO CANCELADO</strong>.
                </p>

                <form onSubmit={manejarConfirmarCancelacion} className="form-stack mt-md" noValidate>
                  <div className="form-group">
                    <label htmlFor="motivo-cancelacion" className="form-label">
                      Motivo de la cancelación (mínimo 5 caracteres) *
                    </label>
                    <textarea
                      ref={textareaMotivoRef}
                      id="motivo-cancelacion"
                      rows={3}
                      className={`form-textarea ${errorMotivo ? 'form-input-invalid' : ''}`}
                      placeholder="Ej. Error en el nombre del destinatario; sustituido por nuevo folio."
                      value={motivoCancelacion}
                      onChange={(e) => setMotivoCancelacion(e.target.value)}
                      required
                    />
                    {errorMotivo && (
                      <span className="field-error-text" role="alert">
                        {errorMotivo}
                      </span>
                    )}
                  </div>

                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={confirmacionCheck}
                      onChange={(e) => setConfirmacionCheck(e.target.checked)}
                    />
                    <span>
                      Confirmo que deseo cancelar definitivamente el documento{' '}
                      <strong>{documento.folio}</strong>.
                    </span>
                  </label>

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
