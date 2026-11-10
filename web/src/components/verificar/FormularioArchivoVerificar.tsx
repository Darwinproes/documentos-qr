import { useRef, useState } from 'react';
import { formatearTamanoBytes } from '../../lib/formato';

const MAX_BYTES_PDF = 10 * 1024 * 1024;

interface FormularioArchivoVerificarProps {
  archivoInfo: { nombre: string; tamano: number } | null;
  hashCalculado: string | null;
  errorArchivo?: string;
  onSeleccionarPdfValido: (archivo: File) => Promise<void>;
  onErrorValidacionArchivo: (mensaje: string) => void;
}

export function FormularioArchivoVerificar({
  archivoInfo,
  hashCalculado,
  errorArchivo,
  onSeleccionarPdfValido,
  onErrorValidacionArchivo
}: FormularioArchivoVerificarProps) {
  const [arrastrando, setArrastrando] = useState<boolean>(false);
  const inputArchivoRef = useRef<HTMLInputElement>(null);

  const manejarArchivo = async (archivo: File) => {
    const esPdf = archivo.type === 'application/pdf' || archivo.name.toLowerCase().endsWith('.pdf');
    if (!esPdf || archivo.size > MAX_BYTES_PDF || archivo.size === 0) {
      onErrorValidacionArchivo(
        !esPdf
          ? 'Seleccione únicamente un archivo en formato PDF (.pdf).'
          : archivo.size > MAX_BYTES_PDF
            ? 'El archivo supera el tamaño máximo permitido de 10 MB.'
            : 'El archivo seleccionado está vacío.'
      );
      return;
    }
    await onSeleccionarPdfValido(archivo);
  };

  return (
    <div id="panel-archivo" role="tabpanel" aria-labelledby="tab-archivo" className="tab-panel">
      <div
        role="button"
        tabIndex={0}
        aria-label="Zona para arrastrar o elegir archivo PDF (máximo 10 MB)"
        className={`dropzone ${arrastrando ? 'dropzone-active' : ''}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputArchivoRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastrando(false);
          const archivo = e.dataTransfer.files?.[0];
          if (archivo) void manejarArchivo(archivo);
        }}
        onClick={(e) => {
          if ((e.target as HTMLElement).tagName !== 'BUTTON') {
            inputArchivoRef.current?.click();
          }
        }}
      >
        <input
          ref={inputArchivoRef}
          id="input-archivo-pdf"
          type="file"
          accept=".pdf,application/pdf"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            const archivo = e.target.files?.[0];
            if (archivo) void manejarArchivo(archivo);
          }}
        />
        <svg className="dropzone-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12-3-3m0 0-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
          />
        </svg>
        <p className="dropzone-title">Arrastre aquí el archivo PDF o selecciónelo desde su dispositivo</p>
        <p className="dropzone-subtitle">Solo archivos .pdf (máximo 10 MB)</p>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={(e) => {
            e.stopPropagation();
            inputArchivoRef.current?.click();
          }}
        >
          Elegir archivo PDF
        </button>

        {archivoInfo && (
          <div className="file-meta-box" onClick={(e) => e.stopPropagation()}>
            <p className="file-meta-name">
              Archivo seleccionado: <strong>{archivoInfo.nombre}</strong> ({formatearTamanoBytes(archivoInfo.tamano)})
            </p>
            {hashCalculado && (
              <p className="file-meta-hash">
                SHA-256: <code className="mono-text">{hashCalculado}</code>
              </p>
            )}
          </div>
        )}
      </div>

      {errorArchivo && (
        <div className="field-error-text mt-xs" role="alert">{errorArchivo}</div>
      )}
      <p className="privacy-notice">
        Su archivo no se envía a ningún servidor; solo se calcula su huella digital.
      </p>
    </div>
  );
}
