import {
  normalizarCodigo,
  normalizarFolio,
  sumarDiasIso,
  validarFormatoCodigo,
  validarFormatoFolio,
  validarFormatoSha256,
  validarFormatoToken
} from './formato';
import {
  ErrorApi,
  RespuestaDescargaOriginal,
  RespuestaEmitirDocumento,
  RespuestaVerificacion,
  SolicitudDescargarOriginal,
  SolicitudEmitirDocumento,
  SolicitudVerificar
} from './tipos';

export const EJEMPLOS_SIMULADOS = {
  tokenValido: 'Qm9EjemploTokenValidoDe43CaracteresExactos1',
  tokenVencido: 'Qm9EjemploTokenVencidoDe43CaracteresExacto2',
  tokenCancelado: 'Qm9EjemploTokenCancelado43CaracteresExacto3',
  tokenNoEncontrado: 'Qm9EjemploTokenNoExiste43CaracteresExactos4',
  tokenLimite: 'Qm9EjemploTokenLimiteDe43CaracteresExactos5',
  folioValido: 'CONST-2026-000001',
  codigoValido: '7KQ2M-XA9PD',
  folioVencido: 'CONST-2025-000002',
  codigoVencido: '9BC3D-EF4GH',
  folioCancelado: 'CONST-2026-000003',
  codigoCancelado: '4JK5M-NP6QR',
  folioLimite: 'CONST-2026-999999',
  codigoLimite: '11111-11111',
  sha256Valido: '3a7bd3e2360a3d29eea436fcfb7e44c735d117c42d1c1835420b6b9942dd4f1b'
};

interface DocumentoSimuladoMemoria {
  respuestaEmision: RespuestaEmitirDocumento;
  token: string;
  codigoNormalizado: string;
  destinatario: string;
  tipoNombre: string;
  campos: { etiqueta: string; tipo: 'texto' | 'texto_largo' | 'fecha' | 'numero'; valor: string }[];
  emitidoEn: string;
}

const emitidosEnSesionSimulada: DocumentoSimuladoMemoria[] = [];
let consecutivoSimulado = 4;

export const DOCUMENTOS_SIMULADOS_BASE: Record<string, RespuestaVerificacion> = {
  valido: {
    resultado: 'valido',
    documento: {
      folio: 'CONST-2026-000001',
      tipo: 'Constancia (ejemplo piloto)',
      destinatario: 'Juan Pérez López',
      area_emisora: 'Recursos Humanos',
      emitido_en: '2026-10-28T17:03:11.123Z',
      vigente_hasta: '2027-10-28',
      cancelado_en: null,
      campos: [
        { etiqueta: 'Concepto', tipo: 'texto', valor: 'Curso de soldadura' },
        { etiqueta: 'Fecha', tipo: 'fecha', valor: '2026-10-20' },
        { etiqueta: 'Duración (horas)', tipo: 'numero', valor: '8' }
      ]
    },
    verificado_en: new Date().toISOString()
  },
  vencido: {
    resultado: 'vencido',
    documento: {
      folio: 'CONST-2025-000002',
      tipo: 'Constancia (ejemplo piloto)',
      destinatario: 'María Fernanda Gómez Hernández',
      area_emisora: 'Calidad e Ingeniería',
      emitido_en: '2025-05-10T15:20:00.000Z',
      vigente_hasta: '2026-05-10',
      cancelado_en: null,
      campos: [
        { etiqueta: 'Concepto', tipo: 'texto', valor: 'Certificación ESD Nivel 1' },
        { etiqueta: 'Fecha', tipo: 'fecha', valor: '2025-05-08' }
      ]
    },
    verificado_en: new Date().toISOString()
  },
  cancelado: {
    resultado: 'cancelado',
    documento: {
      folio: 'CONST-2026-000003',
      tipo: 'Constancia (ejemplo piloto)',
      destinatario: 'Roberto Carlos Sánchez Ruiz',
      area_emisora: 'Sistemas',
      emitido_en: '2026-10-15T14:00:00.000Z',
      vigente_hasta: '2027-10-15',
      cancelado_en: '2026-10-22T18:45:00.000Z',
      campos: [
        { etiqueta: 'Concepto', tipo: 'texto', valor: 'Constancia emitida con error en nombre' },
        { etiqueta: 'Fecha', tipo: 'fecha', valor: '2026-10-14' }
      ]
    },
    verificado_en: new Date().toISOString()
  },
  no_encontrado: {
    resultado: 'no_encontrado',
    documento: null,
    verificado_en: new Date().toISOString()
  },
  limite_excedido: {
    resultado: 'limite_excedido',
    documento: null,
    verificado_en: new Date().toISOString()
  }
};

