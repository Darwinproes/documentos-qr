import { useEffect, useState } from 'react';
import { ORG_NOMBRE } from './config';

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
 * Detecta si la ventana está por debajo de `maxAnchoPx` (por defecto 768px)
 * para montar únicamente la vista correspondiente (tabla o tarjetas móviles).
 */
export function useEsMovil(maxAnchoPx = 768): boolean {
  const [esMovil, setEsMovil] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < maxAnchoPx : false
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${maxAnchoPx - 1}px)`);
    const actualizar = () => setEsMovil(window.innerWidth < maxAnchoPx);
    actualizar();
    mq.addEventListener('change', actualizar);
    window.addEventListener('resize', actualizar);
    return () => {
      mq.removeEventListener('change', actualizar);
      window.removeEventListener('resize', actualizar);
    };
  }, [maxAnchoPx]);

  return esMovil;
}

/**
 * Actualiza document.title según la ruta actual (D9).
 */
export function useTituloDocumento(tituloEspecifico: string): void {
  useEffect(() => {
    document.title = `${tituloEspecifico} · ${ORG_NOMBRE}`;
  }, [tituloEspecifico]);
}

export function useMetaRobots(contenido: string): void {
  useEffect(() => {
    let meta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    const creado = !meta;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'robots';
      document.head.appendChild(meta);
    }
    const anterior = meta.content;
    meta.content = contenido;

    return () => {
      if (creado && meta?.parentNode) {
        meta.parentNode.removeChild(meta);
      } else if (meta) {
        meta.content = anterior;
      }
    };
  }, [contenido]);
}

export function formatearTamanoBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}
