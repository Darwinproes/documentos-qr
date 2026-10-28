# Tareas de Antigravity — Frontend (verificación pública + panel interno)

## Prompt de arranque (copiar y pegar en Antigravity)

> Trabajas en la carpeta `Documentos con QR`. Lee `AGENTS.md`, `docs/01-arquitectura.md`, `docs/02-contrato-api.md`, `docs/03-seguridad.md` y este archivo (`tareas/ANTIGRAVITY.md`). Implementa las tareas A1 a A7 en orden, solo dentro de `web/`. No modifiques `supabase/` ni `docs/`. Mientras las Edge Functions no estén desplegadas, usa el modo simulado (A1). Al terminar cada tarea, márcala en `PROGRESO.md` y anota cómo se prueba. Si algo del contrato no está claro, escríbelo en `PROGRESO.md` → *Preguntas al orquestador*, elige la opción más segura y continúa.

## Stack

- Vite 5.4.11 + React 18.3.1 + TypeScript 5.6.3
- `react-router-dom@6.28.0`
- `@supabase/supabase-js@2.49.4`
- CSS propio (variables CSS) o Tailwind 3.4.15. Sin librerías de componentes pesadas.
- Despliegue: sitio estático en Render, con regla de reescritura `/*` → `/index.html`.

## Rutas

| Ruta | Acceso | Pantalla |
|---|---|---|
| `/v/:token` | pública | Resultado de verificación por QR |
| `/verificar` | pública | Verificación manual (folio + código) y por archivo |
| `/` | pública | Redirige a `/verificar` |
| `/panel/login` | pública | Inicio de sesión |
| `/panel` | activos | Lista de documentos |
| `/panel/emitir` | emisor, admin | Emitir documento |
| `/panel/documentos/:id` | activos | Detalle |
| `/panel/tipos` | admin | Catálogo de tipos de documento |
| `/panel/usuarios` | admin | Usuarios y roles |

## A1 — Base del proyecto

- `web/` con Vite, router, cliente Supabase (`src/lib/supabase.ts`) a partir de `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`.
- `src/lib/api.ts` con `emitirDocumento()` y `verificar()` según el contrato. **Modo simulado:** si `VITE_API_SIMULADA=1`, devuelven respuestas de ejemplo con la forma exacta del contrato (incluye un caso de cada `resultado`), para avanzar sin backend.
- Tipos TypeScript en `src/lib/tipos.ts` copiados del contrato.
- `.env.example` con las variables (sin valores reales); `.env.local` en `.gitignore`.
- `index.html`: `lang="es-MX"`, `<meta name="referrer" content="no-referrer">`.

## A2 — Página pública `/v/:token`

Se abre desde la cámara del celular: **diseño móvil primero**, carga rápida, sin login.

- Validar el formato del token (43 caracteres `[A-Za-z0-9_-]`) antes de llamar; si no cumple → "El enlace no es válido".
- Agregar `<meta name="robots" content="noindex">` en esta ruta.
- Resultado grande y claro, con ícono y color (no depender solo del color):

| `resultado` | Encabezado | Color | Texto |
|---|---|---|---|
| `valido` | DOCUMENTO VÁLIDO | verde | "Este documento fue emitido por {ORG} y está vigente. Compare los datos con el documento que tiene en sus manos: si algo no coincide, el documento fue alterado." |
| `vencido` | DOCUMENTO VENCIDO | ámbar | "Fue emitido por {ORG}, pero su vigencia terminó el dd/mm/aaaa." |
| `cancelado` | DOCUMENTO CANCELADO | rojo | "Fue cancelado el dd/mm/aaaa y ya no tiene validez." |
| `no_encontrado` | DOCUMENTO NO REGISTRADO | gris oscuro | "No existe un documento de {ORG} con estos datos. Podría ser falso. Repórtelo a {CONTACTO}." |
| `limite_excedido` | Demasiadas consultas | gris | "Espere un minuto e intente de nuevo." |

- Datos (si hay `documento`): folio, tipo, destinatario, área emisora, fecha de emisión, vigencia, y la lista `campos` (fechas como dd/mm/aaaa).
- Pie fijo: "Página oficial de verificación de {ORG}. Verifique que la dirección en su navegador sea **{VITE_DOMINIO_OFICIAL}**." + "Consultado el dd/mm/aaaa hh:mm".
- Estados de carga y error de red ("No se pudo consultar. Revise su conexión.").

