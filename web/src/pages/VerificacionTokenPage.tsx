import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LayoutPublico } from '../components/LayoutPublico';
import {
  ResultadoVerificacionEsqueleto,
  ResultadoVerificacionVista
} from '../components/ResultadoVerificacionVista';
import { verificar } from '../lib/api';
import { validarFormatoToken } from '../lib/formato';
import { ErrorApi, RespuestaVerificacion } from '../lib/tipos';
import { useCargaDiferida, useTituloDocumento } from '../lib/useCargaDiferida';

export function VerificacionTokenPage() {
  useTituloDocumento('Resultado de verificación');

  const { token = '' } = useParams<{ token: string }>();
  const [cargando, setCargando] = useState<boolean>(true);
  const mostrarEsqueleto = useCargaDiferida(cargando, 200);
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
        const res = await verificar({ metodo: 'token', token });
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

    void consultarToken();

    return () => {
      cancelado = true;
    };
  }, [token]);

  return (
    <LayoutPublico>
      <div className="page-narrow">
        <h1 className="sr-only">Resultado de verificación de documento</h1>

        {cargando && mostrarEsqueleto && <ResultadoVerificacionEsqueleto />}

        {!cargando && enlaceInvalido && (
          <div className="card alert alert-error" role="alert" aria-live="assertive">
            <h2 className="section-title">El enlace no es válido</h2>
            <p>
              El código QR escaneado o la dirección web está incompleta o no tiene el formato de
              seguridad requerido.
            </p>
            <div className="mt-md">
              <Link to="/verificar" className="btn btn-primary">
                Verificar con folio y código
              </Link>
            </div>
          </div>
        )}

        {!cargando && errorRed && (
          <div className="card alert alert-error" role="alert" aria-live="assertive">
            <h2 className="section-title">{errorRed}</h2>
            <div className="mt-md">
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
          <ResultadoVerificacionVista respuesta={respuesta} metodo="token" />
        )}
      </div>
    </LayoutPublico>
  );
}
