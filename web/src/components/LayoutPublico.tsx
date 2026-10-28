import React from 'react';
import { Link } from 'react-router-dom';
import { DOMINIO_OFICIAL, ORG_NOMBRE } from '../lib/supabase';
import { formatearFechaHora } from '../lib/formato';
import { esModoSimulado } from '../lib/api';

interface LayoutPublicoProps {
  children: React.ReactNode;
  verificadoEn?: string | null;
}

export function LayoutPublico({ children, verificadoEn }: LayoutPublicoProps) {
  const fechaConsulta = formatearFechaHora(verificadoEn || new Date().toISOString());

  return (
    <div className="public-shell">
      <header className="public-header">
        <div className="public-header-inner">
          <Link to="/verificar" className="brand-link" aria-label={`Inicio de verificación — ${ORG_NOMBRE}`}>
            <img src="/logo.svg" alt={ORG_NOMBRE} className="brand-logo" />
          </Link>
          <div className="public-header-actions">
            {esModoSimulado() && (
              <span className="badge badge-simulado" title="VITE_API_SIMULADA=1 activo">
                Modo simulado
              </span>
            )}
            <Link to="/verificar" className="link-subtle">
              Verificar documento
            </Link>
            <Link to="/panel/login" className="link-subtle">
              Acceso interno
            </Link>
          </div>
        </div>
      </header>

      <main className="public-main">{children}</main>

      <footer className="public-footer" role="contentinfo">
        <div className="public-footer-inner">
          <p className="footer-domain-notice">
            Página oficial de verificación de {ORG_NOMBRE}. Verifique que la dirección en su
            navegador sea <strong>{DOMINIO_OFICIAL}</strong>.
          </p>
          <p className="footer-timestamp">Consultado el {fechaConsulta}</p>
        </div>
      </footer>
    </div>
  );
}
