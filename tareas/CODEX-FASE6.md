# Fase 6 — Descarga del PDF original · Codex

## Prompt de arranque (copiar y pegar en Codex)

> Fase 6. Lee `AGENTS.md` (regla 10), `docs/02-contrato-api.md` sección **2.1** y este archivo. Implementa DS1 a DS3 en orden, solo dentro de `supabase/functions/`, `supabase/tests/` y `qa/` (no toques `web/` ni `supabase/migrations/`; la migración ya la escribió el orquestador). Después de cada tarea: `deno check` y `deno test` con `--config supabase/functions/deno.json`. Si no tienes Deno, escríbelo en *Preguntas al orquestador* y sigue; el orquestador lo corre. Marca cada tarea en `PROGRESO.md` → *Fase 6 — Codex*.

## Qué se construye

Quien verifica un documento **vigente** con el QR o con folio y código puede bajar el PDF original firmado. Decisión del usuario: nunca vencidos ni cancelados; nunca con «subir archivo». La regla vive en la RPC `ruta_pdf_descarga` (migración `20261110000001_descarga_pdf_original.sql`): solo devuelve `pdf_path` cuando el resultado es `valido`.

## Tareas

### DS1 — `accion: "descargar"` en `verificar`

- `validacion.ts`: `accion` opcional, `"verificar"` por defecto; cualquier otro valor → 400 `VALIDACION`. `archivo` + `descargar` → 400 con el mensaje exacto del contrato.
- `verificar/manejador.ts`: con `descargar`, llama a `rpc('ruta_pdf_descarga', …)` con los mismos `p_ip_hash` y `p_user_agent` que la verificación. Si `resultado = "valido"` y viene `pdf_path`, crea la URL con `createSignedUrl(pdf_path, 120, { download: `${folio}.pdf` })` y responde `{ resultado, descarga: { url, nombre_archivo, expira_en } }`. Si no, `{ resultado, descarga: null }`. `limite_excedido` → 429. Error al firmar → 500 `INTERNO`.
- Sin `accion`, la respuesta de verificación queda **idéntica** a la actual.

### DS2 — Pruebas del manejador

En `supabase/tests/verificar.test.ts`, antes de tocar red:

| Caso | Esperado |
|---|---|
| `accion: "borrar"` | 400 `VALIDACION` |
| `archivo` + `descargar` | 400 con «La descarga solo está disponible con el QR o con folio y código» |
| `qr` + `descargar` con token de 10 caracteres | 400 «El enlace no es válido» |

### DS3 — Simulado y pruebas de QA

- `qa/mock-supabase.mjs`: `/functions/v1/verificar` con `accion: "descargar"` devuelve `descarga.url` hacia la ruta firmada que el simulado ya sirve (`/storage/v1/object/sign/documentos/…`) solo si el documento está vigente y no vencido; si no, `descarga: null`.
- `qa/e2e/panel.mjs` (o un archivo nuevo en `qa/e2e/` incluido en `run-panel.mjs`):
  - resultado válido por QR (`/v/Qm9EjemploTokenValidoDe43CaracteresExactos1`): aparece el botón «Descargar PDF original» y al pulsarlo hay un evento `download` o se abre la URL firmada;
  - documento vencido o cancelado (por folio y código): **no** aparece el botón.
- Si una prueba falla por el producto, anótalo en *Preguntas al orquestador*; no cambies `web/`.

## Lo que no se toca

- `supabase/migrations/`, `web/`, `docs/`.
- La respuesta de verificación sin `accion`.
- `emitir-documento` y el PDF.
