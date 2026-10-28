import React, { useCallback, useEffect, useState } from 'react';
import { LayoutPanel } from '../components/LayoutPanel';
import { supabase } from '../lib/supabase';
import { DefinicionCampo, TipoCampo, TipoDocumento } from '../lib/tipos';
import { useTituloDocumento } from '../lib/useCargaDiferida';

const REGEX_CLAVE_TIPO = /^[A-Z0-9]{2,10}$/;
const REGEX_CLAVE_CAMPO = /^[a-z][a-z0-9_]{0,39}$/;

export function TiposAdminPage() {
  useTituloDocumento('Panel · Tipos de documento');

  const [tipos, setTipos] = useState<TipoDocumento[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [errorLista, setErrorLista] = useState<string | null>(null);

  // Estado del formulario de alta/edición
  const [modoFormulario, setModoFormulario] = useState<'cerrado' | 'alta' | 'edicion'>('cerrado');
  const [idEditando, setIdEditando] = useState<number | null>(null);
  const [clave, setClave] = useState<string>('');
  const [nombre, setNombre] = useState<string>('');
  const [descripcion, setDescripcion] = useState<string>('');
  const [prefijoFolio, setPrefijoFolio] = useState<string>('');
  const [vigenciaDias, setVigenciaDias] = useState<string>('365');
  const [activo, setActivo] = useState<boolean>(true);
  const [campos, setCampos] = useState<DefinicionCampo[]>([]);

  const [guardando, setGuardando] = useState<boolean>(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const cargarTipos = useCallback(async () => {
    setCargando(true);
    setErrorLista(null);
    const { data, error } = await supabase
      .from('tipos_documento')
      .select('*')
      .order('nombre');

    if (error) {
      setErrorLista('No se pudo cargar el catálogo de tipos de documento.');
    } else {
      setTipos((data || []) as TipoDocumento[]);
    }
    setCargando(false);
  }, []);

  useEffect(() => {
    void cargarTipos();
  }, [cargarTipos]);

  const abrirAlta = () => {
    setModoFormulario('alta');
    setIdEditando(null);
    setClave('');
    setNombre('');
    setDescripcion('');
    setPrefijoFolio('');
    setVigenciaDias('365');
    setActivo(true);
    setCampos([
      {
        clave: 'concepto',
        etiqueta: 'Concepto',
        tipo: 'texto',
        requerido: true,
        publico: true
      }
    ]);
    setErrorForm(null);
    setMensajeExito(null);
  };

  const abrirEdicion = (t: TipoDocumento) => {
    setModoFormulario('edicion');
    setIdEditando(t.id);
    setClave(t.clave);
    setNombre(t.nombre);
    setDescripcion(t.descripcion || '');
    setPrefijoFolio(t.prefijo_folio);
    setVigenciaDias(t.vigencia_dias !== null ? String(t.vigencia_dias) : '');
    setActivo(t.activo);
    setCampos(
      (t.campos || []).map((c) => ({
        clave: c.clave,
        etiqueta: c.etiqueta,
        tipo: c.tipo,
        requerido: Boolean(c.requerido),
        publico: Boolean(c.publico)
      }))
    );
    setErrorForm(null);
    setMensajeExito(null);
  };

  const agregarCampo = () => {
    setCampos((prev) => [
      ...prev,
      {
        clave: '',
        etiqueta: '',
        tipo: 'texto',
        requerido: true,
        publico: true
      }
    ]);
  };

  const quitarCampo = (idx: number) => {
    setCampos((prev) => prev.filter((_, i) => i !== idx));
  };

  const moverCampo = (idx: number, direccion: -1 | 1) => {
    const destino = idx + direccion;
    if (destino < 0 || destino >= campos.length) return;
    setCampos((prev) => {
      const copia = [...prev];
      const temp = copia[idx];
      copia[idx] = copia[destino];
      copia[destino] = temp;
      return copia;
    });
  };

  const actualizarCampo = <K extends keyof DefinicionCampo>(
    idx: number,
    prop: K,
    valor: DefinicionCampo[K]
  ) => {
    setCampos((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, [prop]: valor } : c))
    );
  };

  const manejarGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorForm(null);
    setMensajeExito(null);

    const claveLimpia = clave.trim().toUpperCase();
    const prefijoLimpio = prefijoFolio.trim().toUpperCase();
    const nombreLimpio = nombre.trim();

    if (modoFormulario === 'alta') {
      if (!REGEX_CLAVE_TIPO.test(claveLimpia)) {
        setErrorForm(
          'La clave del tipo debe tener entre 2 y 10 caracteres alfanuméricos en mayúsculas (A-Z, 0-9).'
        );
        return;
      }
      if (!REGEX_CLAVE_TIPO.test(prefijoLimpio)) {
        setErrorForm(
          'El prefijo de folio debe tener entre 2 y 10 caracteres alfanuméricos en mayúsculas (A-Z, 0-9).'
        );
        return;
      }
    }

    if (!nombreLimpio) {
      setErrorForm('El nombre del tipo de documento es obligatorio.');
      return;
    }

    let vigenciaNum: number | null = null;
    if (vigenciaDias.trim() !== '') {
      const n = Number(vigenciaDias);
      if (!Number.isInteger(n) || n <= 0) {
        setErrorForm('La vigencia en días debe ser un número entero mayor a 0, o dejarse vacía.');
        return;
      }
      vigenciaNum = n;
    }

    const clavesVistas = new Set<string>();
    const camposLimpios: DefinicionCampo[] = [];

    for (let i = 0; i < campos.length; i++) {
      const c = campos[i];
      const cClave = c.clave.trim();
      const cEtiqueta = c.etiqueta.trim();

      if (!REGEX_CLAVE_CAMPO.test(cClave)) {
        setErrorForm(
          `El campo #${i + 1} tiene una clave inválida ("${cClave}"). Debe iniciar con letra minúscula y usar solo [a-z0-9_], máx. 40 caracteres.`
        );
        return;
      }
      if (clavesVistas.has(cClave)) {
        setErrorForm(`La clave de campo "${cClave}" está repetida. Cada campo debe tener clave única.`);
        return;
      }
      if (!cEtiqueta) {
        setErrorForm(`El campo con clave "${cClave}" requiere una etiqueta visible.`);
        return;
      }

      clavesVistas.add(cClave);
      camposLimpios.push({
        clave: cClave,
        etiqueta: cEtiqueta,
        tipo: c.tipo,
        requerido: c.requerido,
        publico: c.publico
      });
    }

    setGuardando(true);

    if (modoFormulario === 'alta') {
      const { error } = await supabase.from('tipos_documento').insert({
        clave: claveLimpia,
        nombre: nombreLimpio,
        descripcion: descripcion.trim(),
        prefijo_folio: prefijoLimpio,
        vigencia_dias: vigenciaNum,
        campos: camposLimpios,
        activo
      });

      setGuardando(false);
      if (error) {
        setErrorForm(error.message || 'No se pudo crear el tipo de documento.');
        return;
      }
      setMensajeExito(`Tipo de documento "${claveLimpia}" creado correctamente.`);
      setModoFormulario('cerrado');
      await cargarTipos();
    } else if (modoFormulario === 'edicion' && idEditando !== null) {
      const { error } = await supabase
        .from('tipos_documento')
        .update({
          nombre: nombreLimpio,
          descripcion: descripcion.trim(),
          vigencia_dias: vigenciaNum,
          campos: camposLimpios,
          activo
        })
        .eq('id', idEditando);

      setGuardando(false);
      if (error) {
        setErrorForm(error.message || 'No se pudo actualizar el tipo de documento.');
        return;
      }
      setMensajeExito(`Tipo de documento "${claveLimpia}" actualizado correctamente.`);
      setModoFormulario('cerrado');
      await cargarTipos();
    }
  };

  return (
    <LayoutPanel rolesPermitidos={['admin']}>
      <div className="panel-header-row">
        <div>
          <h1 className="page-title">Catálogo de tipos de documento</h1>
          <p className="page-subtitle">
            Defina los formatos oficiales, sus prefijos de folio y los campos dinámicos de captura.
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

      {errorLista && (
        <div className="alert alert-error" role="alert">
          {errorLista}
        </div>
      )}

      {modoFormulario !== 'cerrado' && (
        <section className="card form-card mb-section" aria-label="Editor de tipo de documento">
          <h2 className="section-title">
            {modoFormulario === 'alta'
              ? 'Dar de alta nuevo tipo de documento'
              : `Editar tipo de documento: ${clave}`}
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
                  Clave única (2–10 mayúsculas/números) *
                </label>
                <input
                  id="tipo-clave"
                  type="text"
                  className="form-input mono-text"
                  placeholder="Ej. CONST"
                  value={clave}
                  onChange={(e) => {
                    const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    setClave(v);
                    if (modoFormulario === 'alta' && !prefijoFolio) {
                      setPrefijoFolio(v);
                    }
                  }}
                  maxLength={10}
                  disabled={modoFormulario === 'edicion'}
                  required
                />
                {modoFormulario === 'edicion' && (
                  <span className="form-hint">La clave no se puede modificar una vez creado el tipo.</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="tipo-prefijo" className="form-label">
                  Prefijo de folio (2–10 mayúsculas/números) *
                </label>
                <input
                  id="tipo-prefijo"
                  type="text"
                  className="form-input mono-text"
                  placeholder="Ej. CONST"
                  value={prefijoFolio}
                  onChange={(e) =>
                    setPrefijoFolio(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
                  }
                  maxLength={10}
                  disabled={modoFormulario === 'edicion'}
                  required
                />
                {modoFormulario === 'edicion' && (
                  <span className="form-hint">
                    El prefijo de folio está bloqueado para conservar la secuencia histórica.
                  </span>
                )}
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label htmlFor="tipo-nombre" className="form-label">
                  Nombre del tipo de documento *
                </label>
                <input
                  id="tipo-nombre"
                  type="text"
                  className="form-input"
                  placeholder="Ej. Constancia de capacitación"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="tipo-vigencia" className="form-label">
                  Vigencia por defecto (días)
                </label>
                <input
                  id="tipo-vigencia"
                  type="number"
                  min={1}
                  className="form-input"
                  placeholder="Dejar vacío si no vence por defecto"
                  value={vigenciaDias}
                  onChange={(e) => setVigenciaDias(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="tipo-descripcion" className="form-label">
                Descripción interna
              </label>
              <input
                id="tipo-descripcion"
                type="text"
                className="form-input"
                placeholder="Breve explicación de cuándo se utiliza este formato"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
            </div>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={activo}
                onChange={(e) => setActivo(e.target.checked)}
              />
              <span>Tipo de documento activo (disponible para nuevas emisiones)</span>
            </label>

            <div className="fields-editor-box">
              <div className="fields-editor-header">
                <div>
                  <h3 className="details-subtitle">Definición de campos del formulario</h3>
                  <p className="form-hint">
                    Claves en minúsculas con guion bajo (<code>^[a-z][a-z0-9_]&#123;0,39&#125;$</code>).
                  </p>
                </div>
                <button type="button" className="btn btn-sm btn-secondary" onClick={agregarCampo}>
                  Agregar campo
                </button>
              </div>

              {campos.length === 0 ? (
                <p className="text-muted">
                  Este tipo no tiene campos personalizados adicionales al destinatario.
                </p>
              ) : (
                <div className="fields-editor-list">
                  {campos.map((campo, idx) => (
                    <div key={idx} className="field-editor-row">
                      <div className="field-editor-inputs">
                        <div className="form-group">
                          <label htmlFor={`c-clave-${idx}`} className="form-label">
                            Clave *
                          </label>
                          <input
                            id={`c-clave-${idx}`}
                            type="text"
                            className="form-input mono-text"
                            placeholder="ej. fecha_evento"
                            value={campo.clave}
                            onChange={(e) =>
                              actualizarCampo(
                                idx,
                                'clave',
                                e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
                              )
                            }
                            maxLength={40}
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
                            placeholder="Ej. Fecha del evento"
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
                              actualizarCampo(idx, 'tipo', e.target.value as TipoCampo)
                            }
                          >
                            <option value="texto">Texto corto</option>
                            <option value="texto_largo">Texto largo</option>
                            <option value="fecha">Fecha (AAAA-MM-DD)</option>
                            <option value="numero">Número</option>
                          </select>
                        </div>
                      </div>

                      <div className="field-editor-controls">
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={campo.requerido}
                            onChange={(e) => actualizarCampo(idx, 'requerido', e.target.checked)}
                          />
                          <span>Requerido</span>
                        </label>

                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={campo.publico}
                            onChange={(e) => actualizarCampo(idx, 'publico', e.target.checked)}
                          />
                          <span>Público al verificar</span>
                        </label>

                        <div className="field-order-btns">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => moverCampo(idx, -1)}
                            disabled={idx === 0}
                            title="Subir campo"
                            aria-label={`Subir campo ${campo.etiqueta || idx + 1}`}
                          >
                            Subir
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => moverCampo(idx, 1)}
                            disabled={idx === campos.length - 1}
                            title="Bajar campo"
                            aria-label={`Bajar campo ${campo.etiqueta || idx + 1}`}
                          >
                            Bajar
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={() => quitarCampo(idx)}
                            aria-label={`Quitar campo ${campo.etiqueta || idx + 1}`}
                          >
                            Quitar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-actions-bar">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setModoFormulario('cerrado')}
                disabled={guardando}
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

      <section className="card table-card">
        {cargando ? (
          <div className="state-card">
            <div className="spinner" aria-hidden="true" />
            <p className="state-text">Cargando tipos de documento…</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Clave</th>
                  <th>Prefijo</th>
                  <th>Nombre</th>
                  <th>Vigencia default</th>
                  <th>Campos</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {tipos.map((t) => (
                  <tr key={t.id}>
                    <td className="mono-text font-semibold">{t.clave}</td>
                    <td className="mono-text">{t.prefijo_folio}</td>
                    <td>
                      <div>{t.nombre}</div>
                      {t.descripcion && <div className="text-muted text-small">{t.descripcion}</div>}
                    </td>
                    <td>{t.vigencia_dias ? `${t.vigencia_dias} días` : 'Sin vencimiento'}</td>
                    <td>{(t.campos || []).length} campos</td>
                    <td>
                      <span
                        className={`badge ${
                          t.activo ? 'badge-estado-vigente' : 'badge-estado-cancelado'
                        }`}
                      >
                        {t.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={() => abrirEdicion(t)}
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </LayoutPanel>
  );
}
