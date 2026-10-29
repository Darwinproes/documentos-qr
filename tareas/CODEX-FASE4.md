# Fase 4 — Pruebas del diseño del panel · Codex (QA)

## Prompt de arranque (copiar y pegar en Codex)

> Fase 4. Lee `AGENTS.md` (regla 10), `design-system/documentos-qr-proesa/pages/decisiones-proyecto.md` → **Identidad institucional**, la maqueta `design-system/documentos-qr-proesa/maquetas/identidad-institucional/resultado-panel-pdf.html` (parte inferior: el PDF), `tareas/ANTIGRAVITY-FASE4.md` y este archivo. Implementa **primero P1 a P5 (PDF)** en `supabase/functions/_shared/` y `supabase/tests/`, y después H1 a H5 en `qa/` (no toques `web/` ni `supabase/migrations/`). Las pruebas deben medir el comportamiento real: si una falla porque Antigravity aún no termina su tarea, déjala fallando y anótalo; nunca la debilites para que pase. Al terminar cada tarea, marca `PROGRESO.md` → *Fase 4 — Codex* con una línea de cómo se corre.

Objetivo: el PDF con la identidad institucional y el emblema real de PROESA, y que el orquestador pueda comprobar cada tarea de Antigravity (N1–N8, G1–G13) con `npm run qa:panel`, sin revisar a mano y sin que Antigravity tome capturas.

## Primero: PDF institucional (P1–P5)

- **P1 — Emblema real en el PDF.** Usa `design-system/documentos-qr-proesa/assets/emblema-proesa-120.png`. La herramienta de despliegue de funciones solo acepta archivos de texto, así que no sirve un `.png` en `assets/`: crea `_shared/emblema.ts` que exporte el PNG en base64 (generado con un script de una vez; anota en un comentario de dónde sale y cómo regenerarlo) y que `cargarLogo` lo incruste con `embedPng`. Encabezado: emblema de unos 30 × 44 pt, «PROESA Electrónica» en Helvetica-Bold, «Registro de documentos oficiales» debajo en `#52606D`, folio a la derecha en Courier-Bold, y doble línea `#091E3E` debajo (dos líneas de 0.75 pt separadas 2 pt). Lo mismo, más compacto, en el encabezado de las páginas 2 en adelante.
- **P2 — Colores y letra.** Tinta `#091E3E` para títulos, folio y líneas; texto `#1F2933`; etiquetas `#52606D`. Título del tipo de documento centrado en **Times-Bold** (fuente estándar del PDF, la serifa institucional sin aumentar el peso del archivo). El resto sigue en Helvetica.
- **P3 — Bloque de verificación sobrio.** Recuadro de 1 pt `#091E3E`, sin guilloche: QR a la izquierda (zona blanca intacta), «Verificación de autenticidad» en Times-Bold, la URL, folio y código en Courier-Bold y la leyenda del dominio. El renglón de la firma digital se queda cuando hay credencial.
- **P4 — Retirar lo decorativo.** Quita las bandas y el marco de guilloche y el sello circular con microtexto. **Se queda** la línea de microtexto con el folio sobre el pie (elemento de seguridad real, casi invisible), en `#9AA5B1`.
- **P5 — Pruebas.** Actualiza `pdf.test.ts`; regenera `ejemplo.pdf`, `ejemplo-largo.pdf` y `ejemplo-firmado.pdf`; las pruebas de firma siguen pasando; PDF de una página por debajo de 120 KB. El orquestador revisa visualmente y vuelve a escanear el QR antes de desplegar.

## Pruebas del panel (H1–H5)

En H3, la comprobación «Atkinson cargada» pasa a «Source Sans 3 cargada» (y Source Serif 4 en los títulos).

- **H1 — Datos del simulado.** En `qa/mock-supabase.mjs`:
  - al menos 5 tipos de documento, para que la vista de tipos en celular tenga contenido (G2);
  - documentos con campos de tipo fecha llenos y vacíos (G6);
  - bitácora con emisión y cancelación con motivo (G9);
  - un usuario con nombre largo (G11).
  Sin cambiar los usuarios ni la clave que ya usan las pruebas.
- **H2 — Casos del panel** en `qa/e2e/panel.mjs`, uno por comportamiento:
  - Errores en línea (G1):
    - login vacío → los dos campos con `aria-invalid="true"` y un mensaje enlazado por `aria-describedby`;
    - emitir paso 2 vacío → el resumen lista **todos** los campos obligatorios y recibe el foco;
    - nuevo tipo con clave inválida → error bajo «Clave única»;
    - modal sin casilla → error en la casilla.
  - Tipos a 360 px (G2): las tarjetas son visibles y los botones Editar/Desactivar quedan dentro de la pantalla (su `getBoundingClientRect().right <= 360`).
  - Filtros a 360 px (G3): el primer documento aparece dentro de los primeros 780 px; el botón «Filtros» tiene `aria-expanded` y al abrirlo se ven Estado y Tipo.
  - Ejemplos (G4): todo `placeholder` del panel empieza con «Ej.» o está vacío.
  - Interruptor (G7): «Tipo activo» tiene `role="switch"`.
  - Lista vacía (G10): un solo botón para limpiar y el mensaje contiene el término buscado.
  - Identidad (N2, N5): el encabezado público, el login y la barra lateral muestran el emblema (`img` con `alt` «PROESA Electrónica» o junto al nombre escrito); el resultado válido de `/v/:token` en el simulado contiene «a nombre de» seguido del destinatario; no existe ningún `canvas` en la página de resultado.
- **H3 — Comprobaciones nuevas** en `qa/e2e/auditoria.mjs`, por pantalla y a 360/768/1440:
  - contenedores con desplazamiento horizontal interno (`scrollWidth > clientWidth + 1` en tablas y sus contenedores);
  - folios y códigos partidos en varios renglones (elementos cuyo texto cumple `^[A-Z0-9]{2,10}-\d{4}-\d{6}$` o el formato de código, con altura mayor a 1.5 renglones);
  - fechas ISO visibles (`\b\d{4}-\d{2}-\d{2}\b` en el texto visible del panel);
  - controles de selección de más de 28 px de lado (G7).
  Columnas nuevas en la tabla final y en `reporte.json`.
- **H4 — Capturas de estados para el orquestador.** Nuevo `qa/e2e/estados.mjs` y script `npm run qa:estados`: guarda en `qa/salida/estados/<ancho>/` capturas de página completa a 1440 y 360 de login (vacío y con error), lista (normal y vacía), detalle, modal de cancelar (con error), emitir pasos 1 a 4 (y paso 2 con errores), tipos (lista, nuevo y nuevo con errores), usuarios (normal y con un cambio sin guardar), menú móvil abierto y rol Consulta. Usa el simulado; corre en CI y se sube como artefacto junto con el reporte.
- **H5 — README.** Actualizar `qa/README.md` con las comprobaciones nuevas y `qa:estados`.

## Fuera de alcance

Cambiar el frontend o las funciones. Si una prueba descubre un error del sistema que no está en G1–G13, anótalo en `PROGRESO.md` → *Preguntas al orquestador*.
