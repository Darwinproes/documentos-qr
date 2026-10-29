import React from 'react';
import { Link } from 'react-router-dom';
import { CONTACTO_REPORTE, ORG_NOMBRE } from '../lib/config';

interface LayoutPublicoProps {
  children: React.ReactNode;
}

export function LayoutPublico({ children }: LayoutPublicoProps) {
  return (
    <div className="public-shell">
      <a href="#contenido-principal" className="skip-link">
        Saltar al contenido principal
      </a>

      <header className="public-header">
        <div className="container public-header-inner">
          <Link to="/verificar" className="brand-link">
            <img src="/emblema-proesa.png" alt="" className="brand-emblema" />
            <span className="brand-texts">
              <span className="brand-title">{ORG_NOMBRE}</span>
              <span className="brand-subtitle">Registro de documentos oficiales</span>
            </span>
          </Link>
          <nav aria-label="Navegación pública" className="public-nav">
            <Link to="/verificar" className="nav-link-public">
              Verificar documento
            </Link>
          </nav>
        </div>
      </header>

      <main id="contenido-principal" className="public-main" tabIndex={-1}>
        <div className="container">{children}</div>
      </main>

      <footer className="public-footer">
        <div className="container public-footer-inner">
          <span className="footer-copy">© {ORG_NOMBRE}</span>
          <a href="/certificado-proesa.cer" className="footer-link" download>
            Certificado de firma digital
          </a>
          <a href={`mailto:${CONTACTO_REPORTE}`} className="footer-link">
            Contacto
          </a>
          <Link to="/panel/login" className="footer-link">
            Acceso interno
          </Link>
        </div>
      </footer>
    </div>
  );
}
