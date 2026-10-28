# Fase 2 — Diseño · Codex (PDF)

## Prompt de arranque (copiar y pegar en Codex)

> Fase 2 de diseño del PDF. Lee `AGENTS.md`, `design-system/documentos-qr-proesa/pages/decisiones-proyecto.md` (sección PDF) y este archivo (`tareas/CODEX-DISENO.md`). Implementa P1 a P7 en orden, solo dentro de `supabase/functions/` y `supabase/tests/`. No cambies el contrato de API. Al terminar cada tarea márcala en `PROGRESO.md` → *Fase 2 — Codex* con una línea de cómo se prueba. Instala Deno 2 si no lo tienes, o deja indicado que el orquestador corre `deno check` y `deno test`.

Objetivo: que el PDF y la página de verificación muestren **los mismos datos con las mismas etiquetas**, y que el documento se vea institucional.

## Tareas

- **P1 — Marca.** Línea de encabezado y título en `#0F2D52`. Si existe `supabase/functions/_shared/assets/logo.png`, incrustarlo arriba a la izquierda (alto 28 pt); si no existe, mostrar `orgNombre` como hoy. No inventar un logo.
- **P2 — Área emisora.** La página de verificación muestra "Área emisora", el PDF no. En `emitir-documento`, leer `perfiles.area` del emisor con el cliente de servicio y pasarla a `generarPdf` (campo nuevo `areaEmisora: string | null`). Mostrarla como dato más. Sin cambios de esquema.
- **P3 — Rejilla de datos.** Reemplazar las líneas "Etiqueta: valor" por dos columnas: etiqueta (Helvetica-Bold 9 pt, gris `#475569`, 150 pt de ancho) y valor (Helvetica 11 pt, ajuste de línea). Orden: Destinatario, campos del tipo, Área emisora, Emitido, Vigencia. Espaciado múltiplo de 4 pt.
- **P4 — Pie de página.** En **todas** las páginas: "Folio {folio} · Página n de N · Verificable en {dominio}" centrado, 8 pt, gris. Requiere dibujarlo después de generar todas las páginas.
- **P5 — Bloque de verificación.** Encabezado del recuadro "VERIFICACIÓN DE AUTENTICIDAD" (Helvetica-Bold 9 pt, `#0F2D52`). QR de 120 pt total (con su zona blanca). Código en **Courier-Bold 12 pt** para teclearlo sin confusiones; folio en Helvetica-Bold 10 pt.
- **P6 — Saltos de página.** Si un campo largo parte la página, repetir en la página nueva un encabezado mínimo (organización + folio) y no dejar el bloque de verificación partido.
- **P7 — Pruebas.** Actualizar `pdf.test.ts`: caso con área emisora, caso de 3 páginas (pie "Página 3 de 3"), caso sin logo. Regenerar `supabase/tests/salida/ejemplo.pdf` y `ejemplo-largo.pdf` para revisión del orquestador.

## Fuera de alcance

Cambiar la fuente del PDF, firma digital PAdES, marcas de agua.
