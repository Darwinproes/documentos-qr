# 01 — Arquitectura del piloto

## Objetivo

Que cualquier persona que reciba un documento de PROESA pueda comprobar en segundos si **lo emitió PROESA**, si **sigue vigente** y si **sus datos coinciden** con los registrados. Un documento que no aparece en el registro no es válido, aunque use el formato oficial.

## Principio

El QR **no** es la seguridad: se puede copiar. La seguridad está en el **registro central**. El QR solo es un atajo hacia una consulta a ese registro, que devuelve los datos reales del documento para compararlos con el papel.

## Componentes

```
┌──────────────────────── Supabase (proyecto "Sesion de prueba") ─────────────────────────┐
│                                                                                           │
│  Auth (usuarios internos)      Postgres                       Storage                    │
│                                 ├ perfiles                     └ bucket "documentos"      │
│                                 ├ tipos_documento                (PDF privados)           │
│                                 ├ documentos  (solo hashes del token y del código)        │
│                                 ├ bitacora / verificaciones (solo inserción)              │
│                                 └ RPC: emitir_documento, confirmar_documento,             │
│                                        cancelar_documento, verificar_documento            │
│                                                                                           │
│  Edge Functions (Codex)                                                                   │
│   ├ emitir-documento  (requiere sesión de emisor/admin) → genera token, código, PDF + QR │
│   └ verificar         (pública, con límite por IP)      → consulta y devuelve datos      │
└───────────────────────────────────────────────────────────────────────────────────────────┘
                 ▲                                    ▲
                 │ supabase-js (sesión)               │ fetch público
┌────────────────┴───────────────┐   ┌────────────────┴──────────────────────────┐
│ Panel interno  /panel/*        │   │ Verificación pública  /v/:token, /verificar│
│ (Antigravity)                  │   │ (Antigravity)                              │
└────────────────────────────────┘   └────────────────────────────────────────────┘
          Una sola app web (Vite + React + TypeScript), sitio estático en Render
```

## Flujo de emisión

1. Usuario interno (rol `emisor` o `admin`) inicia sesión en el panel.
2. Elige el tipo de documento; el formulario se arma a partir de `tipos_documento.campos`.
3. El panel llama a la Edge Function `emitir-documento` con su sesión.
4. La función:
   1. Genera un **token** aleatorio (32 bytes, base64url, 43 caracteres) y un **código manual** (10 caracteres Crockford, se muestra `XXXXX-XXXXX`).
   2. Llama a `emitir_documento` → la base asigna el folio `PREFIJO-AAAA-NNNNNN`, guarda **solo el SHA-256** del token y del código, y deja el documento `pendiente`.
   3. Genera el PDF con el QR (`{VERIFICACION_BASE_URL}/v/{token}`), el folio y el código.
   4. Calcula el SHA-256 del PDF final, lo sube a Storage y llama a `confirmar_documento` → `vigente`.
   5. Devuelve folio, enlace, código y una URL firmada para descargar el PDF.
5. Si algo falla después del paso 2, el documento queda `pendiente` y **nunca** aparece como válido.

## Flujo de verificación

Tres formas, todas pasan por la Edge Function pública `verificar`:

| Método | Qué captura quien verifica | Se busca por |
|---|---|---|
| `qr` | Escanea el QR → abre `/v/{token}` | SHA-256 del token |
| `manual` | Escribe folio y código en `/verificar` | folio + SHA-256 del código |
| `archivo` | Arrastra el PDF en `/verificar` (el archivo **no se sube**, el navegador calcula el SHA-256) | SHA-256 del PDF |

Resultados: `valido`, `vencido`, `cancelado`, `no_encontrado`, `limite_excedido`.

Con `valido` la página muestra folio, tipo, destinatario, área emisora, fechas y los campos marcados como públicos, para que la persona los **compare con el documento que tiene en la mano**.

## Modelo de datos

La fuente de verdad es `supabase/migrations/20261028000001_esquema_inicial.sql`. Resumen:

| Tabla | Para qué |
|---|---|
| `perfiles` | Usuarios internos: nombre, área, rol (`admin`, `emisor`, `consulta`), activo. Se crea sola al dar de alta un usuario en Auth, con rol `consulta`. |
| `tipos_documento` | Catálogo de formatos. `campos` (JSON) define el formulario, qué es requerido y qué se muestra al verificar (`publico`). |
| `folios_contador` | Consecutivo por tipo y año. Uso interno. |
| `documentos` | Cada documento emitido: folio, estado, destinatario, datos, vigencia, ruta y hash del PDF, datos de cancelación. |
| `bitacora` | Quién emitió, generó PDF o canceló. No se puede modificar ni borrar. |
| `verificaciones` | Cada consulta pública, con IP seudonimizada (hash). No se puede modificar ni borrar. |

Estados: `pendiente` → `vigente` → `cancelado`. "Vencido" no es un estado guardado: se calcula con `vigente_hasta`.

Definición de `campos`:

```json
[
  {"clave": "concepto", "etiqueta": "Concepto", "tipo": "texto", "requerido": true, "publico": true}
]
```

`tipo` ∈ `texto` | `texto_largo` | `fecha` (ISO `AAAA-MM-DD`) | `numero`. Todos los valores viajan como **texto**.

## Entorno del piloto

| Elemento | Valor |
|---|---|
| Proyecto Supabase | `usbacyllkozqrcwbbuok` ("Sesion de prueba"), región us-east-1 |
| URL de la API | `https://usbacyllkozqrcwbbuok.supabase.co` |
| Hosting web | Render, sitio estático (URL `*.onrender.com` en el piloto; dominio propio en producción) |
| Zona horaria | `America/Mexico_City` (función `public.hoy_local()`) |

## Fuera del piloto (fase 2)

- Dominio propio tipo `verifica.proesaelectronica.com`.
- Firma digital del PDF (PAdES) para documentos que se mandan por correo.
- MFA para administradores.
- Plantillas de PDF por tipo de documento (en el piloto todas usan la plantilla genérica).
- Integración con la intranet.
