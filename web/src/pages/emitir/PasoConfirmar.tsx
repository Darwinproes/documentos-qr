import { formatearValorCampo } from '../../lib/formato';
import { TipoDocumento } from '../../lib/tipos';

interface PasoConfirmarProps {
  tipoActual: TipoDocumento;
  destinatario: string;
  datos: Record<string, string>;
  resumenVigencia: string;
  emitiendo: boolean;
  onModificarDatos: () => void;
  onConfirmarYEmitir: () => void;
}

export function PasoConfirmar({
  tipoActual,
  destinatario,
  datos,
  resumenVigencia,
  emitiendo,
  onModificarDatos,
  onConfirmarYEmitir
}: PasoConfirmarProps) {
  return (
    <section className="card confirmation-card" aria-live="polite">
      <h2 className="section-title">Confirmar datos antes de emitir</h2>
      <p className="page-subtitle">
        Verifique cuidadosamente la información. Al confirmar se asignará un folio consecutivo
        oficial y se generará el PDF definitivo.
      </p>

      <dl className="renglones-panel-grid mt-section">
        <div className="renglon-panel-fila">
          <dt className="renglon-panel-dt">Tipo de documento</dt>
          <dd className="renglon-panel-dd">
            {tipoActual.clave} — {tipoActual.nombre}
          </dd>
        </div>
        <div className="renglon-panel-fila">
          <dt className="renglon-panel-dt">Vigencia seleccionada</dt>
          <dd className="renglon-panel-dd">{resumenVigencia}</dd>
        </div>
        <div className="renglon-panel-fila renglon-panel-wide">
          <dt className="renglon-panel-dt">Destinatario</dt>
          <dd className="renglon-panel-dd">{destinatario.trim()}</dd>
        </div>
      </dl>

      {tipoActual.campos && tipoActual.campos.length > 0 && (
        <div className="mt-section">
          <h3 className="subsection-title">Campos del documento</h3>
          <dl className="renglones-panel-grid">
            {tipoActual.campos.map((campo) => {
              const val = formatearValorCampo(datos[campo.clave], campo.tipo);
              return (
                <div key={campo.clave} className="renglon-panel-fila">
                  <dt className="renglon-panel-dt">{campo.etiqueta}</dt>
                  <dd className="renglon-panel-dd">
                    {val !== null ? val : <span className="text-muted">No capturado</span>}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      )}

      <div className="form-actions-bar">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onModificarDatos}
          disabled={emitiendo}
        >
          Modificar datos
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onConfirmarYEmitir}
          disabled={emitiendo}
        >
          {emitiendo ? 'Emitiendo y generando PDF…' : 'Emitir'}
        </button>
      </div>
    </section>
  );
}
