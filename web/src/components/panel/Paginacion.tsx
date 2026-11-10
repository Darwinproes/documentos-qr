interface PaginacionProps {
  pagina: number;
  totalPaginas: number;
  totalRegistros: number;
  onCambiarPagina: (nuevaPagina: number) => void;
}

export function Paginacion({
  pagina,
  totalPaginas,
  totalRegistros,
  onCambiarPagina
}: PaginacionProps) {
  return (
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
          onClick={() => onCambiarPagina(Math.max(0, pagina - 1))}
        >
          Anterior
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={pagina + 1 >= totalPaginas}
          onClick={() => onCambiarPagina(pagina + 1)}
        >
          Siguiente
        </button>
      </div>
    </nav>
  );
}
