# Decisiones de diseño del proyecto (complementan y, donde choquen, mandan sobre MASTER.md)

Fecha: 2026-10-28 · Dueño: orquestador

## Principio

La página de verificación la abre **un tercero que no conoce el sistema**, casi siempre en un celular, para decidir si confía en un papel. Tiene que leerse en 2 segundos: **resultado, datos para comparar, dominio oficial**. Sobriedad institucional; nada decorativo.

## Paleta (tokens en `:root`, ningún hex fuera de ahí)

| Token | Valor | Uso |
|---|---|---|
| `--color-primary` | `#0F2D52` | Marca PROESA (provisional hasta tener el logo oficial), encabezados, botón principal |
| `--color-primary-hover` | `#173F70` | |
| `--color-accent` | `#0369A1` | Enlaces, foco, acentos (5.9:1 sobre blanco) |
| `--color-bg` | `#F8FAFC` | Fondo |
| `--color-surface` | `#FFFFFF` | Tarjetas |
| `--color-text` | `#0F172A` | Texto |
| `--color-text-muted` | `#475569` | Texto secundario (7:1 sobre blanco) |
| `--color-border` | `#E2E8F0` | Bordes |
| `--color-danger` | `#B91C1C` | Acciones destructivas |
| Estados | se conservan los tokens `--valido-*`, `--vencido-*`, `--cancelado-*`, `--no-encontrado-*`, `--limite-*` actuales (ya cumplen AA) | |

**Solo modo claro.** Decisión explícita: la página se compara contra un papel impreso y debe verse igual en cualquier teléfono.

## Tipografía

- **Atkinson Hyperlegible** 400/700 para todo el texto, **auto-hospedada** con `@fontsource/atkinson-hyperlegible` (versión exacta fijada). **No usar Google Fonts CDN**: la página pública no debe enviar la IP de quien verifica a terceros.
- Folio y código en monoespaciada (`--font-mono`), `font-variant-numeric: tabular-nums`, `letter-spacing: 0.04em`.
- Cuerpo 16 px mínimo; folio en el resultado ≥ 18 px; título del resultado 24–28 px en móvil.

## Íconos

Una sola familia de SVG en línea, estilo contorno, trazo 1.75–2. Con texto al lado: `aria-hidden="true"`. Sin emojis.

## Movimiento

Solo transiciones de 150–200 ms en hover/foco/estado. Nada de animaciones de entrada. Respetar `prefers-reduced-motion: reduce` (transiciones a 0).

## Accesibilidad (mínimos verificables)

Contraste AA, foco visible, objetivos táctiles ≥ 44×44 px, el estado nunca solo por color (ícono + texto), `aria-live` en resultados, errores junto al campo + resumen enfocable al enviar, sin desplazamiento horizontal a 360 px, Lighthouse Accesibilidad ≥ 95.

## PDF

Misma marca: azul `#0F2D52` en línea de encabezado y título, Helvetica (estándar PDF), datos en rejilla etiqueta/valor, pie con folio y paginación, bloque de verificación destacado. El PDF y la página de verificación deben mostrar **los mismos datos con las mismas etiquetas** para que comparar sea trivial.