function clonarRespuestaSimulada(
  clave: keyof typeof DOCUMENTOS_SIMULADOS_BASE
): RespuestaVerificacion {
  const base = DOCUMENTOS_SIMULADOS_BASE[clave];
  return {
    ...base,
    documento: base.documento
      ? {
          ...base.documento,
          campos: [...base.documento.campos]
        }
      : null,
    verificado_en: new Date().toISOString()
  };
}

export function validarSolicitudVerificarCliente(solicitud: SolicitudVerificar): void {
  if (solicitud.metodo === 'qr' || solicitud.metodo === 'token') {
    if (!validarFormatoToken(solicitud.token)) {
      throw new ErrorApi('VALIDACION', 'El formato del token de verificación no es válido.', 400);
    }
  } else if (solicitud.metodo === 'manual') {
    if (!validarFormatoFolio(solicitud.folio)) {
      throw new ErrorApi(
        'VALIDACION',
        'El formato del folio no es válido (ejemplo: CONST-2026-000001).',
        400
      );
    }
    if (!validarFormatoCodigo(solicitud.codigo)) {
      throw new ErrorApi(
        'VALIDACION',
        'El código de verificación debe tener 10 caracteres alfanuméricos.',
        400
      );
    }
  } else if (solicitud.metodo === 'archivo') {
    if (!validarFormatoSha256(solicitud.pdf_sha256)) {
      throw new ErrorApi('VALIDACION', 'La huella digital SHA-256 del archivo no es válida.', 400);
    }
  }
}

export async function verificarSimulado(
  solicitud: SolicitudVerificar
): Promise<RespuestaVerificacion> {
  validarSolicitudVerificarCliente(solicitud);
  await new Promise((resolve) => setTimeout(resolve, 180));

  if (solicitud.metodo === 'qr' || solicitud.metodo === 'token') {
    const emitido = emitidosEnSesionSimulada.find((item) => item.token === solicitud.token);
    if (emitido) {
      return {
        resultado: 'valido',
        documento: {
          folio: emitido.respuestaEmision.folio,
          tipo: emitido.tipoNombre,
          destinatario: emitido.destinatario,
          area_emisora: 'Sistemas',
          emitido_en: emitido.emitidoEn,
          vigente_hasta: emitido.respuestaEmision.vigente_hasta,
          cancelado_en: null,
          campos: emitido.campos
        },
        verificado_en: new Date().toISOString()
      };
    }

    if (solicitud.token === EJEMPLOS_SIMULADOS.tokenValido) return clonarRespuestaSimulada('valido');
    if (solicitud.token === EJEMPLOS_SIMULADOS.tokenVencido)
      return clonarRespuestaSimulada('vencido');
    if (solicitud.token === EJEMPLOS_SIMULADOS.tokenCancelado)
      return clonarRespuestaSimulada('cancelado');
    if (solicitud.token === EJEMPLOS_SIMULADOS.tokenLimite)
      return clonarRespuestaSimulada('limite_excedido');
    return clonarRespuestaSimulada('no_encontrado');
  }

  if (solicitud.metodo === 'manual') {
    const folio = normalizarFolio(solicitud.folio);
    const codigo = normalizarCodigo(solicitud.codigo);

    const emitido = emitidosEnSesionSimulada.find(
      (item) => item.respuestaEmision.folio === folio && item.codigoNormalizado === codigo
    );
    if (emitido) {
      return {
        resultado: 'valido',
        documento: {
          folio: emitido.respuestaEmision.folio,
          tipo: emitido.tipoNombre,
          destinatario: emitido.destinatario,
          area_emisora: 'Sistemas',
          emitido_en: emitido.emitidoEn,
          vigente_hasta: emitido.respuestaEmision.vigente_hasta,
          cancelado_en: null,
          campos: emitido.campos
        },
        verificado_en: new Date().toISOString()
      };
    }

    if (
      folio === EJEMPLOS_SIMULADOS.folioValido &&
      codigo === normalizarCodigo(EJEMPLOS_SIMULADOS.codigoValido)
    ) {
      return clonarRespuestaSimulada('valido');
    }
    if (
      folio === EJEMPLOS_SIMULADOS.folioVencido &&
      codigo === normalizarCodigo(EJEMPLOS_SIMULADOS.codigoVencido)
    ) {
      return clonarRespuestaSimulada('vencido');
    }
    if (
      folio === EJEMPLOS_SIMULADOS.folioCancelado &&
      codigo === normalizarCodigo(EJEMPLOS_SIMULADOS.codigoCancelado)
    ) {
      return clonarRespuestaSimulada('cancelado');
    }
    if (
      folio === EJEMPLOS_SIMULADOS.folioLimite &&
      codigo === normalizarCodigo(EJEMPLOS_SIMULADOS.codigoLimite)
    ) {
      return clonarRespuestaSimulada('limite_excedido');
    }
    return clonarRespuestaSimulada('no_encontrado');
  }

  if (solicitud.metodo !== 'archivo') {
    return clonarRespuestaSimulada('no_encontrado');
  }
  const hash = solicitud.pdf_sha256.trim().toLowerCase();
  const emitidoPorHash = emitidosEnSesionSimulada.find(
    (item) => item.respuestaEmision.pdf_sha256 === hash
  );
  if (emitidoPorHash) {
    return {
      resultado: 'valido',
      documento: {
        folio: emitidoPorHash.respuestaEmision.folio,
        tipo: emitidoPorHash.tipoNombre,
        destinatario: emitidoPorHash.destinatario,
        area_emisora: 'Sistemas',
        emitido_en: emitidoPorHash.emitidoEn,
        vigente_hasta: emitidoPorHash.respuestaEmision.vigente_hasta,
        cancelado_en: null,
        campos: emitidoPorHash.campos
      },
      verificado_en: new Date().toISOString()
    };
  }
  if (hash === EJEMPLOS_SIMULADOS.sha256Valido) {
    return clonarRespuestaSimulada('valido');
  }
  return clonarRespuestaSimulada('no_encontrado');
}

