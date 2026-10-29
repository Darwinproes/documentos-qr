import React, { useCallback, useEffect, useState } from 'react';
import { LayoutPanel } from '../components/LayoutPanel';
import { LedEstado } from '../components/LedEstado';
import { supabase } from '../lib/supabase';
import { CampoEsquema, TipoCampoEsquema, TipoDocumento } from '../lib/tipos';
import { useCargaDiferida, useTituloDocumento } from '../lib/useCargaDiferida';

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
  const [errorForm, setErrorForm] = useState<string | null>(null);

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
    setErrorForm(null);
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
    setErrorForm(null);
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
  };

  const actualizarCampo = <K extends keyof CampoEsquema>(
    indice: number,
    propiedad: K,
    valor: CampoEsquema[K]
  ) => {
    setCampos((prev) =>
      prev.map((item, idx) => (idx === indice ? { ...item, [propiedad]: valor } : item))
    );
  };

  const manejarGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorForm(null);

    const claveLimpia = clave.trim().toUpperCase();
    const prefijoLimpio = prefijoFolio.trim().toUpperCase();
    const nombreLimpio = nombre.trim();

    if (!/^[A-Z0-9]{2,10}$/.test(claveLimpia)) {
      setErrorForm('La clave debe tener entre 2 y 10 letras mayúsculas o números (ej. CONST).');
      return;
    }

    if (!/^[A-Z0-9]{2,10}$/.test(prefijoLimpio)) {
      setErrorForm('El prefijo de folio debe tener entre 2 y 10 letras mayúsculas o números.');
      return;
    }

    if (!nombreLimpio) {
      setErrorForm('Ingrese el nombre del tipo de documento.');
      return;
    }

    let vigenciaNumero: number | null = null;
    if (!sinVigenciaDefault) {
      const parsed = Number(vigenciaDias);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        setErrorForm(
          'La vigencia en días debe ser un número entero mayor a 0, o marque «Sin vencimiento por defecto».'
        );
        return;
      }
      vigenciaNumero = parsed;
    }

    const clavesVistas = new Set<string>();
    const camposLimpios: CampoEsquema[] = [];

    for (let i = 0; i < campos.length; i++) {
      const c = campos[i];
      const cClave = c.clave.trim().toLowerCase();
      const cEtiqueta = c.etiqueta.trim();

      if (!/^[a-z][a-z0-9_]{1,39}$/.test(cClave)) {
        setErrorForm(
          `El campo #${i + 1} requiere una clave en minúsculas sin espacios (ej. fecha_evento).`
        );
        return;
      }
      if (!cEtiqueta) {
        setErrorForm(`El campo #${i + 1} requiere una etiqueta visible.`);
        return;
      }
      if (clavesVistas.has(cClave)) {
        setErrorForm(`La clave de campo «${cClave}» está repetida.`);
        return;
      }
      clavesVistas.add(cClave);
      camposLimpios.push({
        clave: cClave,
        etiqueta: cEtiqueta,
        tipo: c.tipo,
        requerido: Boolean(c.requerido),
        publico: Boolean(c.publico)
      });
    }

    setGuardando(true);
    try {
      const payload = {
        clave: claveLimpia,
        nombre: nombreLimpio,
        descripcion: descripcion.trim() || null,
        prefijo_folio: prefijoLimpio,
        vigencia_dias: vigenciaNumero,
        campos: camposLimpios,
        activo
      };

      if (modoFormulario === 'crear') {
        const { error } = await supabase.from('tipos_documento').insert(payload);
        if (error) {
          setErrorForm(error.message || 'No fue posible crear el tipo de documento.');
          return;
        }
        setMensajeExito(`Tipo de documento "${claveLimpia}" creado correctamente.`);
      } else if (modoFormulario === 'editar' && editandoId !== null) {
        const { error } = await supabase
          .from('tipos_documento')
          .update(payload)
          .eq('id', editandoId);
        if (error) {
          setErrorForm(error.message || 'No fue posible actualizar el tipo de documento.');
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

          {errorForm && (
            <div className="alert alert-error" role="alert">
              {errorForm}
            </div>
          )}

          <form onSubmit={manejarGuardar} className="form-stack" noValidate>
            <div className="form-grid-2">
              <div className="form-group">
                <label htmlFor="tipo-clave" className="form-label">
                  Clave única (2 a 10 caracteres) *
                </label>
                <input
                  id="tipo-clave"
                  type="text"
                  className="form-input mono-text"
                  placeholder="CONST"
                  maxLength={10}
                  value={clave}
                  onChange={(e) => {
                    const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    setClave(v);
                    if (modoFormulario === 'crear' && !prefijoFolio) {
                      setPrefijoFolio(v);
                    }
                  }}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="tipo-prefijo" className="form-label">
                  Prefijo de folio *
                </label>
                <input
                  id="tipo-prefijo"
                  type="text"
                  className="form-input mono-text"
                  placeholder="CONST"
                  maxLength={10}
                  value={prefijoFolio}
                  onChange={(e) => setPrefijoFolio(e.target.value.toUpperCase())}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="tipo-nombre" className="form-label">
                Nombre del tipo de documento *
              </label>
              <input
                id="tipo-nombre"
                type="text"
                className="form-input"
                placeholder="Constancia de capacitación"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="tipo-desc" className="form-label">
                Descripción
              </label>
              <input
                id="tipo-desc"
                type="text"
                className="form-input"
                placeholder="Breve descripción sobre el propósito de este documento"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label htmlFor="tipo-vigencia" className="form-label">
                  Vigencia por defecto (días)
                </label>
                <input
                  id="tipo-vigencia"
                  type="number"
                  min={1}
                  className="form-input"
                  value={vigenciaDias}
                  disabled={sinVigenciaDefault}
                  onChange={(e) => setVigenciaDias(e.target.value)}
                />
                <label className="checkbox-row mt-xs">
                  <input
                    type="checkbox"
                    checked={sinVigenciaDefault}
                    onChange={(e) => setSinVigenciaDefault(e.target.checked)}
                  />
                  <span>Sin vencimiento por defecto</span>
                </label>
              </div>

              <div className="form-group">
                <span className="form-label">Disponibilidad</span>
                <label className="checkbox-row mt-xs">
                  <input
                    type="checkbox"
                    checked={activo}
                    onChange={(e) => setActivo(e.target.checked)}
                  />
                  <span>Tipo activo para nuevas emisiones</span>
                </label>
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
                  {campos.map((campo, idx) => (
                    <div key={idx} className="schema-field-card">
                      <div className="form-grid-3">
                        <div className="form-group">
                          <label htmlFor={`c-clave-${idx}`} className="form-label">
                            Clave *
                          </label>
                          <input
                            id={`c-clave-${idx}`}
                            type="text"
                            className="form-input mono-text"
                            placeholder="concepto"
                            value={campo.clave}
                            onChange={(e) =>
                              actualizarCampo(
                                idx,
                                'clave',
                                e.target.value.toLowerCase().replace(/\s+/g, '_')
                              )
                            }
                            required
                          />
                        </div>

                        <div className="form-group">
                          <label htmlFor={`c-etiqueta-${idx}`} className="form-label">
                            Etiqueta visible *
                          </label>
                          <input
                            id={`c-etiqueta-${idx}`}
                            type="text"
                            className="form-input"
                            placeholder="Concepto"
                            value={campo.etiqueta}
                            onChange={(e) => actualizarCampo(idx, 'etiqueta', e.target.value)}
                            required
                          />
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
                  ))}
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

      {!cargando && (
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
                    <LedEstado
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
      )}
    </LayoutPanel>
  );
}