## A3 — `/verificar`

Dos pestañas:

1. **Folio y código:** campos `Folio` (`CONST-2026-000001`) y `Código` (`XXXXX-XXXXX`). Normalizar en el cliente: mayúsculas, quitar espacios. Mostrar el resultado con el mismo componente que A2.
2. **Archivo PDF:** zona para arrastrar o elegir archivo (solo `.pdf`, máx. 10 MB). Calcular SHA-256 con `crypto.subtle.digest` **en el navegador**; el archivo no se sube. Texto visible: "Su archivo no se envía a ningún servidor; solo se calcula su huella digital." Si el resultado es `no_encontrado`, mensaje específico: "Este archivo no coincide con ningún documento emitido. Si es una copia de un documento real, puede haber sido modificado."

## A4 — Login y estructura del panel

- Login con correo y contraseña (`supabase.auth.signInWithPassword`). Mensaje claro si falla.
- Al entrar, leer el perfil (`perfiles`) y el rol. Si `activo = false` o no hay perfil → "Su usuario no está habilitado" y cerrar sesión.
- Menú lateral según el rol; ruta protegida que redirige a `/panel/login`.
- Botón de cerrar sesión con el nombre y el rol del usuario.

## A5 — Lista y detalle de documentos

- **Lista** (`/panel`): tabla con folio, tipo, destinatario, emitido, vigencia, estado (con etiqueta de color; "vencido" se calcula en el cliente con `vigente_hasta`). Búsqueda por folio o destinatario (`ilike`), filtros por tipo y estado, paginación de 25. Ocultar `pendiente` salvo que se filtre por ese estado.
- **Detalle** (`/panel/documentos/:id`): todos los datos, botón "Descargar PDF" (URL firmada), bitácora en línea de tiempo. Si es admin: lista de verificaciones (fecha, método, resultado) y botón **Cancelar documento** con modal que exige motivo (≥ 5 caracteres) y confirmación.
- Recordatorio: listar columnas explícitas en `documentos` (no `select('*')`).

## A6 — Emitir documento

1. Elegir tipo (solo activos).
2. Formulario generado desde `campos`: `texto` → input, `texto_largo` → textarea, `fecha` → `type="date"`, `numero` → `type="number"`; marcar requeridos; enviar todos los valores como texto.
3. Campo destinatario (obligatorio) y vigencia: "Según el tipo ({vigencia_dias} días)" / "Fecha específica" / "Sin vencimiento".
4. Pantalla de confirmación con el resumen → "Emitir".
5. Resultado: folio, código de verificación, enlace de verificación, botón **Descargar PDF** y botón **Copiar enlace**. Aviso: "El enlace y el código solo se muestran ahora. Ya quedan impresos en el PDF; para reimprimir, descargue el PDF desde el detalle del documento."
6. Errores del contrato mostrados con su `mensaje`.

## A7 — Administración

- **Tipos** (`/panel/tipos`): lista; alta y edición con editor de campos (agregar, quitar, reordenar; clave, etiqueta, tipo, requerido, público). En edición, `clave` y `prefijo_folio` quedan bloqueados. Validar clave/prefijo `^[A-Z0-9]{2,10}$` y claves de campo `^[a-z][a-z0-9_]{0,39}$` únicas.
- **Usuarios** (`/panel/usuarios`): lista de perfiles; editar nombre, área, rol y activo. Nota en pantalla: "Los usuarios nuevos se crean en Supabase → Authentication y aparecen aquí con rol Consulta."

## Diseño visual

- Identidad sobria e institucional; colores de PROESA si hay logo disponible (dejar `web/public/logo.svg` como reemplazable).
- Accesible: contraste AA, foco visible, etiquetas en todos los campos, mensajes de estado con `aria-live`.
- Página pública legible a 360 px de ancho sin desplazamiento horizontal.

## Definición de terminado

- `npm run build` sin errores ni advertencias de TypeScript.
- Funciona en modo simulado y contra el proyecto real.
- Ningún secreto en `web/` (solo publishable key en `.env.local`).
- `PROGRESO.md` actualizado.
