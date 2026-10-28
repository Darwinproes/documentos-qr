import React from 'react';
import { Link, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { esModoSimulado } from '../lib/api';
import { ORG_NOMBRE } from '../lib/supabase';
import { RolDocumentos } from '../lib/tipos';

interface LayoutPanelProps {
  children: React.ReactNode;
  rolesPermitidos?: RolDocumentos[];
}

const ETIQUETA_ROL: Record<RolDocumentos, string> = {
  admin: 'Administrador',
  emisor: 'Emisor',
  consulta: 'Consulta'
};

export function LayoutPanel({ children, rolesPermitidos }: LayoutPanelProps) {
  const { perfil, cargando, cerrarSesion } = useAuth();
  const navigate = useNavigate();

  if (cargando) {
    return (
      <div className="panel-loading-screen" role="status" aria-live="polite">
        <div className="spinner" aria-hidden="true" />
        <p>Cargando sesión del panel…</p>
      </div>
    );
  }

  if (!perfil) {
    return <Navigate to="/panel/login" replace />;
  }

  const tienePermiso = !rolesPermitidos || rolesPermitidos.includes(perfil.rol);

  const manejarSalir = async () => {
    await cerrarSesion();
    navigate('/panel/login', { replace: true });
  };

  return (
    <div className="panel-shell">
      <aside className="panel-sidebar" aria-label="Menú principal del panel">
        <div className="sidebar-brand">
          <Link to="/panel" className="brand-link">
            <img src="/logo.svg" alt={ORG_NOMBRE} className="brand-logo" />
          </Link>
          <span className="sidebar-subtitle">Control de Documentos con QR</span>
          {esModoSimulado() && (
            <span className="badge badge-simulado">Modo simulado (Emisión/Verif)</span>
          )}
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to="/panel"
            end
            className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
          >
            Documentos emitidos
          </NavLink>

          {(perfil.rol === 'emisor' || perfil.rol === 'admin') && (
            <NavLink
              to="/panel/emitir"
              className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
            >
              Emitir documento
            </NavLink>
          )}

          {perfil.rol === 'admin' && (
            <>
              <div className="sidebar-section-label">Administración</div>
              <NavLink
                to="/panel/tipos"
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
                }
              >
                Tipos de documento
              </NavLink>
              <NavLink
                to="/panel/usuarios"
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
                }
              >
                Usuarios y roles
              </NavLink>
            </>
          )}

          <div className="sidebar-section-label">Público</div>
          <Link to="/verificar" className="sidebar-link sidebar-link-with-icon">
            <span>Ir a verificador público</span>
            <svg
              className="inline-icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
              />
            </svg>
          </Link>
        </nav>

        <div className="sidebar-user-footer">
          <div className="user-info">
            <span className="user-name">{perfil.nombre || 'Usuario interno'}</span>
            {perfil.area && <span className="user-area">{perfil.area}</span>}
            <span className={`badge badge-rol-${perfil.rol}`}>
              Rol: {ETIQUETA_ROL[perfil.rol]}
            </span>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-block btn-sm"
            onClick={manejarSalir}
          >
            Cerrar sesión ({perfil.nombre || ETIQUETA_ROL[perfil.rol]})
          </button>
        </div>
      </aside>

      <div className="panel-content-area">
        <main className="panel-main">
          {tienePermiso ? (
            children
          ) : (
            <div className="card state-card" role="alert">
              <h1 className="state-heading">Acceso restringido</h1>
              <p className="state-description">
                Su rol actual (<strong>{ETIQUETA_ROL[perfil.rol]}</strong>) no tiene permiso para
                acceder a esta sección.
              </p>
              <div className="state-actions">
                <Link to="/panel" className="btn btn-primary">
                  Volver a la lista de documentos
                </Link>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
