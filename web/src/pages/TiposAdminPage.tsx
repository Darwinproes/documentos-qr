import { useCallback, useEffect, useState } from 'react';
import { LayoutPanel } from '../components/LayoutPanel';
import { FormularioTipoDocumento } from '../components/panel/FormularioTipoDocumento';
import { TablaTipos } from '../components/panel/TablaTipos';
import { useCargaDiferida, useEsMovil, useTituloDocumento } from '../lib/hooks';
import { alternarTipoActivo, listarTipos } from '../lib/panel';
import { TipoDocumento } from '../lib/tipos';

export function TiposAdminPage() {
  useTituloDocumento('Panel · Tipos de documento');

  const esMovil = useEsMovil(768);

  const [tipos, setTipos] = useState<TipoDocumento[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const mostrarEsqueleto = useCargaDiferida(cargando, 200);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const [modoFormulario, setModoFormulario] = useState<'cerrado' | 'crear' | 'editar'>('cerrado');
  const [tipoEditando, setTipoEditando] = useState<TipoDocumento | null>(null);

  const cargarTipos = useCallback(async () => {
    setCargando(true);
    setErrorGeneral(null);

    try {
      const lista = await listarTipos();
      setTipos(lista);
    } catch {
      setErrorGeneral('No se pudieron cargar los tipos de documento.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarTipos();
  }, [cargarTipos]);

  const abrirAlta = () => {
    setTipoEditando(null);
    setModoFormulario('crear');
    setMensajeExito(null);
  };

  const abrirEdicion = (tipo: TipoDocumento) => {
    setTipoEditando(tipo);
    setModoFormulario('editar');
    setMensajeExito(null);
  };

  const alternarActivoRapido = async (tipo: TipoDocumento) => {
    setErrorGeneral(null);
    setMensajeExito(null);
    const nuevoEstado = !tipo.activo;
    try {
      await alternarTipoActivo(tipo.id, nuevoEstado);
      setMensajeExito(
        `El tipo «${tipo.nombre}» ahora está ${nuevoEstado ? 'activo' : 'desactivado'}.`
      );
      await cargarTipos();
    } catch {
      setErrorGeneral('No se pudo cambiar el estado del tipo de documento.');
    }
  };

  return (
    <LayoutPanel>
      <div className="panel-header-row">
        <div>
          <h1 className="panel-page-title">Tipos de documento</h1>
          <p className="panel-page-subtitle">
            Configure los tipos de documento, su vigencia por defecto y el esquema de campos
            públicos e internos.
          </p>
        </div>
        {modoFormulario === 'cerrado' && (
          <button type="button" className="btn btn-primary" onClick={abrirAlta}>
            Nuevo tipo de documento
          </button>
        )}
      </div>

      {mensajeExito && (
        <div className="alert alert-success" role="status" aria-live="polite">
          {mensajeExito}
        </div>
      )}

      {errorGeneral && (
        <div className="alert alert-error" role="alert">
          {errorGeneral}
        </div>
      )}

      {modoFormulario !== 'cerrado' && (
        <FormularioTipoDocumento
          key={modoFormulario === 'crear' ? 'nuevo' : `editar-${tipoEditando?.id ?? 0}`}
          modo={modoFormulario}
          tipoInicial={tipoEditando}
          onGuardado={async (mensaje) => {
            setMensajeExito(mensaje);
            setModoFormulario('cerrado');
            await cargarTipos();
          }}
          onCancelar={() => setModoFormulario('cerrado')}
        />
      )}

      {cargando && mostrarEsqueleto && (
        <div className="card" role="status" aria-live="polite">
          <div className="skeleton skeleton-row" />
          <div className="skeleton skeleton-row" />
          <p className="sr-only">Cargando tipos de documento…</p>
        </div>
      )}

      {!cargando && (
        <TablaTipos
          tipos={tipos}
          esMovil={esMovil}
          onEditar={abrirEdicion}
          onAlternarActivo={alternarActivoRapido}
        />
      )}
    </LayoutPanel>
  );
}
