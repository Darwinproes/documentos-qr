import {
  descargarOriginalSimulado,
  emitirDocumentoSimulado,
  validarSolicitudVerificarCliente,
  verificarSimulado
} from './api-simulada';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, USAR_API_SIMULADA } from './config';
import { calcularSha256Archivo, normalizarCodigo, normalizarFolio } from './formato';
import {
  ErrorApi,
  ErrorContratoCuerpo,
  RespuestaDescargaOriginal,
  RespuestaEmitirDocumento,
  RespuestaVerificacion,
  SolicitudDescargarOriginal,
  SolicitudEmitirDocumento,
  SolicitudVerificar
} from './tipos';

export { calcularSha256Archivo };

/**
 * Llama a POST /functions/v1/verificar según el contrato.
 * No importa el cliente de Supabase para mantener ligero el chunk público.
 */
export async function verificar(solicitud: SolicitudVerificar): Promise<RespuestaVerificacion> {
  validarSolicitudVerificarCliente(solicitud);

  if (USAR_API_SIMULADA) {
    return verificarSimulado(solicitud);
  }

  const cuerpo =
    solicitud.metodo === 'manual'
      ? {
          metodo: 'manual' as const,
          folio: normalizarFolio(solicitud.folio),
          codigo: normalizarCodigo(solicitud.codigo)
        }
      : solicitud.metodo === 'archivo'
        ? {
            metodo: 'archivo' as const,
            pdf_sha256: solicitud.pdf_sha256.trim().toLowerCase()
          }
        : {
            metodo: 'qr' as const,
            token: solicitud.token
          };

  let response: Response;
  try {
    response = await fetch(`${SUPABASE_URL}/functions/v1/verificar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_PUBLISHABLE_KEY
      },
      body: JSON.stringify(cuerpo)
    });
  } catch {
    throw new Error('ERROR_RED');
  }

  const json = await response.json().catch(() => null);

  if (response.status === 429 && json && json.resultado === 'limite_excedido') {
    return json as RespuestaVerificacion;
  }

  if (!response.ok) {
    if (response.status === 429) {
      return {
        resultado: 'limite_excedido',
        documento: null,
        verificado_en: new Date().toISOString()
      };
    }
    const errCuerpo = json as ErrorContratoCuerpo | null;
    if (errCuerpo?.error) {
      throw new ErrorApi(errCuerpo.error.codigo, errCuerpo.error.mensaje, response.status);
    }
    throw new ErrorApi('INTERNO', 'No se pudo completar la verificación.', response.status);
  }

  return json as RespuestaVerificacion;
}

/**
 * Llama a POST /functions/v1/verificar con accion: 'descargar' según el contrato (§2.1).
 * Solo aplica para documentos vigentes consultados por QR o por folio y código.
 */
export async function descargarOriginal(
  entrada: SolicitudDescargarOriginal
): Promise<RespuestaDescargaOriginal> {
  validarSolicitudVerificarCliente(entrada);

  if (USAR_API_SIMULADA) {
    return descargarOriginalSimulado(entrada);
  }

  const cuerpo =
    entrada.metodo === 'manual'
      ? {
          metodo: 'manual' as const,
          folio: normalizarFolio(entrada.folio),
          codigo: normalizarCodigo(entrada.codigo),
          accion: 'descargar' as const
        }
      : {
          metodo: 'qr' as const,
          token: entrada.token,
          accion: 'descargar' as const
        };

  let response: Response;
  try {
    response = await fetch(`${SUPABASE_URL}/functions/v1/verificar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_PUBLISHABLE_KEY
      },
      body: JSON.stringify(cuerpo)
    });
  } catch {
    throw new Error('ERROR_RED');
  }

  const json = await response.json().catch(() => null);

  if (response.status === 429) {
    return {
      resultado: 'limite_excedido',
      descarga: null
    };
  }

  if (!response.ok) {
    const errCuerpo = json as ErrorContratoCuerpo | null;
    if (errCuerpo?.error) {
      throw new ErrorApi(errCuerpo.error.codigo, errCuerpo.error.mensaje, response.status);
    }
    throw new ErrorApi(
      'INTERNO',
      'No se pudo preparar la descarga. Intente de nuevo.',
      response.status
    );
  }

  return json as RespuestaDescargaOriginal;
}

/**
 * Llama a POST /functions/v1/emitir-documento según el contrato.
 * Importa dinámicamente el cliente de Supabase solo cuando se usa en el panel.
 */
export async function emitirDocumento(
  solicitud: SolicitudEmitirDocumento
): Promise<RespuestaEmitirDocumento> {
  if (USAR_API_SIMULADA) {
    return emitirDocumentoSimulado(solicitud);
  }

  const { supabase } = await import('./supabase');
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new ErrorApi('NO_AUTENTICADO', 'Su sesión ha expirado. Inicie sesión nuevamente.', 401);
  }

  let response: Response;
  try {
    response = await fetch(`${SUPABASE_URL}/functions/v1/emitir-documento`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify(solicitud)
    });
  } catch {
    throw new ErrorApi('INTERNO', 'No se pudo conectar con el servidor de emisión.', 500);
  }

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    const errCuerpo = json as ErrorContratoCuerpo | null;
    if (errCuerpo?.error) {
      throw new ErrorApi(errCuerpo.error.codigo, errCuerpo.error.mensaje, response.status);
    }
    throw new ErrorApi(
      'INTERNO',
      'Ocurrió un error al emitir el documento. Intente de nuevo.',
      response.status
    );
  }

  return json as RespuestaEmitirDocumento;
}
