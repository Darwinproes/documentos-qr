import React, { useRef, useState } from 'react';
import { EsquemaBloqueVerificacion } from '../components/EsquemaBloqueVerificacion';
import { LayoutPublico } from '../components/LayoutPublico';
import {
  ResultadoVerificacionEsqueleto,
  ResultadoVerificacionVista
} from '../components/ResultadoVerificacionVista';
import { FormularioArchivoVerificar } from '../components/verificar/FormularioArchivoVerificar';
import { FormularioManualVerificar } from '../components/verificar/FormularioManualVerificar';
import { calcularSha256Archivo, verificar } from '../lib/api';
import { ORG_NOMBRE } from '../lib/config';
import { useCargaDiferida, useMetaRobots, useTituloDocumento } from '../lib/hooks';
import { ErrorApi, MetodoVerificacion, RespuestaVerificacion } from '../lib/tipos';

type PestanaActiva = 'manual' | 'archivo';

export function VerificarPage() {
  useTituloDocumento('Verificar documento');
  useMetaRobots('index, follow');

  const [pestana, setPestana] = useState<PestanaActiva>('manual');
  const [errorArchivo, setErrorArchivo] = useState<string | undefined>(undefined);
  const [archivoInfo, setArchivoInfo] = useState<{ nombre: string; tamano: number } | null>(null);
  const [hashCalculado, setHashCalculado] = useState<string | null>(null);
  const [cargando, setCargando] = useState<boolean>(false);
  const mostrarEsqueleto = useCargaDiferida(cargando, 200);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [respuesta, setRespuesta] = useState<RespuestaVerificacion | null>(null);
  const [metodoUsado, setMetodoUsado] = useState<MetodoVerificacion>('manual');
  const [credencialesManual, setCredencialesManual] = useState<{
    folio: string;
    codigo: string;
  } | null>(null);

  const tabManualRef = useRef<HTMLButtonElement>(null);
  const tabArchivoRef = useRef<HTMLButtonElement>(null);

  const cambiarPestana = (nueva: PestanaActiva) => {
    setPestana(nueva);
    setErrorArchivo(undefined);
    setErrorGeneral(null);
  };

  const manejarTecladoTabs = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const siguiente: PestanaActiva = pestana === 'manual' ? 'archivo' : 'manual';
      cambiarPestana(siguiente);
      (siguiente === 'manual' ? tabManualRef : tabArchivoRef).current?.focus();
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

  const manejarVerificarManual = async (folioLimpio: string, codigoLimpio: string) => {
    setCargando(true);
    setRespuesta(null);
    setMetodoUsado('manual');
    setCredencialesManual({ folio: folioLimpio, codigo: codigoLimpio });
    try {
      setRespuesta(
        await verificar({
          metodo: 'manual',
          folio: folioLimpio,
          codigo: codigoLimpio
        })
      );
    } catch (err) {
      setErrorGeneral(
        err instanceof ErrorApi
          ? err.message
          : 'No fue posible conectar con el servicio de verificación. Revise su conexión e intente nuevamente.'
      );
    } finally {
      setCargando(false);
    }
  };

  const manejarArchivoValido = async (archivo: File) => {
    setErrorGeneral(null);
    setErrorArchivo(undefined);
    setRespuesta(null);
    setCredencialesManual(null);
    setArchivoInfo({ nombre: archivo.name, tamano: archivo.size });
    setCargando(true);
    setMetodoUsado('archivo');
    try {
      const sha256 = await calcularSha256Archivo(archivo);
      setHashCalculado(sha256);
      setRespuesta(await verificar({ metodo: 'archivo', pdf_sha256: sha256 }));
    } catch (err) {
      setErrorGeneral(
        err instanceof ErrorApi
          ? err.message
          : 'Ocurrió un problema al calcular la huella digital o consultar el documento. Intente de nuevo.'
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <LayoutPublico>
      <div className="page-narrow">
        <div className="page-intro">
          <h1 className="page-title">Verificación de documentos oficiales</h1>
          <p className="page-lead">
            Compruebe si un documento fue emitido por {ORG_NOMBRE}, si sigue vigente y a nombre de
            quién está.
          </p>
        </div>

        <div className="verificar-grid">
          <div className="verificar-form-col">
            <div
              role="tablist"
              aria-label="Forma de verificar"
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
              <FormularioManualVerificar
                cargando={cargando}
                onVerificarManual={manejarVerificarManual}
                onLimpiarErrorGeneral={() => setErrorGeneral(null)}
              />
            )}

            {pestana === 'archivo' && (
              <FormularioArchivoVerificar
                archivoInfo={archivoInfo}
                hashCalculado={hashCalculado}
                errorArchivo={errorArchivo}
                onSeleccionarPdfValido={manejarArchivoValido}
                onErrorValidacionArchivo={(mensaje) => {
                  setErrorGeneral(null);
                  setRespuesta(null);
                  setArchivoInfo(null);
                  setHashCalculado(null);
                  setErrorArchivo(mensaje);
                }}
              />
            )}

            {errorGeneral && (
              <div className="alert alert-error mt-md" role="alert" aria-live="assertive">
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
            solicitudDescarga={
              metodoUsado === 'manual' && credencialesManual
                ? {
                    metodo: 'manual',
                    folio: credencialesManual.folio,
                    codigo: credencialesManual.codigo
                  }
                : undefined
            }
            onVerificarOtro={() => {
              setRespuesta(null);
              setErrorGeneral(null);
              setCredencialesManual(null);
            }}
          />
        )}
      </div>
    </LayoutPublico>
  );
}
