import React, { useCallback, useEffect, useRef, useState } from 'react';
import { EtiquetaEstado } from '../components/EtiquetaEstado';
import { LayoutPanel } from '../components/LayoutPanel';
import { supabase } from '../lib/supabase';
import { CampoEsquema, TipoCampoEsquema, TipoDocumento } from '../lib/tipos';
import { useCargaDiferida, useEsMovil, useTituloDocumento } from '../lib/useCargaDiferida';

const TIPOS_CAMPO: { valor: TipoCampoEsquema; etiqueta: string }[] = [
  { valor: 'texto', etiqueta: 'Texto corto' },
  { valor: 'texto_largo', etiqueta: 'Texto largo (párrafo)' },
  { valor: 'numero', etiqueta: 'Número' },
  { valor: 'fecha', etiqueta: 'Fecha' }
];

function textoCantidadCampos(cantidad: number): string {
  return cantidad === 1 ? '1 campo' : `${cantidad} campos`;
}

export function TiposAdminPage() {
  useTituloDocumento('Panel · Tipos de documento');

  const esMovil = useEsMovil(768);

  const [tipos, setTipos] = useState<TipoDocumento[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const mostrarEsqueleto = useCargaDiferida(cargando, 200);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const [modoFormulario, setModoFormulario] = useState<'cerrado' | 'crear' | 'editar'>('cerrado');
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [clave, setClave] = useState<string>('');
  const [nombre, setNombre] = useState<string>('');
  const [descripcion, setDescripcion] = useState<string>('');
  const [prefijoFolio, setPrefijoFolio] = useState<string>('');
  const [vigenciaDias, setVigenciaDias] = useState<string>('365');
  const [sinVigenciaDefault, setSinVigenciaDefault] = useState<boolean>(false);
  const [activo, setActivo] = useState<boolean>(true);
  const [campos, setCampos] = useState<CampoEsquema[]>([]);

  const [guardando, setGuardando] = useState<boolean>(false);
  const [erroresCampo, setErroresCampo] = useState<Record<string, string>>({});
  const [errorServidorForm, setErrorServidorForm] = useState<string | null>(null);

  const resumenErroresRef = useRef<HTMLDivElement>(null);

  const cargarTipos = useCallback(async () => {
    setCargando(true);
    setErrorGeneral(null);

    try {
      const { data, error } = await supabase
        .from('tipos_documento')
        .select('id,clave,nombre,descripcion,prefijo_folio,vigencia_dias,campos,activo,creado_en')
        .order('id', { ascending: true });

      if (error) {
        setErrorGeneral('No se pudieron cargar los tipos de documento.');
        return;
      }

      setTipos((data || []) as TipoDocumento[]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarTipos();
  }, [cargarTipos]);

  const limpiarErrorCampo = (idCampo: string) => {
    if (erroresCampo[idCampo]) {
      setErroresCampo((prev) => {
        const copia = { ...prev };
        delete copia[idCampo];
        return copia;
      });
    }
  };

  const abrirAlta = () => {
    setModoFormulario('crear');
    setEditandoId(null);
    setClave('');
    setNombre('');
    setDescripcion('');
    setPrefijoFolio('');
    setVigenciaDias('365');
    setSinVigenciaDefault(false);
    setActivo(true);
    setCampos([]);
    setErroresCampo({});
    setErrorServidorForm(null);
    setMensajeExito(null);
  };

  const abrirEdicion = (tipo: TipoDocumento) => {
    setModoFormulario('editar');
    setEditandoId(tipo.id);
    setClave(tipo.clave);
    setNombre(tipo.nombre);
    setDescripcion(tipo.descripcion || '');
    setPrefijoFolio(tipo.prefijo_folio);
    if (tipo.vigencia_dias === null) {
      setSinVigenciaDefault(true);
      setVigenciaDias('');
    } else {
      setSinVigenciaDefault(false);
      setVigenciaDias(String(tipo.vigencia_dias));
    }
    setActivo(tipo.activo);
    setCampos(Array.isArray(tipo.campos) ? [...tipo.campos] : []);
    setErroresCampo({});
    setErrorServidorForm(null);
    setMensajeExito(null);
  };

  const agregarCampo = () => {
    setCampos((prev) => [
      ...prev,
      { clave: '', etiqueta: '', tipo: 'texto', requerido: false, publico: true }
    ]);
  };

  const eliminarCampo = (indice: number) => {
    setCampos((prev) => prev.filter((_, idx) => idx !== indice));
    setErroresCampo({});
  };

  const actualizarCampo = <K extends keyof CampoEsquema>(
    indice: number,
    propiedad: K,
    valor: CampoEsquema[K]
  ) => {
    setCampos((prev) =>
      prev.map((item, idx) => (idx === indice ? { ...item, [propiedad]: valor } : item))
    );
    if (propiedad === 'clave') {
      limpiarErrorCampo(`c-clave-${indice}`);
    } else if (propiedad === 'etiqueta') {
      limpiarErrorCampo(`c-etiqueta-${indice}`);
    }
  };

  const manejarGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorServidorForm(null);

    const nuevosErrores: Record<string, string> = {};
    const claveLimpia = clave.trim().toUpperCase();
    const prefijoLimpio = prefijoFolio.trim().toUpperCase();
    const nombreLimpio = nombre.trim();

    if (!/^[A-Z0-9]{2,10}$/.test(claveLimpia)) {
      nuevosErrores['tipo-clave'] =
        'La clave debe tener entre 2 y 10 letras mayúsculas o números (ej. CONST).';
    }

    if (!/^[A-Z0-9]{2,10}$/.test(prefijoLimpio)) {
      nuevosErrores['tipo-prefijo'] =
        'El prefijo de folio debe tener entre 2 y 10 letras mayúsculas o números.';
    }

    if (!nombreLimpio) {
      nuevosErrores['tipo-nombre'] = 'Ingrese el nombre del tipo de documento.';
    }

    let vigenciaNumero: number | null = null;
    if (!sinVigenciaDefault) {
      const parsed = Number(vigenciaDias);
      if (!vigenciaDias.trim() || !Number.isInteger(parsed) || parsed <= 0) {
        nuevosErrores['tipo-vigencia'] =
          'La vigencia en días debe ser un número entero mayor a 0, o marque «Sin vencimiento por defecto».';
      } else {
        vigenciaNumero = parsed;
      }
    }

    const clavesVistas = new Set<string>();
    const camposLimpios: CampoEsquema[] = [];

    for (let i = 0; i < campos.length; i++) {
      const c = campos[i];
      const cClave = c.clave.trim().toLowerCase();
      const cEtiqueta = c.etiqueta.trim();
      const idClave = `c-clave-${i}`;
      const idEtiqueta = `c-etiqueta-${i}`;

      if (!/^[a-z][a-z0-9_]{1,39}$/.test(cClave)) {
        nuevosErrores[idClave] =
          `El campo #${i + 1} requiere una clave en minúsculas sin espacios (ej. fecha_evento).`;
      } else if (clavesVistas.has(cClave)) {
        nuevosErrores[idClave] = `La clave de campo «${cClave}» está repetida.`;
      } else {
        clavesVistas.add(cClave);
      }

      if (!cEtiqueta) {
        nuevosErrores[idEtiqueta] = `El campo #${i + 1} requiere una etiqueta visible.`;
      }

      camposLimpios.push({
        clave: cClave,
        etiqueta: cEtiqueta,
        tipo: c.tipo,
        requerido: Boolean(c.requerido),
        publico: Boolean(c.publico)
      });
    }

    setErroresCampo(nuevosErrores);

    if (Object.keys(nuevosErrores).length > 0) {
      setTimeout(() => {
        resumenErroresRef.current?.focus();
      }, 0);
      return;
    }

    setGuardando(true);
    try {
      if (modoFormulario === 'crear') {
        const payload = {
          clave: claveLimpia,
          nombre: nombreLimpio,
          descripcion: descripcion.trim() || null,
          prefijo_folio: prefijoLimpio,
          vigencia_dias: vigenciaNumero,
          campos: camposLimpios,
          activo
        };
        const { error } = await supabase.from('tipos_documento').insert(payload);
        if (error) {
          setErrorServidorForm(error.message || 'No fue posible crear el tipo de documento.');
          setTimeout(() => {
            resumenErroresRef.current?.focus();
          }, 0);
          return;
        }
        setMensajeExito(`Tipo de documento "${claveLimpia}" creado correctamente.`);
      } else if (modoFormulario === 'editar' && editandoId !== null) {
        const payloadEdicion = {
          nombre: nombreLimpio,
          descripcion: descripcion.trim() || null,
          vigencia_dias: vigenciaNumero,
          campos: camposLimpios,
          activo
        };
        const { error } = await supabase
          .from('tipos_documento')
          .update(payloadEdicion)
          .eq('id', editandoId);
        if (error) {
          setErrorServidorForm(error.message || 'No fue posible actualizar el tipo de documento.');
          setTimeout(() => {
            resumenErroresRef.current?.focus();
          }, 0);
          return;
        }
        setMensajeExito(`Tipo de documento "${claveLimpia}" actualizado correctamente.`);
      }

      setModoFormulario('cerrado');
      await cargarTipos();
    } finally {
      setGuardando(false);
    }
  };

  const alternarActivoRapido = async (tipo: TipoDocumento) => {
    setErrorGeneral(null);
    setMensajeExito(null);
    const nuevoEstado = !tipo.activo;
    const { error } = await supabase
      .from('tipos_documento')
      .update({ activo: nuevoEstado })
      .eq('id', tipo.id);

    if (error) {
      setErrorGeneral('No se pudo cambiar el estado del tipo de documento.');
      return;
    }

    setMensajeExito(
      `El tipo «${tipo.nombre}» ahora está ${nuevoEstado ? 'activo' : 'desactivado'}.`
    );
    await cargarTipos();
  };

  const listaErrores = Object.entries(erroresCampo).map(([id, texto]) => ({ id, texto }));

  return (
    <LayoutPanel rolesPermitidos={['admin']}>
      <div className="panel-header-row">
        <div>
          <h1 className="panel-page-title">Tipos de documento</h1>
          <p className="panel-page-subtitle">
            Configure los tipos de documento, su vigencia por defecto y el esquema de campos
            públicos e internos.
          </p>
        </div>
        {modoFormulario === 'cerrado' && (
          <button type="button" className="btn btn-primary" onClick={abrirAlta}>
            Nuevo tipo de documento
          </button>
        )}
      </div>

      {mensajeExito && (
        <div className="alert alert-success" role="status" aria-live="polite">
          {mensajeExito}
        </div>
      )}

      {errorGeneral && (
        <div className="alert alert-error" role="alert">
          {errorGeneral}
        </div>
      )}

      {modoFormulario !== 'cerrado' && (
        <section className="card" aria-labelledby="titulo-form-tipo">
          <h2 id="titulo-form-tipo" className="section-title">
            {modoFormulario === 'crear'
              ? 'Crear nuevo tipo de documento'
              : `Editar tipo: ${nombre}`}
          </h2>

          {(errorServidorForm || listaErrores.length > 0) && (
            <div
              ref={resumenErroresRef}
              className="alert alert-error error-summary"
              role="alert"
              tabIndex={-1}
            >
              {errorServidorForm ? (
                <p className="error-summary-title">{errorServidorForm}</p>
              ) : (
                <p className="error-summary-title">Revise los siguientes campos:</p>
              )}
              {listaErrores.length > 0 && (
                <ul className="error-summary-list">
                  {listaErrores.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        onClick={(ev) => {
                          ev.preventDefault();
                          document.getElementById(item.id)?.focus();
                        }}
                      >
                        {item.texto}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <form onSubmit={manejarGuardar} className="form-stack" noValidate>
            <div className="form-grid-2">
              <div className="form-group">
                <label htmlFor="tipo-clave" className="form-label">
                  Clave única *
                </label>
                <input
                  id="tipo-clave"
                  type="text"
                  className={`form-input mono-text ${
                    erroresCampo['tipo-clave'] ? 'form-input-invalid' : ''
                  }`}
                  placeholder="Ej. CONST"
                  maxLength={10}
                  value={clave}
                  disabled={modoFormulario === 'editar'}
                  aria-invalid={Boolean(erroresCampo['tipo-clave'])}
                  aria-describedby={
                    erroresCampo['tipo-clave']
                      ? 'hint-tipo-clave error-tipo-clave'
                      : 'hint-tipo-clave'
                  }
                  onChange={(e) => {
                    const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    setClave(v);
                    limpiarErrorCampo('tipo-clave');
                    if (modoFormulario === 'crear' && !prefijoFolio) {
                      setPrefijoFolio(v);
                      limpiarErrorCampo('tipo-prefijo');
                    }
                  }}
                  required
                />
                <span id="hint-tipo-clave" className="form-hint">
                  De 2 a 10 letras mayúsculas o números, sin espacios.
                </span>
                {erroresCampo['tipo-clave'] && (
                  <span id="error-tipo-clave" className="field-error-text" role="alert">
                    {erroresCampo['tipo-clave']}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="tipo-prefijo" className="form-label">
                  Prefijo de folio *
                </label>
                <input
                  id="tipo-prefijo"
                  type="text"
                  className={`form-input mono-text ${
                    erroresCampo['tipo-prefijo'] ? 'form-input-invalid' : ''
                  }`}
                  placeholder="Ej. CONST"
                  maxLength={10}
                  value={prefijoFolio}
                  disabled={modoFormulario === 'editar'}
                  aria-invalid={Boolean(erroresCampo['tipo-prefijo'])}
                  aria-describedby={
                    erroresCampo['tipo-prefijo']
                      ? 'hint-tipo-prefijo error-tipo-prefijo'
                      : 'hint-tipo-prefijo'
                  }
                  onChange={(e) => {
                    setPrefijoFolio(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                    limpiarErrorCampo('tipo-prefijo');
                  }}
                  required
                />
                <span id="hint-tipo-prefijo" className="form-hint">
                  Antecede al año y consecutivo (PREFIJO-AAAA-NNNNNN).
                </span>
                {erroresCampo['tipo-prefijo'] && (
                  <span id="error-tipo-prefijo" className="field-error-text" role="alert">
                    {erroresCampo['tipo-prefijo']}
                  </span>
                )}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="tipo-nombre" className="form-label">
                Nombre del tipo de documento *
              </label>
              <input
                id="tipo-nombre"
                type="text"
                className={`form-input ${erroresCampo['tipo-nombre'] ? 'form-input-invalid' : ''}`}
                placeholder="Ej. Constancia de capacitación"
                value={nombre}
                aria-invalid={Boolean(erroresCampo['tipo-nombre'])}
                aria-describedby={
                  erroresCampo['tipo-nombre']
                    ? 'hint-tipo-nombre error-tipo-nombre'
                    : 'hint-tipo-nombre'
                }
                onChange={(e) => {
                  setNombre(e.target.value);
                  limpiarErrorCampo('tipo-nombre');
                }}
                required
              />
              <span id="hint-tipo-nombre" className="form-hint">
                Nombre oficial visible en el título del PDF y en la página de verificación.
              </span>
              {erroresCampo['tipo-nombre'] && (
                <span id="error-tipo-nombre" className="field-error-text" role="alert">
                  {erroresCampo['tipo-nombre']}
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="tipo-desc" className="form-label">
                Descripción (opcional)
              </label>
              <input
                id="tipo-desc"
                type="text"
                className="form-input"
                placeholder="Ej. Constancia para cursos internos y certificaciones"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
            </div>

            {/* G7: Sin vencimiento por defecto junto a Vigencia por defecto; Tipo activo como interruptor */}
            <div className="form-grid-2">
              <div className="form-group vigencia-grupo">
                <label htmlFor="tipo-vigencia" className="form-label">
                  Vigencia por defecto (días)
                </label>
                <input
                  id="tipo-vigencia"
                  type="number"
                  min={1}
                  placeholder="Ej. 365"
                  className={`form-input ${
                    erroresCampo['tipo-vigencia'] ? 'form-input-invalid' : ''
                  }`}
                  value={vigenciaDias}
                  disabled={sinVigenciaDefault}
                  aria-invalid={Boolean(erroresCampo['tipo-vigencia'])}
                  aria-describedby={
                    erroresCampo['tipo-vigencia'] ? 'error-tipo-vigencia' : undefined
                  }
                  onChange={(e) => {
                    setVigenciaDias(e.target.value);
                    limpiarErrorCampo('tipo-vigencia');
                  }}
                />
                {erroresCampo['tipo-vigencia'] && (
                  <span id="error-tipo-vigencia" className="field-error-text" role="alert">
                    {erroresCampo['tipo-vigencia']}
                  </span>
                )}
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={sinVigenciaDefault}
                    onChange={(e) => {
                      setSinVigenciaDefault(e.target.checked);
                      limpiarErrorCampo('tipo-vigencia');
                    }}
                  />
                  <span>Sin vencimiento por defecto</span>
                </label>
              </div>

              <div className="form-group">
                <span className="form-label" id="label-disponibilidad-tipo">
                  Disponibilidad
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={activo}
                  aria-labelledby="label-disponibilidad-tipo"
                  className={`switch-btn ${activo ? 'switch-btn-on' : 'switch-btn-off'}`}
                  onClick={() => setActivo((prev) => !prev)}
                >
                  <span className="switch-track" aria-hidden="true">
                    <span className="switch-thumb" />
                  </span>
                  <span className="switch-label">
                    {activo ? 'Tipo activo para nuevas emisiones' : 'Tipo inactivo'}
                  </span>
                </button>
              </div>
            </div>

            <div className="dynamic-fields-section">
              <div className="section-header-inline">
                <div>
                  <h3 className="subsection-title">Esquema de campos personalizados</h3>
                  <p className="section-helper">
                    Los campos marcados como «Público» se muestran en la página pública de
                    verificación; los no marcados solo se ven en el panel interno.
                  </p>
                </div>
                <button type="button" className="btn btn-secondary btn-sm" onClick={agregarCampo}>
                  Agregar campo
                </button>
              </div>

              {campos.length === 0 ? (
                <p className="text-muted">Sin campos adicionales definidos.</p>
              ) : (
                <div className="schema-fields-list">
                  {campos.map((campo, idx) => {
                    const idClave = `c-clave-${idx}`;
                    const idEtiqueta = `c-etiqueta-${idx}`;
                    const errClave = erroresCampo[idClave];
                    const errEtiqueta = erroresCampo[idEtiqueta];

                    return (
                      <div key={idx} className="schema-field-card">
                        <div className="form-grid-3">
                          <div className="form-group">
                            <label htmlFor={idClave} className="form-label">
                              Clave *
                            </label>
                            <input
                              id={idClave}
                              type="text"
                              className={`form-input mono-text ${
                                errClave ? 'form-input-invalid' : ''
                              }`}
                              placeholder="Ej. concepto"
                              value={campo.clave}
                              aria-invalid={Boolean(errClave)}
                              aria-describedby={
                                errClave
                                  ? `hint-${idClave} error-${idClave}`
                                  : `hint-${idClave}`
                              }
                              onChange={(e) =>
                                actualizarCampo(
                                  idx,
                                  'clave',
                                  e.target.value.toLowerCase().replace(/\s+/g, '_')
                                )
                              }
                              required
                            />
                            <span id={`hint-${idClave}`} className="form-hint">
                              Minúsculas, números y guion bajo.
                            </span>
                            {errClave && (
                              <span id={`error-${idClave}`} className="field-error-text" role="alert">
                                {errClave}
                              </span>
                            )}
                          </div>

                          <div className="form-group">
                            <label htmlFor={idEtiqueta} className="form-label">
                              Etiqueta visible *
                            </label>
                            <input
                              id={idEtiqueta}
                              type="text"
                              className={`form-input ${errEtiqueta ? 'form-input-invalid' : ''}`}
                              placeholder="Ej. Concepto"
                              value={campo.etiqueta}
                              aria-invalid={Boolean(errEtiqueta)}
                              aria-describedby={
                                errEtiqueta
                                  ? `hint-${idEtiqueta} error-${idEtiqueta}`
                                  : `hint-${idEtiqueta}`
                              }
                              onChange={(e) => actualizarCampo(idx, 'etiqueta', e.target.value)}
                              required
                            />
                            <span id={`hint-${idEtiqueta}`} className="form-hint">
                              Nombre visible en el formulario y el PDF.
                            </span>
                            {errEtiqueta && (
                              <span
                                id={`error-${idEtiqueta}`}
                                className="field-error-text"
                                role="alert"
                              >
                                {errEtiqueta}
                              </span>
                            )}
                          </div>

                          <div className="form-group">
                            <label htmlFor={`c-tipo-${idx}`} className="form-label">
                              Tipo de dato
                            </label>
                            <select
                              id={`c-tipo-${idx}`}
                              className="form-select"
                              value={campo.tipo}
                              onChange={(e) =>
                                actualizarCampo(idx, 'tipo', e.target.value as TipoCampoEsquema)
                              }
                            >
                              {TIPOS_CAMPO.map((tc) => (
                                <option key={tc.valor} value={tc.valor}>
                                  {tc.etiqueta}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="schema-field-footer">
                          <div className="schema-checkboxes">
                            <label className="checkbox-row">
                              <input
                                type="checkbox"
                                checked={campo.requerido}
                                onChange={(e) =>
                                  actualizarCampo(idx, 'requerido', e.target.checked)
                                }
                              />
                              <span>Requerido</span>
                            </label>

                            <label className="checkbox-row">
                              <input
                                type="checkbox"
                                checked={campo.publico}
                                onChange={(e) => actualizarCampo(idx, 'publico', e.target.checked)}
                              />
                              <span>Público (visible al escanear QR)</span>
                            </label>
                          </div>

                          <button
                            type="button"
                            className="btn-link text-danger"
                            onClick={() => eliminarCampo(idx)}
                          >
                            Quitar campo
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={guardando}
                onClick={() => setModoFormulario('cerrado')}
              >
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={guardando}>
                {guardando ? 'Guardando…' : 'Guardar tipo de documento'}
              </button>
            </div>
          </form>
        </section>
      )}

      {cargando && mostrarEsqueleto && (
        <div className="card" role="status" aria-live="polite">
          <div className="skeleton skeleton-row" />
          <div className="skeleton skeleton-row" />
          <p className="sr-only">Cargando tipos de documento…</p>
        </div>
      )}

      {/* G2: Tabla en escritorio (>= 768px) y tarjetas en celular (< 768px) */}
      {!cargando && (
        <>
          {!esMovil ? (
            <div className="card table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Clave</th>
                    <th scope="col">Nombre</th>
                    <th scope="col">Prefijo folio</th>
                    <th scope="col">Vigencia por defecto</th>
                    <th scope="col">Campos</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {tipos.map((t) => (
                    <tr key={t.id}>
                      <td className="cell-nowrap">
                        <span className="tipo-clave-chip mono-text">{t.clave}</span>
                      </td>
                      <td>
                        <strong>{t.nombre}</strong>
                        {t.descripcion && <div className="cell-subtext">{t.descripcion}</div>}
                      </td>
                      <td className="mono-text cell-nowrap">{t.prefijo_folio}</td>
                      <td className="cell-nowrap">
                        {t.vigencia_dias ? `${t.vigencia_dias} días` : 'Sin vencimiento'}
                      </td>
                      <td className="cell-nowrap">
                        {textoCantidadCampos(Array.isArray(t.campos) ? t.campos.length : 0)}
                      </td>
                      <td className="cell-nowrap">
                        <EtiquetaEstado
                          estado={t.activo ? 'vigente' : 'cancelado'}
                          etiqueta={t.activo ? 'Activo' : 'Inactivo'}
                        />
                      </td>
                      <td className="cell-nowrap">
                        <div className="row-actions">
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => abrirEdicion(t)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => alternarActivoRapido(t)}
                          >
                            {t.activo ? 'Desactivar' : 'Activar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mobile-cards-only">
              {tipos.map((t) => (
                <div key={t.id} className="card mobile-tipo-card">
                  <div className="mobile-doc-row1">
                    <div className="mobile-tipo-head">
                      <span className="tipo-clave-chip mono-text">{t.clave}</span>
                      <strong>{t.nombre}</strong>
                    </div>
                    <EtiquetaEstado
                      estado={t.activo ? 'vigente' : 'cancelado'}
                      etiqueta={t.activo ? 'Activo' : 'Inactivo'}
                    />
                  </div>
                  {t.descripcion && <p className="cell-subtext">{t.descripcion}</p>}
                  <p className="mobile-doc-row3">
                    <span>
                      Prefijo <strong className="mono-text">{t.prefijo_folio}</strong>
                    </span>
                    <span aria-hidden="true"> · </span>
                    <span>{t.vigencia_dias ? `${t.vigencia_dias} días` : 'Sin vencimiento'}</span>
                    <span aria-hidden="true"> · </span>
                    <span>{textoCantidadCampos(Array.isArray(t.campos) ? t.campos.length : 0)}</span>
                  </p>
                  <div className="mobile-tipo-actions">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => abrirEdicion(t)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => alternarActivoRapido(t)}
                    >
                      {t.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </LayoutPanel>
  );
}
