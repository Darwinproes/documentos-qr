# Fase 6 — Descarga del PDF original · Antigravity

## Prompt de arranque (copiar y pegar en Antigravity)

> Fase 6. Lee `AGENTS.md` (regla 10), `docs/02-contrato-api.md` sección **2.1** y este archivo. Implementa DW1 a DW3 en orden, solo dentro de `web/`. **No tomes capturas de pantalla.** Después de cada tarea: `npm run build` sin errores y `cd ../qa && npm run qa:panel` en verde. Si una prueba de `qa/` falla, **no cambies el producto para que pase**: anótalo en `PROGRESO.md` → *Preguntas al orquestador*. Marca cada tarea en `PROGRESO.md` → *Fase 6 — Antigravity*.

## Qué se construye

En la página pública de resultado, quien verificó un documento **vigente** con el QR o con folio y código puede bajar el PDF original firmado. Decisión del usuario: nunca en vencidos ni cancelados; nunca con «subir archivo». El servidor ya lo impide; la página solo debe ofrecer el botón donde aplica.

## Tareas

### DW1 — Cliente de la API

- `lib/api.ts`: `descargarOriginal(entrada)` donde `entrada` es `{ metodo: 'qr', token }` o `{ metodo: 'manual', folio, codigo }`; manda `accion: 'descargar'` y regresa `{ resultado, descarga }` según el contrato. Tipos en `lib/tipos.ts` (`DescargaPdf`).
- `lib/api-simulada.ts`: para el ejemplo vigente regresa `descarga.url` hacia un PDF de ejemplo en `web/public/ejemplo-documento.pdf` (cópialo de `supabase/tests/salida/ejemplo-firmado.pdf`); para los demás, `descarga: null`.

### DW2 — Botón en el resultado

En `ResultadoVerificacionVista` (o un componente nuevo `components/verificar/DescargaOriginal.tsx`), solo cuando `resultado === 'valido'` **y** la verificación se hizo con QR (`/v/:token`) o con folio y código:

- Botón secundario **«Descargar PDF original»**, debajo de los datos del documento, con la nota: «Es el archivo que emitió PROESA, con su firma digital. Úselo para comparar con la copia que recibió.»
- Al pulsarlo: el botón dice «Preparando descarga…» y queda deshabilitado; pide `descargarOriginal` y, si llega `descarga.url`, navega a ella (`window.location.assign`), lo que baja el archivo con el nombre `<folio>.pdf`.
- Si la respuesta ya no es `valido` (lo cancelaron o venció entre la verificación y el clic): mensaje en la misma zona, «Este documento ya no está vigente; no se puede descargar.», y se quita el botón.
- `limite_excedido`: «Demasiadas consultas desde esta conexión. Espere un minuto e intente de nuevo.»
- Error de red o 500: «No se pudo preparar la descarga. Intente de nuevo.»; el botón vuelve a estar disponible.
- Accesible: es un `<button>`, mínimo 44 px, los mensajes en `role="status"` (o `alert` para errores), foco visible. Usa las clases existentes (`btn btn-secondary`, `alert`); colores solo por variables de `:root`.

Para la verificación con folio y código, la página ya tiene folio y código en su estado: pásalos al componente; **no** los pongas en la URL.

### DW3 — Sin botón donde no aplica

Comprueba en el modo simulado (`VITE_API_SIMULADA=1 npm run dev`) que el botón **no** aparece en: vencido, cancelado, no encontrado, límite excedido y verificación por archivo.

## Lo que no se toca

- `supabase/`, `qa/`, `docs/`.
- El resto del contenido y el diseño de la página de resultado.
