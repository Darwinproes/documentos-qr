import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
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

type PestanaActiva = 'manual' | 'archivo';

const MAX_BYTES_PDF = 10 * 1024 * 1024; // 10 MB

export function VerificarPage() {
  const [pestana, setPestana] = useState<PestanaActiva>('manual');

  // Estado pestaña manual
  const [folio, setFolio] = useState<string>('');
  const [codigo, setCodigo] = useState<string>('');

  // Estado pestaña archivo
  const [archivoNombre, setArchivoNombre] = useState<string | null>(null);
  const [archivoHash, setArchivoHash] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState<boolean>(false);
  const inputArchivoRef = useRef<HTMLInputElement | null>(null);

  // Estado compartido de consulta
  const [cargando, setCargando] = useState<boolean>(false);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);
  const [errorRed, setErrorRed] = useState<string | null>(null);
  const [respuesta, setRespuesta] = useState<RespuestaVerificacion | null>(null);
  const [metodoUltimaConsulta, setMetodoUltimaConsulta] = useState<MetodoVerificacion>('manual');

  const cambiarPestana = (nueva: PestanaActiva) => {
    setPestana(nueva);
    setErrorValidacion(null);
    setErrorRed(null);
    setRespuesta(null);
  };

  const manejarSubmitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorValidacion(null);
    setErrorRed(null);
    setRespuesta(null);

    const folioNorm = normalizarFolio(folio);
    const codigoNorm = normalizarCodigo(codigo);

    if (!validarFormatoFolio(folioNorm)) {
      setErrorValidacion('Ingrese un folio con formato válido (por ejemplo: CONST-2026-000001).');
      return;
    }

    if (!validarFormatoCodigo(codigoNorm)) {
      setErrorValidacion('Ingrese el código de verificación de 10 caracteres impreso en el documento.');
      return;
    }

    setCargando(true);
    setMetodoUltimaConsulta('manual');

    try {
      const res = await verificar({
        metodo: 'manual',
        folio: folioNorm,
        codigo: codigoNorm
      });
      setRespuesta(res);
    } catch (err) {
      if (err instanceof ErrorApi) {
        setErrorValidacion(err.message);
      } else {
        setErrorRed('No se pudo consultar. Revise su conexión.');
      }
    } finally {
      setCargando(false);
    }
  };

  const procesarArchivoPdf = async (archivo: File) => {
    setErrorValidacion(null);
    setErrorRed(null);
    setRespuesta(null);
    setArchivoNombre(null);
    setArchivoHash(null);

    const nombreLower = archivo.name.toLowerCase();
    if (!nombreLower.endsWith('.pdf') && archivo.type !== 'application/pdf') {
      setErrorValidacion('Seleccione únicamente un archivo en formato PDF (.pdf).');
      return;
    }

    if (archivo.size > MAX_BYTES_PDF) {
      setErrorValidacion('El archivo supera el tamaño máximo permitido de 10 MB.');
      return;
    }

    setCargando(true);
    setMetodoUltimaConsulta('archivo');
    setArchivoNombre(archivo.name);

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
        setErrorValidacion(err.message);
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
          <div className="tabs-header" role="tablist" aria-label="Métodos de verificación">
            <button
              type="button"
              role="tab"
              id="tab-manual"
              aria-selected={pestana === 'manual'}
              aria-controls="panel-manual"
              className={`tab-btn ${pestana === 'manual' ? 'tab-btn-active' : ''}`}
              onClick={() => cambiarPestana('manual')}
            >
              Folio y código
            </button>
            <button
              type="button"
              role="tab"
              id="tab-archivo"
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
              <form onSubmit={manejarSubmitManual} noValidate className="form-stack">
                <div className="form-group">
                  <label htmlFor="input-folio" className="form-label">
                    Folio del documento
                  </label>
                  <input
                    id="input-folio"
                    type="text"
                    className="form-input mono-text"
                    placeholder="CONST-2026-000001"
                    value={folio}
                    onChange={(e) => setFolio(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                    autoComplete="off"
                    spellCheck={false}
                    required
                  />
                  <span className="form-hint">Formato: PREFIJO-AAAA-NNNNNN</span>
                </div>

                <div className="form-group">
                  <label htmlFor="input-codigo" className="form-label">
                    Código de verificación
                  </label>
                  <input
                    id="input-codigo"
                    type="text"
                    className="form-input mono-text"
                    placeholder="7KQ2M-XA9PD"
                    maxLength={13}
                    value={codigo}
                    onChange={(e) => setCodigo(formatearCodigoVisual(e.target.value))}
                    autoComplete="off"
                    spellCheck={false}
                    required
                  />
                  <span className="form-hint">
                    10 caracteres impresos debajo del código QR (se aceptan con o sin guion).
                  </span>
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
                className={`dropzone ${arrastrando ? 'dropzone-active' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setArrastrando(true);
                }}
                onDragLeave={() => setArrastrando(false)}
                onDrop={manejarDrop}
              >
                <input
                  ref={inputArchivoRef}
                  id="input-archivo-pdf"
                  type="file"
                  accept=".pdf,application/pdf"
                  className="sr-only"
                  onChange={manejarSeleccionArchivo}
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
                <label htmlFor="input-archivo-pdf" className="btn btn-secondary">
                  Elegir archivo PDF
                </label>

                {archivoNombre && (
                  <div className="file-meta-box">
                    <p className="file-meta-name">
                      Archivo analizado: <strong>{archivoNombre}</strong>
                    </p>
                    {archivoHash && (
                      <p className="file-meta-hash">
                        SHA-256: <code className="mono-text">{archivoHash}</code>
                      </p>
                    )}
                  </div>
                )}
              </div>

              <p className="privacy-notice">
                Su archivo no se envía a ningún servidor; solo se calcula su huella digital.
              </p>
            </div>
          )}

          {errorValidacion && (
            <div className="alert alert-error" role="alert" aria-live="assertive">
              {errorValidacion}
            </div>
          )}

          {errorRed && (
            <div className="alert alert-error" role="alert" aria-live="assertive">
              {errorRed}
            </div>
          )}
        </div>

        {cargando && (
          <div className="card state-card" role="status" aria-live="polite">
            <div className="spinner" aria-hidden="true" />
            <p className="state-text">Verificando autenticidad…</p>
          </div>
        )}

        {!cargando && respuesta && (
          <ResultadoVerificacionVista respuesta={respuesta} metodo={metodoUltimaConsulta} />
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
                  setPestana('manual');
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
                  setPestana('manual');
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
                  setPestana('manual');
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
                  setPestana('manual');
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
                  setPestana('manual');
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
