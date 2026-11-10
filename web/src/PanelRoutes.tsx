import React from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { etiquetaRol, LayoutPanel } from './components/LayoutPanel';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RolDocumentos } from './lib/tipos';
import { DocumentoDetallePage } from './pages/DocumentoDetallePage';
import { DocumentosListaPage } from './pages/DocumentosListaPage';
import { EmitirDocumentoPage } from './pages/EmitirDocumentoPage';
import { LoginPage } from './pages/LoginPage';
import { TiposAdminPage } from './pages/TiposAdminPage';
import { UsuariosAdminPage } from './pages/UsuariosAdminPage';

function RutaProtegida({
  roles,
  children
}: {
  roles?: RolDocumentos[];
  children: React.ReactElement;
}) {
  const { perfil, cargando } = useAuth();
  const location = useLocation();
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
  if (roles && !roles.includes(perfil.rol)) {
    return (
      <LayoutPanel>
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
      </LayoutPanel>
    );
  }
  return children;
}

export default function PanelRoutes() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route
          path=""
          element={
            <RutaProtegida>
              <DocumentosListaPage />
            </RutaProtegida>
          }
        />
        <Route
          path="emitir"
          element={
            <RutaProtegida roles={['admin', 'emisor']}>
              <EmitirDocumentoPage />
            </RutaProtegida>
          }
        />
        <Route
          path="documentos/:id"
          element={
            <RutaProtegida>
              <DocumentoDetallePage />
            </RutaProtegida>
          }
        />
        <Route
          path="tipos"
          element={
            <RutaProtegida roles={['admin']}>
              <TiposAdminPage />
            </RutaProtegida>
          }
        />
        <Route
          path="usuarios"
          element={
            <RutaProtegida roles={['admin']}>
              <UsuariosAdminPage />
            </RutaProtegida>
          }
        />
        <Route path="*" element={<Navigate to="/panel" replace />} />
      </Routes>
    </AuthProvider>
  );
}
