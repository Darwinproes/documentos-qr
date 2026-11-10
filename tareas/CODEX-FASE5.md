# Fase 5 — Estructura del backend y QA · Codex

## Prompt de arranque (copiar y pegar en Codex)

> Fase 5. Lee `AGENTS.md` (regla 10), `docs/02-contrato-api.md`, `tareas/CODEX-FASE4.md` (H1–H5 siguen pendientes y van primero) y este archivo. Después de H1–H5 implementa R1 a R5 en orden, solo dentro de `supabase/functions/`, `supabase/tests/` y `qa/` (no toques `web/` ni `supabase/migrations/`). Es una fase de **estructura**: el PDF, las respuestas de la API y el comportamiento no cambian. Después de cada tarea: `deno check` y `deno test` en verde (comandos abajo). Marca cada tarea en `PROGRESO.md` → *Fase 5 — Codex* con una línea de cómo se corre.

## Por qué esta fase

La revisión de código del 2026-11-09 encontró que las Edge Functions no se pueden probar por unidad (los manejadores viven dentro de `Deno.serve`), que las versiones de dependencias están en dos lugares, que el PDF dibuja el mismo encabezado dos veces y que dos scripts de QA repiten el ciclo que `common.mjs` ya exporta.

## Comandos

```sh
deno check supabase/functions/emitir-documento/index.ts supabase/functions/verificar/index.ts
deno test --allow-read --allow-write=supabase/tests/salida supabase/tests/
```

Si R3 cambia los imports a nombres del mapa, agrega `--config supabase/functions/deno.json` a ambos comandos y actualiza `.github/workflows/qa.yml` (está permitido para esta tarea).

## Tareas

### R1 — Manejadores exportados y un lector de JSON compartido

- `supabase/functions/_shared/http.ts`: `leerJson(request)` que une lo que hoy hacen las dos funciones por separado: `leerCuerpoLimitado` + `JSON.parse` + comprobación de `objeto`. Regresa `{ ok: true, body }` o `{ ok: false, respuesta: Response }` ya con el error 400 armado.
- `emitir-documento/manejador.ts` exporta `manejarEmision(request: Request): Promise<Response>`; `index.ts` queda en `Deno.serve(manejarEmision)`. Igual `verificar/manejador.ts` con `manejarVerificacion`.
- Dentro de `manejarEmision`, separa la validación del cuerpo en `validarSolicitudEmision(body)` que regresa el error o los datos limpios; hoy son seis `if` de una línea muy larga.

Nada cambia hacia afuera: mismos códigos, mismos mensajes.

### R2 — Pruebas de los manejadores (lo que hoy no tiene pruebas)

`supabase/tests/verificar.test.ts` y `supabase/tests/emitir.test.ts`, construyendo `new Request(...)` y llamando al manejador. Todos los casos deben fallar **antes** de tocar red o base de datos:

| Caso | Esperado |
|---|---|
| `GET` | 405 `METODO_NO_PERMITIDO` |
| cuerpo que no es JSON | 400 `VALIDACION` |
| cuerpo mayor a 32 KB (`content-length`) | 400 `VALIDACION` |
| `metodo` desconocido | 400 |
| `qr` con token de 10 caracteres | 400 «El enlace no es válido» |
| `manual` con folio `ABC` | 400 |
| `archivo` con huella de 10 caracteres | 400 |
| emitir sin `Authorization` | 401 `NO_AUTENTICADO` |
| emitir con `tipo_clave` `x` | 400 |
| emitir con `destinatario` de 201 caracteres | 400 |
| `OPTIONS` con origen permitido | 204 y `Access-Control-Allow-Origin` igual al origen |
| `OPTIONS` con origen no permitido | 204 sin `Access-Control-Allow-Origin` |

Para CORS usa `Deno.env.set("ALLOWED_ORIGINS", ...)` dentro de la prueba. Agrega los dos archivos al paso de CI.

### R3 — Versiones en un solo lugar

`deno.json` tiene un mapa de importaciones y el código importa `npm:paquete@versión` escrito a mano; el mapa no se usa. Cambia todos los imports de `_shared/`, de las dos funciones y de `supabase/tests/` a los nombres del mapa (`"pdf-lib"`, `"qrcode"`, `"@signpdf/signpdf"`, etc.) y agrega al mapa `node-forge` (lo usan las pruebas). El despliegue ya se hace con `import_map_path: "deno.json"`, así que no cambia nada en producción. Regenera `deno.lock`.

Cómo se prueba: `grep -rn 'from "npm:' supabase/` no regresa nada; los comandos de arriba con `--config` en verde.

### R4 — Un solo encabezado en el PDF

En `_shared/pdf.ts` la primera página dibuja el encabezado a mano (emblema 30×47, nombre 14 pt, línea 9 pt) y las siguientes usan `drawHeader` (emblema 23×36, 11 pt, 8 pt). Deja una sola función `dibujarEncabezado(page, data, fuentes, logo, { principal: boolean })` que reciba el tamaño y úsala en ambos casos. El PDF de una página debe quedar igual al actual salvo metadatos de fecha; compara `supabase/tests/salida/ejemplo.pdf` antes y después con `pdftotext -layout` o con la prueba de PyMuPDF del orquestador.

### R5 — Un solo ciclo de ejecución en QA

`qa/e2e/panel.mjs` y `qa/e2e/auditoria.mjs` reimplementan el ciclo abrir navegador → correr casos → imprimir tabla → `exitCode` que `common.mjs` ya exporta como `runCases` y que `publica.mjs` sí usa. Cámbialos a `runCases`; si la auditoría necesita el reporte JSON, agrega a `runCases` una opción `onFinish(results)` en lugar de copiar el ciclo.

Cómo se prueba: `npm run qa:panel` 12/12 y `qa/salida/reporte.json` idéntico en forma.

## Lo que no se toca

- `supabase/migrations/`, `web/`, `docs/`.
- Códigos y mensajes de error del contrato.
- Contenido visible del PDF.
