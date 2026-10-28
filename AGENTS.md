# Reglas para agentes (Codex, Antigravity y cualquier otro)

Proyecto: **Documentos con QR** de PROESA Electrónica. Es un piloto para que cada documento oficial lleve un QR verificable y no se puedan hacer pasar por legítimos documentos hechos fuera de la organización.

## Roles

| Quién | Qué hace | Carpeta |
|---|---|---|
| **Claude (orquestador)** | Dueño del esquema de base de datos, del contrato de la API y de la seguridad. Revisa, despliega a Supabase y corre las pruebas de aceptación. | `supabase/migrations/`, `docs/`, `PROGRESO.md` |
| **Codex** | Backend: Edge Functions (emitir, verificar), generación del PDF con QR, pruebas y QA automatizada. | `supabase/functions/`, `supabase/tests/`, `qa/` |
| **Antigravity** | Frontend: página pública de verificación y panel interno. | `web/` |

## Reglas obligatorias

1. **Lee primero** `docs/01-arquitectura.md`, `docs/02-contrato-api.md` y `docs/03-seguridad.md`. El contrato manda: si tu código y el contrato no coinciden, gana el contrato.
2. **No modifiques** `supabase/migrations/` ni `docs/`. Si necesitas un cambio de esquema o de contrato, anótalo en `PROGRESO.md` → sección *Preguntas al orquestador* y continúa con lo demás.
3. **Trabaja solo en tu carpeta.** Codex no toca `web/`; Antigravity no toca `supabase/` ni `qa/`.
4. **Archivos en UTF-8** (sin BOM). Textos visibles para el usuario en **español de México**, con acentos correctos.
5. **Antes de modificar un archivo existente**, haz una copia `nombre.ext.bak` en la misma carpeta (regla de la organización). No hace falta para archivos nuevos.
6. **Secretos:** nunca escribas en el código ni en el repositorio la `service_role` key, el `IP_SALT` ni contraseñas. Van en variables de entorno. El frontend solo usa la *publishable key*.
7. **Solo el proyecto Supabase de prueba** `usbacyllkozqrcwbbuok` ("Sesion de prueba"). No toques ningún otro proyecto (en particular `servicios2`). No te conectes a servidores de producción de PROESA.
8. **Al terminar cada tarea**, marca la casilla en `PROGRESO.md`, escribe en una línea qué hiciste y cómo se prueba.
9. No agregues dependencias pesadas sin necesidad. Fija versiones exactas.
