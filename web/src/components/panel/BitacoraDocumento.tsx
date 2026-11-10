import React from 'react';
import { abreviarSha256, formatearFechaHora, formatearValorCampo } from '../../lib/formato';
import { RegistroBitacora } from '../../lib/tipos';

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

interface BitacoraDocumentoProps {
  bitacora: RegistroBitacora[];
}

export function BitacoraDocumento({ bitacora }: BitacoraDocumentoProps) {
  return (
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
                <span className="audit-date">{formatearFechaHora(reg.creado_en)}</span>
              </div>
              {reg.detalle && renderizarDetalleBitacora(reg.detalle)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
