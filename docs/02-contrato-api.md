# 02 — Contrato de la API

Este documento es el acuerdo entre backend (Codex) y frontend (Antigravity). Si cambia, lo cambia el orquestador.

Base: `https://usbacyllkozqrcwbbuok.supabase.co`

## Formato de error (ambas Edge Functions)

```json
{ "error": { "codigo": "VALIDACION", "mensaje": "Falta el campo requerido: Concepto" } }
```

| HTTP | `codigo` | Cuándo |
|---|---|---|
| 400 | `VALIDACION` | Datos faltantes o inválidos. `mensaje` se puede mostrar tal cual al usuario. |
| 401 | `NO_AUTENTICADO` | Sin sesión o sesión vencida. |
| 403 | `SIN_PERMISO` | El usuario no es `emisor`/`admin` o está inactivo. |
| 405 | `METODO_NO_PERMITIDO` | Método HTTP distinto de `POST`/`OPTIONS`. |
| 429 | `LIMITE` | Demasiadas verificaciones desde la misma IP. |
| 500 | `INTERNO` | Cualquier otro error. `mensaje` genérico; el detalle va solo al log. |

Errores de Postgres → HTTP: `42501` → 403 `SIN_PERMISO`; `22023` → 400 `VALIDACION` (usar el mensaje de la excepción).

Las dos funciones responden a `OPTIONS` (CORS) con los orígenes de `ALLOWED_ORIGINS`.

---

## 1. `POST /functions/v1/emitir-documento`

Requiere sesión. `verify_jwt = true`.

Encabezados:

```
Authorization: Bearer <access_token del usuario>
apikey: <publishable key>
Content-Type: application/json
```

Cuerpo:

```json
{
  "tipo_clave": "CONST",
  "destinatario": "Juan Pérez López",
  "datos": { "concepto": "Curso de soldadura", "fecha_evento": "2026-10-20", "horas": "8" },
  "vigente_hasta": "2027-10-28",
  "sin_vencimiento": false
}
```

- `vigente_hasta` (opcional, `AAAA-MM-DD`): si no viene, se usa `tipos_documento.vigencia_dias`.
- `sin_vencimiento` (opcional): `true` = no vence nunca.
- Límites: `destinatario` ≤ 200 caracteres; cada valor de `datos` ≤ 2000; cuerpo ≤ 32 KB.

Respuesta `200`:

```json
{
  "documento_id": "6f1c…",
  "folio": "CONST-2026-000001",
  "url_verificacion": "https://documentos-qr.onrender.com/v/Qm9…(43 caracteres)",
  "codigo_verificacion": "7KQ2M-XA9PD",
  "vigente_hasta": "2027-10-28",
  "pdf_sha256": "3a7bd3e2…(64 hex)",
  "pdf_url": "https://usbacyllkozqrcwbbuok.supabase.co/storage/v1/object/sign/documentos/…"
}
```

- `url_verificacion` y `codigo_verificacion` **solo se devuelven aquí, una vez**. No se guardan en claro. Quedan impresos en el PDF.
- `pdf_url` es una URL firmada válida 15 minutos.

Pasos internos (los implementa Codex):

1. Validar la sesión con `supabase.auth.getUser(jwt)`.
2. Generar `token` = 32 bytes de `crypto.getRandomValues` en base64url sin relleno (43 caracteres).
3. Generar `codigo` = 10 caracteres del alfabeto Crockford `0123456789ABCDEFGHJKMNPQRSTVWXYZ` (`byte & 31`). Mostrar como `XXXXX-XXXXX`.
4. `rpc('emitir_documento', { p_actor, p_tipo_clave, p_destinatario, p_datos, p_token, p_codigo, p_vigente_hasta, p_sin_vencimiento })` con el cliente `service_role`. Devuelve `{documento_id, folio, tipo_nombre, destinatario, datos, campos, emitido_en, vigente_hasta}`.
5. Generar el PDF (ver `tareas/CODEX.md`), calcular SHA-256 de los bytes finales.
6. Subir a Storage, bucket `documentos`, ruta `{tipo_clave}/{AAAA}/{folio}.pdf`, `contentType: application/pdf`, `upsert: false`.
7. `rpc('confirmar_documento', { p_actor, p_documento_id, p_pdf_path, p_pdf_sha256 })`.
8. `createSignedUrl(pdf_path, 900)` y responder.

---

## 2. `POST /functions/v1/verificar`

Pública. `verify_jwt = false`. El frontend manda `apikey` igualmente.

Cuerpo, según el método:

```json
{ "metodo": "qr", "token": "Qm9…" }
{ "metodo": "manual", "folio": "CONST-2026-000001", "codigo": "7KQ2M-XA9PD" }
{ "metodo": "archivo", "pdf_sha256": "3a7bd3e2…" }
```

