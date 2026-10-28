# Tareas de Codex — Backend (Edge Functions + PDF)

## Prompt de arranque (copiar y pegar en Codex)

> Trabajas en la carpeta `Documentos con QR`. Lee `AGENTS.md`, `docs/01-arquitectura.md`, `docs/02-contrato-api.md`, `docs/03-seguridad.md` y este archivo (`tareas/CODEX.md`). Implementa las tareas C1 a C6 en orden, solo dentro de `supabase/functions/` y `supabase/tests/`. No modifiques `supabase/migrations/` ni `docs/`. Al terminar cada tarea, márcala en `PROGRESO.md` y anota cómo se prueba. Si algo del contrato no está claro, escríbelo en `PROGRESO.md` → *Preguntas al orquestador*, elige la opción más segura y continúa.

## Stack

- Supabase Edge Functions (Deno 2, TypeScript).
- `npm:@supabase/supabase-js@2.49.4`
- `npm:pdf-lib@1.17.1`
- `npm:qrcode@1.5.4` (solo `QRCode.create()` para obtener la matriz; el QR se dibuja como rectángulos vectoriales con pdf-lib, sin canvas ni PNG).
- Pruebas: `deno test`.

## Estructura esperada

```
supabase/
  config.toml                  # [functions.verificar] verify_jwt = false ; [functions.emitir-documento] verify_jwt = true
  functions/
    deno.json                  # imports con versiones fijas
    _shared/
      cors.ts                  # encabezados CORS a partir de ALLOWED_ORIGINS
      errores.ts               # respuesta {error:{codigo,mensaje}} y mapeo 42501/22023
      cliente.ts               # cliente service_role y cliente con el JWT del usuario
      aleatorio.ts             # generarToken(), generarCodigo(), formatearCodigo()
      hash.ts                  # sha256Hex(bytes|string)
      validacion.ts            # regex y límites del contrato
      pdf.ts                   # generarPdf(datos) → Uint8Array
    emitir-documento/index.ts
    verificar/index.ts
  tests/
    aleatorio.test.ts
    validacion.test.ts
    pdf.test.ts
    integracion.ts             # script contra el proyecto de prueba (lo corre el orquestador)
```

## C1 — Utilidades compartidas

- `generarToken()`: 32 bytes con `crypto.getRandomValues`, base64url sin `=` → 43 caracteres.
- `generarCodigo()`: 10 caracteres de `0123456789ABCDEFGHJKMNPQRSTVWXYZ` con `byte & 31`. `formatearCodigo('7KQ2MXA9PD')` → `7KQ2M-XA9PD`.
- `sha256Hex()` con `crypto.subtle.digest`.
- `cors.ts`: responde `OPTIONS` con 204; `Access-Control-Allow-Origin` solo si el `Origin` está en `ALLOWED_ORIGINS`; permite `authorization, apikey, content-type, x-client-info`.
- `errores.ts`: `respuestaError(status, codigo, mensaje)`; `desdeErrorPostgres(err)` mapea `42501` → 403 `SIN_PERMISO`, `22023` → 400 `VALIDACION` (con el mensaje de Postgres), lo demás → 500 `INTERNO` "Ocurrió un error, intente de nuevo".
- `validacion.ts`: regex del contrato (token, folio, código, sha256), fecha `AAAA-MM-DD` válida, límites de longitud, cuerpo ≤ 32 KB (revisar `content-length` y el tamaño real del texto).

**Prueba:** `deno test supabase/tests/aleatorio.test.ts supabase/tests/validacion.test.ts` — longitud y alfabeto del token/código, 1 000 tokens sin repetidos, casos válidos e inválidos de cada regex.

## C2 — Generador de PDF (`_shared/pdf.ts`)

Entrada:

```ts
interface DatosPdf {
  orgNombre: string;          // ORG_NOMBRE
  tipoNombre: string;
  folio: string;
  destinatario: string;
  campos: { clave: string; etiqueta: string; tipo: string }[];
  datos: Record<string, string>;
  emitidoEn: string;          // ISO
  vigenteHasta: string | null; // AAAA-MM-DD
  urlVerificacion: string;
  codigo: string;             // ya formateado XXXXX-XXXXX
  dominioOficial: string;     // host de VERIFICACION_BASE_URL
}
```

