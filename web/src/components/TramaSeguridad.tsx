import { useEffect, useRef } from 'react';
import { ResultadoVerificacion } from '../lib/tipos';

interface TramaSeguridadProps {
  resultado?: ResultadoVerificacion;
}

const TRAZO_POR_RESULTADO: Record<ResultadoVerificacion, string> = {
  valido: 'rgba(23, 102, 58, 0.24)',
  vencido: 'rgba(138, 90, 0, 0.22)',
  cancelado: 'rgba(163, 32, 26, 0.22)',
  no_encontrado: 'rgba(31, 42, 68, 0.20)',
  limite_excedido: 'rgba(86, 96, 107, 0.20)'
};

export function TramaSeguridad({ resultado = 'valido' }: TramaSeguridadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dibujar = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // La trama se limita a la zona del sello: nunca pasa detrás del veredicto ni de los datos.
      const sello = canvas.parentElement?.querySelector<HTMLElement>('.sello-veredicto-contenedor');
      const rCanvas = canvas.getBoundingClientRect();
      const rSello = sello?.getBoundingClientRect();
      const cx = rSello ? rSello.left - rCanvas.left + rSello.width / 2 : w / 2;
      const cy = rSello ? rSello.top - rCanvas.top + rSello.height / 2 : h / 2;
      const radioSello = rSello ? rSello.width / 2 : 56;
      const limiteInferior = rSello ? rSello.bottom - rCanvas.top + 6 : h;

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, limiteInferior);
      ctx.clip();

      // Líneas onduladas horizontales de fondo (--trama)
      ctx.strokeStyle = 'rgba(31, 42, 68, 0.09)';
      ctx.lineWidth = 0.55;
      const numLineas = Math.ceil(limiteInferior / 9);
      for (let i = 0; i < numLineas; i++) {
        ctx.beginPath();
        for (let px = 0; px <= w; px += 4) {
          const py = 6 + i * 9 + Math.sin(px / 18 + i * 0.6) * 3;
          if (px === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }

      // Roseta de guilloche (epitrocoide) alrededor del sello
      ctx.lineWidth = 0.65;
      ctx.strokeStyle = TRAZO_POR_RESULTADO[resultado];
      for (let k = 0; k < 3; k++) {
        const R = 108 + k * 10;
        const r = 34 - k * 6;
        const d = 46 + k * 8;
        const s = (radioSello * 1.05) / (R - r + d);
        ctx.beginPath();
        const limite = Math.PI * 2 * 13 + 0.01;
        for (let t = 0; t <= limite; t += 0.016) {
          const px = (R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t);
          const py = (R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t);
          const x = cx + px * s * 1.6;
          const y = cy + py * s;
          if (t === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.restore();
    };

    dibujar();
    const observador = new ResizeObserver(dibujar);
    observador.observe(canvas);
    return () => observador.disconnect();
  }, [resultado]);

  return <canvas ref={canvasRef} className="trama-seguridad-canvas" aria-hidden="true" />;
}
