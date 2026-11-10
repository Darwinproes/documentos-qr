import React, { useEffect, useRef, useState } from 'react';
import { LayoutPanel } from '../components/LayoutPanel';
import { emitirDocumento } from '../lib/api';
import { formatearFecha, hoyLocalIso, sumarDiasIso } from '../lib/formato';
import { useTituloDocumento } from '../lib/hooks';
import { listarTiposActivos } from '../lib/panel';
import {
  DefinicionCampo,
  ErrorApi,
  RespuestaEmitirDocumento,
  SolicitudEmitirDocumento,
  TipoDocumento
} from '../lib/tipos';
import { PasoConfirmar } from './emitir/PasoConfirmar';
import { ModoVigencia, PasoDatos } from './emitir/PasoDatos';
import { CampoCopiadoEmision, PasoResultado } from './emitir/PasoResultado';
import { PasoTipo } from './emitir/PasoTipo';

type PasoEmision = 1 | 2 | 3 | 4;

const PASOS_DEFINICION: { numero: PasoEmision; etiqueta: string }[] = [
  { numero: 1, etiqueta: 'Tipo' },
  { numero: 2, etiqueta: 'Datos' },
  { numero: 3, etiqueta: 'Confirmar' },
  { numero: 4, etiqueta: 'Listo' }
];

