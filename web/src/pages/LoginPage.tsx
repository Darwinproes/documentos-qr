import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ORG_NOMBRE } from '../lib/config';
import { useTituloDocumento } from '../lib/useCargaDiferida';

export function LoginPage() {
  useTituloDocumento('Panel · Iniciar sesión');

  const { perfil, cargando, errorAcceso, iniciarSesion } = useAuth();
  const navigate = useNavigate();

  const [correo, setCorreo] = useState<string>('');
  const [contrasena, setContrasena] = useState<string>('');
  const [enviando, setEnviando] = useState<boolean>(false);
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null);

  if (!cargando && perfil) {
    return <Navigate to="/panel" replace />;
  }

  const manejarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorFormulario(null);

    if (!correo.trim() || !contrasena) {
      setErrorFormulario('Ingrese su correo electrónico y contraseña.');
      return;
    }

    setEnviando(true);
    try {
      const { error } = await iniciarSesion(correo, contrasena);
      if (error) {
        setErrorFormulario(error);
      } else {
        navigate('/panel', { replace: true });
      }
    } finally {
      setEnviando(false);
    }
  };

  const mensajeError = errorFormulario || errorAcceso;

  return (
    <div className="login-shell">
      <div className="card login-card">
        <div className="login-brand">
          <img src="/logo.svg" alt={ORG_NOMBRE} className="brand-logo" />
          <h1 className="login-title">Panel interno de documentos</h1>
          <p className="login-subtitle">{ORG_NOMBRE}</p>
        </div>

        {mensajeError && (
          <div className="alert alert-error" role="alert" aria-live="assertive">
            {mensajeError}
          </div>
        )}

        <form onSubmit={manejarSubmit} className="form-stack" noValidate>
          <div className="form-group">
            <label htmlFor="login-correo" className="form-label">
              Correo electrónico institucional
            </label>
            <input
              id="login-correo"
              type="email"
              className="form-input"
              placeholder="usuario@proesaelectronica.com"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-contrasena" className="form-label">
              Contraseña
            </label>
            <input
              id="login-contrasena"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={enviando}>
            {enviando ? 'Iniciando sesión…' : 'Iniciar sesión'}
          </button>
        </form>

        <div className="login-footer">
          <Link to="/verificar" className="link-subtle">
            Volver a la página pública de verificación
          </Link>
        </div>
      </div>
    </div>
  );
}
