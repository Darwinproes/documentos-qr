# Documentos con QR — piloto

Sistema para que los documentos de PROESA Electrónica lleven un QR verificable. Quien recibe el documento lo escanea y ve, en la página oficial, si es **válido**, **vencido**, **cancelado** o **no registrado**, junto con los datos reales para compararlos con el papel.

## Cómo está organizado

| Carpeta / archivo | Contenido | Responsable |
|---|---|---|
| `AGENTS.md` | Reglas para todos los agentes | Orquestador |
| `PROGRESO.md` | Tablero de avance y preguntas | Todos |
| `docs/01-arquitectura.md` | Componentes, flujos, modelo de datos | Orquestador |
| `docs/02-contrato-api.md` | Contrato entre backend y frontend | Orquestador |
| `docs/03-seguridad.md` | Amenazas y controles | Orquestador |
| `docs/04-pruebas-aceptacion.md` | Casos que deben pasar | Orquestador |
| `supabase/migrations/` | Esquema de la base (ya aplicado) | Orquestador |
| `supabase/seed.sql` | Tipo de documento de ejemplo | Orquestador |
| `supabase/functions/` | Edge Functions + PDF | Codex (`tareas/CODEX.md`) |
| `web/` | Verificación pública + panel interno | Antigravity (`tareas/ANTIGRAVITY.md`) |

## Cómo arrancar a los agentes

1. **Codex:** abrir esta carpeta y pegar el *prompt de arranque* de `tareas/CODEX.md`.
2. **Antigravity:** abrir esta carpeta y pegar el *prompt de arranque* de `tareas/ANTIGRAVITY.md`.
3. Pueden trabajar al mismo tiempo: cada uno tiene su carpeta y el frontend tiene modo simulado.
4. Cuando terminen, el orquestador revisa, despliega y corre las pruebas de aceptación.