Validación previa en la función (si falla → 400 `VALIDACION`):

- `token`: exactamente 43 caracteres `[A-Za-z0-9_-]`.
- `folio`: `^[A-Za-z0-9]{2,10}-\d{4}-\d{6}$`. `codigo`: 10 caracteres alfanuméricos tras quitar guiones y espacios.
- `pdf_sha256`: 64 hexadecimales.

La función calcula `p_ip_hash = SHA-256(IP_SALT + ip)` (IP del primer valor de `x-forwarded-for`), toma `user-agent`, y llama a `rpc('verificar_documento', {...})` con `service_role`.

Respuesta `200` (o `429` cuando `resultado = "limite_excedido"`, con el mismo cuerpo):

```json
{
  "resultado": "valido",
  "documento": {
    "folio": "CONST-2026-000001",
    "tipo": "Constancia (ejemplo piloto)",
    "destinatario": "Juan Pérez López",
    "area_emisora": "Recursos Humanos",
    "emitido_en": "2026-10-28T17:03:11.123Z",
    "vigente_hasta": "2027-10-28",
    "cancelado_en": null,
    "campos": [
      { "etiqueta": "Concepto", "tipo": "texto", "valor": "Curso de soldadura" },
      { "etiqueta": "Fecha",    "tipo": "fecha", "valor": "2026-10-20" }
    ]
  },
  "verificado_en": "2026-10-28T18:00:00.000Z"
}
```

- `resultado` ∈ `valido` | `vencido` | `cancelado` | `no_encontrado` | `limite_excedido`.
- Con `no_encontrado` y `limite_excedido`, `documento` es `null`.
- Un documento `pendiente` responde `no_encontrado`.

---

## 3. Acceso directo desde el panel (supabase-js con la sesión del usuario)

> ⚠️ En `documentos` el permiso es **por columna**: `select('*')` falla con *permission denied*. Siempre lista las columnas.

| Acción | Llamada | Quién |
|---|---|---|
| Mi perfil | `from('perfiles').select('id,nombre,area,rol,activo').eq('id', user.id).single()` | todos |
| Tipos | `from('tipos_documento').select('*').order('nombre')` | activos |
| Lista de documentos | `from('documentos').select('id,folio,estado,destinatario,emitido_en,vigente_hasta,tipo_id,tipos_documento(clave,nombre)').order('emitido_en',{ascending:false}).range(a,b)` — excluir `estado = 'pendiente'` salvo filtro explícito | activos |
| Detalle | mismas columnas + `datos,pdf_path,pdf_sha256,confirmado_en,emitido_por,cancelado_por,cancelado_en,motivo_cancelacion` | activos |
| Bitácora de un documento | `from('bitacora').select('*').eq('documento_id', id).order('creado_en')` | activos |
| Verificaciones de un documento | `from('verificaciones').select('id,metodo,resultado,creado_en').eq('documento_id', id).order('creado_en',{ascending:false})` | admin |
| Descargar PDF | `storage.from('documentos').createSignedUrl(pdf_path, 600)` | activos |
| Cancelar | `rpc('cancelar_documento', { p_documento_id, p_motivo })` (motivo ≥ 5 caracteres) | admin |
| Alta / edición de tipos | `from('tipos_documento').insert/update(...)` (en update no se puede cambiar `clave` ni `prefijo_folio`) | admin |
| Usuarios | `from('perfiles').select(...)` / `.update({nombre, area, rol, activo})` | admin |
| Saber mi rol | `rpc('rol_actual')` | todos |

Los usuarios se dan de alta en el piloto desde el panel de Supabase (Authentication → Users). Al crearse quedan con rol `consulta`; un admin les cambia el rol.

## Variables de entorno

Edge Functions (las configura el orquestador como *secrets*):

| Variable | Ejemplo |
|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | las pone Supabase automáticamente |
| `VERIFICACION_BASE_URL` | `https://documentos-qr.onrender.com` |
| `ALLOWED_ORIGINS` | `http://localhost:5173,https://documentos-qr.onrender.com` |
| `IP_SALT` | cadena aleatoria de 32+ caracteres |
| `ORG_NOMBRE` | `PROESA Electrónica` |

Web (`web/.env.local`, no se sube al repositorio):

| Variable | Ejemplo |
|---|---|
| `VITE_SUPABASE_URL` | `https://usbacyllkozqrcwbbuok.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` |
| `VITE_ORG_NOMBRE` | `PROESA Electrónica` |
| `VITE_DOMINIO_OFICIAL` | `documentos-qr.onrender.com` |
| `VITE_CONTACTO` | correo para reportar documentos sospechosos |
