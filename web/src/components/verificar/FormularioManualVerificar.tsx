import React, { useRef, useState } from 'react';
import { DOMINIO_OFICIAL } from '../../lib/config';
import {
  formatearCodigoVisual,
  normalizarCodigo,
  PATRON_CODIGO_LIMPIO,
  REGEX_FOLIO
} from '../../lib/formato';

function validarFolio(valor: string): string | undefined {
  const limpio = valor.trim().toUpperCase();
  if (!limpio) return 'Ingrese el folio impreso en el documento (por ejemplo: CONST-2026-000001).';
  if (!REGEX_FOLIO.test(limpio)) {
    return 'El formato del folio no es válido. Use PREFIJO-AAAA-NNNNNN (por ejemplo: CONST-2026-000001).';
  }
  return undefined;
}

function validarCodigo(valor: string): string | undefined {
  const limpio = normalizarCodigo(valor);
  if (!limpio) return 'Ingrese el código de verificación de 10 caracteres.';
  if (!PATRON_CODIGO_LIMPIO.test(limpio)) {
    return 'El código debe tener 10 caracteres válidos del alfabeto de seguridad (sin 0, O, 1, I ni L).';
  }
  return undefined;
}

interface FormularioManualVerificarProps {
  cargando: boolean;
  onVerificarManual: (folio: string, codigo: string) => Promise<void>;
  onLimpiarErrorGeneral: () => void;
}

export function FormularioManualVerificar({
  cargando,
  onVerificarManual,
  onLimpiarErrorGeneral
}: FormularioManualVerificarProps) {
  const [folio, setFolio] = useState<string>('');
  const [codigo, setCodigo] = useState<string>('');
  const [erroresCampo, setErroresCampo] = useState<{ folio?: string; codigo?: string }>({});

  const inputFolioRef = useRef<HTMLInputElement>(null);
  const inputCodigoRef = useRef<HTMLInputElement>(null);
  const resumenErroresRef = useRef<HTMLDivElement>(null);

  const manejarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onLimpiarErrorGeneral();
    const errorFolio = validarFolio(folio);
    const errorCodigo = validarCodigo(codigo);
    setErroresCampo({ folio: errorFolio, codigo: errorCodigo });

    if (errorFolio || errorCodigo) {
      setTimeout(() => {
        if (resumenErroresRef.current) resumenErroresRef.current.focus();
        else if (errorFolio) inputFolioRef.current?.focus();
        else inputCodigoRef.current?.focus();
      }, 0);
      return;
    }

    await onVerificarManual(folio.trim().toUpperCase(), normalizarCodigo(codigo));
  };

  const listaErroresManual: { idCampo: string; mensaje: string }[] = [];
  if (erroresCampo.folio) listaErroresManual.push({ idCampo: 'input-folio', mensaje: erroresCampo.folio });
  if (erroresCampo.codigo) listaErroresManual.push({ idCampo: 'input-codigo', mensaje: erroresCampo.codigo });

  return (
    <div id="panel-manual" role="tabpanel" aria-labelledby="tab-manual" className="tab-panel">
      {listaErroresManual.length > 0 && (
        <div ref={resumenErroresRef} className="alert alert-error error-summary" role="alert" tabIndex={-1}>
          <p className="error-summary-title">Revise los siguientes campos:</p>
          <ul className="error-summary-list">
            {listaErroresManual.map((item) => (
              <li key={item.idCampo}>
                <a
                  href={`#${item.idCampo}`}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(item.idCampo)?.focus();
                  }}
                >
                  {item.mensaje}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={manejarSubmit} noValidate className="form-stack">
        <div className="form-group">
          <label htmlFor="input-folio" className="form-label">Folio del documento</label>
          <input
            ref={inputFolioRef}
            id="input-folio"
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            className={`form-input mono-text ${erroresCampo.folio ? 'form-input-invalid' : ''}`}
            placeholder="Ej. CONST-2026-000001"
            value={folio}
            aria-invalid={Boolean(erroresCampo.folio)}
            aria-describedby={erroresCampo.folio ? 'hint-folio error-folio' : 'hint-folio'}
            onChange={(e) => {
              setFolio(e.target.value.toUpperCase().replace(/\s+/g, ''));
              if (erroresCampo.folio) setErroresCampo((prev) => ({ ...prev, folio: undefined }));
            }}
            onBlur={() => {
              if (folio.trim()) setErroresCampo((prev) => ({ ...prev, folio: validarFolio(folio) }));
            }}
            required
          />
          <span id="hint-folio" className="form-hint">Formato PREFIJO-AÑO-NÚMERO.</span>
          {erroresCampo.folio && (
            <span id="error-folio" className="field-error-text" role="alert">{erroresCampo.folio}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="input-codigo" className="form-label">Código de verificación</label>
          <input
            ref={inputCodigoRef}
            id="input-codigo"
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            className={`form-input mono-text ${erroresCampo.codigo ? 'form-input-invalid' : ''}`}
            placeholder="Ej. 7KQ2M-XA9PD"
            maxLength={13}
            value={codigo}
            aria-invalid={Boolean(erroresCampo.codigo)}
            aria-describedby={erroresCampo.codigo ? 'hint-codigo error-codigo' : 'hint-codigo'}
            onChange={(e) => {
              setCodigo(formatearCodigoVisual(e.target.value));
              if (erroresCampo.codigo) setErroresCampo((prev) => ({ ...prev, codigo: undefined }));
            }}
            onPaste={(e) => {
              e.preventDefault();
              setCodigo(formatearCodigoVisual(e.clipboardData.getData('text')));
              if (erroresCampo.codigo) setErroresCampo((prev) => ({ ...prev, codigo: undefined }));
            }}
            onBlur={() => {
              if (codigo.trim()) setErroresCampo((prev) => ({ ...prev, codigo: validarCodigo(codigo) }));
            }}
            required
          />
          <span id="hint-codigo" className="form-hint">
            10 caracteres, impresos junto al código QR. El guion se agrega solo.
          </span>
          {erroresCampo.codigo && (
            <span id="error-codigo" className="field-error-text" role="alert">{erroresCampo.codigo}</span>
          )}
        </div>

        <button type="submit" className="btn btn-primary btn-submit-verificar" disabled={cargando}>
          {cargando ? 'Consultando…' : 'Verificar documento'}
        </button>
        <p className="dominio-pie-form">
          Solo es oficial en <strong className="nowrap-domain">{DOMINIO_OFICIAL}</strong>
        </p>
      </form>
    </div>
  );
}
