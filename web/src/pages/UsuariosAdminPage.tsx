import { useCallback, useEffect, useState } from 'react';
import { LayoutPanel } from '../components/LayoutPanel';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Perfil, RolDocumentos } from '../lib/tipos';

export function UsuariosAdminPage() {
  const { perfil: miPerfil, recargarPerfil } = useAuth();
  const [perfiles, setPerfiles] = useState<Perfil[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [guardandoId, setGuardandoId] = useState<string | null>(null);

  const cargarPerfiles = useCallback(async () => {
    setCargando(true);
    setError(null);
    const { data, error: errDb } = await supabase
      .from('perfiles')
      .select('id,nombre,area,rol,activo,creado_en')
      .order('creado_en', { ascending: true });

    if (errDb) {
      setError('No se pudo cargar la lista de usuarios.');
    } else {
      setPerfiles((data || []) as Perfil[]);
    }
    setCargando(false);
  }, []);

  useEffect(() => {
    void cargarPerfiles();
  }, [cargarPerfiles]);

  const actualizarCampoLocal = <K extends keyof Perfil>(
    id: string,
    campo: K,
    valor: Perfil[K]
  ) => {
    setPerfiles((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [campo]: valor } : p))
    );
  };

  const guardarUsuario = async (usuario: Perfil) => {
    setError(null);
    setMensajeExito(null);
    setGuardandoId(usuario.id);

    const { error: errUpd } = await supabase
      .from('perfiles')
      .update({
        nombre: usuario.nombre.trim(),
        area: usuario.area.trim(),
        rol: usuario.rol,
        activo: usuario.activo
      })
      .eq('id', usuario.id);

    setGuardandoId(null);

    if (errUpd) {
      setError(errUpd.message || 'No se pudieron guardar los cambios del usuario.');
      return;
    }

    setMensajeExito(`Perfil de "${usuario.nombre || usuario.id}" actualizado correctamente.`);
    if (miPerfil?.id === usuario.id) {
      await recargarPerfil();
    }
    await cargarPerfiles();
  };

  return (
    <LayoutPanel rolesPermitidos={['admin']}>
      <div className="panel-header-row">
        <div>
          <h1 className="page-title">Administración de usuarios y roles</h1>
          <p className="page-subtitle">
            Gestione el nombre, área emisora, nivel de acceso y estado de las cuentas internas.
          </p>
        </div>
      </div>

      <div className="alert alert-info mb-section" role="note">
        Los usuarios nuevos se crean en Supabase → Authentication y aparecen aquí con rol Consulta.
      </div>

      {mensajeExito && (
        <div className="alert alert-success" role="status" aria-live="polite">
          {mensajeExito}
        </div>
      )}

      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}

      <section className="card table-card">
        {cargando ? (
          <div className="state-card">
            <div className="spinner" aria-hidden="true" />
            <p className="state-text">Cargando perfiles de usuario…</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Área emisora</th>
                  <th>Rol</th>
                  <th>Activo</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {perfiles.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <input
                        type="text"
                        className="form-input form-input-sm"
                        aria-label={`Nombre de ${u.nombre || u.id}`}
                        value={u.nombre}
                        onChange={(e) => actualizarCampoLocal(u.id, 'nombre', e.target.value)}
                      />
                      <div className="mono-text text-small text-muted">{u.id}</div>
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-input form-input-sm"
                        aria-label={`Área de ${u.nombre || u.id}`}
                        placeholder="Ej. Recursos Humanos"
                        value={u.area}
                        onChange={(e) => actualizarCampoLocal(u.id, 'area', e.target.value)}
                      />
                    </td>
                    <td>
                      <select
                        className="form-select form-select-sm"
                        aria-label={`Rol de ${u.nombre || u.id}`}
                        value={u.rol}
                        onChange={(e) =>
                          actualizarCampoLocal(u.id, 'rol', e.target.value as RolDocumentos)
                        }
                      >
                        <option value="consulta">Consulta</option>
                        <option value="emisor">Emisor</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </td>
                    <td>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          aria-label={`Usuario activo ${u.nombre || u.id}`}
                          checked={u.activo}
                          onChange={(e) => actualizarCampoLocal(u.id, 'activo', e.target.checked)}
                        />
                        <span>{u.activo ? 'Sí' : 'No'}</span>
                      </label>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        disabled={guardandoId === u.id}
                        onClick={() => guardarUsuario(u)}
                      >
                        {guardandoId === u.id ? 'Guardando…' : 'Guardar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </LayoutPanel>
  );
}
