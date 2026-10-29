# Fase 4 — Diseño del panel interno · Antigravity (frontend)

## Prompt de arranque (copiar y pegar en Antigravity)

> Fase 4. Lee `AGENTS.md` (sobre todo la **regla 10**), `design-system/documentos-qr-proesa/pages/decisiones-proyecto.md` → *Identidad elegida* y este archivo. Implementa G1 a G13 en orden, solo dentro de `web/`. **No tomes capturas de pantalla ni abras el navegador para revisar**: el orquestador hace la revisión visual con sus propias capturas automáticas. Al terminar cada tarea: `npm run build` sin errores y una línea en `PROGRESO.md` → *Fase 4 — Antigravity* con qué cambiaste. Si una prueba de `qa/` falla, no cambies el producto para que pase: anótalo en *Preguntas al orquestador*.

Origen: auditoría del orquestador del 2026-10-29 con la skill de diseño (ui-ux-pro-max) sobre 41 capturas del panel a 1440 y 360 px (login, lista, detalle, modal, emitir en sus 4 pasos, tipos, usuarios, menú móvil y rol Consulta). Cada tarea cita la regla de la skill que la respalda; cuando la skill no tuvo una regla específica se indica «criterio del orquestador».

## Prioridad alta

- **G1 — Errores junto a cada campo.** Hoy los formularios muestran un solo mensaje arriba y no marcan el campo (login vacío, emitir paso 2, nuevo tipo; solo el modal de cancelar lo hace bien). En emitir paso 2 con destinatario y concepto vacíos aparece solo «El destinatario es obligatorio». Cambiar a:
  - Debajo de **cada** campo inválido, su mensaje concreto, enlazado con `aria-describedby`, con `aria-invalid="true"` y borde `--sello-rojo`.
  - Arriba, el resumen lista **todos** los errores, cada uno como enlace al campo; al enviar recibe el foco (`tabindex="-1"`).
  - Aplica en login, emitir paso 2, nuevo/editar tipo (incluidos los campos personalizados) y el modal de cancelar (que también marque la casilla de confirmación si falta).
  - Skill: *Forms → Error Placement* y *Forms / Accessibility → Focusable Error Summary* (severidad alta).
- **G2 — Tipos de documento en celular.** A 360 px la tabla mide 822 px dentro de 330: Editar y Desactivar quedan fuera de vista. Debajo de 768 px, mostrar tarjetas como en la lista de documentos: clave como etiqueta + nombre, prefijo · vigencia · número de campos, estado como LED, y los botones Editar / Desactivar visibles. En escritorio la tabla se queda. Skill: *Responsive → Table Handling*.
- **G3 — Filtros plegados en celular.** A 360 px los filtros (estado, tipo, dos fechas) ocupan la primera pantalla y el primer documento aparece hasta abajo. Debajo de 768 px: búsqueda siempre visible + botón «Filtros» (con «· N activos» si hay) que despliega estado, tipo y fechas (`aria-expanded`, `aria-controls`). En escritorio sin cambios. Criterio del orquestador (regla de contenido primero de la fase 3).
- **G4 — Ejemplos que parecen valores.** En «Nuevo tipo», los textos de ejemplo de los campos dicen «CONST», «concepto», «Concepto», «Constancia de capacitación», en gris #757575: parecen valores ya escritos, y el error «La clave debe tener…» confunde porque el campo «tiene» CONST. Todos los textos de ejemplo empiezan con «Ej.» («Ej. CONST», «Ej. concepto»), y la regla de formato va como texto de ayuda visible bajo la etiqueta, no solo en el ejemplo. Skill: *Forms → Input Labels* (el ejemplo nunca sustituye a la etiqueta ni a la ayuda).

## Prioridad media

