# Fase 3 — QA automatizada en el repositorio · Codex

## Prompt de arranque (copiar y pegar en Codex)

> Fase 3. Lee `AGENTS.md`, `docs/02-contrato-api.md`, `docs/04-pruebas-aceptacion.md` y este archivo. Implementa Q1 a Q5 en una carpeta nueva `qa/` en la raíz (es tuya; no toques `web/` ni `supabase/migrations/`). Marca cada tarea en `PROGRESO.md` → *Fase 3 — Codex*.

Objetivo: que cualquier persona pueda volver a correr, con un comando, la QA de punta a punta que hizo el orquestador el 2026-10-28, sin cuentas reales y sin tocar los datos de Supabase.

## Tareas

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
