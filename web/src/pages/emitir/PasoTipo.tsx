import React from 'react';
import { Link } from 'react-router-dom';
import { TipoDocumento } from '../../lib/tipos';

interface PasoTipoProps {
  tipos: TipoDocumento[];
  tipoClave: string;
  tipoActual: TipoDocumento | null;
  onCambiarTipo: (nuevaClave: string) => void;
  onAvanzar: (e: React.FormEvent) => void;
}

export function PasoTipo({
  tipos,
  tipoClave,
  tipoActual,
  onCambiarTipo,
  onAvanzar
}: PasoTipoProps) {
  return (
    <section className="card form-card">
      <form onSubmit={onAvanzar} className="form-stack" noValidate>
        <div className="form-group">
          <label htmlFor="select-tipo" className="form-label">
            Seleccione el tipo de documento a emitir *
          </label>
          <select
            id="select-tipo"
            className="form-select"
            value={tipoClave}
            onChange={(e) => onCambiarTipo(e.target.value)}
            required
          >
            {tipos.map((t) => (
              <option key={t.id} value={t.clave}>
                {t.clave} — {t.nombre}
              </option>
            ))}
          </select>
          {tipoActual?.descripcion && <span className="form-hint">{tipoActual.descripcion}</span>}
        </div>

        {tipoActual && (
          <div className="type-preview-box">
            <p className="text-small">
              <strong>Prefijo de folio:</strong>{' '}
              <span className="mono-text">{tipoActual.prefijo_folio}</span> ·{' '}
              <strong>Vigencia por defecto:</strong>{' '}
              {tipoActual.vigencia_dias ? `${tipoActual.vigencia_dias} días` : 'Sin vencimiento'} ·{' '}
              <strong>Campos del formato:</strong> {(tipoActual.campos || []).length}
            </p>
          </div>
        )}

        <div className="form-actions-bar">
          <Link to="/panel" className="btn btn-secondary">
            Cancelar
          </Link>
          <button type="submit" className="btn btn-primary">
            Continuar a captura de datos
          </button>
        </div>
      </form>
    </section>
  );
}
