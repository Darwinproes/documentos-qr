import React, { useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ORG_NOMBRE } from '../lib/config';
import { useTituloDocumento } from '../lib/useCargaDiferida';

interface ErroresLogin {
  correo?: string;
  contrasena?: string;
}

export function LoginPage() {
  useTituloDocumento('Panel · Iniciar sesión');

  const { perfil, cargando, errorAcceso, iniciarSesion } = useAuth();
  const navigate = useNavigate();

  const [correo, setCorreo] = useState<string>('');
  const [contrasena, setContrasena] = useState<string>('');
  const [enviando, setEnviando] = useState<boolean>(false);
  const [erroresCampo, setErroresCampo] = useState<ErroresLogin>({});
  const [errorServidor, setErrorServidor] = useState<string | null>(null);

  const resumenRef = useRef<HTMLDivElement>(null);

  if (!cargando && perfil) {
    return <Navigate to="/panel" replace />;
  }

  const enfocarResumen = () => {
    setTimeout(() => {
      resumenRef.current?.focus();
    }, 0);
  };

  const manejarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorServidor(null);

    const nuevosErrores: ErroresLogin = {};
    const correoLimpio = correo.trim();
    if (!correoLimpio) {
      nuevosErrores.correo = 'Ingrese su correo electrónico institucional.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoLimpio)) {
      nuevosErrores.correo = 'Ingrese un formato de correo electrónico válido.';
    }

    if (!contrasena) {
      nuevosErrores.contrasena = 'Ingrese su contraseña.';
    }

    setErroresCampo(nuevosErrores);

    if (nuevosErrores.correo || nuevosErrores.contrasena) {
      enfocarResumen();
      return;
    }

    setEnviando(true);
    try {
      const { error } = await iniciarSesion(correoLimpio, contrasena);
      if (error) {
        setErrorServidor(error);
        setErroresCampo({
          correo: 'Verifique su correo electrónico institucional.',
          contrasena: 'Verifique su contraseña.'
        });
        enfocarResumen();
      } else {
        navigate('/panel', { replace: true });
      }
    } finally {
      setEnviando(false);
    }
  };

  const mensajeGeneral = errorServidor || errorAcceso;
  const listaErrores: { id: string; texto: string }[] = [];
  if (erroresCampo.correo) {
    listaErrores.push({ id: 'login-correo', texto: erroresCampo.correo });
  }
  if (erroresCampo.contrasena) {
    listaErrores.push({ id: 'login-contrasena', texto: erroresCampo.contrasena });
  }

  const correoInvalido = Boolean(erroresCampo.correo || mensajeGeneral);
  const contrasenaInvalida = Boolean(erroresCampo.contrasena || mensajeGeneral);

  return (
    <div className="login-shell">
      <div className="login-card">
        <header className="login-header-band">
          <img src="/emblema-proesa.png" alt="" className="login-emblema" />
          <div className="brand-texts">
            <span className="brand-title">{ORG_NOMBRE}</span>
            <span className="brand-subtitle">Registro de documentos oficiales</span>
          </div>
        </header>

        <div className="login-body">
          <h1 className="login-title">Panel interno</h1>

          {(mensajeGeneral || listaErrores.length > 0) && (
            <div
              ref={resumenRef}
              id="login-error-summary"
              className="alert alert-error error-summary"
              role="alert"
              aria-live="assertive"
              tabIndex={-1}
            >
              {mensajeGeneral && <p className="error-summary-title">{mensajeGeneral}</p>}
              {!mensajeGeneral && (
                <p className="error-summary-title">Revise los siguientes campos:</p>
              )}
              {listaErrores.length > 0 && (
                <ul className="error-summary-list">
                  {listaErrores.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        onClick={(ev) => {
                          ev.preventDefault();
                          document.getElementById(item.id)?.focus();
                        }}
                      >
                        {item.texto}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
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
                className={`form-input ${correoInvalido ? 'form-input-invalid' : ''}`}
                placeholder="Ej. usuario@proesaelectronica.com"
                value={correo}
                aria-invalid={correoInvalido}
                aria-describedby={
                  erroresCampo.correo
                    ? 'error-login-correo'
                    : mensajeGeneral
                      ? 'login-error-summary'
                      : undefined
                }
                onChange={(e) => {
                  setCorreo(e.target.value);
                  if (erroresCampo.correo) {
                    setErroresCampo((prev) => ({ ...prev, correo: undefined }));
                  }
                  if (errorServidor) {
                    setErrorServidor(null);
                  }
                }}
                autoComplete="email"
                required
              />
              {erroresCampo.correo && (
                <span id="error-login-correo" className="field-error-text" role="alert">
                  {erroresCampo.correo}
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="login-contrasena" className="form-label">
                Contraseña
              </label>
              <input
                id="login-contrasena"
                type="password"
                className={`form-input ${contrasenaInvalida ? 'form-input-invalid' : ''}`}
                value={contrasena}
                aria-invalid={contrasenaInvalida}
                aria-describedby={
                  erroresCampo.contrasena
                    ? 'error-login-contrasena'
                    : mensajeGeneral
                      ? 'login-error-summary'
                      : undefined
                }
                onChange={(e) => {
                  setContrasena(e.target.value);
                  if (erroresCampo.contrasena) {
                    setErroresCampo((prev) => ({ ...prev, contrasena: undefined }));
                  }
                  if (errorServidor) {
                    setErrorServidor(null);
                  }
                }}
                autoComplete="current-password"
                required
              />
              {erroresCampo.contrasena && (
                <span id="error-login-contrasena" className="field-error-text" role="alert">
                  {erroresCampo.contrasena}
                </span>
              )}
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
    </div>
  );
}
