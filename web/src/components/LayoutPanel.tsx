import React, { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ORG_NOMBRE } from '../lib/config';
import { RolUsuario } from '../lib/tipos';

interface LayoutPanelProps {
  children: React.ReactNode;
  rolesPermitidos?: RolUsuario[];
}

function etiquetaRol(rol: RolUsuario): string {
  switch (rol) {
    case 'admin':
      return 'Administrador';
    case 'emisor':
      return 'Emisor';
    case 'consulta':
      return 'Consulta';
  }
}

function tituloSeccionActual(pathname: string): string {
  if (pathname === '/panel/emitir') return 'Emitir documento';
  if (pathname.startsWith('/panel/documentos/')) return 'Detalle de documento';
  if (pathname === '/panel/tipos') return 'Tipos de documento';
  if (pathname === '/panel/usuarios') return 'Usuarios y roles';
  return 'Documentos emitidos';
}

export function LayoutPanel({ children, rolesPermitidos }: LayoutPanelProps) {
  const { perfil, cargando, cerrarSesion } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [menuAbierto, setMenuAbierto] = useState<boolean>(false);
  const btnMenuRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMenuAbierto(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuAbierto) return;

    const contenedor = drawerRef.current;
    const selectorFocables =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const elementos = contenedor
      ? Array.from(contenedor.querySelectorAll<HTMLElement>(selectorFocables))
      : [];
    if (elementos.length > 0) {
      elementos[0].focus();
    }

    const manejarKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setMenuAbierto(false);
        btnMenuRef.current?.focus();
        return;
      }
      if (e.key === 'Tab' && contenedor) {
        const actuales = Array.from(contenedor.querySelectorAll<HTMLElement>(selectorFocables));
        if (actuales.length === 0) return;
        const primero = actuales[0];
        const ultimo = actuales[actuales.length - 1];
        if (e.shiftKey && document.activeElement === primero) {
          e.preventDefault();
          ultimo.focus();
        } else if (!e.shiftKey && document.activeElement === ultimo) {
          e.preventDefault();
          primero.focus();
        }
      }
    };

    document.addEventListener('keydown', manejarKeyDown);
    return () => {
      document.removeEventListener('keydown', manejarKeyDown);
    };
  }, [menuAbierto]);

  if (cargando) {
    return (
      <div className="panel-loading-screen" role="status" aria-live="polite">
        <div className="panel-loading-box">Verificando sesión…</div>
      </div>
    );
  }

  if (!perfil) {
    return <Navigate to="/panel/login" replace state={{ from: location.pathname }} />;
  }

  const tienePermiso = !rolesPermitidos || rolesPermitidos.includes(perfil.rol);

  const manejarSalir = async () => {
    setMenuAbierto(false);
    await cerrarSesion();
    navigate('/panel/login', { replace: true });
  };

  const puedeEmitir = perfil.rol === 'admin' || perfil.rol === 'emisor';
  const esAdmin = perfil.rol === 'admin';

  const esDocumentosActivo =
    location.pathname === '/panel' || location.pathname.startsWith('/panel/documentos/');

  const renderLinksNavegacion = (alHacerClick?: () => void) => (
    <ul className="panel-nav-list">
      <li>
        <Link
          to="/panel"
          className={`panel-nav-link ${esDocumentosActivo ? 'panel-nav-link-active' : ''}`}
          aria-current={esDocumentosActivo ? 'page' : undefined}
          onClick={alHacerClick}
        >
          Documentos
        </Link>
      </li>

      {puedeEmitir && (
        <li>
          <Link
            to="/panel/emitir"
            className={`panel-nav-link ${location.pathname === '/panel/emitir' ? 'panel-nav-link-active' : ''}`}
            aria-current={location.pathname === '/panel/emitir' ? 'page' : undefined}
            onClick={alHacerClick}
          >
            Emitir documento
          </Link>
        </li>
      )}

      {esAdmin && (
        <>
          <li>
            <Link
              to="/panel/tipos"
              className={`panel-nav-link ${location.pathname === '/panel/tipos' ? 'panel-nav-link-active' : ''}`}
              aria-current={location.pathname === '/panel/tipos' ? 'page' : undefined}
              onClick={alHacerClick}
            >
              Tipos de documento
            </Link>
          </li>
          <li>
            <Link
              to="/panel/usuarios"
              className={`panel-nav-link ${location.pathname === '/panel/usuarios' ? 'panel-nav-link-active' : ''}`}
              aria-current={location.pathname === '/panel/usuarios' ? 'page' : undefined}
              onClick={alHacerClick}
            >
              Usuarios y roles
            </Link>
          </li>
        </>
      )}
    </ul>
  );

  return (
    <div className="panel-shell">
      <a href="#panel-contenido" className="skip-link">
        Saltar al contenido del panel
      </a>

      {/* Barra superior compacta para móvil/tableta (< 1024px) */}
      <header className="panel-topbar-mobile">
        <Link
          to="/panel"
          className="brand-link panel-topbar-brand"
          aria-label={`${ORG_NOMBRE} — Ir al inicio del panel interno`}
        >
          <img src="/emblema-proesa.png" alt="" className="panel-emblema-mobile" />
          <span className="panel-topbar-title">{tituloSeccionActual(location.pathname)}</span>
        </Link>

        <button
          ref={btnMenuRef}
          type="button"
          className="btn-menu-mobile"
          aria-expanded={menuAbierto}
          aria-controls="panel-drawer-menu"
          onClick={() => setMenuAbierto((prev) => !prev)}
        >
          <svg
            className="menu-icon-svg"
            viewBox="0 0 24 24"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            {menuAbierto ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            )}
          </svg>
          <span>Menú</span>
        </button>
      </header>

      {/* Cajón lateral móvil/tableta */}
      {menuAbierto && (
        <div
          className="panel-drawer-backdrop"
          onClick={() => {
            setMenuAbierto(false);
            btnMenuRef.current?.focus();
          }}
        >
          <div
            ref={drawerRef}
            id="panel-drawer-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación del panel"
            className="panel-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-drawer-head">
              <div className="panel-sidebar-brand">
                <img src="/emblema-proesa.png" alt="" className="panel-emblema" />
                <div className="panel-brand-texts">
                  <span className="panel-brand-name">PROESA</span>
                  <span className="panel-brand-sub">Registro de documentos</span>
                </div>
              </div>
              <button
                type="button"
                className="btn-close-drawer"
                onClick={() => {
                  setMenuAbierto(false);
                  btnMenuRef.current?.focus();
                }}
              >
                Cerrar
              </button>
            </div>

            <nav aria-label="Navegación móvil del panel" className="panel-nav">
              {renderLinksNavegacion(() => setMenuAbierto(false))}
            </nav>

            <div className="panel-sidebar-footer">
              <div className="user-summary">
                <p className="user-name">{perfil.nombre}</p>
                <p className="user-meta">
                  {perfil.area ? `${perfil.area} · ` : ''}
                  <span className="role-pill">{etiquetaRol(perfil.rol)}</span>
                </p>
              </div>
              <button
                type="button"
                className="btn btn-sidebar-logout btn-block"
                onClick={manejarSalir}
              >
                Cerrar sesión
              </button>
              <Link
                to="/verificar"
                className="sidebar-public-link"
                onClick={() => setMenuAbierto(false)}
              >
                Ir a verificación pública
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Barra lateral fija en escritorio (>= 1024px) */}
      <aside className="panel-sidebar" aria-label="Barra lateral del panel interno">
        <div className="panel-sidebar-top">
          <Link
            to="/panel"
            className="brand-link panel-sidebar-brand"
            aria-label={`${ORG_NOMBRE} — Ir al inicio del panel interno`}
          >
            <img src="/emblema-proesa.png" alt="" className="panel-emblema" />
            <div className="panel-brand-texts">
              <span className="panel-brand-name">PROESA</span>
              <span className="panel-brand-sub">Registro de documentos</span>
            </div>
          </Link>
        </div>

        <nav aria-label="Navegación del panel interno" className="panel-nav">
          {renderLinksNavegacion()}
        </nav>

        <div className="panel-sidebar-footer">
          <div className="user-summary">
            <p className="user-name">{perfil.nombre}</p>
            <p className="user-meta">
              {perfil.area ? `${perfil.area} · ` : ''}
              <span className="role-pill">{etiquetaRol(perfil.rol)}</span>
            </p>
          </div>
          <button
            type="button"
            className="btn btn-sidebar-logout btn-block"
            onClick={manejarSalir}
          >
            Cerrar sesión
          </button>
          <Link to="/verificar" className="sidebar-public-link">
            Ir a verificación pública
          </Link>
        </div>
      </aside>

      <main id="panel-contenido" className="panel-main" tabIndex={-1}>
        <div className="panel-container">
          {tienePermiso ? (
            children
          ) : (
            <div className="card alert alert-error" role="alert">
              <h1 className="section-title">Acceso restringido</h1>
              <p>
                Su cuenta tiene el rol <strong>{etiquetaRol(perfil.rol)}</strong> y no cuenta con
                autorización para acceder a esta pantalla.
              </p>
              <div className="mt-md">
                <Link to="/panel" className="btn btn-secondary">
                  Volver al listado de documentos
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