export async function descargarOriginalSimulado(
  entrada: SolicitudDescargarOriginal
): Promise<RespuestaDescargaOriginal> {
  const verificacion = await verificarSimulado(entrada);
  if (verificacion.resultado === 'valido' && verificacion.documento) {
    const expiraEn = new Date(Date.now() + 2 * 60 * 1000).toISOString();
    return {
      resultado: 'valido',
      descarga: {
        url: '/ejemplo-documento.pdf',
        nombre_archivo: `${verificacion.documento.folio}.pdf`,
        expira_en: expiraEn
      }
    };
  }
  return {
    resultado: verificacion.resultado,
    descarga: null
  };
}

function generarTokenAleatorio43(): string {
  const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const bytes = new Uint8Array(43);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join('');
}

function generarCodigoCrockfordFormateado(): string {
  const alfabeto = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (b) => alfabeto[b & 31]).join('');
  return `${chars.slice(0, 5)}-${chars.slice(5, 10)}`;
}

function generarSha256HexSimulado(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function emitirDocumentoSimulado(
  solicitud: SolicitudEmitirDocumento
): Promise<RespuestaEmitirDocumento> {
  await new Promise((resolve) => setTimeout(resolve, 250));

  const destinatario = solicitud.destinatario.trim();
  if (!destinatario) {
    throw new ErrorApi('VALIDACION', 'El destinatario es obligatorio', 400);
  }
  if (destinatario.length > 200) {
    throw new ErrorApi('VALIDACION', 'El destinatario no puede exceder 200 caracteres', 400);
  }

  const tipoClave = solicitud.tipo_clave.trim().toUpperCase();
  if (!tipoClave) {
    throw new ErrorApi('VALIDACION', 'Debe seleccionar un tipo de documento', 400);
  }

  for (const [, valor] of Object.entries(solicitud.datos || {})) {
    if (String(valor).length > 2000) {
      throw new ErrorApi('VALIDACION', 'El valor de un campo excede los 2000 caracteres', 400);
    }
  }

  const num = String(consecutivoSimulado++).padStart(6, '0');
  const anio = new Date().getFullYear();
  const folio = `${tipoClave}-${anio}-${num}`;
  const token = generarTokenAleatorio43();
  const codigo = generarCodigoCrockfordFormateado();
  const pdfSha256 = generarSha256HexSimulado();
  const vigenteHasta = solicitud.sin_vencimiento
    ? null
    : solicitud.vigente_hasta || sumarDiasIso(365);

  const origenActual =
    typeof window !== 'undefined' ? window.location.origin : 'https://documentos-qr.onrender.com';

  const respuesta: RespuestaEmitirDocumento = {
    documento_id: crypto.randomUUID(),
    folio,
    url_verificacion: `${origenActual}/v/${token}`,
    codigo_verificacion: codigo,
    vigente_hasta: vigenteHasta,
    pdf_sha256: pdfSha256,
    pdf_url: `data:application/pdf;base64,${btoa(
      `%PDF-1.4\n% Documento simulado ${folio} - ${destinatario}\n`
    )}`
  };

  emitidosEnSesionSimulada.push({
    respuestaEmision: respuesta,
    token,
    codigoNormalizado: normalizarCodigo(codigo),
    destinatario,
    tipoNombre: `${tipoClave} (emitido en modo simulado)`,
    campos: Object.entries(solicitud.datos).map(([clave, valor]) => ({
      etiqueta: clave.charAt(0).toUpperCase() + clave.slice(1).replace(/_/g, ' '),
      tipo: 'texto',
      valor: String(valor)
    })),
    emitidoEn: new Date().toISOString()
  });

  return respuesta;
}
