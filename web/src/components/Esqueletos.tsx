export function EsqueletoResultado() {
  return (
    <section
      className="verification-result-card skeleton-card"
      aria-busy="true"
      aria-live="polite"
      aria-label="Consultando registro oficial de documentos"
    >
      <div className="skeleton-banner">
        <div className="skeleton-circle" />
        <div className="skeleton-stack">
          <div className="skeleton-line skeleton-line-lg" />
          <div className="skeleton-line skeleton-line-md" />
        </div>
      </div>
      <div className="document-details-box">
        <div className="skeleton-line skeleton-line-title" />
        <div className="details-grid">
          <div className="skeleton-box" />
          <div className="skeleton-box" />
          <div className="skeleton-box details-item-wide" />
          <div className="skeleton-box" />
          <div className="skeleton-box" />
        </div>
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
        <div key={fila} className="skeleton-row">
          <div className="skeleton-line skeleton-line-sm" />
          <div className="skeleton-line skeleton-line-md" />
          <div className="skeleton-line skeleton-line-sm" />
        </div>
      ))}
    </div>
  );
}

export function EsqueletoDetalle() {
  return (
    <div
      className="detail-grid-layout"
      aria-busy="true"
      aria-live="polite"
      aria-label="Cargando detalle del documento"
    >
      <div className="card">
        <div className="skeleton-line skeleton-line-title" />
        <div className="details-grid">
          <div className="skeleton-box" />
          <div className="skeleton-box" />
          <div className="skeleton-box details-item-wide" />
          <div className="skeleton-box" />
          <div className="skeleton-box" />
        </div>
      </div>
      <div className="card">
        <div className="skeleton-line skeleton-line-title" />
        <div className="skeleton-stack">
          <div className="skeleton-box" />
          <div className="skeleton-box" />
        </div>
      </div>
    </div>
  );
}
