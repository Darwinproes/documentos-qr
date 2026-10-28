# 04 — Pruebas de aceptación

Las corre el orquestador contra el proyecto de prueba cuando backend y frontend estén listos. El piloto se da por terminado cuando todas pasan.

## Emisión

| # | Caso | Esperado |
|---|---|---|
| E1 | Emisor emite `CONST` con todos los campos requeridos | 200; folio `CONST-2026-000001` (o siguiente); PDF descargable; estado `vigente` |
| E2 | Falta `concepto` | 400 `VALIDACION` "Falta el campo requerido: Concepto"; no se consume folio |
| E3 | Usuario con rol `consulta` intenta emitir | 403 `SIN_PERMISO` |
| E4 | Sin sesión | 401 `NO_AUTENTICADO` |
| E5 | `datos` trae una clave no definida en el tipo | Se descarta; no aparece en el PDF ni en la base |
| E6 | Dos emisiones simultáneas del mismo tipo | Folios distintos y consecutivos |
| E7 | El PDF trae QR legible con cámara de celular, folio, código `XXXXX-XXXXX` y leyenda con dominio oficial | Visual |
| E8 | SHA-256 del PDF descargado = `pdf_sha256` registrado | Igual |
| E9 | Acentos y ñ en destinatario y campos | Se ven bien en PDF y en la verificación |

## Verificación

| # | Caso | Esperado |
|---|---|---|
| V1 | Escanear el QR de E1 | Página `/v/…` en verde **VÁLIDO** con los datos públicos |
| V2 | Token inventado de 43 caracteres | **NO ENCONTRADO** |
| V3 | Token con formato inválido | 400; la página muestra "enlace no válido" |
| V4 | Folio + código correctos (con minúsculas, sin guion, con O en vez de 0) | **VÁLIDO** |
| V5 | Folio correcto + código incorrecto | **NO ENCONTRADO** |
| V6 | Subir el PDF original | **VÁLIDO** |
| V7 | Subir el PDF modificado (un byte) | **NO ENCONTRADO** con mensaje "el archivo no coincide; puede estar alterado" |
| V8 | Documento cancelado | Rojo **CANCELADO** con fecha |
| V9 | Documento con `vigente_hasta` en el pasado (se ajusta a mano en la base) | Ámbar **VENCIDO** |
| V10 | 21 verificaciones en un minuto desde la misma IP | La 21 responde 429 / **límite excedido** |
| V11 | Documento en estado `pendiente` | **NO ENCONTRADO** |
| V12 | Campo con `publico: false` | No aparece en la verificación |

## Seguridad

| # | Caso | Esperado |
|---|---|---|
| S1 | Con la publishable key y sin sesión: `select` a cualquier tabla | Vacío / sin permiso |
| S2 | Usuario autenticado: `select token_hash from documentos` | *permission denied* |
| S3 | Usuario autenticado: `rpc('emitir_documento')` o `rpc('verificar_documento')` directo | *permission denied* |
| S4 | `update`/`delete` en `bitacora` o `verificaciones` | Error "solo inserción" |
| S5 | Emisor llama `cancelar_documento` | 403 / error de permiso |
| S6 | Buscar la `service_role` key o `IP_SALT` en `web/` y en el repositorio | No aparecen |
| S7 | Logs de las Edge Functions tras E1 y V1 | No contienen token ni código |
| S8 | Supabase Security Advisor | Sin avisos de nivel ERROR |

## Panel

| # | Caso | Esperado |
|---|---|---|
| P1 | Login con usuario válido / inválido | Entra / mensaje claro |
| P2 | Lista con búsqueda por folio y destinatario, filtro por estado y tipo | Funciona y pagina |
| P3 | Detalle muestra bitácora; admin ve verificaciones y botón Cancelar | Correcto por rol |
| P4 | Admin da de alta un tipo nuevo con 3 campos y se emite un documento de ese tipo | Funciona sin tocar código |
| P5 | Admin cambia rol de un usuario de `consulta` a `emisor` | El usuario ya puede emitir |
