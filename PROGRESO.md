# Tablero de avance — Documentos con QR (piloto)

Cada agente marca sus casillas y deja **una línea**: qué hizo y cómo se prueba.

## Datos del entorno de prueba

| | |
|---|---|
| Proyecto Supabase | `usbacyllkozqrcwbbuok` ("Sesion de prueba") |
| `VITE_SUPABASE_URL` | `https://usbacyllkozqrcwbbuok.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_VLm3IKXGb-a2lJd5QTUrtQ_TWNGNhXW` (pública por diseño) |
| Tipo de ejemplo | `CONST` — "Constancia (ejemplo piloto)" |
| Usuario admin | `sistemasproesaelectronica@gmail.com` (área Sistemas) |
| Usuario consulta | `auxsistemas@proesaelectronica.com` |

El proyecto también tiene tablas de un prototipo anterior de tickets (`profiles`, `tickets`, `catalogo_*`…). **No se tocan.**

## Orquestador (Claude)

- [x] O1 — Arquitectura, contrato de API, seguridad y pruebas de aceptación (`docs/`) — 2026-10-28
- [x] O2 — Esquema aplicado en Supabase (`documentos_qr_esquema_inicial`) + tipo `CONST` — 2026-10-28
- [x] O3 — Pruebas de la base: E1, E2, E3, E5, E6, V1, V2, V4, V5, V6, V8–V12, S1–S5 OK (en transacción revertida) — 2026-10-28
- [x] O4 — Security Advisor: sin ERROR. WARN intencionales: `cancelar_documento` y `rol_actual` (validan rol internamente) — 2026-10-28
- [ ] O5 — Revisar el código de Codex, configurar secrets y desplegar las Edge Functions
- [ ] O6 — Crear el sitio estático en Render con `web/` y fijar `VERIFICACION_BASE_URL` / `ALLOWED_ORIGINS`
- [ ] O7 — Correr las pruebas de aceptación completas (`docs/04-pruebas-aceptacion.md`) y el script de integración
- [ ] O8 — Informe final del piloto

## Codex — backend (`tareas/CODEX.md`)

- [x] C1 — Utilidades compartidas + pruebas — 2026-10-28: Aleatoriedad, hash, CORS, errores y validaciones; probar con `deno test supabase/tests/aleatorio.test.ts supabase/tests/validacion.test.ts`.
- [x] C2 — Generador de PDF con QR + prueba — 2026-10-28: PDF carta multipágina con QR vectorial; probar con `deno test supabase/tests/pdf.test.ts` y revisar `supabase/tests/salida/ejemplo.pdf`.
- [x] C3 — Edge Function `emitir-documento` — 2026-10-28: Emisión validada, PDF y Storage; probar tras desplegar con el emisor de prueba.
- [x] C4 — Edge Function `verificar` — 2026-10-28: Verificación pública con hash de IP y límite RPC; probar tras desplegar con QR, código y PDF.
- [x] C5 — `config.toml`, `deno.json`, `.env.example` — 2026-10-28: Configuración y dependencias fijas; revisar archivos y configurar secrets al desplegar.
- [x] C6 — Script de integración — 2026-10-28: Agrega cobertura E1–E6/E8, V1–V7 y S1–S3; V11 requiere inyectar una falla entre emisión y confirmación. Ejecutar `deno run -A supabase/tests/integracion.ts` con variables de prueba.

Verificación local pendiente: este entorno no tiene Deno instalado; las pruebas y `deno check` quedan para ejecutarse con Deno 2.

## Antigravity — frontend (`tareas/ANTIGRAVITY.md`)

- [ ] A1 — Base del proyecto + modo simulado
- [ ] A2 — Página pública `/v/:token`
- [ ] A3 — `/verificar` (folio+código y archivo)
- [ ] A4 — Login y estructura del panel
- [ ] A5 — Lista y detalle de documentos
- [ ] A6 — Emitir documento
- [ ] A7 — Administración (tipos y usuarios)

## Pendientes del responsable (usuario)

- [ ] Activar *Leaked password protection* en Supabase → Authentication → Policies.
- [ ] Confirmar la zona horaria (se usa `America/Mexico_City`).
- [ ] Definir el primer formato real para dar de alta después del piloto.
- [ ] Para producción: subdominio propio (ej. `verifica.proesaelectronica.com`).

## Revisión del orquestador

### Backend (Codex) — 2026-10-28

Resultado: **aprobado para desplegar**. `deno check` OK; 7/7 pruebas OK; el PDF de ejemplo se ve correcto (acentos, QR vectorial, folio, código, leyenda). No hay secretos ni se registra el token o el código en logs.

Ajustes pedidos a Codex (no bloquean el despliegue del piloto):

- [x] R1 (media) — `pdf.ts`: bloque al pie de la última página; folio y código en negritas.
- [x] R2 (baja) — `pdf.ts`: zona blanca del QR de cuatro módulos dibujada dentro del área de 110 pt.
- [x] R3 (baja) — `pdf.ts`: conserva saltos de línea en campos largos.
- [x] R4 (baja) — `validacion.ts`/funciones: valida `content-length` antes de leer y limita también el cuerpo transmitido por streaming.

Segunda revisión (orquestador): R1–R3 verificados en el PDF de ejemplo; 7/7 pruebas OK. **`deno check` falla** tras R4:

- [ ] R6 (alta, bloquea el despliegue) — `emitir-documento/index.ts:16` y `verificar/index.ts:14`: `JSON.parse(raw)` recibe `string | undefined` (TS2345), porque la unión de `leerCuerpoLimitado` no se estrecha con la desestructuración. Usar el resultado sin desestructurar (`const leido = await leerCuerpoLimitado(request); if (leido.error !== undefined) return …; const raw = leido.texto;`) o devolver `{ ok: true, texto } | { ok: false, error }`. El orquestador corre `deno check` con Deno 2.1.4 antes de desplegar.

Lo verifica el orquestador al desplegar:

- [ ] R5 — Comprobar que un `X-Forwarded-For` enviado por el cliente **no** cambia el `ip_hash` (si lo cambia, el límite por IP se puede saltar).

## Preguntas al orquestador

_(Los agentes escriben aquí: fecha, agente, pregunta, qué opción eligieron mientras tanto.)_
