import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { EsqueletoResultado } from '../components/Esqueletos';
import { LayoutPublico } from '../components/LayoutPublico';
import { ResultadoVerificacionVista } from '../components/ResultadoVerificacionVista';
import { EJEMPLOS_SIMULADOS, esModoSimulado, verificar } from '../lib/api';
import {
  calcularSha256Archivo,
  formatearCodigoVisual,
  normalizarCodigo,
  normalizarFolio,
  validarFormatoCodigo,
  validarFormatoFolio
} from '../lib/formato';
import { ORG_NOMBRE } from '../lib/supabase';
import { ErrorApi, MetodoVerificacion, RespuestaVerificacion } from '../lib/tipos';
import {
  formatearTamanoBytes,
  useCargaDiferida,
  useTituloDocumento
} from '../lib/useCargaDiferida';

type PestanaActiva = 'manual' | 'archivo';

const MAX_BYTES_PDF = 10 * 1024 * 1024; // 10 MB

interface ErroresCampos {
  folio?: string;
  codigo?: string;
  archivo?: string;
}

export function VerificarPage() {
  useTituloDocumento('Verificación de documento');

  const [pestana, setPestana] = useState<PestanaActiva>('manual');
  const tabManualRef = useRef<HTMLButtonElement | null>(null);
  const tabArchivoRef = useRef<HTMLButtonElement | null>(null);
  const resumenErroresRef = useRef<HTMLDivElement | null>(null);
  const inputFolioRef = useRef<HTMLInputElement | null>(null);
  const inputCodigoRef = useRef<HTMLInputElement | null>(null);
  const inputArchivoRef = useRef<HTMLInputElement | null>(null);

  // Estado pestaña manual
  const [folio, setFolio] = useState<string>('');
  const [codigo, setCodigo] = useState<string>('');
  const [erroresCampos, setErroresCampos] = useState<ErroresCampos>({});
  const [mostrarResumenErrores, setMostrarResumenErrores] = useState<boolean>(false);

  // Estado pestaña archivo
  const [archivoInfo, setArchivoInfo] = useState<{ nombre: string; tamano: number } | null>(null);
  const [archivoHash, setArchivoHash] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState<boolean>(false);

  // Estado compartido de consulta
  const [cargando, setCargando] = useState<boolean>(false);
  const mostrarEsqueleto = useCargaDiferida(cargando, 300);
  const [errorRed, setErrorRed] = useState<string | null>(null);
  const [respuesta, setRespuesta] = useState<RespuestaVerificacion | null>(null);
  const [metodoUltimaConsulta, setMetodoUltimaConsulta] = useState<MetodoVerificacion>('manual');

  const cambiarPestana = (nueva: PestanaActiva, enfocarTab = false) => {
    setPestana(nueva);
    setErroresCampos({});
    setMostrarResumenErrores(false);
    setErrorRed(null);
    setRespuesta(null);
    if (enfocarTab) {
      setTimeout(() => {
        if (nueva === 'manual') tabManualRef.current?.focus();
        else tabArchivoRef.current?.focus();
      }, 0);
    }
  };

  const manejarKeyDownTabs = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const siguiente: PestanaActiva = pestana === 'manual' ? 'archivo' : 'manual';
      cambiarPestana(siguiente, true);
    }
  };

  const validarCampoFolio = (valor: string): string | undefined => {
    const norm = normalizarFolio(valor);
    if (!norm) return 'Ingrese el folio del documento.';
    if (!validarFormatoFolio(norm)) {
      return 'El formato del folio no es válido (ejemplo: CONST-2026-000001).';
    }
    return undefined;
  };

  const validarCampoCodigo = (valor: string): string | undefined => {
    const norm = normalizarCodigo(valor);
    if (!norm) return 'Ingrese el código de verificación.';
    if (!validarFormatoCodigo(norm)) {
      return 'El código debe tener 10 caracteres alfanuméricos (ejemplo: 7KQ2M-XA9PD).';
    }
    return undefined;
  };

  const manejarBlurFolio = () => {
    if (!folio.trim()) return;
    const msg = validarCampoFolio(folio);
    setErroresCampos((prev) => ({ ...prev, folio: msg }));
  };

  const manejarBlurCodigo = () => {
    if (!codigo.trim()) return;
    const msg = validarCampoCodigo(codigo);
    setErroresCampos((prev) => ({ ...prev, codigo: msg }));
  };

  const manejarSubmitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorRed(null);
    setRespuesta(null);

    const errFolio = validarCampoFolio(folio);
    const errCodigo = validarCampoCodigo(codigo);
    const nuevosErrores: ErroresCampos = {
      folio: errFolio,
      codigo: errCodigo
    };
    setErroresCampos(nuevosErrores);

    if (errFolio || errCodigo) {
      setMostrarResumenErrores(true);
      setTimeout(() => {
        resumenErroresRef.current?.focus();
      }, 0);
      return;
    }

    setMostrarResumenErrores(false);
    setCargando(true);
    setMetodoUltimaConsulta('manual');

    try {
      const res = await verificar({
        metodo: 'manual',
        folio: normalizarFolio(folio),
        codigo: normalizarCodigo(codigo)
      });
      setRespuesta(res);
    } catch (err) {
      if (err instanceof ErrorApi) {
        setErroresCampos({ folio: err.message });
        setMostrarResumenErrores(true);
      } else {
        setErrorRed('No se pudo consultar. Revise su conexión.');
      }
    } finally {
      setCargando(false);
    }
  };

  const procesarArchivoPdf = async (archivo: File) => {
    setErroresCampos({});
    setMostrarResumenErrores(false);
    setErrorRed(null);
    setRespuesta(null);
    setArchivoInfo({ nombre: archivo.name, tamano: archivo.size });
    setArchivoHash(null);

    const nombreLower = archivo.name.toLowerCase();
    if (!nombreLower.endsWith('.pdf') && archivo.type !== 'application/pdf') {
      setErroresCampos({ archivo: 'Seleccione únicamente un archivo en formato PDF (.pdf).' });
      return;
    }

    if (archivo.size > MAX_BYTES_PDF) {
      setErroresCampos({ archivo: 'El archivo supera el tamaño máximo permitido de 10 MB.' });
      return;
    }

    setCargando(true);
    setMetodoUltimaConsulta('archivo');

    try {
      const sha256 = await calcularSha256Archivo(archivo);
      setArchivoHash(sha256);
      const res = await verificar({
        metodo: 'archivo',
        pdf_sha256: sha256
      });
      setRespuesta(res);
    } catch (err) {
      if (err instanceof ErrorApi) {
        setErroresCampos({ archivo: err.message });
      } else {
        setErrorRed('No se pudo consultar. Revise su conexión.');
      }
    } finally {
      setCargando(false);
    }
  };

  const manejarSeleccionArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void procesarArchivoPdf(file);
    }
  };

  const manejarDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setArrastrando(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void procesarArchivoPdf(file);
    }
  };

  const manejarKeyDownDropzone = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      inputArchivoRef.current?.click();
    }
  };

  const limpiarParaVerificarOtro = () => {
    setRespuesta(null);
    setErrorRed(null);
    setErroresCampos({});
    setMostrarResumenErrores(false);
    if (pestana === 'manual') {
      setTimeout(() => inputFolioRef.current?.focus(), 0);
    } else {
      setArchivoInfo(null);
      setArchivoHash(null);
      if (inputArchivoRef.current) inputArchivoRef.current.value = '';
    }
  };

  const hayErroresResumen = Boolean(erroresCampos.folio || erroresCampos.codigo);

  return (
    <LayoutPublico verificadoEn={respuesta?.verificado_en}>
      <div className="public-container">
        <div className="public-intro">
          <h1 className="page-title">Verificación de documentos</h1>
          <p className="page-subtitle">
            Compruebe la autenticidad y vigencia de cualquier documento oficial emitido por{' '}
            <strong>{ORG_NOMBRE}</strong>.
          </p>
        </div>

        <div className="card tabs-card">
          <div
            className="tabs-header"
            role="tablist"
            aria-label="Métodos de verificación"
            onKeyDown={manejarKeyDownTabs}
          >
            <button
              ref={tabManualRef}
              type="button"
              role="tab"
              id="tab-manual"
              tabIndex={pestana === 'manual' ? 0 : -1}
              aria-selected={pestana === 'manual'}
              aria-controls="panel-manual"
              className={`tab-btn ${pestana === 'manual' ? 'tab-btn-active' : ''}`}
              onClick={() => cambiarPestana('manual')}
            >
              Folio y código
            </button>
            <button
              ref={tabArchivoRef}
              type="button"
              role="tab"
              id="tab-archivo"
              tabIndex={pestana === 'archivo' ? 0 : -1}
              aria-selected={pestana === 'archivo'}
              aria-controls="panel-archivo"
              className={`tab-btn ${pestana === 'archivo' ? 'tab-btn-active' : ''}`}
              onClick={() => cambiarPestana('archivo')}
            >
              Archivo PDF
            </button>
          </div>

          {pestana === 'manual' && (
            <div
              id="panel-manual"
              role="tabpanel"
              aria-labelledby="tab-manual"
              className="tab-panel"
            >
              {mostrarResumenErrores && hayErroresResumen && (
                <div
                  ref={resumenErroresRef}
                  tabIndex={-1}
                  className="alert alert-error error-summary"
                  role="alert"
                  aria-labelledby="resumen-errores-titulo"
                >
                  <p id="resumen-errores-titulo" className="error-summary-title">
                    Revise los siguientes campos antes de continuar:
                  </p>
                  <ul className="error-summary-list">
                    {erroresCampos.folio && (
                      <li>
                        <a
                          href="#input-folio"
                          onClick={(e) => {
                            e.preventDefault();
                            inputFolioRef.current?.focus();
                          }}
                        >
                          Folio: {erroresCampos.folio}
                        </a>
                      </li>
                    )}
                    {erroresCampos.codigo && (
                      <li>
                        <a
                          href="#input-codigo"
                          onClick={(e) => {
                            e.preventDefault();
                            inputCodigoRef.current?.focus();
                          }}
                        >
                          Código: {erroresCampos.codigo}
                        </a>
                      </li>
                    )}
                  </ul>
                </div>
              )}

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
                    className={`form-input mono-text ${erroresCampos.folio ? 'form-input-invalid' : ''}`}
                    placeholder="CONST-2026-000001"
                    value={folio}
                    aria-invalid={Boolean(erroresCampos.folio)}
                    aria-describedby={
                      erroresCampos.folio ? 'hint-folio error-folio' : 'hint-folio'
                    }
                    onChange={(e) => {
                      const nuevo = e.target.value.toUpperCase().replace(/\s+/g, '');
                      setFolio(nuevo);
                      if (erroresCampos.folio) {
                        setErroresCampos((prev) => ({ ...prev, folio: undefined }));
                      }
                    }}
                    onBlur={manejarBlurFolio}
                    required
                  />
                  <span id="hint-folio" className="form-hint">
                    Formato: PREFIJO-AAAA-NNNNNN
                  </span>
                  {erroresCampos.folio && (
                    <span id="error-folio" className="field-error-text" role="alert">
                      {erroresCampos.folio}
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
                    className={`form-input mono-text ${erroresCampos.codigo ? 'form-input-invalid' : ''}`}
                    placeholder="7KQ2M-XA9PD"
                    maxLength={13}
                    value={codigo}
                    aria-invalid={Boolean(erroresCampos.codigo)}
                    aria-describedby={
                      erroresCampos.codigo ? 'hint-codigo error-codigo' : 'hint-codigo'
                    }
                    onChange={(e) => {
                      const formateado = formatearCodigoVisual(e.target.value);
                      setCodigo(formateado);
                      if (erroresCampos.codigo) {
                        setErroresCampos((prev) => ({ ...prev, codigo: undefined }));
                      }
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pegado = e.clipboardData.getData('text');
                      const formateado = formatearCodigoVisual(pegado);
                      setCodigo(formateado);
                      if (erroresCampos.codigo) {
                        setErroresCampos((prev) => ({ ...prev, codigo: undefined }));
                      }
                    }}
                    onBlur={manejarBlurCodigo}
                    required
                  />
                  <span id="hint-codigo" className="form-hint">
                    10 caracteres impresos debajo del código QR (inserta el guion automáticamente).
                  </span>
                  {erroresCampos.codigo && (
                    <span id="error-codigo" className="field-error-text" role="alert">
                      {erroresCampos.codigo}
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
                onKeyDown={manejarKeyDownDropzone}
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
                    {archivoHash && (
                      <p className="file-meta-hash">
                        SHA-256: <code className="mono-text">{archivoHash}</code>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {erroresCampos.archivo && (
                <div className="field-error-text mt-xs" role="alert">
                  {erroresCampos.archivo}
                </div>
              )}

              <p className="privacy-notice">
                Su archivo no se envía a ningún servidor; solo se calcula su huella digital.
              </p>
            </div>
          )}

          {errorRed && (
            <div className="alert alert-error mx-panel" role="alert" aria-live="assertive">
              {errorRed}
            </div>
          )}
        </div>

        {cargando && mostrarEsqueleto && <EsqueletoResultado />}

        {!cargando && respuesta && (
          <ResultadoVerificacionVista
            respuesta={respuesta}
            metodo={metodoUltimaConsulta}
            onVerificarOtro={limpiarParaVerificarOtro}
          />
        )}

        {esModoSimulado() && (
          <aside className="card sim-helper-card" aria-label="Datos de prueba en modo simulado">
            <h2 className="sim-helper-title">Casos de prueba rápida (Modo simulado activo)</h2>
            <p className="sim-helper-desc">
              Use cualquiera de estos botones para probar las respuestas del contrato sin backend:
            </p>
            <div className="sim-helper-buttons">
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => {
                  cambiarPestana('manual');
                  setFolio(EJEMPLOS_SIMULADOS.folioValido);
                  setCodigo(EJEMPLOS_SIMULADOS.codigoValido);
                }}
              >
                Cargar Válido
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => {
                  cambiarPestana('manual');
                  setFolio(EJEMPLOS_SIMULADOS.folioVencido);
                  setCodigo(EJEMPLOS_SIMULADOS.codigoVencido);
                }}
              >
                Cargar Vencido
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => {
                  cambiarPestana('manual');
                  setFolio(EJEMPLOS_SIMULADOS.folioCancelado);
                  setCodigo(EJEMPLOS_SIMULADOS.codigoCancelado);
                }}
              >
                Cargar Cancelado
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => {
                  cambiarPestana('manual');
                  setFolio('CONST-2026-000404');
                  setCodigo('ABCDE-12345');
                }}
              >
                Cargar No registrado
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => {
                  cambiarPestana('manual');
                  setFolio(EJEMPLOS_SIMULADOS.folioLimite);
                  setCodigo(EJEMPLOS_SIMULADOS.codigoLimite);
                }}
              >
                Cargar Límite excedido
              </button>
              <Link
                to={`/v/${EJEMPLOS_SIMULADOS.tokenValido}`}
                className="btn btn-sm btn-outline"
              >
                Abrir QR Válido (/v/:token)
              </Link>
            </div>
          </aside>
        )}
      </div>
    </LayoutPublico>
  );
}
