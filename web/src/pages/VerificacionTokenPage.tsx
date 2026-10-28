import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LayoutPublico } from '../components/LayoutPublico';
import { ResultadoVerificacionVista } from '../components/ResultadoVerificacionVista';
import { verificar } from '../lib/api';
import { validarFormatoToken } from '../lib/formato';
import { ErrorApi, RespuestaVerificacion } from '../lib/tipos';

export function VerificacionTokenPage() {
  const { token = '' } = useParams<{ token: string }>();
  const [cargando, setCargando] = useState<boolean>(true);
  const [enlaceInvalido, setEnlaceInvalido] = useState<boolean>(false);
  const [errorRed, setErrorRed] = useState<string | null>(null);
  const [respuesta, setRespuesta] = useState<RespuestaVerificacion | null>(null);

  useEffect(() => {
    let meta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    const creado = !meta;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'robots';
      document.head.appendChild(meta);
    }
    const anterior = meta.content;
    meta.content = 'noindex';

    return () => {
      if (creado && meta?.parentNode) {
        meta.parentNode.removeChild(meta);
      } else if (meta) {
        meta.content = anterior;
      }
    };
  }, []);

  useEffect(() => {
    let cancelado = false;

    async function consultarToken() {
      setErrorRed(null);
      setRespuesta(null);

      if (!validarFormatoToken(token)) {
        setEnlaceInvalido(true);
        setCargando(false);
        return;
      }

      setEnlaceInvalido(false);
      setCargando(true);

      try {
        const res = await verificar({ metodo: 'qr', token });
        if (!cancelado) {
          setRespuesta(res);
        }
      } catch (err) {
        if (cancelado) return;
        if (err instanceof ErrorApi && err.codigo === 'VALIDACION') {
          setEnlaceInvalido(true);
        } else {
          setErrorRed('No se pudo consultar. Revise su conexión.');
        }
      } finally {
        if (!cancelado) {
          setCargando(false);
        }
      }
    }

    consultarToken();

    return () => {
      cancelado = true;
    };
  }, [token]);

  return (
    <LayoutPublico verificadoEn={respuesta?.verificado_en}>
      <div className="public-container">
        <h1 className="sr-only">Resultado de verificación de documento</h1>

        {cargando && (
          <div className="card state-card" role="status" aria-live="polite">
            <div className="spinner" aria-hidden="true" />
            <p className="state-text">Consultando el registro oficial de documentos…</p>
          </div>
        )}

        {!cargando && enlaceInvalido && (
          <div className="card state-card state-invalid-link" role="alert" aria-live="assertive">
            <svg className="status-icon text-danger" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            <h2 className="state-heading">El enlace no es válido</h2>
            <p className="state-description">
              El código QR escaneado o la dirección web está incompleta o no tiene el formato de
              seguridad requerido.
            </p>
            <div className="state-actions">
              <Link to="/verificar" className="btn btn-primary">
                Verificar con folio y código
              </Link>
            </div>
          </div>
        )}

        {!cargando && errorRed && (
          <div className="card state-card state-network-error" role="alert" aria-live="assertive">
            <h2 className="state-heading">{errorRed}</h2>
            <div className="state-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => window.location.reload()}
              >
                Reintentar consulta
              </button>
            </div>
          </div>
        )}

        {!cargando && respuesta && (
          <>
            <ResultadoVerificacionVista respuesta={respuesta} metodo="qr" />
            <div className="verify-another-bar">
              <Link to="/verificar" className="btn btn-secondary">
                Verificar otro documento o validar archivo PDF
              </Link>
            </div>
          </>
        )}
      </div>
    </LayoutPublico>
  );
}
