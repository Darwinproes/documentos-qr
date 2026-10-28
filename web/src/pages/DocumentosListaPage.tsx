import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { EsqueletoLista } from '../components/Esqueletos';
import { EtiquetaEstado } from '../components/EtiquetaEstado';
import { LayoutPanel } from '../components/LayoutPanel';
import { useAuth } from '../context/AuthContext';
import {
  calcularEstadoVisual,
  formatearFecha,
  formatearFechaHora,
  hoyLocalIso
} from '../lib/formato';
import { supabase } from '../lib/supabase';
import { DocumentoResumen, TipoDocumento } from '../lib/tipos';
import { useCargaDiferida, useTituloDocumento } from '../lib/useCargaDiferida';

const TAMANO_PAGINA = 25;

function obtenerNombreTipo(doc: DocumentoResumen): string {
  const td = doc.tipos_documento;
  if (!td) return '—';
  if (Array.isArray(td)) {
    return td[0] ? `${td[0].clave} — ${td[0].nombre}` : '—';
  }
  return `${td.clave} — ${td.nombre}`;
}

export function DocumentosListaPage() {
  useTituloDocumento('Panel · Documentos');

  const { perfil } = useAuth();

  const [tipos, setTipos] = useState<TipoDocumento[]>([]);
  const [documentos, setDocumentos] = useState<DocumentoResumen[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [pagina, setPagina] = useState<number>(0);

  const [busquedaInput, setBusquedaInput] = useState<string>('');
  const [busquedaActiva, setBusquedaActiva] = useState<string>('');
  const [filtroTipoId, setFiltroTipoId] = useState<string>('');
  const [filtroEstado, setFiltroEstado] = useState<string>('');

  const [cargando, setCargando] = useState<boolean>(true);
  const mostrarEsqueleto = useCargaDiferida(cargando, 300);
  const [error, setError] = useState<string | null>(null);

  const puedeEmitir = perfil?.rol === 'emisor' || perfil?.rol === 'admin';

  useEffect(() => {
    async function cargarTipos() {
      const { data } = await supabase
        .from('tipos_documento')
        .select('id,clave,nombre,descripcion,prefijo_folio,vigencia_dias,campos,activo')
        .order('nombre');
      if (data) {
        setTipos(data as TipoDocumento[]);
      }
    }
    void cargarTipos();
  }, []);

  const cargarDocumentos = useCallback(async () => {
    setCargando(true);
    setError(null);

    const desde = pagina * TAMANO_PAGINA;
    const hasta = desde + TAMANO_PAGINA - 1;

    let query = supabase
      .from('documentos')
      .select(
        'id,folio,estado,destinatario,emitido_en,vigente_hasta,tipo_id,tipos_documento(clave,nombre)',
        { count: 'exact' }
      );

    if (filtroTipoId) {
      query = query.eq('tipo_id', Number(filtroTipoId));
    }

    const hoy = hoyLocalIso();
    if (!filtroEstado) {
      query = query.neq('estado', 'pendiente');
    } else if (filtroEstado === 'pendiente') {
      query = query.eq('estado', 'pendiente');
    } else if (filtroEstado === 'cancelado') {
      query = query.eq('estado', 'cancelado');
    } else if (filtroEstado === 'vigente') {
      query = query
        .eq('estado', 'vigente')
        .or(`vigente_hasta.is.null,vigente_hasta.gte.${hoy}`);
    } else if (filtroEstado === 'vencido') {
      query = query.eq('estado', 'vigente').lt('vigente_hasta', hoy);
    }

    const termino = busquedaActiva.trim().replace(/[,()]/g, ' ');
    if (termino) {
      query = query.or(`folio.ilike.%${termino}%,destinatario.ilike.%${termino}%`);
    }

    const { data, error: errDb, count } = await query
      .order('emitido_en', { ascending: false })
      .range(desde, hasta);

    if (errDb) {
      setError('No se pudo cargar la lista de documentos.');
      setDocumentos([]);
      setTotal(0);
    } else {
      setDocumentos((data || []) as DocumentoResumen[]);
      setTotal(count || 0);
    }

    setCargando(false);
  }, [pagina, filtroTipoId, filtroEstado, busquedaActiva]);

  useEffect(() => {
    void cargarDocumentos();
  }, [cargarDocumentos]);

  const manejarBuscarSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPagina(0);
    setBusquedaActiva(busquedaInput);
  };

  const limpiarFiltros = () => {
    setBusquedaInput('');
    setBusquedaActiva('');
    setFiltroTipoId('');
    setFiltroEstado('');
    setPagina(0);
  };

  const totalPaginas = Math.max(1, Math.ceil(total / TAMANO_PAGINA));

  return (
    <LayoutPanel>
      <div className="panel-header-row">
        <div>
          <h1 className="page-title">Documentos emitidos</h1>
          <p className="page-subtitle">
            Consulta y seguimiento de documentos oficiales en el registro central.
          </p>
        </div>
        {puedeEmitir && (
          <Link to="/panel/emitir" className="btn btn-primary">
            Emitir documento
          </Link>
        )}
      </div>

      <section className="card filters-card" aria-label="Filtros de búsqueda">
        <form onSubmit={manejarBuscarSubmit} className="filters-grid">
          <div className="form-group">
            <label htmlFor="filtro-busqueda" className="form-label">
              Buscar por folio o destinatario
            </label>
            <div className="input-with-btn">
              <input
                id="filtro-busqueda"
                type="search"
                className="form-input"
                placeholder="Ej. CONST-2026 o Juan Pérez…"
                value={busquedaInput}
                onChange={(e) => setBusquedaInput(e.target.value)}
              />
              <button type="submit" className="btn btn-secondary">
                Buscar
              </button>
            </div>
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
                setFiltroTipoId(e.target.value);
                setPagina(0);
              }}
            >
              <option value="">Todos los tipos</option>
              {tipos.map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.clave} — {t.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="filtro-estado" className="form-label">
              Estado
            </label>
            <select
              id="filtro-estado"
              className="form-select"
              value={filtroEstado}
              onChange={(e) => {
                setFiltroEstado(e.target.value);
                setPagina(0);
              }}
            >
              <option value="">Todos (excepto pendientes)</option>
              <option value="vigente">Vigente</option>
              <option value="vencido">Vencido</option>
              <option value="cancelado">Cancelado</option>
              <option value="pendiente">Pendiente (sin confirmar PDF)</option>
            </select>
          </div>

          <div className="form-group filters-actions">
            <button type="button" className="btn btn-outline" onClick={limpiarFiltros}>
              Limpiar filtros
            </button>
          </div>
        </form>
      </section>

      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}

      <section className="card table-card" aria-live="polite">
        {cargando ? (
          mostrarEsqueleto ? (
            <EsqueletoLista />
          ) : null
        ) : documentos.length === 0 ? (
          <div className="state-card">
            <h2 className="state-heading">No hay documentos para mostrar</h2>
            <p className="state-description">
              No se encontraron documentos emitidos con los criterios seleccionados.
            </p>
            {puedeEmitir && (
              <div className="state-actions">
                <Link to="/panel/emitir" className="btn btn-primary">
                  Emitir documento
                </Link>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Tabla para escritorio (>= 768 px) */}
            <div className="table-responsive desktop-only-table">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Folio</th>
                    <th>Tipo</th>
                    <th>Destinatario</th>
                    <th>Emitido</th>
                    <th>Vigencia</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {documentos.map((doc) => {
                    const estadoVisual = calcularEstadoVisual(doc.estado, doc.vigente_hasta);
                    return (
                      <tr key={doc.id}>
                        <td className="mono-text font-semibold">
                          <Link to={`/panel/documentos/${doc.id}`} className="table-link">
                            {doc.folio}
                          </Link>
                        </td>
                        <td>{obtenerNombreTipo(doc)}</td>
                        <td>{doc.destinatario}</td>
                        <td>{formatearFechaHora(doc.emitido_en)}</td>
                        <td>
                          {doc.vigente_hasta
                            ? formatearFecha(doc.vigente_hasta)
                            : 'Sin vencimiento'}
                        </td>
                        <td>
                          <EtiquetaEstado estado={estadoVisual} />
                        </td>
                        <td>
                          <Link
                            to={`/panel/documentos/${doc.id}`}
                            className="btn btn-sm btn-secondary"
                          >
                            Ver detalle
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Tarjetas para móvil (< 768 px) */}
            <div className="mobile-cards-list">
              {documentos.map((doc) => {
                const estadoVisual = calcularEstadoVisual(doc.estado, doc.vigente_hasta);
                return (
                  <article key={doc.id} className="mobile-doc-card">
                    <div className="mobile-doc-card-top">
                      <Link
                        to={`/panel/documentos/${doc.id}`}
                        className="mono-text mobile-doc-folio"
                      >
                        {doc.folio}
                      </Link>
                      <EtiquetaEstado estado={estadoVisual} />
                    </div>
                    <p className="mobile-doc-destinatario">{doc.destinatario}</p>
                    <p className="mobile-doc-meta">
                      <span>{obtenerNombreTipo(doc)}</span> ·{' '}
                      <span>Emitido: {formatearFecha(doc.emitido_en)}</span>
                    </p>
                    <div className="mobile-doc-actions">
                      <Link
                        to={`/panel/documentos/${doc.id}`}
                        className="btn btn-sm btn-secondary btn-block"
                      >
                        Ver detalle
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="pagination-bar">
              <span className="pagination-info">
                Mostrando {pagina * TAMANO_PAGINA + 1}–
                {Math.min((pagina + 1) * TAMANO_PAGINA, total)} de {total} documentos
              </span>
              <div className="pagination-controls">
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  disabled={pagina === 0}
                  onClick={() => setPagina((p) => Math.max(0, p - 1))}
                >
                  Anterior
                </button>
                <span className="pagination-page-indicator">
                  Página {pagina + 1} de {totalPaginas}
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  disabled={pagina + 1 >= totalPaginas}
                  onClick={() => setPagina((p) => p + 1)}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </LayoutPanel>
  );
}
