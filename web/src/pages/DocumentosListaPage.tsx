import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EstadoIndicador, EtiquetaEstado } from '../components/EtiquetaEstado';
import { LayoutPanel } from '../components/LayoutPanel';
import { useAuth } from '../context/AuthContext';
import {
  esFechaVencida,
  esPorVencer30Dias,
  formatearFechaCorta,
  formatearFechaHoraMX,
  hoyIsoLocal,
  sumarDiasIso
} from '../lib/formato';
import { supabase } from '../lib/supabase';
import { DocumentoPanel, ResumenDocumentos, TipoDocumento } from '../lib/tipos';
import { useCargaDiferida, useEsMovil, useTituloDocumento } from '../lib/useCargaDiferida';

const TAMANO_PAGINA = 25;

type FiltroEstado = '' | 'vigente' | 'por_vencer' | 'vencido' | 'cancelado' | 'pendiente';

function resolverEstadoIndicador(doc: DocumentoPanel): EstadoIndicador {
  if (doc.estado === 'cancelado') return 'cancelado';
  if (doc.estado === 'pendiente') return 'pendiente';
  if (doc.vigente_hasta && esFechaVencida(doc.vigente_hasta)) return 'vencido';
  if (doc.vigente_hasta && esPorVencer30Dias(doc.vigente_hasta)) return 'por_vencer';
  return 'vigente';
}

