import { EtiquetaEstado } from '../EtiquetaEstado';
import { TipoDocumento } from '../../lib/tipos';

function textoCantidadCampos(cantidad: number): string {
  return cantidad === 1 ? '1 campo' : `${cantidad} campos`;
}

interface TablaTiposProps {
  tipos: TipoDocumento[];
  esMovil: boolean;
  onEditar: (tipo: TipoDocumento) => void;
  onAlternarActivo: (tipo: TipoDocumento) => void;
}

export function TablaTipos({
  tipos,
  esMovil,
  onEditar,
  onAlternarActivo
}: TablaTiposProps) {
  if (!esMovil) {
    return (
      <div className="card table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Clave</th>
              <th scope="col">Nombre</th>
              <th scope="col">Prefijo folio</th>
              <th scope="col">Vigencia por defecto</th>
              <th scope="col">Campos</th>
              <th scope="col">Estado</th>
              <th scope="col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {tipos.map((t) => (
              <tr key={t.id}>
                <td className="cell-nowrap">
                  <span className="tipo-clave-chip mono-text">{t.clave}</span>
                </td>
                <td>
                  <strong>{t.nombre}</strong>
                  {t.descripcion && <div className="cell-subtext">{t.descripcion}</div>}
                </td>
                <td className="mono-text cell-nowrap">{t.prefijo_folio}</td>
                <td className="cell-nowrap">
                  {t.vigencia_dias ? `${t.vigencia_dias} días` : 'Sin vencimiento'}
                </td>
                <td className="cell-nowrap">
                  {textoCantidadCampos(Array.isArray(t.campos) ? t.campos.length : 0)}
                </td>
                <td className="cell-nowrap">
                  <EtiquetaEstado
                    estado={t.activo ? 'vigente' : 'cancelado'}
                    etiqueta={t.activo ? 'Activo' : 'Inactivo'}
                  />
                </td>
                <td className="cell-nowrap">
                  <div className="row-actions">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => onEditar(t)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => onAlternarActivo(t)}
                    >
                      {t.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="mobile-cards-only">
      {tipos.map((t) => (
        <div key={t.id} className="card mobile-tipo-card">
          <div className="mobile-doc-row1">
            <div className="mobile-tipo-head">
              <span className="tipo-clave-chip mono-text">{t.clave}</span>
              <strong>{t.nombre}</strong>
            </div>
            <EtiquetaEstado
              estado={t.activo ? 'vigente' : 'cancelado'}
              etiqueta={t.activo ? 'Activo' : 'Inactivo'}
            />
          </div>
          {t.descripcion && <p className="cell-subtext">{t.descripcion}</p>}
          <p className="mobile-doc-row3">
            <span>
              Prefijo <strong className="mono-text">{t.prefijo_folio}</strong>
            </span>
            <span aria-hidden="true"> · </span>
            <span>{t.vigencia_dias ? `${t.vigencia_dias} días` : 'Sin vencimiento'}</span>
            <span aria-hidden="true"> · </span>
            <span>{textoCantidadCampos(Array.isArray(t.campos) ? t.campos.length : 0)}</span>
          </p>
          <div className="mobile-tipo-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onEditar(t)}
            >
              Editar
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onAlternarActivo(t)}
            >
              {t.activo ? 'Desactivar' : 'Activar'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
