import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LayoutPanel } from '../components/LayoutPanel';
import { useAuth } from '../context/AuthContext';
import {
  calcularEstadoVisual,
  formatearFecha,
  formatearFechaHora
} from '../lib/formato';
import { supabase } from '../lib/supabase';
import {
  DefinicionCampo,
  DocumentoDetalle,
  EstadoVisualDocumento,
  RegistroBitacora,
  RegistroVerificacion
} from '../lib/tipos';

const ETIQUETA_ESTADO: Record<EstadoVisualDocumento, string> = {
  vigente: 'Vigente',
  vencido: 'Vencido',
  cancelado: 'Cancelado',
  pendiente: 'Pendiente'
};

const ETIQUETA_ACCION_BITACORA: Record<string, string> = {
  emitido: 'Documento registrado (folio reservado)',
  pdf_generado: 'PDF generado y firmado con código QR',
  cancelado: 'Documento cancelado'
};

interface DocumentoDetalleConCampos extends Omit<DocumentoDetalle, 'tipos_documento'> {
  tipos_documento:
    | { clave: string; nombre: string; campos?: DefinicionCampo[] }
    | { clave: string; nombre: string; campos?: DefinicionCampo[] }[]
    | null;
}

export function DocumentoDetallePage() {
  const { id = '' } = useParams<{ id: string }>();
  const { perfil } = useAuth();

  const [documento, setDocumento] = useState<DocumentoDetalleConCampos | null>(null);
  const [bitacora, setBitacora] = useState<RegistroBitacora[]>([]);
  const [verificaciones, setVerificaciones] = useState<RegistroVerificacion[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [descargandoPdf, setDescargandoPdf] = useState<boolean>(false);
  const [errorPdf, setErrorPdf] = useState<string | null>(null);

  // Modal de cancelación (solo admin)
  const [modalCancelarAbierto, setModalCancelarAbierto] = useState<boolean>(false);
  const [motivoCancelacion, setMotivoCancelacion] = useState<string>('');
  const [confirmacionCheck, setConfirmacionCheck] = useState<boolean>(false);
  const [cancelando, setCancelando] = useState<boolean>(false);
  const [errorCancelacion, setErrorCancelacion] = useState<string | null>(null);

  const cargarTodo = useCallback(async () => {
    if (!id) return;
    setCargando(true);
    setError(null);

    const { data: docData, error: docErr } = await supabase
      .from('documentos')
      .select(
        'id,folio,estado,destinatario,emitido_en,vigente_hasta,tipo_id,tipos_documento(clave,nombre,campos),datos,pdf_path,pdf_sha256,confirmado_en,emitido_por,cancelado_por,cancelado_en,motivo_cancelacion'
      )
      .eq('id', id)
      .single();

    if (docErr || !docData) {
      setError('No se encontró el documento solicitado o no tiene permiso para consultarlo.');
      setDocumento(null);
      setCargando(false);
      return;
    }

    setDocumento(docData as DocumentoDetalleConCampos);

    const { data: bitData } = await supabase
      .from('bitacora')
      .select('*')
      .eq('documento_id', id)
      .order('creado_en');

    setBitacora((bitData || []) as RegistroBitacora[]);

    if (perfil?.rol === 'admin') {
      const { data: verifData } = await supabase
        .from('verificaciones')
        .select('id,metodo,resultado,creado_en')
        .eq('documento_id', id)
        .order('creado_en', { ascending: false });

      setVerificaciones((verifData || []) as RegistroVerificacion[]);
    }

    setCargando(false);
  }, [id, perfil?.rol]);

  useEffect(() => {
    void cargarTodo();
  }, [cargarTodo]);

  const manejarDescargarPdf = async () => {
    if (!documento?.pdf_path) return;
    setDescargandoPdf(true);
    setErrorPdf(null);

    const { data, error: errSign } = await supabase.storage
      .from('documentos')
      .createSignedUrl(documento.pdf_path, 600);

    setDescargandoPdf(false);

    if (errSign || !data?.signedUrl) {
      setErrorPdf('No se pudo generar el enlace de descarga del PDF.');
      return;
    }

    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const manejarConfirmarCancelacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documento) return;
    setErrorCancelacion(null);

    const motivoLimpio = motivoCancelacion.trim();
    if (motivoLimpio.length < 5) {
      setErrorCancelacion('Indique el motivo de la cancelación (mínimo 5 caracteres).');
      return;
    }

    if (!confirmacionCheck) {
      setErrorCancelacion('Debe marcar la casilla de confirmación para cancelar el documento.');
      return;
    }

    setCancelando(true);
    const { error: errRpc } = await supabase.rpc('cancelar_documento', {
      p_documento_id: documento.id,
      p_motivo: motivoLimpio
    });
    setCancelando(false);

    if (errRpc) {
      setErrorCancelacion(errRpc.message || 'No se pudo cancelar el documento.');
      return;
    }

    setModalCancelarAbierto(false);
    setMotivoCancelacion('');
    setConfirmacionCheck(false);
    await cargarTodo();
  };

  if (cargando) {
    return (
      <LayoutPanel>
        <div className="card state-card" role="status" aria-live="polite">
          <div className="spinner" aria-hidden="true" />
          <p className="state-text">Cargando detalle del documento…</p>
        </div>
      </LayoutPanel>
    );
  }

  if (error || !documento) {
    return (
      <LayoutPanel>
        <div className="card state-card" role="alert">
          <h1 className="state-heading">Documento no disponible</h1>
          <p className="state-description">{error}</p>
          <div className="state-actions">
            <Link to="/panel" className="btn btn-primary">
              ← Volver a la lista
            </Link>
          </div>
        </div>
      </LayoutPanel>
    );
  }

  const estadoVisual = calcularEstadoVisual(documento.estado, documento.vigente_hasta);
  const infoTipo = Array.isArray(documento.tipos_documento)
    ? documento.tipos_documento[0]
    : documento.tipos_documento;
  const definicionesCampos: DefinicionCampo[] = infoTipo?.campos || [];

  return (
    <LayoutPanel>
      <div className="breadcrumb-row">
        <Link to="/panel" className="link-subtle">
          ← Volver a documentos emitidos
        </Link>
      </div>

      <div className="panel-header-row">
        <div>
          <div className="folio-heading-group">
            <h1 className="page-title mono-text">{documento.folio}</h1>
            <span className={`badge badge-estado-${estadoVisual}`}>
              {ETIQUETA_ESTADO[estadoVisual]}
            </span>
          </div>
          <p className="page-subtitle">
            {infoTipo ? `${infoTipo.clave} — ${infoTipo.nombre}` : 'Documento oficial'}
          </p>
        </div>

        <div className="header-actions-group">
          {documento.pdf_path && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={manejarDescargarPdf}
              disabled={descargandoPdf}
            >
              {descargandoPdf ? 'Generando enlace…' : 'Descargar PDF'}
            </button>
          )}

          {perfil?.rol === 'admin' && documento.estado === 'vigente' && (
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                setErrorCancelacion(null);
                setMotivoCancelacion('');
                setConfirmacionCheck(false);
                setModalCancelarAbierto(true);
              }}
            >
              Cancelar documento
            </button>
          )}
        </div>
      </div>

      {errorPdf && (
        <div className="alert alert-error" role="alert">
          {errorPdf}
        </div>
      )}

      <div className="detail-grid-layout">
        <section className="card">
          <h2 className="section-title">Datos generales</h2>
          <dl className="details-grid">
            <div className="details-item">
              <dt>Folio</dt>
              <dd className="mono-text">{documento.folio}</dd>
            </div>
            <div className="details-item">
              <dt>Estado en registro</dt>
              <dd>{ETIQUETA_ESTADO[estadoVisual]}</dd>
            </div>
            <div className="details-item details-item-wide">
              <dt>Destinatario</dt>
              <dd className="destinatario-highlight">{documento.destinatario}</dd>
            </div>
            <div className="details-item">
              <dt>Fecha de emisión</dt>
              <dd>{formatearFechaHora(documento.emitido_en)}</dd>
            </div>
            <div className="details-item">
              <dt>Confirmación de PDF</dt>
              <dd>{formatearFechaHora(documento.confirmado_en)}</dd>
            </div>
            <div className="details-item">
              <dt>Vigencia</dt>
              <dd>
                {documento.vigente_hasta
                  ? formatearFecha(documento.vigente_hasta)
                  : 'Sin vencimiento'}
              </dd>
            </div>
            <div className="details-item">
              <dt>ID interno</dt>
              <dd className="mono-text text-small">{documento.id}</dd>
            </div>
            {documento.pdf_sha256 && (
              <div className="details-item details-item-wide">
                <dt>Huella digital SHA-256 del PDF</dt>
                <dd className="mono-text text-small break-all">{documento.pdf_sha256}</dd>
              </div>
            )}
          </dl>

          {documento.estado === 'cancelado' && (
            <div className="cancellation-info-box">
              <h3 className="cancellation-title">Información de cancelación</h3>
              <p>
                <strong>Fecha:</strong> {formatearFechaHora(documento.cancelado_en)}
              </p>
              <p>
                <strong>Motivo:</strong> {documento.motivo_cancelacion || '—'}
              </p>
            </div>
          )}

          <div className="custom-fields-section">
            <h3 className="details-subtitle">Campos capturados del documento</h3>
            {Object.keys(documento.datos || {}).length === 0 ? (
              <p className="text-muted">Sin campos adicionales registrados.</p>
            ) : (
              <dl className="details-grid">
                {Object.entries(documento.datos || {}).map(([clave, valor]) => {
                  const def = definicionesCampos.find((c) => c.clave === clave);
                  const etiqueta = def ? def.etiqueta : clave;
                  const esPublico = def ? def.publico : true;
                  const textoValor =
                    def?.tipo === 'fecha' ? formatearFecha(String(valor)) : String(valor);

                  return (
                    <div key={clave} className="details-item">
                      <dt>
                        {etiqueta}{' '}
                        <span className="badge badge-subtle">
                          {esPublico ? 'Público' : 'Interno'}
                        </span>
                      </dt>
                      <dd>{textoValor}</dd>
                    </div>
                  );
                })}
              </dl>
            )}
          </div>
        </section>

        <section className="card">
          <h2 className="section-title">Bitácora de auditoría</h2>
          {bitacora.length === 0 ? (
            <p className="text-muted">No hay eventos registrados en la bitácora.</p>
          ) : (
            <ol className="timeline-list">
              {bitacora.map((item) => (
                <li key={item.id} className={`timeline-item timeline-${item.accion}`}>
                  <div className="timeline-marker" aria-hidden="true" />
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <strong>{ETIQUETA_ACCION_BITACORA[item.accion] || item.accion}</strong>
                      <span className="timeline-date">{formatearFechaHora(item.creado_en)}</span>
                    </div>
                    {item.actor && (
                      <p className="timeline-actor mono-text">Actor ID: {item.actor}</p>
                    )}
                    {item.detalle && Object.keys(item.detalle).length > 0 && (
                      <div className="timeline-detail">
                        {Boolean(item.detalle.motivo) && (
                          <p>Motivo: {String(item.detalle.motivo)}</p>
                        )}
                        {Boolean(item.detalle.folio) && (
                          <p className="mono-text">Folio: {String(item.detalle.folio)}</p>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {perfil?.rol === 'admin' && (
        <section className="card mt-section">
          <h2 className="section-title">Historial de verificaciones públicas (Solo Administrador)</h2>
          {verificaciones.length === 0 ? (
            <p className="text-muted">
              Este documento aún no ha sido consultado en la página pública de verificación.
            </p>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fecha y hora</th>
                    <th>Método</th>
                    <th>Resultado devuelto</th>
                  </tr>
                </thead>
                <tbody>
                  {verificaciones.map((v) => (
                    <tr key={v.id}>
                      <td>{formatearFechaHora(v.creado_en)}</td>
                      <td className="uppercase-text">{v.metodo}</td>
                      <td>
                        <span className={`badge badge-verif-${v.resultado}`}>{v.resultado}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {modalCancelarAbierto && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-cancelar-titulo"
        >
          <div className="card modal-card">
            <h2 id="modal-cancelar-titulo" className="section-title text-danger">
              Cancelar documento {documento.folio}
            </h2>
            <p className="modal-description">
              Al cancelar este documento, cualquier persona que escanee su código QR o lo consulte
              en la página pública verá el estado <strong>DOCUMENTO CANCELADO</strong> en color
              rojo. Esta acción es irreversible y queda registrada en la bitácora.
            </p>

            {errorCancelacion && (
              <div className="alert alert-error" role="alert">
                {errorCancelacion}
              </div>
            )}

            <form onSubmit={manejarConfirmarCancelacion} className="form-stack">
              <div className="form-group">
                <label htmlFor="motivo-cancelacion" className="form-label">
                  Motivo de la cancelación (mínimo 5 caracteres) *
                </label>
                <textarea
                  id="motivo-cancelacion"
                  className="form-textarea"
                  rows={3}
                  placeholder="Explique la razón de la cancelación (ej. Error en datos del destinatario, baja de personal)…"
                  value={motivoCancelacion}
                  onChange={(e) => setMotivoCancelacion(e.target.value)}
                  required
                  minLength={5}
                />
              </div>

              <label className="checkbox-label">
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
                  onClick={() => setModalCancelarAbierto(false)}
                  disabled={cancelando}
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
    </LayoutPanel>
  );
}
