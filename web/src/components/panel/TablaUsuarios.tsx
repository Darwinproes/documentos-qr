import { Perfil, RolDocumentos } from '../../lib/tipos';

interface TablaUsuariosProps {
  usuarios: Perfil[];
  esMovil: boolean;
  perfilActualId?: string;
  guardandoId: string | null;
  guardadoRecienteId: string | null;
  filaModificada: (usuario: Perfil) => boolean;
  onActualizarCampo: <K extends keyof Perfil>(id: string, campo: K, valor: Perfil[K]) => void;
  onGuardar: (usuario: Perfil) => void;
}

export function TablaUsuarios({
  usuarios,
  esMovil,
  perfilActualId,
  guardandoId,
  guardadoRecienteId,
  filaModificada,
  onActualizarCampo,
  onGuardar
}: TablaUsuariosProps) {
  const renderInterruptor = (u: Perfil) => (
    <button
      type="button"
      role="switch"
      aria-checked={u.activo}
      aria-label={`Usuario activo ${u.nombre}`}
      className={`switch-btn ${u.activo ? 'switch-btn-on' : 'switch-btn-off'}`}
      onClick={() => onActualizarCampo(u.id, 'activo', !u.activo)}
    >
      <span className="switch-track" aria-hidden="true">
        <span className="switch-thumb" />
      </span>
      <span className="switch-label">{u.activo ? 'Activo' : 'Inactivo'}</span>
    </button>
  );

  const renderBotonGuardar = (u: Perfil, modificado: boolean, bloque = false) => (
    <div className={`user-save-cell${bloque ? ' mt-xs' : ''}`}>
      <button
        type="button"
        className={`btn btn-primary ${bloque ? 'btn-block' : 'btn-sm'}`}
        disabled={!modificado || guardandoId === u.id}
        onClick={() => onGuardar(u)}
      >
        {guardandoId === u.id ? 'Guardando…' : 'Guardar'}
      </button>
      {guardadoRecienteId === u.id && !modificado && (
        <span className="saved-inline-pill" aria-live="polite">
          Guardado
        </span>
      )}
    </div>
  );

  if (esMovil) {
    return (
      <div className="mobile-cards-only">
        {usuarios.map((u) => {
          const modificado = filaModificada(u);
          const esPropio = perfilActualId === u.id;
          return (
            <div key={u.id} className="card mobile-user-card">
              {esPropio && (
                <div className="mobile-user-head">
                  <span className="cuenta-actual-pill">Tu cuenta actual</span>
                </div>
              )}
              <div className="mobile-user-row2col">
                <div className="form-group">
                  <label htmlFor={`m-nom-${u.id}`} className="form-label">
                    Nombre
                  </label>
                  <input
                    id={`m-nom-${u.id}`}
                    type="text"
                    aria-label={`Nombre de ${u.nombre}`}
                    className="form-input form-input-compact"
                    placeholder="Ej. María López"
                    value={u.nombre}
                    onChange={(e) => onActualizarCampo(u.id, 'nombre', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor={`m-area-${u.id}`} className="form-label">
                    Área
                  </label>
                  <input
                    id={`m-area-${u.id}`}
                    type="text"
                    aria-label={`Área de ${u.nombre}`}
                    className="form-input form-input-compact"
                    placeholder="Ej. Sistemas"
                    value={u.area || ''}
                    onChange={(e) => onActualizarCampo(u.id, 'area', e.target.value)}
                  />
                </div>
              </div>
              <div className="mobile-user-row2col">
                <div className="form-group">
                  <label htmlFor={`m-rol-${u.id}`} className="form-label">
                    Rol
                  </label>
                  <select
                    id={`m-rol-${u.id}`}
                    aria-label={`Rol de ${u.nombre}`}
                    className="form-select form-input-compact"
                    value={u.rol}
                    onChange={(e) => onActualizarCampo(u.id, 'rol', e.target.value as RolDocumentos)}
                  >
                    <option value="admin">Administrador</option>
                    <option value="emisor">Emisor</option>
                    <option value="consulta">Consulta</option>
                  </select>
                </div>
                <div className="form-group">
                  <span className="form-label">Estado</span>
                  {renderInterruptor(u)}
                </div>
              </div>
              {renderBotonGuardar(u, modificado, true)}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="card table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">Nombre</th>
            <th scope="col">Área</th>
            <th scope="col">Rol</th>
            <th scope="col">Estado</th>
            <th scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((u) => {
            const modificado = filaModificada(u);
            const esPropio = perfilActualId === u.id;
            return (
              <tr key={u.id}>
                <td>
                  <span className="sr-only">{u.nombre}</span>
                  <div className="user-name-cell">
                    <input
                      type="text"
                      aria-label={`Nombre de ${u.nombre}`}
                      className="form-input form-input-compact"
                      placeholder="Ej. María López"
                      value={u.nombre}
                      onChange={(e) => onActualizarCampo(u.id, 'nombre', e.target.value)}
                    />
                    {esPropio && <span className="cuenta-actual-pill">Tu cuenta actual</span>}
                  </div>
                </td>
                <td>
                  <input
                    type="text"
                    aria-label={`Área de ${u.nombre}`}
                    className="form-input form-input-compact"
                    placeholder="Ej. Recursos Humanos"
                    value={u.area || ''}
                    onChange={(e) => onActualizarCampo(u.id, 'area', e.target.value)}
                  />
                </td>
                <td>
                  <select
                    aria-label={`Rol de ${u.nombre}`}
                    className="form-select form-input-compact"
                    value={u.rol}
                    onChange={(e) => onActualizarCampo(u.id, 'rol', e.target.value as RolDocumentos)}
                  >
                    <option value="admin">Administrador</option>
                    <option value="emisor">Emisor</option>
                    <option value="consulta">Consulta</option>
                  </select>
                </td>
                <td className="cell-nowrap">{renderInterruptor(u)}</td>
                <td className="cell-nowrap">{renderBotonGuardar(u, modificado)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
