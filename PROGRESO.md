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
- [x] O5 — Edge Functions `verificar` (sin JWT) y `emitir-documento` (con JWT) desplegadas v1 tras R6; faltan secrets (los captura el usuario en el panel) — 2026-10-28
- [x] O6 — Sitio Render `documentos-qr` → https://documentos-qr.onrender.com (repo Darwinproes/documentos-qr, autodeploy main); Rewrite `/*` → `/index.html` activa — 2026-10-28
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

- [x] A1 — Base del proyecto + modo simulado — 2026-10-28: Vite 5.4.11 + React 18.3.1 + TS 5.6.3, cliente Supabase, tipos del contrato y `api.ts` con modo simulado (`VITE_API_SIMULADA=1`); probar con `cd web && npm run build`.
- [x] A2 — Página pública `/v/:token` — 2026-10-28: Vista móvil primero con validación previa de token (43 chars), `noindex`, 5 estados con ícono/color/texto oficial y pie de dominio; probar en `/v/Qm9EjemploTokenValidoDe43CaracteresExactos1`.
- [x] A3 — `/verificar` (folio+código y archivo) — 2026-10-28: Pestaña manual (normalización Crockford/folio) y pestaña PDF con cálculo local SHA-256 (`crypto.subtle.digest`, máx. 10 MB); probar en `/verificar`.
- [x] A4 — Login y estructura del panel — 2026-10-28: Inicio de sesión con validación de perfil activo (`perfiles`), menú lateral por rol y cierre de sesión con nombre/rol; probar en `/panel/login`.
- [x] A5 — Lista y detalle de documentos — 2026-10-28: Tabla paginada (25) con columnas explícitas, búsqueda `ilike`, filtros, descarga de PDF firmado, bitácora y modal de cancelación para admin; probar en `/panel` y `/panel/documentos/:id`.
- [x] A6 — Emitir documento — 2026-10-28: Formulario dinámico desde `tipos_documento.campos`, opciones de vigencia, confirmación previa y pantalla final con enlace/código únicos y descarga; probar en `/panel/emitir`.
- [x] A7 — Administración (tipos y usuarios) — 2026-10-28: CRUD de tipos con editor reordenable de campos (bloqueando `clave` y `prefijo_folio` en edición) y gestión de perfiles/roles; probar en `/panel/tipos` y `/panel/usuarios`.

## Fase 2 — Diseño (2026-10-28)

Prueba manual del usuario: **funcional** (emitió CONST-2026-000001; verificación por folio+código y por archivo OK; archivo alterado → no encontrado). Sistema de diseño: `design-system/documentos-qr-proesa/MASTER.md` + `pages/decisiones-proyecto.md` (manda sobre MASTER).

### Antigravity (`tareas/ANTIGRAVITY-DISENO.md`)

- [ ] D1 — Tokens (0 hex fuera de `:root`)
- [ ] D2 — Atkinson Hyperlegible auto-hospedada; folio/código monoespaciados
- [ ] D3 — Jerarquía del resultado de verificación
- [ ] D4 — Formulario `/verificar` (pestañas, máscaras, validación, archivo)
- [ ] D5 — Esqueletos de carga
- [ ] D6 — Lista del panel en tarjetas para móvil
- [ ] D7 — Flujo de emisión por pasos + copiar + modal accesible
- [ ] D8 — Movimiento reducido, cursor, objetivos de 44 px
- [ ] D9 — Títulos por ruta, favicon, logo reemplazable
- [ ] D10 — Checklist final + Lighthouse (anotar puntajes)

### Codex (`tareas/CODEX-DISENO.md`)

