export function EsqueletoResultado() {
  return (
    <section
      className="resultado-institucional"
      aria-busy="true"
      aria-live="polite"
      aria-label="Consultando registro oficial de documentos"
    >
      <div className="veredicto-encabezado">
        <div className="skeleton skeleton-circle" />
        <div className="veredicto-textos">
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-subtitle" />
        </div>
      </div>
      <div>
        <div className="skeleton skeleton-row" />
        <div className="skeleton skeleton-row" />
        <div className="skeleton skeleton-row" />
      </div>
    </section>
  );
}

export function EsqueletoLista() {
  return (
    <div
      className="skeleton-list-wrapper"
      aria-busy="true"
      aria-live="polite"
      aria-label="Cargando lista de documentos"
    >
      {[1, 2, 3, 4, 5].map((fila) => (
        <div key={fila} className="skeleton skeleton-row" />
      ))}
    </div>
  );
}

export function EsqueletoDetalle() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      aria-label="Cargando detalle del documento"
    >
      <div className="card">
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-row" />
        <div className="skeleton skeleton-row" />
      </div>
    </div>
  );
}
