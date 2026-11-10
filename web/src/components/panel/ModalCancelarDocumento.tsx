import React, { useEffect, useRef, useState } from 'react';
import { cancelarDocumento } from '../../lib/panel';
import { DocumentoDetalle } from '../../lib/tipos';

interface ModalCancelarDocumentoProps {
  documento: DocumentoDetalle;
  onCerrar: () => void;
  onCancelado: () => Promise<void>;
}

interface ErroresModalCancelar {
  motivo?: string;
  confirmacion?: string;
}

export function ModalCancelarDocumento({
  documento,
  onCerrar,
  onCancelado
}: ModalCancelarDocumentoProps) {
  const [motivoCancelacion, setMotivoCancelacion] = useState<string>('');
  const [confirmacionCheck, setConfirmacionCheck] = useState<boolean>(false);
  const [erroresModal, setErroresModal] = useState<ErroresModalCancelar>({});
  const [errorServidorModal, setErrorServidorModal] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState<boolean>(false);

  const modalCardRef = useRef<HTMLDivElement | null>(null);
  const textareaMotivoRef = useRef<HTMLTextAreaElement | null>(null);
  const resumenModalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      textareaMotivoRef.current?.focus();
    }, 10);

    const manejarKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !cancelando) {
        e.preventDefault();
        onCerrar();
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
  }, [cancelando, onCerrar]);

  const manejarConfirmarCancelacion = async (e: React.FormEvent) => {
    e.preventDefault();

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
      await cancelarDocumento(documento.id, motivoLimpio);
      await onCancelado();
    } catch (err) {
      setErrorServidorModal(
        err instanceof Error ? err.message : 'No fue posible cancelar el documento.'
      );
      setTimeout(() => {
        resumenModalRef.current?.focus();
      }, 0);
    } finally {
      setCancelando(false);
    }
  };

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
          Esta acción es irreversible. Al cancelar el documento, cualquier persona que escanee su
          código QR verá el estado <strong>Documento cancelado</strong>.
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
              <span id="error-motivo-cancelacion" className="field-error-text" role="alert">
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
              <span id="error-check-cancelacion" className="field-error-text" role="alert">
                {erroresModal.confirmacion}
              </span>
            )}
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={cancelando}
              onClick={onCerrar}
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
  );
}
