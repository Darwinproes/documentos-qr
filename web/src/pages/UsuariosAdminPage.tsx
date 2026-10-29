import { useCallback, useEffect, useState } from 'react';
import { LayoutPanel } from '../components/LayoutPanel';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Perfil, RolUsuario } from '../lib/tipos';
import { useCargaDiferida, useEsMovil, useTituloDocumento } from '../lib/useCargaDiferida';

export function UsuariosAdminPage() {
  useTituloDocumento('Panel · Usuarios y roles');

  const { perfil: perfilActual, recargarPerfil } = useAuth();
  const esMovil = useEsMovil(768);

  const [usuarios, setUsuarios] = useState<Perfil[]>([]);
  const [originales, setOriginales] = useState<Record<string, Perfil>>({});
  const [cargando, setCargando] = useState<boolean>(true);
  const mostrarEsqueleto = useCargaDiferida(cargando, 200);
  const [guardandoId, setGuardandoId] = useState<string | null>(null);
  const [guardadoRecienteId, setGuardadoRecienteId] = useState<string | null>(null);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [confirmacionPropia, setConfirmacionPropia] = useState<Perfil | null>(null);

  const cargarUsuarios = useCallback(async () => {
    setCargando(true);
    setErrorGeneral(null);

    try {
      const { data, error } = await supabase
        .from('perfiles')
        .select('id,nombre,area,rol,activo,creado_en')
        .order('creado_en', { ascending: true });

      if (error) {
        setErrorGeneral('No fue posible cargar la lista de perfiles de usuario.');
        return;
      }

      const lista = (data || []) as Perfil[];
      setUsuarios(lista);
      const mapa: Record<string, Perfil> = {};
      for (const item of lista) {
        mapa[item.id] = { ...item };
      }
      setOriginales(mapa);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarUsuarios();
  }, [cargarUsuarios]);

  const filaModificada = (u: Perfil): boolean => {
    const orig = originales[u.id];
    if (!orig) return true;
    return (
      u.nombre.trim() !== orig.nombre.trim() ||
      (u.area || '').trim() !== (orig.area || '').trim() ||
      u.rol !== orig.rol ||
      u.activo !== orig.activo
    );
  };

  const actualizarFilaLocal = <K extends keyof Perfil>(
    id: string,
    campo: K,
    valor: Perfil[K]
  ) => {
    setGuardadoRecienteId((prev) => (prev === id ? null : prev));
    setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, [campo]: valor } : u)));
  };

  const ejecutarGuardadoPerfil = async (usuario: Perfil) => {
    setGuardandoId(usuario.id);
    setErrorGeneral(null);
    setMensajeExito(null);

    try {
      const { error } = await supabase
        .from('perfiles')
        .update({
          nombre: usuario.nombre.trim(),
          area: usuario.area?.trim() || null,
          rol: usuario.rol,
          activo: usuario.activo
        })
        .eq('id', usuario.id);

      if (error) {
        setErrorGeneral(error.message || 'No se pudo actualizar el perfil del usuario.');
        return;
      }

      setOriginales((prev) => ({
        ...prev,
        [usuario.id]: {
          ...usuario,
          nombre: usuario.nombre.trim(),
          area: usuario.area?.trim() || null
        }
      }));
      setGuardadoRecienteId(usuario.id);
      setMensajeExito(`Perfil de «${usuario.nombre}» actualizado correctamente — Guardado.`);

      if (perfilActual?.id === usuario.id) {
        await recargarPerfil();
      }
    } finally {
      setGuardandoId(null);
      setConfirmacionPropia(null);
    }
  };

  const solicitarGuardarPerfil = (usuario: Perfil) => {
    if (!usuario.nombre.trim()) {
      setErrorGeneral('El nombre del usuario no puede quedar vacío.');
      return;
    }

    const esPropio = perfilActual?.id === usuario.id;
    if (esPropio && (!usuario.activo || usuario.rol !== 'admin')) {
      setConfirmacionPropia(usuario);
      return;
    }

    void ejecutarGuardadoPerfil(usuario);
  };

  return (
    <LayoutPanel rolesPermitidos={['admin']}>
      <div className="panel-header-row">
        <div>
          <h1 className="panel-page-title">Usuarios y roles</h1>
          <p className="panel-page-subtitle">
            Administre el área, rol y estado activo de las cuentas registradas en el sistema.
          </p>
        </div>
      </div>

      <div className="card info-banner">
        <p>
          <strong>Alta de nuevas cuentas:</strong> Para registrar un nuevo usuario, créelo primero en{' '}
          <em>Supabase Auth → Users</em> y posteriormente asigne aquí su nombre, área y rol
          correspondiente.
        </p>
      </div>

      {mensajeExito && (
        <div className="alert alert-success" role="status" aria-live="polite">
          {mensajeExito}
        </div>
      )}

      {errorGeneral && (
        <div className="alert alert-error" role="alert">
          {errorGeneral}
        </div>
      )}

      {cargando && mostrarEsqueleto && (
        <div className="card" role="status" aria-live="polite">
          <div className="skeleton skeleton-row" />
          <div className="skeleton skeleton-row" />
          <p className="sr-only">Cargando perfiles de usuario…</p>
        </div>
      )}

      {!cargando && (
        <>
          {!esMovil ? (
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
                    return (
                      <tr key={u.id}>
                        <td title={`ID interno: ${u.id}`}>
                          <span className="sr-only">{u.nombre}</span>
                          <input
                            type="text"
                            aria-label={`Nombre de ${u.nombre}`}
                            className="form-input form-input-compact"
                            value={u.nombre}
                            title={`ID interno: ${u.id}`}
                            onChange={(e) => actualizarFilaLocal(u.id, 'nombre', e.target.value)}
                          />
                          {perfilActual?.id === u.id && (
                            <div className="cell-subtext">Tu cuenta actual</div>
                          )}
                        </td>
                        <td>
                          <input
                            type="text"
                            aria-label={`Área de ${u.nombre}`}
                            className="form-input form-input-compact"
                            placeholder="Ej. Recursos Humanos"
                            value={u.area || ''}
                            onChange={(e) => actualizarFilaLocal(u.id, 'area', e.target.value)}
                          />
                        </td>
                        <td>
                          <select
                            aria-label={`Rol de ${u.nombre}`}
                            className="form-select form-input-compact"
                            value={u.rol}
                            onChange={(e) =>
                              actualizarFilaLocal(u.id, 'rol', e.target.value as RolUsuario)
                            }
                          >
                            <option value="admin">Administrador</option>
                            <option value="emisor">Emisor</option>
                            <option value="consulta">Consulta</option>
                          </select>
                        </td>
                        <td className="cell-nowrap">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={u.activo}
                            aria-label={`Usuario activo ${u.nombre}`}
                            className={`switch-btn ${u.activo ? 'switch-btn-on' : 'switch-btn-off'}`}
                            onClick={() => actualizarFilaLocal(u.id, 'activo', !u.activo)}
                          >
                            <span className="switch-track" aria-hidden="true">
                              <span className="switch-thumb" />
                            </span>
                            <span className="switch-label">
                              {u.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </button>
                        </td>
                        <td className="cell-nowrap">
                          <div className="user-save-cell">
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              disabled={!modificado || guardandoId === u.id}
                              onClick={() => solicitarGuardarPerfil(u)}
                            >
                              {guardandoId === u.id ? 'Guardando…' : 'Guardar'}
                            </button>
                            {guardadoRecienteId === u.id && !modificado && (
                              <span className="saved-inline-pill" aria-live="polite">
                                Guardado
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mobile-cards-only">
              {usuarios.map((u) => {
                const modificado = filaModificada(u);
                return (
                  <div key={u.id} className="card mobile-doc-card" title={`ID interno: ${u.id}`}>
                    <div className="form-stack">
                      <div className="form-group">
                        <label htmlFor={`m-nom-${u.id}`} className="form-label">
                          Nombre
                        </label>
                        <input
                          id={`m-nom-${u.id}`}
                          type="text"
                          aria-label={`Nombre de ${u.nombre}`}
                          className="form-input"
                          value={u.nombre}
                          onChange={(e) => actualizarFilaLocal(u.id, 'nombre', e.target.value)}
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
                          className="form-input"
                          value={u.area || ''}
                          onChange={(e) => actualizarFilaLocal(u.id, 'area', e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor={`m-rol-${u.id}`} className="form-label">
                          Rol
                        </label>
                        <select
                          id={`m-rol-${u.id}`}
                          aria-label={`Rol de ${u.nombre}`}
                          className="form-select"
                          value={u.rol}
                          onChange={(e) =>
                            actualizarFilaLocal(u.id, 'rol', e.target.value as RolUsuario)
                          }
                        >
                          <option value="admin">Administrador</option>
                          <option value="emisor">Emisor</option>
                          <option value="consulta">Consulta</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <span className="form-label">Estado de acceso</span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={u.activo}
                          aria-label={`Usuario activo ${u.nombre}`}
                          className={`switch-btn ${u.activo ? 'switch-btn-on' : 'switch-btn-off'}`}
                          onClick={() => actualizarFilaLocal(u.id, 'activo', !u.activo)}
                        >
                          <span className="switch-track" aria-hidden="true">
                            <span className="switch-thumb" />
                          </span>
                          <span className="switch-label">
                            {u.activo ? 'Usuario activo' : 'Usuario inactivo'}
                          </span>
                        </button>
                      </div>

                      <div className="user-save-cell">
                        <button
                          type="button"
                          className="btn btn-primary btn-block"
                          disabled={!modificado || guardandoId === u.id}
                          onClick={() => solicitarGuardarPerfil(u)}
                        >
                          {guardandoId === u.id ? 'Guardando…' : 'Guardar cambios'}
                        </button>
                        {guardadoRecienteId === u.id && !modificado && (
                          <span className="saved-inline-pill" aria-live="polite">
                            Guardado
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {confirmacionPropia && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-propia-titulo"
        >
          <div className="card modal-card">
            <h2 id="modal-propia-titulo" className="section-title">
              Confirmar cambio en tu propia cuenta
            </h2>
            <p className="text-muted">
              Estás por quitar permisos de administrador o desactivar tu propia cuenta (
              <strong>{confirmacionPropia.nombre}</strong>). Si continúas, perderás acceso a esta
              sección inmediatamente.
            </p>
            <div className="modal-actions mt-md">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmacionPropia(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => void ejecutarGuardadoPerfil(confirmacionPropia)}
              >
                Sí, aplicar cambio
              </button>
            </div>
          </div>
        </div>
      )}
    </LayoutPanel>
  );
}
