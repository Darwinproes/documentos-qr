# Fase 4 — Pruebas del diseño del panel · Codex (QA)

## Prompt de arranque (copiar y pegar en Codex)

> Fase 4. Lee `AGENTS.md` (regla 10), `tareas/ANTIGRAVITY-FASE4.md` (lo que Antigravity va a cambiar en el panel) y este archivo. Implementa H1 a H5 solo dentro de `qa/` (no toques `web/` ni `supabase/`). Las pruebas deben medir el comportamiento real del panel: si una falla porque Antigravity aún no termina su tarea, déjala fallando y anótalo; nunca la debilites para que pase. Al terminar cada tarea, marca `PROGRESO.md` → *Fase 4 — Codex* con una línea de cómo se corre.

Objetivo: que el orquestador pueda comprobar cada tarea G1–G13 de Antigravity con `npm run qa:panel`, sin revisar a mano y sin que Antigravity tome capturas.

## Tareas

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
