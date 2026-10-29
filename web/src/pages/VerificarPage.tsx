import React, { useRef, useState } from 'react';
import { EsquemaBloqueVerificacion } from '../components/EsquemaBloqueVerificacion';
import { LayoutPublico } from '../components/LayoutPublico';
import {
  ResultadoVerificacionEsqueleto,
  ResultadoVerificacionVista
} from '../components/ResultadoVerificacionVista';
import { calcularSha256Archivo, ErrorClienteVerificacion, verificarDocumento } from '../lib/api';
import { ORG_NOMBRE } from '../lib/config';
import {
  formatearTamanoBytes,
  limpiarCodigoVerificacion,
  normalizarCodigoConGuion,
  PATRON_CODIGO_LIMPIO,
  PATRON_FOLIO
} from '../lib/formato';
import { MetodoVerificacion, RespuestaVerificacion } from '../lib/tipos';
import { useCargaDiferida, useMetaRobots, useTituloDocumento } from '../lib/useCargaDiferida';

type PestanaActiva = 'manual' | 'archivo';

const MAX_BYTES_PDF = 10 * 1024 * 1024; // 10 MB

export function VerificarPage() {
  useTituloDocumento('Verificar documento');
  useMetaRobots('index, follow');

  const [pestana, setPestana] = useState<PestanaActiva>('manual');

  const [folio, setFolio] = useState<string>('');
  const [codigo, setCodigo] = useState<string>('');
  const [erroresCampo, setErroresCampo] = useState<{
    folio?: string;
    codigo?: string;
    archivo?: string;
  }>({});

  const [archivoInfo, setArchivoInfo] = useState<{ nombre: string; tamano: number } | null>(null);
  const [hashCalculado, setHashCalculado] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState<boolean>(false);

  const [cargando, setCargando] = useState<boolean>(false);
  const mostrarEsqueleto = useCargaDiferida(cargando, 200);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [respuesta, setRespuesta] = useState<RespuestaVerificacion | null>(null);
  const [metodoUsado, setMetodoUsado] = useState<MetodoVerificacion>('manual');

  const inputFolioRef = useRef<HTMLInputElement>(null);
  const inputCodigoRef = useRef<HTMLInputElement>(null);
  const inputArchivoRef = useRef<HTMLInputElement>(null);
  const tabManualRef = useRef<HTMLButtonElement>(null);
  const tabArchivoRef = useRef<HTMLButtonElement>(null);

  const cambiarPestana = (nueva: PestanaActiva) => {
    setPestana(nueva);
    setErroresCampo({});
    setErrorGeneral(null);
  };

  const manejarTecladoTabs = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const siguiente: PestanaActiva = pestana === 'manual' ? 'archivo' : 'manual';
      cambiarPestana(siguiente);
      if (siguiente === 'manual') {
        tabManualRef.current?.focus();
      } else {
        tabArchivoRef.current?.focus();
      }
    } else if (e.key === 'Home') {
      e.preventDefault();
      cambiarPestana('manual');
      tabManualRef.current?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      cambiarPestana('archivo');
      tabArchivoRef.current?.focus();
    }
  };

  const validarFolio = (valor: string): string | undefined => {
    const limpio = valor.trim().toUpperCase();
    if (!limpio) {
      return 'Ingrese el folio impreso en el documento (por ejemplo: CONST-2026-000001).';
    }
    if (!PATRON_FOLIO.test(limpio)) {
      return 'El formato del folio no es válido. Use PREFIJO-AAAA-NNNNNN (por ejemplo: CONST-2026-000001).';
    }
    return undefined;
  };

  const validarCodigo = (valor: string): string | undefined => {
    const limpio = limpiarCodigoVerificacion(valor);
    if (!limpio) {
      return 'Ingrese el código de verificación de 10 caracteres.';
    }
    if (!PATRON_CODIGO_LIMPIO.test(limpio)) {
      return 'El código debe tener 10 caracteres válidos del alfabeto de seguridad (sin 0, O, 1, I ni L).';
    }
    return undefined;
  };

  const manejarBlurFolio = () => {
    if (!folio.trim()) return;
    const err = validarFolio(folio);
    setErroresCampo((prev) => ({ ...prev, folio: err }));
  };

  const manejarBlurCodigo = () => {
    if (!codigo.trim()) return;
    const err = validarCodigo(codigo);
    setErroresCampo((prev) => ({ ...prev, codigo: err }));
  };

  const manejarSubmitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorGeneral(null);

    const errorFolio = validarFolio(folio);
    const errorCodigo = validarCodigo(codigo);
    setErroresCampo({ folio: errorFolio, codigo: errorCodigo });

    if (errorFolio) {
      inputFolioRef.current?.focus();
      return;
    }
    if (errorCodigo) {
      inputCodigoRef.current?.focus();
      return;
    }

    setCargando(true);
    setRespuesta(null);
    setMetodoUsado('manual');

    try {
      const resultado = await verificarDocumento({
        metodo: 'manual',
        folio: folio.trim().toUpperCase(),
        codigo: limpiarCodigoVerificacion(codigo)
      });
      setRespuesta(resultado);
    } catch (err) {
      if (err instanceof ErrorClienteVerificacion) {
        setErrorGeneral(err.message);
      } else {
        setErrorGeneral(
          'No fue posible conectar con el servicio de verificación. Revise su conexión e intente nuevamente.'
        );
      }
    } finally {
      setCargando(false);
    }
  };

  const procesarArchivoPdf = async (archivo: File) => {
    setErrorGeneral(null);
    setErroresCampo({});
    setRespuesta(null);

    const nombreLower = archivo.name.toLowerCase();
    const esPdf = archivo.type === 'application/pdf' || nombreLower.endsWith('.pdf');
    if (!esPdf) {
      setArchivoInfo(null);
      setHashCalculado(null);
      setErroresCampo({
        archivo: 'Seleccione únicamente un archivo en formato PDF (.pdf).'
      });
      return;
    }

    if (archivo.size > MAX_BYTES_PDF) {
      setArchivoInfo(null);
      setHashCalculado(null);
      setErroresCampo({
        archivo: 'El archivo supera el tamaño máximo permitido de 10 MB.'
      });
      return;
    }

    if (archivo.size === 0) {
      setArchivoInfo(null);
      setHashCalculado(null);
      setErroresCampo({
        archivo: 'El archivo seleccionado está vacío.'
      });
      return;
    }

    setArchivoInfo({ nombre: archivo.name, tamano: archivo.size });
    setCargando(true);
    setMetodoUsado('archivo');

    try {
      const sha256 = await calcularSha256Archivo(archivo);
      setHashCalculado(sha256);
      const resultado = await verificarDocumento({
        metodo: 'archivo',
        pdf_sha256: sha256
      });
      setRespuesta(resultado);
    } catch (err) {
      if (err instanceof ErrorClienteVerificacion) {
        setErrorGeneral(err.message);
      } else {
        setErrorGeneral(
          'Ocurrió un problema al calcular la huella digital o consultar el documento. Intente de nuevo.'
        );
      }
    } finally {
      setCargando(false);
    }
  };

  const manejarSeleccionArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (archivo) {
      void procesarArchivoPdf(archivo);
    }
  };

  const manejarDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setArrastrando(false);
    const archivo = e.dataTransfer.files?.[0];
    if (archivo) {
      void procesarArchivoPdf(archivo);
    }
  };

  const manejarTecladoZonaArchivo = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      inputArchivoRef.current?.click();
    }
  };

  const reiniciarConsulta = () => {
    setRespuesta(null);
    setErrorGeneral(null);
  };

  return (
    <LayoutPublico>
      <div className="page-narrow">
        <div className="page-intro">
          <h1 className="page-title">Verificación de documentos oficiales</h1>
          <p className="page-lead">
            Compruebe la autenticidad y vigencia de cualquier documento emitido por{' '}
            <strong>{ORG_NOMBRE}</strong> ingresando su folio y código o validando el archivo PDF
            original.
          </p>
        </div>

        <div className="verificar-grid">
          <div className="card tabs-card">
            <div
              role="tablist"
              aria-label="Método de verificación"
              className="tabs-header"
              onKeyDown={manejarTecladoTabs}
            >
              <button
                ref={tabManualRef}
                id="tab-manual"
                role="tab"
                type="button"
                aria-selected={pestana === 'manual'}
                aria-controls="panel-manual"
                tabIndex={pestana === 'manual' ? 0 : -1}
                className={`tab-btn ${pestana === 'manual' ? 'tab-btn-active' : ''}`}
                onClick={() => cambiarPestana('manual')}
              >
                Por folio y código
              </button>
              <button
                ref={tabArchivoRef}
                id="tab-archivo"
                role="tab"
                type="button"
                aria-selected={pestana === 'archivo'}
                aria-controls="panel-archivo"
                tabIndex={pestana === 'archivo' ? 0 : -1}
                className={`tab-btn ${pestana === 'archivo' ? 'tab-btn-active' : ''}`}
                onClick={() => cambiarPestana('archivo')}
              >
                Por archivo PDF
              </button>
            </div>

            {pestana === 'manual' && (
              <div
                id="panel-manual"
                role="tabpanel"
                aria-labelledby="tab-manual"
                className="tab-panel"
              >
                <form onSubmit={manejarSubmitManual} noValidate className="form-stack">
                  <div className="form-group">
                    <label htmlFor="input-folio" className="form-label">
                      Folio del documento
                    </label>
                    <input
                      ref={inputFolioRef}
                      id="input-folio"
                      type="text"
                      inputMode="text"
                      autoCapitalize="characters"
                      autoComplete="off"
                      spellCheck={false}
                      className={`form-input mono-text ${erroresCampo.folio ? 'form-input-invalid' : ''}`}
                      placeholder="CONST-2026-000001"
                      value={folio}
                      aria-invalid={Boolean(erroresCampo.folio)}
                      aria-describedby={erroresCampo.folio ? 'hint-folio error-folio' : 'hint-folio'}
                      onChange={(e) => {
                        const limpio = e.target.value.toUpperCase().replace(/\s+/g, '');
                        setFolio(limpio);
                        if (erroresCampo.folio) {
                          setErroresCampo((prev) => ({ ...prev, folio: undefined }));
                        }
                      }}
                      onBlur={manejarBlurFolio}
                      required
                    />
                    <span id="hint-folio" className="form-hint">
                      Formato: PREFIJO-AAAA-NNNNNN
                    </span>
                    {erroresCampo.folio && (
                      <span id="error-folio" className="field-error-text" role="alert">
                        {erroresCampo.folio}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="input-codigo" className="form-label">
                      Código de verificación
                    </label>
                    <input
                      ref={inputCodigoRef}
                      id="input-codigo"
                      type="text"
                      inputMode="text"
                      autoCapitalize="characters"
                      autoComplete="off"
                      spellCheck={false}
                      className={`form-input mono-text ${erroresCampo.codigo ? 'form-input-invalid' : ''}`}
                      placeholder="7KQ2M-XA9PD"
                      maxLength={13}
                      value={codigo}
                      aria-invalid={Boolean(erroresCampo.codigo)}
                      aria-describedby={
                        erroresCampo.codigo ? 'hint-codigo error-codigo' : 'hint-codigo'
                      }
                      onChange={(e) => {
                        const normalizado = normalizarCodigoConGuion(e.target.value);
                        setCodigo(normalizado);
                        if (erroresCampo.codigo) {
                          setErroresCampo((prev) => ({ ...prev, codigo: undefined }));
                        }
                      }}
                      onPaste={(e) => {
                        e.preventDefault();
                        const textoPegado = e.clipboardData.getData('text');
                        const normalizado = normalizarCodigoConGuion(textoPegado);
                        setCodigo(normalizado);
                        if (erroresCampo.codigo) {
                          setErroresCampo((prev) => ({ ...prev, codigo: undefined }));
                        }
                      }}
                      onBlur={manejarBlurCodigo}
                      required
                    />
                    <span id="hint-codigo" className="form-hint">
                      10 caracteres impresos debajo del código QR (inserta el guion
                      automáticamente).
                    </span>
                    {erroresCampo.codigo && (
                      <span id="error-codigo" className="field-error-text" role="alert">
                        {erroresCampo.codigo}
                      </span>
                    )}
                  </div>

                  <button type="submit" className="btn btn-primary btn-block" disabled={cargando}>
                    {cargando ? 'Consultando…' : 'Verificar documento'}
                  </button>
                </form>
              </div>
            )}

            {pestana === 'archivo' && (
              <div
                id="panel-archivo"
                role="tabpanel"
                aria-labelledby="tab-archivo"
                className="tab-panel"
              >
                <div
                  role="button"
                  tabIndex={0}
                  aria-label="Zona para arrastrar o elegir archivo PDF (máximo 10 MB)"
                  className={`dropzone ${arrastrando ? 'dropzone-active' : ''}`}
                  onKeyDown={manejarTecladoZonaArchivo}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setArrastrando(true);
                  }}
                  onDragLeave={() => setArrastrando(false)}
                  onDrop={manejarDrop}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).tagName !== 'BUTTON') {
                      inputArchivoRef.current?.click();
                    }
                  }}
                >
                  <input
                    ref={inputArchivoRef}
                    id="input-archivo-pdf"
                    type="file"
                    accept=".pdf,application/pdf"
                    className="sr-only"
                    onChange={manejarSeleccionArchivo}
                    tabIndex={-1}
                  />
                  <svg
                    className="dropzone-icon"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12-3-3m0 0-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                    />
                  </svg>
                  <p className="dropzone-title">
                    Arrastre aquí el archivo PDF o selecciónelo desde su dispositivo
                  </p>
                  <p className="dropzone-subtitle">Solo archivos .pdf (máximo 10 MB)</p>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      inputArchivoRef.current?.click();
                    }}
                  >
                    Elegir archivo PDF
                  </button>

                  {archivoInfo && (
                    <div className="file-meta-box" onClick={(e) => e.stopPropagation()}>
                      <p className="file-meta-name">
                        Archivo seleccionado: <strong>{archivoInfo.nombre}</strong> (
                        {formatearTamanoBytes(archivoInfo.tamano)})
                      </p>
                      {hashCalculado && (
                        <p className="file-meta-hash">
                          SHA-256: <code className="mono-text">{hashCalculado}</code>
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {erroresCampo.archivo && (
                  <div className="field-error-text mt-xs" role="alert">
                    {erroresCampo.archivo}
                  </div>
                )}

                <p className="privacy-notice">
                  Su archivo no se envía a ningún servidor; solo se calcula su huella digital.
                </p>
              </div>
            )}

            {errorGeneral && (
              <div className="alert alert-error mx-panel" role="alert" aria-live="assertive">
                {errorGeneral}
              </div>
            )}
          </div>

          <EsquemaBloqueVerificacion />
        </div>

        {cargando && mostrarEsqueleto && <ResultadoVerificacionEsqueleto />}

        {!cargando && respuesta && (
          <ResultadoVerificacionVista
            respuesta={respuesta}
            metodo={metodoUsado}
            onVerificarOtro={reiniciarConsulta}
          />
        )}
      </div>
    </LayoutPublico>
  );
}
