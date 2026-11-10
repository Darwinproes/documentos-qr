import { useState } from 'react';
import { descargarOriginal } from '../../lib/api';
import { SolicitudDescargarOriginal } from '../../lib/tipos';

interface DescargaOriginalProps {
  solicitud: SolicitudDescargarOriginal;
}

export function DescargaOriginal({ solicitud }: DescargaOriginalProps) {
  const [descargando, setDescargando] = useState<boolean>(false);
  const [yaNoVigente, setYaNoVigente] = useState<boolean>(false);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  const manejarClic = async () => {
    setDescargando(true);
    setMensajeError(null);

    try {
      const respuesta = await descargarOriginal(solicitud);

      if (respuesta.resultado === 'valido') {
        if (respuesta.descarga?.url) {
          window.location.assign(respuesta.descarga.url);
        } else {
          setMensajeError('No se pudo preparar la descarga. Intente de nuevo.');
        }
        return;
      }

      if (respuesta.resultado === 'limite_excedido') {
        setMensajeError(
          'Demasiadas consultas desde esta conexión. Espere un minuto e intente de nuevo.'
        );
        return;
      }

      setYaNoVigente(true);
    } catch {
      setMensajeError('No se pudo preparar la descarga. Intente de nuevo.');
    } finally {
      setDescargando(false);
    }
  };

  if (yaNoVigente) {
    return (
      <div className="descarga-original-bloque">
        <div className="alert alert-warning" role="status" aria-live="polite">
          Este documento ya no está vigente; no se puede descargar.
        </div>
      </div>
    );
  }

  return (
    <div className="descarga-original-bloque">
      <button
        type="button"
        className="btn btn-secondary btn-block-mobile"
        disabled={descargando}
        onClick={() => void manejarClic()}
      >
        {descargando ? 'Preparando descarga…' : 'Descargar PDF original'}
      </button>
      <p className="descarga-original-nota">
        Es el archivo que emitió PROESA, con su firma digital. Úselo para comparar con la copia que
        recibió.
      </p>
      {mensajeError && (
        <div className="alert alert-error" role="alert" aria-live="assertive">
          {mensajeError}
        </div>
      )}
    </div>
  );
}
