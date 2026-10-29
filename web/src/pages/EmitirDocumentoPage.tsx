import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutPanel } from '../components/LayoutPanel';
import { emitirDocumento } from '../lib/api';
import { formatearFecha, hoyLocalIso, sumarDiasIso } from '../lib/formato';
import { supabase } from '../lib/supabase';
import {
  DefinicionCampo,
  ErrorApi,
  RespuestaEmitirDocumento,
  SolicitudEmitirDocumento,
  TipoDocumento
} from '../lib/tipos';
import { useTituloDocumento } from '../lib/useCargaDiferida';

type ModoVigencia = 'segun_tipo' | 'fecha_especifica' | 'sin_vencimiento';
type PasoEmision = 1 | 2 | 3 | 4;

const PASOS_DEFINICION: { numero: PasoEmision; etiqueta: string }[] = [
  { numero: 1, etiqueta: 'Tipo' },
  { numero: 2, etiqueta: 'Datos' },
  { numero: 3, etiqueta: 'Confirmar' },
  { numero: 4, etiqueta: 'Listo' }
];

export function EmitirDocumentoPage() {
  useTituloDocumento('Panel · Emitir documento');

  const [tipos, setTipos] = useState<TipoDocumento[]>([]);
  const [cargandoTipos, setCargandoTipos] = useState<boolean>(true);

  const [tipoClave, setTipoClave] = useState<string>('');
  const [destinatario, setDestinatario] = useState<string>('');
  const [datos, setDatos] = useState<Record<string, string>>({});
  const [modoVigencia, setModoVigencia] = useState<ModoVigencia>('segun_tipo');
  const [fechaEspecifica, setFechaEspecifica] = useState<string>('');

  const [paso, setPaso] = useState<PasoEmision>(1);
  const [emitiendo, setEmitiendo] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<RespuestaEmitirDocumento | null>(null);
  const [copiadoCampo, setCopiadoCampo] = useState<'folio' | 'codigo' | 'enlace' | null>(null);

  useEffect(() => {
    async function cargarTiposActivos() {
      setCargandoTipos(true);
      const { data } = await supabase
        .from('tipos_documento')
        .select('*')
        .eq('activo', true)
        .order('id');

      const lista = (data || []) as TipoDocumento[];
      setTipos(lista);
      if (lista.length > 0) {
        setTipoClave(lista[0].clave);
      }
      setCargandoTipos(false);
    }
    void cargarTiposActivos();
  }, []);

  const tipoActual = tipos.find((t) => t.clave === tipoClave) || null;

  const manejarCambioTipo = (nuevaClave: string) => {
    setTipoClave(nuevaClave);
    setDatos({});
    setError(null);
  };

  const manejarCambioCampo = (clave: string, valor: string) => {
    setDatos((prev) => ({
      ...prev,
      [clave]: valor
    }));
  };

  const avanzarADatos = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!tipoActual) {
      setError('Seleccione un tipo de documento activo.');
      return;
    }
    setPaso(2);
  };

  const validarDatosCaptura = (): boolean => {
    setError(null);

    if (!tipoActual) {
      setError('Seleccione un tipo de documento activo.');
      return false;
    }

    const destLimpio = destinatario.trim();
    if (!destLimpio) {
      setError('El destinatario es obligatorio.');
      return false;
    }
    if (destLimpio.length > 200) {
      setError('El destinatario no puede exceder los 200 caracteres.');
      return false;
    }

    const camposDefinidos: DefinicionCampo[] = tipoActual.campos || [];
    for (const campo of camposDefinidos) {
      const val = (datos[campo.clave] ?? '').trim();
      if (campo.requerido && !val) {
        setError(`Falta el campo requerido: ${campo.etiqueta}`);
        return false;
      }
      if (val.length > 2000) {
        setError(`El campo "${campo.etiqueta}" excede el máximo de 2000 caracteres.`);
        return false;
      }
    }

    if (modoVigencia === 'fecha_especifica') {
      if (!fechaEspecifica) {
        setError('Seleccione la fecha específica de vigencia.');
        return false;
      }
      if (fechaEspecifica < hoyLocalIso()) {
        setError('La vigencia no puede ser anterior a hoy.');
        return false;
      }
    }

    return true;
  };

  const pasarAConfirmacion = (e: React.FormEvent) => {
    e.preventDefault();
    if (validarDatosCaptura()) {
      setPaso(3);
    }
  };

  const confirmarYEmitir = async () => {
    if (!tipoActual) return;
    setError(null);
    setEmitiendo(true);

    const datosTexto: Record<string, string> = {};
    for (const campo of tipoActual.campos || []) {
      const valor = datos[campo.clave];
      if (valor !== undefined && String(valor).trim() !== '') {
        datosTexto[campo.clave] = String(valor).trim();
      }
    }

    const solicitud: SolicitudEmitirDocumento = {
      tipo_clave: tipoActual.clave,
      destinatario: destinatario.trim(),
      datos: datosTexto,
      sin_vencimiento: modoVigencia === 'sin_vencimiento'
    };

    if (modoVigencia === 'fecha_especifica') {
      solicitud.vigente_hasta = fechaEspecifica;
    }

    try {
      const res = await emitirDocumento(solicitud);
      setResultado(res);
      setPaso(4);
    } catch (err) {
      if (err instanceof ErrorApi) {
        setError(err.message);
      } else {
        setError('Ocurrió un error inesperado al emitir el documento.');
      }
    } finally {
      setEmitiendo(false);
    }
  };

  const copiarValor = async (tipo: 'folio' | 'codigo' | 'enlace', texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiadoCampo(tipo);
      setTimeout(() => setCopiadoCampo(null), 2500);
    } catch {
      setCopiadoCampo(null);
    }
  };

  const reiniciarFormulario = () => {
    setDestinatario('');
    setDatos({});
    setModoVigencia('segun_tipo');
    setFechaEspecifica('');
    setResultado(null);
    setError(null);
    setPaso(1);
  };

  const resumenVigenciaTexto = () => {
    if (modoVigencia === 'sin_vencimiento') return 'Sin vencimiento';
    if (modoVigencia === 'fecha_especifica') return formatearFecha(fechaEspecifica);
    if (tipoActual?.vigencia_dias) {
      const estimada = sumarDiasIso(tipoActual.vigencia_dias);
      return `Según el tipo (${tipoActual.vigencia_dias} días — aprox. ${formatearFecha(estimada)})`;
    }
    return 'Según el tipo (Sin vencimiento)';
  };

  return (
    <LayoutPanel rolesPermitidos={['emisor', 'admin']}>
      <div className="panel-header-row">
        <div>
          <h1 className="panel-page-title">Emitir documento oficial</h1>
          <p className="panel-page-subtitle">
            Genera un nuevo folio, código de verificación y archivo PDF con código QR.
          </p>
        </div>
      </div>

      {/* Indicador de pasos D7: 1 Tipo → 2 Datos → 3 Confirmar → 4 Listo */}
      <nav className="stepper-nav" aria-label="Progreso de emisión">
        <ol className="stepper-list">
          {PASOS_DEFINICION.map((item) => {
            const completado = paso > item.numero;
            const actual = paso === item.numero;
            return (
              <li
                key={item.numero}
                className={`stepper-item ${actual ? 'stepper-item-active' : ''} ${
                  completado ? 'stepper-item-completed' : ''
                }`}
                aria-current={actual ? 'step' : undefined}
              >
                <span className="stepper-badge">{item.numero}</span>
                <span className="stepper-label">{item.etiqueta}</span>
              </li>
            );
          })}
        </ol>
      </nav>

      {error && (
        <div className="alert alert-error" role="alert" aria-live="assertive">
          {error}
        </div>
      )}

      {cargandoTipos ? (
        <div className="card state-card" role="status">
          <div className="spinner" aria-hidden="true" />
          <p className="state-text">Cargando catálogo de tipos de documento…</p>
        </div>
      ) : tipos.length === 0 ? (
        <div className="card state-card">
          <p className="state-text">No hay tipos de documento activos para emitir.</p>
        </div>
      ) : paso === 1 ? (
        <section className="card form-card">
          <form onSubmit={avanzarADatos} className="form-stack" noValidate>
            <div className="form-group">
              <label htmlFor="select-tipo" className="form-label">
                Seleccione el tipo de documento a emitir *
              </label>
              <select
                id="select-tipo"
                className="form-select"
                value={tipoClave}
                onChange={(e) => manejarCambioTipo(e.target.value)}
                required
              >
                {tipos.map((t) => (
                  <option key={t.id} value={t.clave}>
                    {t.clave} — {t.nombre}
                  </option>
                ))}
              </select>
              {tipoActual?.descripcion && (
                <span className="form-hint">{tipoActual.descripcion}</span>
              )}
            </div>

            {tipoActual && (
              <div className="type-preview-box">
                <p className="text-small">
                  <strong>Prefijo de folio:</strong>{' '}
                  <span className="mono-text">{tipoActual.prefijo_folio}</span> ·{' '}
                  <strong>Vigencia por defecto:</strong>{' '}
                  {tipoActual.vigencia_dias
                    ? `${tipoActual.vigencia_dias} días`
                    : 'Sin vencimiento'}{' '}
                  · <strong>Campos del formato:</strong> {(tipoActual.campos || []).length}
                </p>
              </div>
            )}

            <div className="form-actions-bar">
              <Link to="/panel" className="btn btn-secondary">
                Cancelar
              </Link>
              <button type="submit" className="btn btn-primary">
                Continuar a captura de datos
              </button>
            </div>
          </form>
        </section>
      ) : paso === 2 && tipoActual ? (
        <section className="card form-card">
          <form onSubmit={pasarAConfirmacion} className="form-stack" noValidate>
            <div className="form-group">
              <label htmlFor="input-destinatario" className="form-label">
                Destinatario (nombre completo o razón social) *
              </label>
              <input
                id="input-destinatario"
                type="text"
                className="form-input"
                placeholder="Ej. Juan Pérez López"
                maxLength={200}
                value={destinatario}
                onChange={(e) => setDestinatario(e.target.value)}
                required
              />
            </div>

            {tipoActual.campos && tipoActual.campos.length > 0 && (
              <fieldset className="fields-fieldset">
                <legend className="fieldset-legend">Datos del formato ({tipoActual.nombre})</legend>
                <div className="form-stack">
                  {tipoActual.campos.map((campo) => {
                    const idInput = `campo-${campo.clave}`;
                    const valorActual = datos[campo.clave] ?? '';

                    return (
                      <div key={campo.clave} className="form-group">
                        <label htmlFor={idInput} className="form-label">
                          {campo.etiqueta} {campo.requerido ? '*' : '(opcional)'}{' '}
                          <span className="badge badge-subtle">
                            {campo.publico ? 'Visible al verificar' : 'Solo uso interno'}
                          </span>
                        </label>

                        {campo.tipo === 'texto_largo' ? (
                          <textarea
                            id={idInput}
                            className="form-textarea"
                            rows={3}
                            value={valorActual}
                            onChange={(e) => manejarCambioCampo(campo.clave, e.target.value)}
                            required={campo.requerido}
                            maxLength={2000}
                          />
                        ) : (
                          <input
                            id={idInput}
                            type={
                              campo.tipo === 'fecha'
                                ? 'date'
                                : campo.tipo === 'numero'
                                  ? 'number'
                                  : 'text'
                            }
                            className="form-input"
                            value={valorActual}
                            onChange={(e) => manejarCambioCampo(campo.clave, e.target.value)}
                            required={campo.requerido}
                            maxLength={2000}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </fieldset>
            )}

            <fieldset className="fields-fieldset">
              <legend className="fieldset-legend">Vigencia del documento</legend>
              <div className="radio-group">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="modo-vigencia"
                    checked={modoVigencia === 'segun_tipo'}
                    onChange={() => setModoVigencia('segun_tipo')}
                  />
                  <span>
                    Según el tipo (
                    {tipoActual.vigencia_dias
                      ? `${tipoActual.vigencia_dias} días`
                      : 'sin vencimiento por defecto'}
                    )
                  </span>
                </label>

                <label className="radio-option">
                  <input
                    type="radio"
                    name="modo-vigencia"
                    checked={modoVigencia === 'fecha_especifica'}
                    onChange={() => setModoVigencia('fecha_especifica')}
                  />
                  <span>Fecha específica</span>
                </label>

                {modoVigencia === 'fecha_especifica' && (
                  <div className="nested-date-input">
                    <label htmlFor="input-vigencia-fecha" className="form-label">
                      Vigente hasta *
                    </label>
                    <input
                      id="input-vigencia-fecha"
                      type="date"
                      className="form-input"
                      min={hoyLocalIso()}
                      value={fechaEspecifica}
                      onChange={(e) => setFechaEspecifica(e.target.value)}
                      required
                    />
                  </div>
                )}

                <label className="radio-option">
                  <input
                    type="radio"
                    name="modo-vigencia"
                    checked={modoVigencia === 'sin_vencimiento'}
                    onChange={() => setModoVigencia('sin_vencimiento')}
                  />
                  <span>Sin vencimiento</span>
                </label>
              </div>
            </fieldset>

            <div className="form-actions-bar">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setError(null);
                  setPaso(1);
                }}
              >
                Cambiar tipo
              </button>
              <button type="submit" className="btn btn-primary">
                Revisar y confirmar
              </button>
            </div>
          </form>
        </section>
      ) : paso === 3 && tipoActual ? (
        <section className="card confirmation-card" aria-live="polite">
          <h2 className="section-title">Confirmar datos antes de emitir</h2>
          <p className="page-subtitle">
            Verifique cuidadosamente la información. Al confirmar se asignará un folio consecutivo
            oficial y se generará el PDF definitivo.
          </p>

          <dl className="details-grid mt-section">
            <div className="details-item">
              <dt>Tipo de documento</dt>
              <dd>
                {tipoActual.clave} — {tipoActual.nombre}
              </dd>
            </div>
            <div className="details-item">
              <dt>Vigencia seleccionada</dt>
              <dd>{resumenVigenciaTexto()}</dd>
            </div>
            <div className="details-item details-item-wide">
              <dt>Destinatario</dt>
              <dd className="destinatario-highlight">{destinatario.trim()}</dd>
            </div>
          </dl>

          {tipoActual.campos && tipoActual.campos.length > 0 && (
            <div className="custom-fields-section">
              <h3 className="details-subtitle">Campos del documento</h3>
              <dl className="details-grid">
                {tipoActual.campos.map((campo) => {
                  const val = (datos[campo.clave] ?? '').trim();
                  return (
                    <div key={campo.clave} className="details-item">
                      <dt>{campo.etiqueta}</dt>
                      <dd>
                        {val
                          ? campo.tipo === 'fecha'
                            ? formatearFecha(val)
                            : val
                          : '— (vacío)'}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          )}

          <div className="form-actions-bar">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setError(null);
                setPaso(2);
              }}
              disabled={emitiendo}
            >
              Modificar datos
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={confirmarYEmitir}
              disabled={emitiendo}
            >
              {emitiendo ? 'Emitiendo y generando PDF…' : 'Emitir'}
            </button>
          </div>
        </section>
      ) : resultado ? (
        <section className="card emission-result-card" aria-live="polite">
          <div className="status-banner status-valido">
            <div className="status-header-row">
              <svg
                className="status-icon"
                viewBox="0 0 24 24"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
              <h2 className="status-heading">Documento emitido correctamente</h2>
            </div>
            <p className="status-message">
              El documento ha quedado registrado con estado vigente y su archivo PDF está listo.
            </p>
          </div>

          <div className="alert alert-warning mt-section" role="note">
            <strong>Aviso importante:</strong> El enlace y el código solo se muestran ahora. Ya
            quedan impresos en el PDF; para reimprimir, descargue el PDF desde el detalle del
            documento.
          </div>

          {/* Feedback accesible para botones Copiar */}
          <div className="sr-only" aria-live="polite">
            {copiadoCampo ? 'Copiado al portapapeles' : ''}
          </div>

          <div className="credentials-highlight-grid mt-section">
            <div className="credential-card">
              <span className="credential-label">Folio asignado</span>
              <div className="credential-value-row">
                <strong className="mono-text credential-big-value">{resultado.folio}</strong>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => copiarValor('folio', resultado.folio)}
                >
                  {copiadoCampo === 'folio' ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>

            <div className="credential-card">
              <span className="credential-label">Código de verificación</span>
              <div className="credential-value-row">
                <strong className="mono-text credential-big-value">
                  {resultado.codigo_verificacion}
                </strong>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => copiarValor('codigo', resultado.codigo_verificacion)}
                >
                  {copiadoCampo === 'codigo' ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>
          </div>

          <dl className="details-grid mt-section">
            <div className="details-item">
              <dt>Vigencia</dt>
              <dd>
                {resultado.vigente_hasta
                  ? formatearFecha(resultado.vigente_hasta)
                  : 'Sin vencimiento'}
              </dd>
            </div>
            <div className="details-item">
              <dt>SHA-256 del PDF</dt>
              <dd className="mono-text text-small break-all">{resultado.pdf_sha256}</dd>
            </div>
            <div className="details-item details-item-wide">
              <dt>Enlace directo de verificación (QR)</dt>
              <dd className="mono-text break-all">{resultado.url_verificacion}</dd>
            </div>
          </dl>

          <div className="emission-actions-bar">
            <a
              href={resultado.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              download={`${resultado.folio}.pdf`}
              className="btn btn-primary"
            >
              Descargar PDF
            </a>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => copiarValor('enlace', resultado.url_verificacion)}
            >
              {copiadoCampo === 'enlace' ? 'Copiado' : 'Copiar enlace'}
            </button>

            <Link
              to={`/panel/documentos/${resultado.documento_id}`}
              className="btn btn-outline"
            >
              Ver detalle del documento
            </Link>

            <button type="button" className="btn btn-outline" onClick={reiniciarFormulario}>
              Emitir otro documento
            </button>
          </div>
        </section>
      ) : null}
    </LayoutPanel>
  );
}
