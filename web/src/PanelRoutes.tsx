import React from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { DocumentosListaPage } from './pages/DocumentosListaPage';
import { EmitirDocumentoPage } from './pages/EmitirDocumentoPage';
import { DocumentoDetallePage } from './pages/DocumentoDetallePage';
import { TiposAdminPage } from './pages/TiposAdminPage';
import { UsuariosAdminPage } from './pages/UsuariosAdminPage';

// Las páginas consultan Supabase al montarse; sin sesión no se montan (F13).
function RutaProtegida({ children }: { children: React.ReactElement }) {
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
  return children;
}

export default function PanelRoutes() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route path="" element={<RutaProtegida><DocumentosListaPage /></RutaProtegida>} />
        <Route path="emitir" element={<RutaProtegida><EmitirDocumentoPage /></RutaProtegida>} />
        <Route path="documentos/:id" element={<RutaProtegida><DocumentoDetallePage /></RutaProtegida>} />
        <Route path="tipos" element={<RutaProtegida><TiposAdminPage /></RutaProtegida>} />
        <Route path="usuarios" element={<RutaProtegida><UsuariosAdminPage /></RutaProtegida>} />
        <Route path="*" element={<Navigate to="/panel" replace />} />
      </Routes>
    </AuthProvider>
  );
}
