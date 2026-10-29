import React, { Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { VerificarPage } from './pages/VerificarPage';
import { VerificacionTokenPage } from './pages/VerificacionTokenPage';

const PanelRoutes = React.lazy(() => import('./PanelRoutes'));

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<Navigate to="/verificar" replace />} />
        <Route path="/verificar" element={<VerificarPage />} />
        <Route path="/v/:token" element={<VerificacionTokenPage />} />
        <Route
          path="/panel/*"
          element={
            <Suspense
              fallback={
                <div className="panel-loading-screen" role="status" aria-live="polite">
                  <div className="panel-loading-box">Cargando panel interno…</div>
                </div>
              }
            >
              <PanelRoutes />
            </Suspense>
          }
        />
        <Route path="/storage/*" element={<div />} />
        <Route path="*" element={<Navigate to="/verificar" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
