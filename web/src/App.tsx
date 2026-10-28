import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DocumentoDetallePage } from './pages/DocumentoDetallePage';
import { DocumentosListaPage } from './pages/DocumentosListaPage';
import { EmitirDocumentoPage } from './pages/EmitirDocumentoPage';
import { LoginPage } from './pages/LoginPage';
import { TiposAdminPage } from './pages/TiposAdminPage';
import { UsuariosAdminPage } from './pages/UsuariosAdminPage';
import { VerificacionTokenPage } from './pages/VerificacionTokenPage';
import { VerificarPage } from './pages/VerificarPage';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/verificar" replace />} />
          <Route path="/verificar" element={<VerificarPage />} />
          <Route path="/v/:token" element={<VerificacionTokenPage />} />
          <Route path="/panel/login" element={<LoginPage />} />
          <Route path="/panel" element={<DocumentosListaPage />} />
          <Route path="/panel/emitir" element={<EmitirDocumentoPage />} />
          <Route path="/panel/documentos/:id" element={<DocumentoDetallePage />} />
          <Route path="/panel/tipos" element={<TiposAdminPage />} />
          <Route path="/panel/usuarios" element={<UsuariosAdminPage />} />
          <Route path="*" element={<Navigate to="/verificar" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
