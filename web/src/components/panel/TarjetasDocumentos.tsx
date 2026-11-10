import { Link } from 'react-router-dom';
import { EtiquetaEstado, resolverEstadoIndicador } from '../EtiquetaEstado';
import { formatearFecha } from '../../lib/formato';
import { DocumentoDetalle } from '../../lib/tipos';

interface TarjetasDocumentosProps {
  documentos: DocumentoDetalle[];
}

export function TarjetasDocumentos({ documentos }: TarjetasDocumentosProps) {
  return (
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
              <span>Emitido {formatearFecha(doc.emitido_en)}</span>
              <span aria-hidden="true"> · </span>
              <span>
                {doc.vigente_hasta
                  ? `Vence ${formatearFecha(doc.vigente_hasta)}`
                  : 'Sin vencimiento'}
              </span>
            </p>
          </Link>
        );
      })}
    </div>
  );
}
