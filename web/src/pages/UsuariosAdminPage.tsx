import { useCallback, useEffect, useState } from 'react';
import { LayoutPanel } from '../components/LayoutPanel';
import { TablaUsuarios } from '../components/panel/TablaUsuarios';
import { useAuth } from '../context/AuthContext';
import { useCargaDiferida, useEsMovil, useTituloDocumento } from '../lib/hooks';
import { actualizarPerfil, listarPerfiles } from '../lib/panel';
import { Perfil } from '../lib/tipos';

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
      const lista = await listarPerfiles();
      setUsuarios(lista);
      const mapa: Record<string, Perfil> = {};
      for (const item of lista) mapa[item.id] = { ...item };
      setOriginales(mapa);
    } catch {
      setErrorGeneral('No fue posible cargar la lista de perfiles de usuario.');
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

  const actualizarFilaLocal = <K extends keyof Perfil>(id: string, campo: K, valor: Perfil[K]) => {
    setGuardadoRecienteId((prev) => (prev === id ? null : prev));
    setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, [campo]: valor } : u)));
  };

  const ejecutarGuardadoPerfil = async (usuario: Perfil) => {
    setGuardandoId(usuario.id);
    setErrorGeneral(null);
    setMensajeExito(null);

    try {
      const nombreLimpio = usuario.nombre.trim();
      const areaLimpia = usuario.area?.trim() || null;
      await actualizarPerfil(usuario.id, {
        nombre: nombreLimpio,
        area: areaLimpia,
        rol: usuario.rol,
        activo: usuario.activo
      });

      setOriginales((prev) => ({
        ...prev,
        [usuario.id]: { ...usuario, nombre: nombreLimpio, area: areaLimpia }
      }));
      setGuardadoRecienteId(usuario.id);
      setMensajeExito(`Perfil de «${usuario.nombre}» actualizado correctamente — Guardado.`);

      if (perfilActual?.id === usuario.id) await recargarPerfil();
    } catch (err) {
      setErrorGeneral(
        err instanceof Error ? err.message : 'No se pudo actualizar el perfil del usuario.'
      );
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
    if (perfilActual?.id === usuario.id && (!usuario.activo || usuario.rol !== 'admin')) {
      setConfirmacionPropia(usuario);
      return;
    }
    void ejecutarGuardadoPerfil(usuario);
  };

  return (
    <LayoutPanel>
      <div className="panel-header-row">
        <div>
          <h1 className="panel-page-title">Usuarios y roles</h1>
          <p className="panel-page-subtitle">
            Administre el área, rol y estado activo de las cuentas registradas en el sistema.
          </p>
        </div>
      </div>

      <details className="card info-details">
        <summary className="info-summary">¿Cómo dar de alta a alguien?</summary>
        <div className="info-body">
          <p>
            Para registrar un nuevo usuario, créelo primero en <em>Supabase Auth → Users</em> y
            posteriormente asigne aquí su nombre, área y rol correspondiente.
          </p>
        </div>
      </details>

      {mensajeExito && (
        <div className="alert alert-success" role="status" aria-live="polite">{mensajeExito}</div>
      )}
      {errorGeneral && (
        <div className="alert alert-error" role="alert">{errorGeneral}</div>
      )}

      {cargando && mostrarEsqueleto && (
        <div className="card" role="status" aria-live="polite">
          <div className="skeleton skeleton-row" />
          <div className="skeleton skeleton-row" />
          <p className="sr-only">Cargando perfiles de usuario…</p>
        </div>
      )}

      {!cargando && (
        <TablaUsuarios
          usuarios={usuarios}
          esMovil={esMovil}
          perfilActualId={perfilActual?.id}
          guardandoId={guardandoId}
          guardadoRecienteId={guardadoRecienteId}
          filaModificada={filaModificada}
          onActualizarCampo={actualizarFilaLocal}
          onGuardar={solicitarGuardarPerfil}
        />
      )}

      {confirmacionPropia && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-propia-titulo">
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
              <button type="button" className="btn btn-secondary" onClick={() => setConfirmacionPropia(null)}>
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
