# Fase 3 — Pulido visual y de uso · Antigravity (frontend)

## Prompt de arranque (copiar y pegar en Antigravity)

> Fase 3. Lee `AGENTS.md`, `design-system/documentos-qr-proesa/MASTER.md`, `design-system/documentos-qr-proesa/pages/decisiones-proyecto.md` (sección **Fase 3**, manda sobre MASTER), `docs/02-contrato-api.md` (dos RPC nuevas: `resumen_documentos` y `bitacora_documento`) y este archivo. Implementa F1 a F14 en orden de prioridad, solo dentro de `web/`. Antes de cada tarea toma captura del «antes» y al terminar la del «después» a 360, 768 y 1440 px en `web/capturas-fase3/` (carpeta ignorada en git). Marca cada tarea en `PROGRESO.md` → *Fase 3 — Antigravity* con una línea de cómo se prueba. `npm run build` debe pasar al terminar cada tarea. Si `node_modules` está dañado, corre `npm install`.

Origen: auditoría del orquestador del 2026-10-28 (QA automatizada: pública 21/21, panel con hallazgos; 49 capturas revisadas). Nada de esto rompe el sistema; es calidad de uso.

## Prioridad alta

- **F1 — Navegación del panel en móvil y tableta.** Hoy, a 360 px, la primera pantalla completa es el menú y el contenido empieza abajo. Bajo 1024 px: barra superior fija de 56 px con logo, título de la sección actual y botón «Menú» (`aria-expanded`, `aria-controls`) que abre un panel lateral con las secciones, el usuario, el rol y «Cerrar sesión». Cerrar con Esc, al tocar fuera y al navegar; foco atrapado mientras está abierto y devuelto al botón al cerrar. En ≥ 1024 px la barra lateral se queda como está.
- **F2 — Tabla de documentos más compacta.** El folio se parte en 3 líneas y «Ver detalle» en 2, y las filas miden ~58 px. Folio y fechas con `white-space: nowrap`; columna Tipo muestra la clave como etiqueta (`CONST`) y el nombre en `title`; fecha de emisión sin hora (la hora en `title`); la fila entera es enlace al detalle (el folio es el `<a>`; el resto de la fila responde al clic) y la columna «Acciones» se elimina. Meta: filas de 48–56 px.
- **F3 — Indicadores sobre la lista.** Cuatro tarjetas con `rpc('resumen_documentos')`: Vigentes, Por vencer (30 días), Vencidos, Cancelados. Cada una es un botón que aplica el filtro correspondiente (`aria-pressed` cuando está activo). Ícono + número + texto; nada de color solo.
- **F4 — Tarjetas de la lista en móvil.** Tarjeta compacta y enlazable completa: fila 1 folio + etiqueta de estado, fila 2 destinatario (máximo 2 líneas con elipsis), fila 3 tipo · fecha. Sin botón «Ver detalle». Paginación visible al final.

## Prioridad media

- **F5 — Detalle sin duplicados y con personas.** Folio y estado solo en el encabezado (quitar sus tarjetas de «Datos generales»). Bitácora con `rpc('bitacora_documento')`: mostrar «Emitido por *Nombre* (Área)», nunca «Actor ID». Huella SHA-256 abreviada `5fec…f38b` con botón «Copiar». Enlace «← Volver a documentos emitidos» con ícono.
- **F6 — Resultado público como lista de comparación.** Sustituir «una tarjeta por dato» por filas etiqueta/valor separadas por líneas finas dentro de una sola tarjeta. Folio (monoespaciado) y destinatario siguen destacados. En móvil, pares Emitido/Vigencia y Fecha/Horas en dos columnas. Meta: el resultado válido de ejemplo cabe en ~1.5 pantallas a 360 px (hoy ~2.6).
- **F7 — Un solo aviso de dominio.** El bloque con candado se queda; el pie deja de repetir el texto y la hora (pie: «© PROESA Electrónica» + «Acceso interno» + contacto). El dominio con `white-space: nowrap` en todos lados: hoy se parte en «documentos-» / «qr.onrender.com».
- **F8 — Encabezado público.** Solo logo y «Verificar documento». «Acceso interno» se mueve al pie.
- **F9 — Ayuda en `/verificar`.** En escritorio, dos columnas: formulario | ayuda. La ayuda muestra un esquema SVG del bloque «Verificación de autenticidad» del PDF señalando dónde están el folio y el código, y el texto «¿Tiene el documento en papel? Escanee el QR con la cámara de su celular». En móvil, la ayuda va debajo, plegable.
- **F10 — Usuarios y roles.** Casillas «Activo» de 18 px → interruptor (`role="switch"`) con área táctil de 44 px. Ocultar los UUID (si acaso, en `title`). «Guardar» deshabilitado hasta que la fila cambie y aviso «Guardado» con `aria-live`. Si el admin intenta quitarse su propio rol de administrador o desactivarse, pedir confirmación.

## Prioridad baja

- **F11 — Textos.** «Cerrar sesión» sin el nombre (ya aparece arriba); «1 campo» / «N campos»; «Vigencia por defecto» en lugar de «Vigencia default»; revisar el resto de la interfaz por anglicismos.
- **F12 — Botón sin nombre accesible.** La auditoría encontró 1 botón o enlace sin nombre accesible en el layout del panel (en todas las pantallas). Darle `aria-label` o texto visible.
- **F13 — No consultar sin sesión.** Al abrir `/panel/*` sin sesión, la página pide `documentos` y `tipos_documento` (401 en consola) antes de redirigir. No montar las páginas protegidas hasta resolver la sesión.
- **F14 — Rendimiento (R9/R10 pendientes).** Carga diferida de `/panel/*` y del cliente de Supabase en las páginas públicas; reservar el alto de la banda de resultado (CLS hoy 0.093).

## Definición de terminado

- `npm run build` sin errores.
- Capturas antes/después de cada tarea a 360/768/1440 en `web/capturas-fase3/`.
- 0 desplazamiento horizontal, controles ≥ 44 px, foco visible, sin UUID visibles.
- `PROGRESO.md` actualizado. El orquestador vuelve a correr la QA automatizada completa.
