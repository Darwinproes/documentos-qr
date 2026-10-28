# Decisiones de diseño del proyecto (complementan y, donde choquen, mandan sobre MASTER.md)

## Identidad elegida (2026-10-28): «Papel de seguridad» en lo público + «Trazabilidad» en el panel

**Esta sección manda sobre todo lo demás de este archivo y sobre MASTER.md.** Maquetas de referencia: `design-system/documentos-qr-proesa/maquetas/direcciones-visuales.html` (direcciones B y A). Origen: el usuario rechazó el diseño anterior por genérico y eligió la mezcla B + A.

**Idea.** La página pública se siente como un **certificado o un billete**: sello que se imprime, trama de seguridad (guilloche), renglones con puntos guía y sellos de goma para los estados negativos. El panel interno se siente como una **herramienta de una planta de electrónica**: verde de máscara de soldadura, líneas de cobre, estados como LED encendido y números de serie en monoespaciada. Lo que une a las dos caras: la tinta, los verdes y rojos de estado y la letra del texto corrido.

### Tokens

| Token | Valor | Dónde |
|---|---|---|
| `--tinta` | `#1F2A44` | Texto principal en todo el sistema |
| `--tinta-tenue` | `#56606B` | Etiquetas y texto secundario (≥ 4.5:1 sobre ambos fondos) |
| `--papel` | `#EEF2EF` | Fondo de la página pública |
| `--trama` | `#9DB3A8` | Solo líneas de guilloche y puntos guía; nunca texto |
| `--serigrafia` | `#F7F9F6` | Fondo del panel |
| `--mascara` | `#0F3D33` | Barra lateral y superior del panel, botón principal del panel |
| `--cobre` | `#9A5B1F` | Líneas bajo encabezados de tabla, pista de la navegación activa, enlaces del panel; nunca fondo de texto |
| `--sello-verde` | `#17663A` | Válido / vigente (texto, sello, LED) |
| `--sello-rojo` | `#A3201A` | Cancelado y acciones destructivas |
| `--ocre` | `#8A5A00` | Vencido / por vencer |
| `--superficie` | `#FFFFFF` | Tarjetas y tablas del panel |

El azul `#0F2D52` y el acento `#0369A1` anteriores **se retiran**. Solo modo claro, como ya estaba decidido.

### Tipografía (todas auto-hospedadas con `@fontsource`, versiones fijas)

| Familia | Rol |
|---|---|
| **Spectral** 600/700 | Solo lo público: veredicto («Documento válido»), sello, folio en el resultado, título de `/verificar` |
| **Atkinson Hyperlegible** 400/700 | Texto corrido y formularios en todo el sistema (se conserva por legibilidad) |
| **Familjen Grotesk** 500/700 | Solo el panel: títulos de sección, navegación, botones, encabezados de tabla |
| **IBM Plex Mono** 400/600 | Solo el panel: folio, código y huellas, que son números de serie |

Las fuentes del panel se cargan con las rutas `/panel/*` (carga diferida) para no pesarle a la página pública.

### Reglas de la cara pública (B)
- El veredicto es un **sello circular** con texto diminuto alrededor («PROESA ELECTRÓNICA · REGISTRO CENTRAL DE DOCUMENTOS · …») y el símbolo del estado al centro. Se dibuja **una sola vez** al cargar (≤ 1.2 s); con `prefers-reduced-motion` aparece completo. Es el único elemento animado de la página.
- Detrás del sello, una trama de guilloche dibujada en `<canvas>` con `--trama` a baja opacidad. Decorativa: `aria-hidden`, nunca detrás de texto que haya que leer.
- Datos como **renglones con puntos guía** (etiqueta ……… valor), no tarjetas. Folio en Spectral con números tabulares.
- Vencido, cancelado y no registrado llevan además un **sello de goma** inclinado («VENCIDO», «CANCELADO», «SIN REGISTRO») sobre el área del veredicto, que nunca tapa datos. El texto del estado siempre está escrito; el sello no es la única señal.
- Etiquetas en tipo oración, sin mayúsculas sostenidas, salvo el texto del sello y de la goma, que imitan impresión de seguridad.

### Reglas del panel (A)
- Barra lateral (≥ 1024 px) y barra superior (< 1024 px) en `--mascara`, con texto `#EAF2EE`. El elemento activo se marca con una pista de cobre de 3 px a la izquierda.
- Encabezados de tabla con una línea de 2 px en `--cobre` debajo. Filas sobre `--superficie`.
- Estado = **LED**: un punto de 9 px del color del estado con halo suave + el texto del estado. Nunca solo el punto.
- Folio, código y huellas en IBM Plex Mono 600 color `--mascara`.
- Indicadores de F3 como LED grandes con número (Familjen Grotesk 700) y texto.
- Botón principal: fondo `--mascara`; secundario: borde `--mascara`; destructivo: `--sello-rojo`.

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
