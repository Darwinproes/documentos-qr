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

## Fase 3 — reglas añadidas tras la auditoría visual (2026-10-28)

Fuente: QA automatizada (Playwright, 360/768/1440 px) + revisión de 49 capturas. Las reglas de navegación móvil vienen de la categoría 9 de la skill (*Navigation Patterns*: contenido primero, navegación predecible); la base de datos de la skill no tuvo una coincidencia específica para cajones de menú.

**Panel interno**
- **Contenido primero en móvil y tableta (< 1024 px):** barra superior compacta de 56 px (logo, título de la sección, botón «Menú» con `aria-expanded`) que abre un panel lateral. Usuario, rol y «Cerrar sesión» viven dentro de ese panel. Nunca el menú completo antes del contenido.
- **Densidad:** las tablas del panel son herramientas de trabajo: filas de 48–56 px, folio y fechas en una sola línea (`white-space: nowrap`), acciones en una sola línea. La fila entera es enlace al detalle.
- **Una sola vez cada dato:** folio y estado aparecen una vez en el encabezado del detalle; las tarjetas de datos no los repiten.
- **Personas, no identificadores:** nunca mostrar UUID a usuarios; mostrar nombre y área. Huellas SHA-256 abreviadas (`5fec…f38b`) con botón «Copiar».
- **Indicadores arriba de la lista:** Vigentes · Por vencer (30 días) · Vencidos · Cancelados; cada uno filtra la lista al tocarlo.
- Textos de botones cortos («Cerrar sesión», no «Cerrar sesión (nombre)»); plurales correctos («1 campo»); sin anglicismos («por defecto», no «default»).

**Página pública**
- El resultado se lee como **lista de comparación**: etiqueta y valor en filas separadas por líneas finas, no una tarjeta por dato. En móvil, los datos cortos van en pares (Emitido/Vigencia, Fecha/Horas).
- El dominio oficial nunca se parte de línea (`white-space: nowrap`); el aviso de dominio aparece **una vez** (bloque con candado). El pie no lo repite.
- El encabezado público solo tiene logo y «Verificar documento»; «Acceso interno» va en el pie.
- `/verificar` explica dónde encontrar el folio y el código (esquema del bloque de verificación del PDF) y recuerda que basta con escanear el QR.

## PDF

Misma marca: azul `#0F2D52` en línea de encabezado y título, Helvetica (estándar PDF), datos en rejilla etiqueta/valor, pie con folio y paginación, bloque de verificación destacado. El PDF y la página de verificación deben mostrar **los mismos datos con las mismas etiquetas** para que comparar sea trivial.