export function DocumentosListaPage() {
  useTituloDocumento('Panel · Documentos emitidos');

  const { perfil } = useAuth();
  const navigate = useNavigate();
  const esMovil = useEsMovil(768);
  const puedeEmitir = perfil?.rol === 'admin' || perfil?.rol === 'emisor';

  const [documentos, setDocumentos] = useState<DocumentoPanel[]>([]);
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
      const [tiposRes, resumenRes] = await Promise.all([
        supabase.from('tipos_documento').select('id,clave,nombre').order('nombre'),
        supabase.rpc('resumen_documentos')
      ]);

      if (tiposRes.data) {
        setTipos(tiposRes.data as Pick<TipoDocumento, 'id' | 'clave' | 'nombre'>[]);
      }
      if (resumenRes.data && typeof resumenRes.data === 'object') {
        const r = resumenRes.data as Partial<ResumenDocumentos>;
        setResumen({
          vigentes: Number(r.vigentes ?? 0),
          por_vencer: Number(r.por_vencer ?? 0),
          vencidos: Number(r.vencidos ?? 0),
          cancelados: Number(r.cancelados ?? 0),
          total: Number(r.total ?? 0)
        });
      }
    }
    void cargarCatalogoYResumen();
  }, []);

  const cargarDocumentos = useCallback(async () => {
    const idPeticion = ++ultimaPeticionRef.current;
    setCargando(true);
    setErrorCarga(null);

    try {
      const desde = pagina * TAMANO_PAGINA;
      const hasta = desde + TAMANO_PAGINA - 1;
      const hoy = hoyIsoLocal();
      const limite30 = sumarDiasIso(30);

      let query = supabase
        .from('documentos')
        .select(
          'id,tipo_id,folio,estado,destinatario,emitido_por,emitido_en,vigente_hasta,datos,pdf_path,pdf_sha256,confirmado_en,cancelado_por,cancelado_en,motivo_cancelacion,tipos_documento(clave,nombre)',
          { count: 'exact' }
        )
        .order('emitido_en', { ascending: false })
        .range(desde, hasta);

      if (busquedaActiva.trim()) {
        const termino = busquedaActiva.trim().replace(/[,%]/g, '');
        query = query.or(`folio.ilike.%${termino}%,destinatario.ilike.%${termino}%`);
      }

      if (filtroTipoId) {
        query = query.eq('tipo_id', Number(filtroTipoId));
      }

      if (filtroEstado === 'cancelado' || filtroEstado === 'pendiente') {
        query = query.eq('estado', filtroEstado);
      } else if (filtroEstado === 'vencido') {
        query = query.eq('estado', 'vigente').lt('vigente_hasta', hoy);
      } else if (filtroEstado === 'por_vencer') {
        query = query
          .eq('estado', 'vigente')
          .gte('vigente_hasta', hoy)
          .lte('vigente_hasta', limite30);
      } else if (filtroEstado === 'vigente') {
        query = query.eq('estado', 'vigente');
      }

      if (fechaDesde) {
        query = query.gte('emitido_en', `${fechaDesde}T00:00:00.000Z`);
      }

      if (fechaHasta) {
        query = query.lte('emitido_en', `${fechaHasta}T23:59:59.999Z`);
      }

      const { data, error, count } = await query;
      if (idPeticion !== ultimaPeticionRef.current) return;

      if (error) {
        setErrorCarga('No fue posible cargar la lista de documentos. Intente nuevamente.');
        return;
      }

      const lista = (data || []) as unknown as DocumentoPanel[];
      const filtrada =
        filtroEstado === 'vigente'
          ? lista.filter((d) => !d.vigente_hasta || !esFechaVencida(d.vigente_hasta))
          : lista;

      setDocumentos(filtrada);
      const totalSinCount =
        filtrada.length === TAMANO_PAGINA
          ? (pagina + 2) * TAMANO_PAGINA
          : pagina * TAMANO_PAGINA + filtrada.length;
      setTotalRegistros(count ?? totalSinCount);
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
  const mostrarControlesSecundarios = !esMovil || filtrosMovilAbiertos;

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

      {/* Indicadores superiores como filtros rápidos (F3, G12) */}
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

      {/* G3: Búsqueda siempre visible y filtros plegables en celular (< 768px) */}
      <section className="card filters-card" aria-label="Filtros de búsqueda">
        <form onSubmit={manejarBuscarSubmit} className="filters-form">
          <div className="filters-top-bar">
            <div className="form-group filter-search-group">
              <label htmlFor="buscar-doc" className="form-label">
                Buscar por folio o destinatario
              </label>
              <div className="search-input-row">
                <input
                  id="buscar-doc"
                  type="search"
                  className="form-input"
                  placeholder="Ej. CONST-2026-000001 o María López"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
                <button type="submit" className="btn btn-secondary">
                  Buscar
                </button>
                {esMovil && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-toggle-filters"
                    aria-expanded={filtrosMovilAbiertos}
                    aria-controls="panel-filtros-adicionales"
                    onClick={() => setFiltrosMovilAbiertos((prev) => !prev)}
                  >
                    {cantidadFiltrosSecundarios > 0
                      ? `Filtros · ${cantidadFiltrosSecundarios} ${
                          cantidadFiltrosSecundarios === 1 ? 'activo' : 'activos'
                        }`
                      : 'Filtros'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {mostrarControlesSecundarios && (
            <div id="panel-filtros-adicionales" className="filters-secondary-grid">
              <div className="form-group">
                <label htmlFor="filtro-estado" className="form-label">
                  Estado
                </label>
                <select
                  id="filtro-estado"
                  className="form-select"
                  value={filtroEstado}
                  onChange={(e) => {
                    setPagina(0);
                    setFiltroEstado(e.target.value as FiltroEstado);
                  }}
                >
                  <option value="">Todos los estados</option>
                  <option value="vigente">Vigentes</option>
                  <option value="por_vencer">Por vencer (30 días)</option>
                  <option value="vencido">Vencidos</option>
                  <option value="cancelado">Cancelados</option>
                  <option value="pendiente">Pendientes de confirmación</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="filtro-tipo" className="form-label">
                  Tipo de documento
                </label>
                <select
                  id="filtro-tipo"
                  className="form-select"
                  value={filtroTipoId}
                  onChange={(e) => {
                    setPagina(0);
                    setFiltroTipoId(e.target.value);
                  }}
                >
                  <option value="">Todos los tipos</option>
                  {tipos.map((t) => (
                    <option key={t.id} value={String(t.id)}>
                      {t.nombre} ({t.clave})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="filtro-desde" className="form-label">
                  Emitido desde
                </label>
                <input
                  id="filtro-desde"
                  type="date"
                  aria-label="Emitido desde"
                  className="form-input"
                  value={fechaDesde}
                  onChange={(e) => {
                    setPagina(0);
                    setFechaDesde(e.target.value);
                  }}
                />
              </div>

              <div className="form-group">
                <label htmlFor="filtro-hasta" className="form-label">
                  Emitido hasta
                </label>
                <input
                  id="filtro-hasta"
                  type="date"
                  aria-label="Emitido hasta"
                  className="form-input"
                  value={fechaHasta}
                  onChange={(e) => {
                    setPagina(0);
                    setFechaHasta(e.target.value);
                  }}
                />
              </div>
            </div>
          )}
        </form>

        {/* G10: Solo mostrar barra con «Limpiar filtros» cuando hay documentos en pantalla */}
        {hayFiltrosActivos && documentos.length > 0 && (
          <div className="filters-active-bar">
            <span>
              Mostrando <strong>{documentos.length}</strong> de <strong>{totalRegistros}</strong>{' '}
              registros
            </span>
            <button type="button" className="btn-link" onClick={limpiarFiltros}>
              Limpiar filtros
            </button>
          </div>
        )}
      </section>

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

      {/* G10: Lista vacía con una sola acción «Limpiar filtros» y el término buscado */}
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
            <div className="card table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Folio</th>
                    <th scope="col">Destinatario</th>
                    <th scope="col">Documento</th>
                    <th scope="col">Emitido</th>
                    <th scope="col">Vigencia</th>
                    <th scope="col">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {documentos.map((doc) => {
                    const estadoInd = resolverEstadoIndicador(doc);
                    const tipoInfo = Array.isArray(doc.tipos_documento)
                      ? doc.tipos_documento[0]
                      : doc.tipos_documento;
                    const claveTipo = tipoInfo?.clave ?? `#${doc.tipo_id}`;
                    const nombreTipo = tipoInfo?.nombre ?? `Tipo #${doc.tipo_id}`;

                    return (
                      <tr
                        key={doc.id}
                        className="table-row-clickable"
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest('a')) return;
                          navigate(`/panel/documentos/${doc.id}`);
                        }}
                      >
                        <td className="cell-nowrap">
                          <Link
                            to={`/panel/documentos/${doc.id}`}
                            className="folio-table-link mono-text"
                          >
                            {doc.folio}
                          </Link>
                        </td>
                        <td className="cell-destinatario" title={doc.destinatario}>
                          <span className="destinatario-trunc">{doc.destinatario}</span>
                        </td>
                        <td className="cell-nowrap">
                          <span className="tipo-clave-chip mono-text" title={nombreTipo}>
                            {claveTipo}
                          </span>{' '}
                          <span className="tipo-nombre-inline">{nombreTipo}</span>
                        </td>
                        <td
                          className="cell-nowrap mono-fecha"
                          title={formatearFechaHoraMX(doc.emitido_en)}
                        >
                          {formatearFechaCorta(doc.emitido_en)}
                        </td>
                        <td className="cell-nowrap mono-fecha">
                          {doc.vigente_hasta
                            ? formatearFechaCorta(doc.vigente_hasta)
                            : 'Sin vencimiento'}
                        </td>
                        <td className="cell-nowrap">
                          <EtiquetaEstado estado={estadoInd} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mobile-cards-only">
              {documentos.map((doc) => {
                const estadoInd = resolverEstadoIndicador(doc);
                const tipoInfo = Array.isArray(doc.tipos_documento)
                  ? doc.tipos_documento[0]
                  : doc.tipos_documento;
                const claveTipo = tipoInfo?.clave ?? `#${doc.tipo_id}`;

                return (
                  <Link
                    key={doc.id}
                    to={`/panel/documentos/${doc.id}`}
                    className="card mobile-doc-card-link"
                  >
                    <div className="mobile-doc-row1">
                      <span className="folio-table-link mono-text">{doc.folio}</span>
                      <EtiquetaEstado estado={estadoInd} />
                    </div>
                    <p className="mobile-doc-row2">{doc.destinatario}</p>
                    <p className="mobile-doc-row3">
                      <span className="mono-text">{claveTipo}</span>
                      <span aria-hidden="true"> · </span>
                      <span>Emitido {formatearFechaCorta(doc.emitido_en)}</span>
                      <span aria-hidden="true"> · </span>
                      <span>
                        {doc.vigente_hasta
                          ? `Vence ${formatearFechaCorta(doc.vigente_hasta)}`
                          : 'Sin vencimiento'}
                      </span>
                    </p>
                  </Link>
                );
              })}
            </div>
          )}

          <nav className="pagination-bar" aria-label="Paginación de documentos">
            <span className="pagination-info">
              <strong>
                Página {pagina + 1} de {totalPaginas}
              </strong>{' '}
              ({totalRegistros} documentos en total)
            </span>
            <div className="pagination-buttons">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={pagina === 0}
                onClick={() => setPagina((p) => Math.max(0, p - 1))}
              >
                Anterior
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={pagina + 1 >= totalPaginas}
                onClick={() => setPagina((p) => p + 1)}
              >
                Siguiente
              </button>
            </div>
          </nav>
        </>
      )}
    </LayoutPanel>
  );
}
