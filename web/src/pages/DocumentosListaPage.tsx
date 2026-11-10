import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { EtiquetaEstado } from '../components/EtiquetaEstado';
import { LayoutPanel } from '../components/LayoutPanel';
import { FiltrosDocumentos } from '../components/panel/FiltrosDocumentos';
import { Paginacion } from '../components/panel/Paginacion';
import { TablaDocumentos } from '../components/panel/TablaDocumentos';
import { TarjetasDocumentos } from '../components/panel/TarjetasDocumentos';
import { useAuth } from '../context/AuthContext';
import { useCargaDiferida, useEsMovil, useTituloDocumento } from '../lib/hooks';
import {
  FiltroEstado,
  listarDocumentos,
  listarTipos,
  resumenDocumentos,
  TAMANO_PAGINA
} from '../lib/panel';
import { DocumentoDetalle, ResumenDocumentos, TipoDocumento } from '../lib/tipos';

export function DocumentosListaPage() {
  useTituloDocumento('Panel · Documentos emitidos');

  const { perfil } = useAuth();
  const esMovil = useEsMovil(768);
  const puedeEmitir = perfil?.rol === 'admin' || perfil?.rol === 'emisor';

  const [documentos, setDocumentos] = useState<DocumentoDetalle[]>([]);
  const [tipos, setTipos] = useState<Pick<TipoDocumento, 'id' | 'clave' | 'nombre'>[]>([]);
  const [totalRegistros, setTotalRegistros] = useState<number>(0);
  const [pagina, setPagina] = useState<number>(0);
  const [resumen, setResumen] = useState<ResumenDocumentos>({
    vigentes: 0,
    por_vencer: 0,
    vencidos: 0,
    cancelados: 0,
    total: 0
  });

  const [busqueda, setBusqueda] = useState<string>('');
  const [busquedaActiva, setBusquedaActiva] = useState<string>('');
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('');
  const [filtroTipoId, setFiltroTipoId] = useState<string>('');
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');
  const [filtrosMovilAbiertos, setFiltrosMovilAbiertos] = useState<boolean>(false);

  const [cargando, setCargando] = useState<boolean>(true);
  const mostrarEsqueleto = useCargaDiferida(cargando, 200);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const ultimaPeticionRef = useRef<number>(0);

  useEffect(() => {
    async function cargarCatalogoYResumen() {
      const [tiposData, resumenData] = await Promise.all([
        listarTipos().catch(() => [] as TipoDocumento[]),
        resumenDocumentos()
      ]);
      setTipos(
        [...tiposData]
          .sort((a, b) => a.nombre.localeCompare(b.nombre))
          .map(({ id, clave, nombre }) => ({ id, clave, nombre }))
      );
      setResumen(resumenData);
    }
    void cargarCatalogoYResumen();
  }, []);

  const cargarDocumentos = useCallback(async () => {
    const idPeticion = ++ultimaPeticionRef.current;
    setCargando(true);
    setErrorCarga(null);

    try {
      const res = await listarDocumentos(
        {
          busqueda: busquedaActiva,
          estado: filtroEstado,
          tipoId: filtroTipoId,
          fechaDesde,
          fechaHasta
        },
        pagina
      );
      if (idPeticion !== ultimaPeticionRef.current) return;

      setDocumentos(res.documentos);
      setTotalRegistros(res.total);
    } catch {
      if (idPeticion !== ultimaPeticionRef.current) return;
      setErrorCarga('No fue posible cargar la lista de documentos. Intente nuevamente.');
    } finally {
      if (idPeticion === ultimaPeticionRef.current) {
        setCargando(false);
      }
    }
  }, [pagina, busquedaActiva, filtroEstado, filtroTipoId, fechaDesde, fechaHasta]);

  useEffect(() => {
    void cargarDocumentos();
  }, [cargarDocumentos]);

  const manejarBuscarSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPagina(0);
    setBusquedaActiva(busqueda);
  };

  const alternarIndicador = (estado: FiltroEstado) => {
    setPagina(0);
    setFiltroEstado((actual) => (actual === estado ? '' : estado));
  };

  const limpiarFiltros = () => {
    setBusqueda('');
    setBusquedaActiva('');
    setFiltroEstado('');
    setFiltroTipoId('');
    setFechaDesde('');
    setFechaHasta('');
    setPagina(0);
  };

  const totalPaginas = Math.max(1, Math.ceil(totalRegistros / TAMANO_PAGINA));
  const cantidadFiltrosSecundarios = [filtroEstado, filtroTipoId, fechaDesde, fechaHasta].filter(
    Boolean
  ).length;
  const hayFiltrosActivos = Boolean(busquedaActiva.trim() || cantidadFiltrosSecundarios > 0);

  return (
    <LayoutPanel>
      <div className="panel-header-row">
        <div>
          <h1 className="panel-page-title">Documentos emitidos</h1>
          <p className="panel-page-subtitle">
            {resumen.total} documentos · {resumen.vigentes} vigentes · {resumen.vencidos} vencidos ·{' '}
            {resumen.cancelados} cancelados
          </p>
        </div>
        {puedeEmitir && (
          <Link to="/panel/emitir" className="btn btn-primary">
            Nueva emisión
          </Link>
        )}
      </div>

      <div className="indicadores-grid" role="group" aria-label="Indicadores de vigencia y cancelación">
        <button
          type="button"
          className={`indicador-card ${filtroEstado === 'vigente' ? 'indicador-card-activo' : ''}`}
          aria-pressed={filtroEstado === 'vigente'}
          onClick={() => alternarIndicador('vigente')}
        >
          <div className="indicador-top">
            <EtiquetaEstado estado="vigente" mostrarTexto={false} />
            <span className="indicador-etiqueta">Vigentes</span>
          </div>
          <span className="indicador-numero">{resumen.vigentes}</span>
        </button>

        <button
          type="button"
          className={`indicador-card ${filtroEstado === 'por_vencer' ? 'indicador-card-activo' : ''}`}
          aria-pressed={filtroEstado === 'por_vencer'}
          onClick={() => alternarIndicador('por_vencer')}
        >
          <div className="indicador-top">
            <EtiquetaEstado estado="por_vencer" mostrarTexto={false} />
            <span className="indicador-etiqueta-bloque">
              <span className="indicador-etiqueta">Por vencer</span>
              <span className="indicador-sub">en 30 días</span>
            </span>
          </div>
          <span className="indicador-numero">{resumen.por_vencer}</span>
        </button>

        <button
          type="button"
          className={`indicador-card ${filtroEstado === 'vencido' ? 'indicador-card-activo' : ''}`}
          aria-pressed={filtroEstado === 'vencido'}
          onClick={() => alternarIndicador('vencido')}
        >
          <div className="indicador-top">
            <EtiquetaEstado estado="vencido" mostrarTexto={false} />
            <span className="indicador-etiqueta">Vencidos</span>
          </div>
          <span className="indicador-numero">{resumen.vencidos}</span>
        </button>

        <button
          type="button"
          className={`indicador-card ${filtroEstado === 'cancelado' ? 'indicador-card-activo' : ''}`}
          aria-pressed={filtroEstado === 'cancelado'}
          onClick={() => alternarIndicador('cancelado')}
        >
          <div className="indicador-top">
            <EtiquetaEstado estado="cancelado" mostrarTexto={false} />
            <span className="indicador-etiqueta">Cancelados</span>
          </div>
          <span className="indicador-numero">{resumen.cancelados}</span>
        </button>
      </div>

      <FiltrosDocumentos
        busqueda={busqueda}
        onBusquedaChange={setBusqueda}
        onBuscarSubmit={manejarBuscarSubmit}
        filtroEstado={filtroEstado}
        onFiltroEstadoChange={(estado) => {
          setPagina(0);
          setFiltroEstado(estado);
        }}
        filtroTipoId={filtroTipoId}
        onFiltroTipoIdChange={(tipoId) => {
          setPagina(0);
          setFiltroTipoId(tipoId);
        }}
        fechaDesde={fechaDesde}
        onFechaDesdeChange={(fecha) => {
          setPagina(0);
          setFechaDesde(fecha);
        }}
        fechaHasta={fechaHasta}
        onFechaHastaChange={(fecha) => {
          setPagina(0);
          setFechaHasta(fecha);
        }}
        tipos={tipos}
        esMovil={esMovil}
        filtrosMovilAbiertos={filtrosMovilAbiertos}
        onAlternarFiltrosMovil={() => setFiltrosMovilAbiertos((prev) => !prev)}
        cantidadFiltrosSecundarios={cantidadFiltrosSecundarios}
        hayFiltrosActivos={hayFiltrosActivos}
        cantidadDocumentosEnPantalla={documentos.length}
        totalRegistros={totalRegistros}
        onLimpiarFiltros={limpiarFiltros}
      />

      {errorCarga && (
        <div className="alert alert-error" role="alert">
          {errorCarga}
        </div>
      )}

      {cargando && mostrarEsqueleto && (
        <div className="card" role="status" aria-live="polite">
          <div className="skeleton skeleton-row" />
          <div className="skeleton skeleton-row" />
          <div className="skeleton skeleton-row" />
          <p className="sr-only">Cargando listado de documentos…</p>
        </div>
      )}

      {!cargando && documentos.length === 0 && (
        <div className="card empty-state">
          <h2 className="section-title">No se encontraron documentos</h2>
          <p className="text-muted">
            {busquedaActiva.trim()
              ? `Ningún documento coincide con "${busquedaActiva.trim()}".`
              : hayFiltrosActivos
                ? 'Ningún documento coincide con los filtros seleccionados.'
                : 'Aún no se han emitido documentos en este proyecto piloto.'}
          </p>
          <div className="empty-state-actions">
            {hayFiltrosActivos ? (
              <button type="button" className="btn btn-secondary" onClick={limpiarFiltros}>
                Limpiar filtros
              </button>
            ) : (
              puedeEmitir && (
                <Link to="/panel/emitir" className="btn btn-primary">
                  Emitir el primer documento
                </Link>
              )
            )}
          </div>
        </div>
      )}

      {!cargando && documentos.length > 0 && (
        <>
          {!esMovil ? (
            <TablaDocumentos documentos={documentos} />
          ) : (
            <TarjetasDocumentos documentos={documentos} />
          )}

          <Paginacion
            pagina={pagina}
            totalPaginas={totalPaginas}
            totalRegistros={totalRegistros}
            onCambiarPagina={setPagina}
          />
        </>
      )}
    </LayoutPanel>
  );
}