export function EmitirDocumentoPage() {
  useTituloDocumento('Panel · Emitir documento');

  const [tipos, setTipos] = useState<TipoDocumento[]>([]);
  const [cargandoTipos, setCargandoTipos] = useState<boolean>(true);
  const [tipoClave, setTipoClave] = useState<string>('');
  const [destinatario, setDestinatario] = useState<string>('');
  const [datos, setDatos] = useState<Record<string, string>>({});
  const [modoVigencia, setModoVigencia] = useState<ModoVigencia>('segun_tipo');
  const [fechaEspecifica, setFechaEspecifica] = useState<string>('');
  const [paso, setPaso] = useState<PasoEmision>(1);
  const [emitiendo, setEmitiendo] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [erroresCampo, setErroresCampo] = useState<Record<string, string>>({});
  const [resultado, setResultado] = useState<RespuestaEmitirDocumento | null>(null);
  const [copiadoCampo, setCopiadoCampo] = useState<CampoCopiadoEmision>(null);

  const resumenErroresRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function cargarTiposActivos() {
      setCargandoTipos(true);
      try {
        const lista = await listarTiposActivos();
        setTipos(lista);
        if (lista.length > 0) setTipoClave(lista[0].clave);
      } catch {
        setTipos([]);
      } finally {
        setCargandoTipos(false);
      }
    }
    void cargarTiposActivos();
  }, []);

  const tipoActual = tipos.find((t) => t.clave === tipoClave) || null;

  const limpiarError = (idCampo: string) => {
    if (!erroresCampo[idCampo]) return;
    setErroresCampo((prev) => {
      const copia = { ...prev };
      delete copia[idCampo];
      return copia;
    });
  };

  const manejarCambioTipo = (nuevaClave: string) => {
    setTipoClave(nuevaClave);
    setDatos({});
    setError(null);
    setErroresCampo({});
  };

  const manejarCambioCampo = (clave: string, valor: string) => {
    setDatos((prev) => ({ ...prev, [clave]: valor }));
    limpiarError(`campo-${clave}`);
  };

  const avanzarADatos = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErroresCampo({});
    if (!tipoActual) {
      setError('Seleccione un tipo de documento activo.');
      return;
    }
    setPaso(2);
  };

  const validarDatosCaptura = (): boolean => {
    setError(null);
    const nuevosErrores: Record<string, string> = {};

    if (!tipoActual) {
      setError('Seleccione un tipo de documento activo.');
      return false;
    }

    const destLimpio = destinatario.trim();
    if (!destLimpio) {
      nuevosErrores['input-destinatario'] = 'El destinatario es obligatorio.';
    } else if (destLimpio.length > 200) {
      nuevosErrores['input-destinatario'] = 'El destinatario no puede exceder los 200 caracteres.';
    }

    const camposDefinidos: DefinicionCampo[] = tipoActual.campos || [];
    for (const campo of camposDefinidos) {
      const idCampo = `campo-${campo.clave}`;
      const val = (datos[campo.clave] ?? '').trim();
      if (campo.requerido && !val) {
        nuevosErrores[idCampo] = `Falta el campo requerido: ${campo.etiqueta}.`;
      } else if (val.length > 2000) {
        nuevosErrores[idCampo] = `El campo «${campo.etiqueta}» excede el máximo de 2000 caracteres.`;
      }
    }

    if (modoVigencia === 'fecha_especifica') {
      if (!fechaEspecifica) {
        nuevosErrores['input-vigencia-fecha'] = 'Seleccione la fecha específica de vigencia.';
      } else if (fechaEspecifica < hoyLocalIso()) {
        nuevosErrores['input-vigencia-fecha'] = 'La vigencia no puede ser anterior a hoy.';
      }
    }

    setErroresCampo(nuevosErrores);

    if (Object.keys(nuevosErrores).length > 0) {
      setTimeout(() => resumenErroresRef.current?.focus(), 0);
      return false;
    }
    return true;
  };

  const pasarAConfirmacion = (e: React.FormEvent) => {
    e.preventDefault();
    if (validarDatosCaptura()) setPaso(3);
  };

  const confirmarYEmitir = async () => {
    if (!tipoActual) return;
    setError(null);
    setEmitiendo(true);

    const datosTexto: Record<string, string> = {};
    for (const campo of tipoActual.campos || []) {
      const valor = datos[campo.clave];
      if (valor !== undefined && String(valor).trim() !== '') {
        datosTexto[campo.clave] = String(valor).trim();
      }
    }

    const solicitud: SolicitudEmitirDocumento = {
      tipo_clave: tipoActual.clave,
      destinatario: destinatario.trim(),
      datos: datosTexto,
      sin_vencimiento: modoVigencia === 'sin_vencimiento'
    };
    if (modoVigencia === 'fecha_especifica') {
      solicitud.vigente_hasta = fechaEspecifica;
    }

    try {
      const res = await emitirDocumento(solicitud);
      setResultado(res);
      setPaso(4);
    } catch (err) {
      setError(
        err instanceof ErrorApi
          ? err.message
          : 'Ocurrió un error inesperado al emitir el documento.'
      );
    } finally {
      setEmitiendo(false);
    }
  };

  const copiarValor = async (tipo: Exclude<CampoCopiadoEmision, null>, texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiadoCampo(tipo);
      setTimeout(() => setCopiadoCampo(null), 2500);
    } catch {
      setCopiadoCampo(null);
    }
  };

  const reiniciarFormulario = () => {
    setDestinatario('');
    setDatos({});
    setModoVigencia('segun_tipo');
    setFechaEspecifica('');
    setResultado(null);
    setError(null);
    setErroresCampo({});
    setPaso(1);
  };

  const resumenVigenciaTexto = () => {
    if (modoVigencia === 'sin_vencimiento') return 'Sin vencimiento';
    if (modoVigencia === 'fecha_especifica') return formatearFecha(fechaEspecifica);
    if (tipoActual?.vigencia_dias) {
      const estimada = sumarDiasIso(tipoActual.vigencia_dias);
      return `Según el tipo (${tipoActual.vigencia_dias} días — ${formatearFecha(estimada)})`;
    }
    return 'Según el tipo (Sin vencimiento)';
  };

  return (
    <LayoutPanel>
      <div className="panel-header-row">
        <div>
          <h1 className="panel-page-title">Emitir documento oficial</h1>
          <p className="panel-page-subtitle">
            Genere un nuevo folio, código de verificación y archivo PDF con código QR.
          </p>
        </div>
      </div>

      <nav className="stepper-nav" aria-label="Progreso de emisión">
        <ol className="stepper-list">
          {PASOS_DEFINICION.map((item) => {
            const completado = paso > item.numero;
            const actual = paso === item.numero;
            return (
              <li
                key={item.numero}
                className={`stepper-item ${actual ? 'stepper-item-active' : ''} ${
                  completado ? 'stepper-item-completed' : ''
                }`}
                aria-current={actual ? 'step' : undefined}
              >
                <span className="stepper-badge">{item.numero}</span>
                <span className="stepper-label">{item.etiqueta}</span>
              </li>
            );
          })}
        </ol>
      </nav>

      {error && (
        <div className="alert alert-error" role="alert" aria-live="assertive">
          {error}
        </div>
      )}

      {cargandoTipos ? (
        <div className="card state-card" role="status">
          <p className="state-text">Cargando catálogo de tipos de documento…</p>
        </div>
      ) : tipos.length === 0 ? (
        <div className="card state-card">
          <p className="state-text">No hay tipos de documento activos para emitir.</p>
        </div>
      ) : paso === 1 ? (
        <PasoTipo
          tipos={tipos}
          tipoClave={tipoClave}
          tipoActual={tipoActual}
          onCambiarTipo={manejarCambioTipo}
          onAvanzar={avanzarADatos}
        />
      ) : paso === 2 && tipoActual ? (
        <PasoDatos
          tipoActual={tipoActual}
          destinatario={destinatario}
          onDestinatarioChange={(valor) => {
            setDestinatario(valor);
            limpiarError('input-destinatario');
          }}
          datos={datos}
          onCampoChange={manejarCambioCampo}
          modoVigencia={modoVigencia}
          onModoVigenciaChange={(modo) => {
            setModoVigencia(modo);
            if (modo !== 'fecha_especifica') limpiarError('input-vigencia-fecha');
          }}
          fechaEspecifica={fechaEspecifica}
          onFechaEspecificaChange={(fecha) => {
            setFechaEspecifica(fecha);
            limpiarError('input-vigencia-fecha');
          }}
          erroresCampo={erroresCampo}
          resumenErroresRef={resumenErroresRef}
          onVolverPaso1={() => {
            setError(null);
            setErroresCampo({});
            setPaso(1);
          }}
          onContinuarConfirmacion={pasarAConfirmacion}
        />
      ) : paso === 3 && tipoActual ? (
        <PasoConfirmar
          tipoActual={tipoActual}
          destinatario={destinatario}
          datos={datos}
          resumenVigencia={resumenVigenciaTexto()}
          emitiendo={emitiendo}
          onModificarDatos={() => {
            setError(null);
            setPaso(2);
          }}
          onConfirmarYEmitir={() => void confirmarYEmitir()}
        />
      ) : resultado ? (
        <PasoResultado
          resultado={resultado}
          copiadoCampo={copiadoCampo}
          onCopiarValor={copiarValor}
          onEmitirOtro={reiniciarFormulario}
        />
      ) : null}
    </LayoutPanel>
  );
}
