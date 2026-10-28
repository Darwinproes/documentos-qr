import { useEffect, useState } from 'react';
import { ORG_NOMBRE } from './supabase';

/**
 * Devuelve true únicamente cuando `cargando` permanece activo por más de `umbralMs` (300 ms por defecto),
 * evitando parpadeos de esqueletos en respuestas rápidas.
 */
export function useCargaDiferida(cargando: boolean, umbralMs = 300): boolean {
  const [mostrarEsqueleto, setMostrarEsqueleto] = useState<boolean>(false);

  useEffect(() => {
    if (!cargando) {
      setMostrarEsqueleto(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setMostrarEsqueleto(true);
    }, umbralMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [cargando, umbralMs]);

  return mostrarEsqueleto;
}

/**
 * Actualiza document.title según la ruta actual (D9).
 */
export function useTituloDocumento(tituloEspecifico: string): void {
  useEffect(() => {
    document.title = `${tituloEspecifico} · ${ORG_NOMBRE}`;
  }, [tituloEspecifico]);
}

export function formatearTamanoBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}
