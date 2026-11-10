import React from 'react';
import { FiltroEstado } from '../../lib/panel';
import { TipoDocumento } from '../../lib/tipos';

interface FiltrosDocumentosProps {
  busqueda: string;
  onBusquedaChange: (valor: string) => void;
  onBuscarSubmit: (e: React.FormEvent) => void;
  filtroEstado: FiltroEstado;
  onFiltroEstadoChange: (estado: FiltroEstado) => void;
  filtroTipoId: string;
  onFiltroTipoIdChange: (tipoId: string) => void;
  fechaDesde: string;
  onFechaDesdeChange: (fecha: string) => void;
  fechaHasta: string;
  onFechaHastaChange: (fecha: string) => void;
  tipos: Pick<TipoDocumento, 'id' | 'clave' | 'nombre'>[];
  esMovil: boolean;
  filtrosMovilAbiertos: boolean;
  onAlternarFiltrosMovil: () => void;
  cantidadFiltrosSecundarios: number;
  hayFiltrosActivos: boolean;
  cantidadDocumentosEnPantalla: number;
  totalRegistros: number;
  onLimpiarFiltros: () => void;
}

export function FiltrosDocumentos({
  busqueda,
  onBusquedaChange,
  onBuscarSubmit,
  filtroEstado,
  onFiltroEstadoChange,
  filtroTipoId,
  onFiltroTipoIdChange,
  fechaDesde,
  onFechaDesdeChange,
  fechaHasta,
  onFechaHastaChange,
  tipos,
  esMovil,
  filtrosMovilAbiertos,
  onAlternarFiltrosMovil,
  cantidadFiltrosSecundarios,
  hayFiltrosActivos,
  cantidadDocumentosEnPantalla,
  totalRegistros,
  onLimpiarFiltros
}: FiltrosDocumentosProps) {
  const mostrarControlesSecundarios = !esMovil || filtrosMovilAbiertos;

  return (
    <section className="card filters-card" aria-label="Filtros de búsqueda">
      <form onSubmit={onBuscarSubmit} className="filters-form">
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
                onChange={(e) => onBusquedaChange(e.target.value)}
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
                  onClick={onAlternarFiltrosMovil}
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
                onChange={(e) => onFiltroEstadoChange(e.target.value as FiltroEstado)}
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
                onChange={(e) => onFiltroTipoIdChange(e.target.value)}
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
                onChange={(e) => onFechaDesdeChange(e.target.value)}
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
                onChange={(e) => onFechaHastaChange(e.target.value)}
              />
            </div>
          </div>
        )}
      </form>

      {hayFiltrosActivos && cantidadDocumentosEnPantalla > 0 && (
        <div className="filters-active-bar">
          <span>
            Mostrando <strong>{cantidadDocumentosEnPantalla}</strong> de{' '}
            <strong>{totalRegistros}</strong> registros
          </span>
          <button type="button" className="btn-link" onClick={onLimpiarFiltros}>
            Limpiar filtros
          </button>
        </div>
      )}
    </section>
  );
}
