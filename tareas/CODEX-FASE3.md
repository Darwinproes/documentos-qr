# Fase 3 — QA automatizada en el repositorio · Codex

## Prompt de arranque (copiar y pegar en Codex)

> Fase 3. Lee `AGENTS.md`, `docs/02-contrato-api.md`, `docs/04-pruebas-aceptacion.md` y este archivo. Implementa **primero I1–I5 (identidad visual del PDF)** dentro de `supabase/functions/` y `supabase/tests/`, y después Q1 a Q5 en una carpeta nueva `qa/` en la raíz (es tuya; no toques `web/` ni `supabase/migrations/`). Marca cada tarea en `PROGRESO.md` → *Fase 3 — Codex*.

Objetivo: que cualquier persona pueda volver a correr, con un comando, la QA de punta a punta que hizo el orquestador el 2026-10-28, sin cuentas reales y sin tocar los datos de Supabase.

## Primero: identidad visual del PDF (I1–I5) — antes de Q1–Q5

El usuario eligió para el sistema la identidad **«Papel de seguridad»** en lo que ven terceros. El PDF es lo primero que ve un tercero, así que adopta esa identidad, la misma de la página pública. Reglas y tokens: `design-system/documentos-qr-proesa/pages/decisiones-proyecto.md` → *Identidad elegida*. Maqueta: `design-system/documentos-qr-proesa/maquetas/direcciones-visuales.html`, dirección **B**. Solo `supabase/functions/` y `supabase/tests/`.

- **I1 — Tinta y color.** El azul `#0F2D52` pasa a tinta `#1F2A44`; las etiquetas, a `#56606B`; las líneas de trama, a `#9DB3A8`. Verde de sello `#17663A` en el bloque de verificación.
- **I2 — Trama de seguridad.** Dibujar con líneas vectoriales finas (0.3–0.5 pt, `#9DB3A8`) una banda de guilloche en el encabezado y un marco de guilloche alrededor del bloque de verificación. Calcular las curvas (epitrocoides) en el propio `pdf.ts`; sin imágenes. Nunca detrás del QR ni de texto: el QR conserva su zona blanca intacta.
- **I3 — Sello junto al QR.** Anillo circular con el texto diminuto «PROESA ELECTRÓNICA · REGISTRO CENTRAL DE DOCUMENTOS ·» siguiendo el círculo (cada carácter rotado), del mismo estilo que el sello de la página pública, al lado del QR y no encima.
- **I4 — Línea de microtexto.** Sobre el pie de cada página, una línea continua de microtexto de 3–3.5 pt que repita «PROESA ELECTRÓNICA REGISTRO CENTRAL {folio}». Es un elemento de seguridad real: se vuelve una línea gris al fotocopiar.
- **I5 — Serifa en títulos (opcional si el peso lo permite).** Incrustar Spectral 700 (subconjunto) con `@pdf-lib/fontkit` (versión fija) para el título del tipo de documento y el folio del encabezado; el resto sigue en Helvetica. Si el PDF crece más de 120 KB, descartar I5 y anotarlo.
- **Pruebas.** Actualizar `pdf.test.ts` y regenerar `ejemplo.pdf` y `ejemplo-largo.pdf`. El orquestador revisa visualmente y además **escanea el QR impreso** antes de desplegar, para confirmar que la trama no afecta la lectura.

## Tareas de QA automatizada

- **Q1 — Supabase simulado (`qa/mock-supabase.mjs`).** Servidor Node sin dependencias en `localhost:54399` que responda lo que usa el frontend:
  - `POST /auth/v1/token?grant_type=password`, `GET /auth/v1/user`, `POST /auth/v1/logout`.
  - PostgREST en `/rest/v1/<tabla>` para `perfiles`, `tipos_documento`, `documentos`, `bitacora` y `verificaciones`: `select` con la relación `tipos_documento(...)`; filtros `eq`, `neq`, `lt`, `gte` y `or=(…ilike…)`; paginación por `offset`/`limit` y por `Range`; `Prefer: count=exact` con `Content-Range`; `Accept: application/vnd.pgrst.object+json` para `.single()`; `POST` y `PATCH`.
  - RPC `cancelar_documento`, `rol_actual`, `resumen_documentos` y `bitacora_documento` con el comportamiento del contrato.
  - `POST /storage/v1/object/sign/…` (y `GET` del enlace firmado → un PDF de ejemplo) y `POST /functions/v1/emitir-documento` y `/verificar`.
  - Datos ficticios: 3 usuarios (admin, emisor, consulta) + 1 inactivo, 2 tipos y 30 documentos con todos los estados, nombres largos y acentos.
  - La contraseña de prueba se lee de la variable `QA_CLAVE`; nunca va escrita en el repositorio.
- **Q2 — Pruebas de interfaz (`qa/e2e/`) con `playwright-core` (versión fija) y el Chrome del sistema.** Casos mínimos:
  - Pública (sitio real, solo lectura; usa como entrada `QA_URL`, `QA_TOKEN`, `QA_FOLIO` y `QA_CODIGO`): P01–P18 de la QA del orquestador.
  - Panel (contra el simulado): login correcto e incorrecto, búsqueda, filtro por estado, paginación, detalle, descargar PDF, modal de cancelar (foco, Esc, trampa de foco, casilla de confirmación, motivo corto), los 4 pasos de emitir con Copiar, tipos (nuevo y agregar campo), usuarios, cerrar sesión, y los permisos de cada rol.
  - Las pruebas buscan los controles por su rol y su nombre visible (`getByRole('textbox', { name: /folio/i })`, no `getByLabel`, que choca con las pestañas).
- **Q3 — Auditoría automática por pantalla.** En cada pantalla y en 360/768/1440 px reportar: desplazamiento horizontal, controles < 44 px, botones sin nombre accesible, textos < 12 px, emojis, fuente Atkinson cargada, errores de consola y respuestas HTTP ≥ 400. Al final, una tabla y un `qa/salida/reporte.json`. Las capturas van a `qa/salida/capturas/` (ignorada en git).
- **Q4 — Un comando.** `qa/README.md` + `qa/package.json` con `npm run qa:publica` y `npm run qa:panel`. `qa:panel` compila `web/` con `VITE_SUPABASE_URL=http://localhost:54399` en `qa/salida/dist`, levanta el simulado y `vite preview`, corre las pruebas y apaga todo al terminar.
- **Q5 — Integración continua.** `.github/workflows/qa.yml` que en cada push a `main` corra `deno check` + `deno test` (`supabase/`), `npm run build` (`web/`) y `npm run qa:panel` (headless, con Chrome de la imagen de GitHub). La parte pública no corre en CI, para no gastar el límite de consultas del sitio real.

## Fuera de alcance

Cambiar el frontend, el esquema o las funciones. Si una prueba descubre un error del sistema, anótalo en `PROGRESO.md` → *Preguntas al orquestador*, con la captura.