- **G5 — Folio, código, huella y enlace sin partir.** En emitir paso 4, a 360 px el folio se parte en «CONST-2026-» / «000032», la huella SHA-256 ocupa 3 renglones y el enlace 3 más. Folio y código con `white-space: nowrap` (si no caben, reducir el tamaño de letra, no partir); huella abreviada `a048…2c2d` con botón «Copiar», igual que en el detalle; enlace abreviado (dominio + `/v/…` + 4 caracteres) con «Copiar enlace». Skill: *Content → Compact Label Overflow*.
- **G6 — Un solo formato de fecha.** Los campos de tipo fecha se muestran como `2026-10-20` en el detalle, en emitir paso 3 y en la bitácora, mientras el resto del panel usa `20/10/2026`. Todo en `dd/mm/aaaa` (con hora `dd/mm/aaaa hh:mm` donde aplique), usando `lib/formato.ts`. Valores vacíos: «No capturado» en `--tinta-tenue`, en lugar de «— (vacío)». Skill: *Content → Date Formatting*.
- **G7 — Casillas y opciones de tamaño normal.** Las casillas y los botones de opción se dibujan de 36 px (círculos y cuadros enormes con un punto pequeño), distintos del interruptor de Usuarios. Cambiar a: control visual de 18–20 px y toda la fila (control + texto) como área de clic de al menos 44 px de alto. «Tipo activo para nuevas emisiones» pasa a ser el mismo interruptor (`role="switch"`) que «Usuario activo». «Sin vencimiento por defecto» se mueve junto a «Vigencia por defecto», como parte del mismo grupo. Skill: *Accessibility → Target Size (Minimum)* (24 px en web) y *Touch → Touch Target Size*.
- **G8 — Botones de acción en celular.** En emitir, nuevo tipo y el modal, los botones quedan alineados a la derecha, uno sobre otro y de anchos distintos. Debajo de 768 px: botón principal a todo el ancho y abajo; el secundario a todo el ancho encima, con estilo de contorno. En escritorio sin cambios. Criterio del orquestador (la skill no tuvo una regla específica).
- **G9 — Detalle legible.** «Datos generales» es una tarjeta por dato (cinco cajas para cinco valores). Cambiar a renglones etiqueta/valor en dos columnas en escritorio y una en celular, como en la página pública. La bitácora muestra el detalle en crudo en monoespaciada (`folio: CONST-2026-000002`): mostrarlo como texto («Folio CONST-2026-000002», «Motivo: …»), con el folio en Plex Mono. Criterio del orquestador.

## Prioridad baja

- **G10 — Lista vacía con una sola salida.** Sin resultados aparecen «Limpiar filtros» y «Restablecer búsqueda», que hacen lo mismo. Dejar uno («Limpiar filtros») y que el mensaje diga qué se buscó: «Ningún documento coincide con "zzzz"». Criterio del orquestador.
- **G11 — Usuarios.** En celular cada usuario es una tarjeta de unos 380 px; compactar: nombre y área en una fila de dos columnas desde 360 px si caben, rol e interruptor en otra. El aviso «Alta de nuevas cuentas…» plegable («¿Cómo dar de alta a alguien?»). En escritorio, «Tu cuenta actual» no debe cambiar la altura de la fila (ponerlo como etiqueta junto al nombre). El botón «Guardar» deshabilitado con estilo de contorno gris, no el mismo botón verde al 55 % de opacidad, que parece activo. Skill: *Typography → Contrast Readability* (estado deshabilitado claramente distinto).
- **G12 — Indicadores en celular.** «Por vencer (30 días)» se parte en dos renglones en la tarjeta. Etiqueta «Por vencer» y «en 30 días» como texto secundario más chico. Skill: *Content → Compact Label Overflow*.
- **G13 — Login.** El nombre «PROESA Electrónica» aparece dos veces (logo y subtítulo); quitar el subtítulo. Si el envío falla, marcar los campos como en G1.

## Definición de terminado

- `npm run build` sin errores después de cada tarea.
- **Sin capturas de pantalla.** El orquestador revisa con `qa/` y sus propias capturas.
- `PROGRESO.md` → *Fase 4 — Antigravity* actualizado, una línea por tarea.
- Regla 10: nada de rutas, esperas ni respuestas especiales para las pruebas.
