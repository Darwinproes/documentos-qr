import { Link, useNavigate } from 'react-router-dom';
import { EtiquetaEstado, resolverEstadoIndicador } from '../EtiquetaEstado';
import { formatearFecha, formatearFechaHora } from '../../lib/formato';
import { DocumentoDetalle } from '../../lib/tipos';

interface TablaDocumentosProps {
  documentos: DocumentoDetalle[];
}

export function TablaDocumentos({ documentos }: TablaDocumentosProps) {
  const navigate = useNavigate();

  return (
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
                  title={formatearFechaHora(doc.emitido_en)}
                >
                  {formatearFecha(doc.emitido_en)}
                </td>
                <td className="cell-nowrap mono-fecha">
                  {doc.vigente_hasta
                    ? formatearFecha(doc.vigente_hasta)
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
  );
}