Diseño (tamaño carta, 612×792 pt, márgenes 56 pt):

1. **Encabezado:** `orgNombre` en negritas y una línea horizontal. Debajo, a la derecha: `Folio: CONST-2026-000001`.
2. **Título:** `tipoNombre`, centrado, 18 pt.
3. **Cuerpo:** `Destinatario:` + nombre. Luego cada campo con valor: `Etiqueta: valor` (incluye los no públicos: es el documento completo). Fechas en formato `dd/mm/aaaa`. Ajuste de línea para textos largos. Si no cabe en una página, agregar páginas.
4. **Fechas:** "Emitido el dd/mm/aaaa" (zona `America/Mexico_City`) y "Vigente hasta dd/mm/aaaa" o "Sin vencimiento".
5. **Bloque de verificación** (al pie de la última página, recuadro):
   - QR de `urlVerificacion`, corrección de error **M**, 4 módulos de zona blanca, ~110 pt de lado.
   - Texto a la derecha: "Verifique la autenticidad de este documento escaneando el código QR o entrando a **{dominioOficial}/verificar** con el folio y el código **{codigo}**." y, en una línea aparte: "Este documento solo es válido si la verificación se hace en {dominioOficial}."
6. **Metadatos del PDF:** Title = folio, Author = orgNombre, Producer = "PROESA Documentos QR", CreationDate = emitidoEn.
7. **Fuente:** Helvetica / Helvetica-Bold estándar (WinAnsi). Acentos y ñ funcionan. Reemplazar cualquier carácter que WinAnsi no pueda codificar por `?` antes de dibujar, para que nunca truene.

**Prueba (`pdf.test.ts`):** genera un PDF con acentos y ñ, valida que abre con `PDFDocument.load`, que el título coincide con el folio y que un texto de 3 000 caracteres genera más de una página. Guarda un ejemplo en `supabase/tests/salida/ejemplo.pdf` (carpeta ignorada en git) para revisión visual del orquestador.

## C3 — `emitir-documento`

Exactamente los pasos 1–8 de `docs/02-contrato-api.md` §1.

- Rechazar si no es `POST` (405) y aplicar CORS.
- Validar el cuerpo antes de llamar a la base.
- Cliente para `getUser` con el JWT del encabezado; cliente `service_role` para las RPC y Storage.
- Si fallan los pasos 5–7, registrar en el log solo `documento_id`, folio y el mensaje de error (sin token ni código) y responder 500. El documento queda `pendiente` (es el comportamiento diseñado).
- `dominioOficial` = `new URL(VERIFICACION_BASE_URL).host`.

## C4 — `verificar`

Exactamente §2 del contrato.

- IP: primer valor de `x-forwarded-for` (recortado); si no hay, `null`.
- `p_ip_hash = sha256Hex(IP_SALT + ip)`. Si falta `IP_SALT`, responder 500 (no verificar sin límite).
- `limite_excedido` → HTTP 429 con el cuerpo devuelto por la RPC.
- Encabezados de respuesta: `Cache-Control: no-store`.

## C5 — Configuración

- `supabase/config.toml` con `verify_jwt` por función.
- `supabase/functions/deno.json` con versiones fijas.
- `.env.example` en `supabase/functions/` con las variables del contrato (sin valores reales).

## C6 — Script de integración (`supabase/tests/integracion.ts`)

Lo ejecuta el orquestador con `deno run -A supabase/tests/integracion.ts`. Lee de variables de entorno: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `EMISOR_EMAIL`, `EMISOR_PASSWORD`, `CONSULTA_EMAIL`, `CONSULTA_PASSWORD`.

Cubre los casos E1–E6, E8, V1–V7, V11, S1–S3 de `docs/04-pruebas-aceptacion.md` e imprime una tabla `caso | esperado | obtenido | OK/FALLA`. No borra datos.

## Definición de terminado

- `deno check` y `deno test` sin errores.
- Ningún secreto en el código.
- `PROGRESO.md` actualizado.
