import React from 'react';
import { hoyLocalIso } from '../../lib/formato';
import { TipoDocumento } from '../../lib/tipos';

export type ModoVigencia = 'segun_tipo' | 'fecha_especifica' | 'sin_vencimiento';

interface PasoDatosProps {
  tipoActual: TipoDocumento;
  destinatario: string;
  onDestinatarioChange: (valor: string) => void;
  datos: Record<string, string>;
  onCampoChange: (clave: string, valor: string) => void;
  modoVigencia: ModoVigencia;
  onModoVigenciaChange: (modo: ModoVigencia) => void;
  fechaEspecifica: string;
  onFechaEspecificaChange: (fecha: string) => void;
  erroresCampo: Record<string, string>;
  resumenErroresRef: React.RefObject<HTMLDivElement>;
  onVolverPaso1: () => void;
  onContinuarConfirmacion: (e: React.FormEvent) => void;
}

export function PasoDatos({
  tipoActual,
  destinatario,
  onDestinatarioChange,
  datos,
  onCampoChange,
  modoVigencia,
  onModoVigenciaChange,
  fechaEspecifica,
  onFechaEspecificaChange,
  erroresCampo,
  resumenErroresRef,
  onVolverPaso1,
  onContinuarConfirmacion
}: PasoDatosProps) {
  const listaErrores = Object.entries(erroresCampo).map(([id, texto]) => ({ id, texto }));

  return (
    <section className="card form-card">
      {listaErrores.length > 0 && (
        <div
          ref={resumenErroresRef}
          className="alert alert-error error-summary"
          role="alert"
          tabIndex={-1}
        >
          <p className="error-summary-title">Revise los siguientes campos obligatorios:</p>
          <ul className="error-summary-list">
            {listaErrores.map((item) => (
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
        </div>
      )}

      <form onSubmit={onContinuarConfirmacion} className="form-stack" noValidate>
        <div className="form-group">
          <label htmlFor="input-destinatario" className="form-label">
            Destinatario (nombre completo o razón social) *
          </label>
          <input
            id="input-destinatario"
            type="text"
            className={`form-input ${
              erroresCampo['input-destinatario'] ? 'form-input-invalid' : ''
            }`}
            placeholder="Ej. Juan Pérez López"
            maxLength={200}
            value={destinatario}
            aria-invalid={Boolean(erroresCampo['input-destinatario'])}
            aria-describedby={
              erroresCampo['input-destinatario']
                ? 'hint-destinatario error-input-destinatario'
                : 'hint-destinatario'
            }
            onChange={(e) => onDestinatarioChange(e.target.value)}
            required
          />
          <span id="hint-destinatario" className="form-hint">
            Aparece en el encabezado de verificación y en el PDF.
          </span>
          {erroresCampo['input-destinatario'] && (
            <span id="error-input-destinatario" className="field-error-text">
              {erroresCampo['input-destinatario']}
            </span>
          )}
        </div>

        {tipoActual.campos && tipoActual.campos.length > 0 && (
          <fieldset className="fields-fieldset">
            <legend className="fieldset-legend">Datos del formato ({tipoActual.nombre})</legend>
            <div className="form-stack">
              {tipoActual.campos.map((campo) => {
                const idInput = `campo-${campo.clave}`;
                const idError = `error-${idInput}`;
                const valorActual = datos[campo.clave] ?? '';
                const msgError = erroresCampo[idInput];

                return (
                  <div key={campo.clave} className="form-group">
                    <label htmlFor={idInput} className="form-label">
                      {campo.etiqueta} {campo.requerido ? '*' : '(opcional)'}{' '}
                      <span className="badge badge-subtle">
                        {campo.publico ? 'Visible al verificar' : 'Solo uso interno'}
                      </span>
                    </label>

                    {campo.tipo === 'texto_largo' ? (
                      <textarea
                        id={idInput}
                        className={`form-textarea ${msgError ? 'form-input-invalid' : ''}`}
                        rows={3}
                        placeholder={`Ej. ${campo.etiqueta}`}
                        value={valorActual}
                        aria-invalid={Boolean(msgError)}
                        aria-describedby={msgError ? idError : undefined}
                        onChange={(e) => onCampoChange(campo.clave, e.target.value)}
                        required={campo.requerido}
                        maxLength={2000}
                      />
                    ) : (
                      <input
                        id={idInput}
                        type={
                          campo.tipo === 'fecha'
                            ? 'date'
                            : campo.tipo === 'numero'
                              ? 'number'
                              : 'text'
                        }
                        className={`form-input ${msgError ? 'form-input-invalid' : ''}`}
                        placeholder={
                          campo.tipo === 'texto'
                            ? `Ej. ${campo.etiqueta}`
                            : campo.tipo === 'numero'
                              ? 'Ej. 8'
                              : undefined
                        }
                        value={valorActual}
                        aria-invalid={Boolean(msgError)}
                        aria-describedby={msgError ? idError : undefined}
                        onChange={(e) => onCampoChange(campo.clave, e.target.value)}
                        required={campo.requerido}
                        maxLength={2000}
                      />
                    )}
                    {msgError && (
                      <span id={idError} className="field-error-text">
                        {msgError}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </fieldset>
        )}

        <fieldset className="fields-fieldset">
          <legend className="fieldset-legend">Vigencia del documento</legend>
          <div className="radio-group">
            <label className="radio-option">
              <input
                type="radio"
                name="modo-vigencia"
                checked={modoVigencia === 'segun_tipo'}
                onChange={() => onModoVigenciaChange('segun_tipo')}
              />
              <span>
                Según el tipo (
                {tipoActual.vigencia_dias
                  ? `${tipoActual.vigencia_dias} días`
                  : 'sin vencimiento por defecto'}
                )
              </span>
            </label>

            <label className="radio-option">
              <input
                type="radio"
                name="modo-vigencia"
                checked={modoVigencia === 'fecha_especifica'}
                onChange={() => onModoVigenciaChange('fecha_especifica')}
              />
              <span>Fecha específica</span>
            </label>

            {modoVigencia === 'fecha_especifica' && (
              <div className="nested-date-input form-group">
                <label htmlFor="input-vigencia-fecha" className="form-label">
                  Vigente hasta *
                </label>
                <input
                  id="input-vigencia-fecha"
                  type="date"
                  className={`form-input ${
                    erroresCampo['input-vigencia-fecha'] ? 'form-input-invalid' : ''
                  }`}
                  min={hoyLocalIso()}
                  value={fechaEspecifica}
                  aria-invalid={Boolean(erroresCampo['input-vigencia-fecha'])}
                  aria-describedby={
                    erroresCampo['input-vigencia-fecha'] ? 'error-vigencia-fecha' : undefined
                  }
                  onChange={(e) => onFechaEspecificaChange(e.target.value)}
                  required
                />
                {erroresCampo['input-vigencia-fecha'] && (
                  <span id="error-vigencia-fecha" className="field-error-text">
                    {erroresCampo['input-vigencia-fecha']}
                  </span>
                )}
              </div>
            )}

            <label className="radio-option">
              <input
                type="radio"
                name="modo-vigencia"
                checked={modoVigencia === 'sin_vencimiento'}
                onChange={() => onModoVigenciaChange('sin_vencimiento')}
              />
              <span>Sin vencimiento</span>
            </label>
          </div>
        </fieldset>

        <div className="form-actions-bar">
          <button type="button" className="btn btn-secondary" onClick={onVolverPaso1}>
            Cambiar tipo
          </button>
          <button type="submit" className="btn btn-primary">
            Revisar y confirmar
          </button>
        </div>
      </form>
    </section>
  );
}