- [x] P1 — Marca en el PDF — 2026-10-28: Línea y título azul `#0F2D52`; usa `assets/logo.png` si está disponible y deja el nombre de la organización como alternativa.
- [x] P2 — Área emisora en el PDF — 2026-10-28: La función consulta `perfiles.area` del emisor y lo incluye con la etiqueta «Área emisora».
- [x] P3 — Rejilla etiqueta/valor — 2026-10-28: Campos en dos columnas con etiquetas y orden alineados a la página de verificación.
- [x] P4 — Pie con folio y "Página n de N" — 2026-10-28: Pie centrado en todas las páginas, con folio y dominio verificable.
- [x] P5 — Bloque de verificación — 2026-10-28: QR de 120 pt con zona blanca, encabezado de autenticidad y código en Courier-Bold 12 pt.
- [x] P6 — Saltos de página limpios — 2026-10-28: Al continuar una página repite organización y folio; el recuadro de verificación se conserva unido.
- [x] P7 — (validado por el orquestador 2026-10-28: `deno check` y `deno test` 7/7 sin `--no-check`; PDFs revisados; `emitir-documento` v6 desplegada) — 2026-10-28: La prueba genera casos de área, sin logo y tres páginas y escribe `ejemplo.pdf`/`ejemplo-largo.pdf`; tras R7–R8, el orquestador debe repetir `deno check`, `deno test` y revisar ambos PDFs.

Revisión del orquestador (2026-10-28): P1–P6 **aprobados**. Corrí las pruebas con Deno 2.1.4: 7/7 OK con `--no-check`; `ejemplo.pdf` y `ejemplo-largo.pdf` revisados (marca, rejilla, área emisora, «Página 3 de 3», bloque unido). `deno check` de las funciones OK. Ajustes siguientes implementados por Codex; falta revalidarlos:

- [x] R7 (Codex 2026-10-28) — `fixture()` ahora devuelve `DatosPdf` y construye un `Record<string, string>` sin claves ausentes; revalidar con `deno check` y `deno test` sin `--no-check`.
- [x] R8 (Codex 2026-10-28) — `pdf.ts` usa 15 pt de interlineado para valores de 11 pt y mantiene 8 pt entre filas; revisar el PDF largo tras regenerarlo.

### Orquestador

- [ ] O9 — Revisar D1–D10 y P1–P7, redesplegar `emitir-documento`, verificar en el sitio real a 360 px
- [ ] O7 — Pruebas de aceptación completas (incluye V1 por QR desde celular y cancelación, que no se probaron)

## Pendientes del responsable (usuario)

- [x] Regla Rewrite en Render (`/*` → `/index.html`) — 2026-10-28; V1 confirmado: QR escaneado desde iPhone → `valido` para CONST-2026-000001.
- [ ] Enviar el logo oficial de PROESA (SVG o PNG con fondo transparente) para el sitio y el PDF.
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

- [x] R6 (verificado por el orquestador 2026-10-28: `deno check` OK, `leerCuerpoLimitado` devuelve `{ ok, ... }`; desplegado) — `emitir-documento/index.ts:16` y `verificar/index.ts:14`: `JSON.parse(raw)` recibe `string | undefined` (TS2345), porque la unión de `leerCuerpoLimitado` no se estrecha con la desestructuración. Usar el resultado sin desestructurar (`const leido = await leerCuerpoLimitado(request); if (leido.error !== undefined) return …; const raw = leido.texto;`) o devolver `{ ok: true, texto } | { ok: false, error }`. El orquestador corre `deno check` con Deno 2.1.4 antes de desplegar.

Lo verifica el orquestador al desplegar:

- [x] R5 — Verificado 2026-10-28: tres consultas (sin XFF, XFF=1.1.1.1, XFF=2.2.2.2) quedan con el mismo `ip_hash`; el gateway de Supabase reescribe la cabecera, el límite por IP no se puede saltar.

### Frontend (Antigravity) — 2026-10-28

Resultado: **aprobado para desplegar**. `npm run build` sin errores (tsc + vite, 348 KB / 102 KB gzip). Llamadas a `verificar` y `emitir-documento` iguales al contrato; `documentos` siempre con columnas explícitas (`select('*')` solo en `bitacora` y `tipos_documento`, permitido); sin `service_role`, sin `innerHTML`, sin `console.log`; `.env.local` solo con publishable key y fuera de git; `lang="es-MX"` y `no-referrer`. Rutas `/`, `/verificar`, `/v/:token` y `/panel/login` responden 200 en `vite preview`.

Pendiente (orquestador, después del despliegue): revisión visual a 360 px y pruebas P1–P5 contra el proyecto real.

Nota: Render **no** lee `public/_redirects` (es formato de Netlify). La reescritura `/*` → `/index.html` se configura en el panel de Render; el archivo puede quedarse, no estorba.

## Preguntas al orquestador

_(Los agentes escriben aquí: fecha, agente, pregunta, qué opción eligieron mientras tanto.)_
