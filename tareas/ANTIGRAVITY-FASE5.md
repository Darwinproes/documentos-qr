# Fase 5 — Estructura del frontend · Antigravity

## Prompt de arranque (copiar y pegar en Antigravity)

> Fase 5. Lee `AGENTS.md` (regla 10), `docs/02-contrato-api.md` y este archivo. Es una fase de **estructura, no de diseño**: la apariencia no cambia en nada; si una captura del antes y el después se ven distintas, algo salió mal. Implementa E1 a E8 en orden, solo dentro de `web/`. **No tomes capturas de pantalla.** Después de cada tarea: `npm run build` sin errores y `cd ../qa && npm run qa:panel` en verde (12/12). Si una prueba de `qa/` falla, no cambies el producto para que pase: anótalo en `PROGRESO.md` → *Preguntas al orquestador*. Marca cada tarea en `PROGRESO.md` → *Fase 5 — Antigravity* con una línea de qué cambiaste.

## Por qué esta fase

La revisión de código del 2026-11-09 encontró que el frontend funciona bien pero su estructura hará lento el crecimiento: cinco páginas consultan Supabase por su cuenta, hay páginas de 600 a 850 líneas, doce pares de nombres para la misma cosa y un solo CSS de 2,438 líneas. Nada de esto se ve en pantalla; todo se siente al mantenerlo.

Regla de la fase: **cero cambios visuales ni de comportamiento**, salvo E2, que corrige un conteo.

## Tareas

### E1 — Capa de datos del panel (`web/src/lib/panel.ts`)

Hoy `DocumentosListaPage`, `DocumentoDetallePage`, `EmitirDocumentoPage`, `TiposAdminPage` y `UsuariosAdminPage` importan `supabase` y arman sus consultas. Crea `lib/panel.ts` con una función por operación y mueve ahí las consultas tal cual están:

- `listarDocumentos(filtros, pagina)` → `{ documentos, total }`
- `obtenerDocumento(id)`, `obtenerBitacora(id)`
- `cancelarDocumento(id, motivo)`
- `urlDescargaPdf(pdfPath)`
- `resumenDocumentos()`
- `listarTipos()`, `listarTiposActivos()`, `crearTipo(datos)`, `actualizarTipo(id, datos)`, `alternarTipoActivo(id, activo)`
- `listarPerfiles()`, `actualizarPerfil(id, cambios)`

Al terminar, **ninguna página importa `../lib/supabase`**; solo `context/AuthContext.tsx` y `lib/panel.ts`. La lista de columnas del `select` queda escrita una sola vez. Los tipos de retorno salen de `lib/tipos.ts`; no inventes tipos nuevos si ya existen.

Cómo se prueba: `grep -rn "lib/supabase" web/src/pages` no regresa nada; `qa:panel` 12/12.

### E2 — Filtro «vigente» resuelto en la consulta

En `DocumentosListaPage` (pasará a `listarDocumentos`), cuando el filtro es `vigente` se traen 25 registros y luego se descartan en memoria los vencidos (`filtrada` y `totalSinCount`). La página puede mostrar menos de 25 y el contador no cuadra. Resuélvelo en la consulta:

```ts
query = query.eq('estado', 'vigente').or(`vigente_hasta.is.null,vigente_hasta.gte.${hoy}`);
```

Borra el filtrado en memoria y el cálculo alterno del total; `count` siempre viene de la consulta.

Cómo se prueba: en el simulado, filtrar «Vigente» muestra el mismo total que la tarjeta superior «Vigentes».

### E3 — Roles en las rutas, no en el layout

`RutaProtegida` (en `PanelRoutes.tsx`) solo revisa sesión; el rol lo revisa cada página al pasar `rolesPermitidos` a `LayoutPanel`, así que la página se monta y lanza consultas antes de saber si el usuario puede verla.

- `RutaProtegida` recibe `roles?: RolDocumentos[]`. Sin permiso, renderiza la pantalla actual de «Acceso restringido» dentro de `LayoutPanel` (las pruebas buscan ese encabezado; no cambies el texto).
- `PanelRoutes` declara: `emitir` → `['admin','emisor']`; `tipos` y `usuarios` → `['admin']`.
- `LayoutPanel` deja de recibir `rolesPermitidos`; quita la prop y la lógica `tienePermiso`.

Cómo se prueba: los casos «emisor puede emitir pero no administrar tipos» y «consulta no puede emitir» de `qa:panel` siguen en verde.

### E4 — Páginas en componentes

Meta: ninguna página pasa de 350 líneas. Extrae, sin cambiar el marcado ni las clases:

| Página (líneas hoy) | Componentes nuevos (`web/src/components/panel/`) |
|---|---|
| `DocumentoDetallePage` (693) | `ModalCancelarDocumento` (modal, foco, validación del motivo), `BitacoraDocumento` |
| `TiposAdminPage` (846) | `FormularioTipoDocumento` (alta/edición con sus campos), `TablaTipos` |
| `DocumentosListaPage` (586) | `FiltrosDocumentos`, `TablaDocumentos`, `TarjetasDocumentos`, `Paginacion` |
| `EmitirDocumentoPage` (802) | carpeta `pages/emitir/`: `PasoTipo`, `PasoDatos`, `PasoConfirmar`, `PasoResultado`; la página solo orquesta el estado |

Cómo se prueba: `wc -l web/src/pages/*.tsx` ≤ 350 por archivo; `qa:panel` 12/12; la auditoría visual del orquestador no detecta diferencias.

### E5 — Separar el modo simulado

`lib/api.ts` tiene 479 líneas y unas 300 son simulación. Mueve `EJEMPLOS_SIMULADOS`, `DOCUMENTOS_SIMULADOS_BASE`, `verificarSimulado`, `emitirDocumentoSimulado` y sus auxiliares a `lib/api-simulada.ts`. `api.ts` solo conserva el contrato real y decide con `USAR_API_SIMULADA` de `config.ts` (borra `esModoSimulado()`, que lee la misma variable por su cuenta).

Cómo se prueba: `VITE_API_SIMULADA=1 npm run dev` sigue mostrando los documentos de ejemplo en `/verificar`.

### E6 — Un solo nombre por concepto

Hay pares de nombres para lo mismo y ambos se usan. Quédate con el de la izquierda y borra el alias:

| Conservar | Borrar |
|---|---|
| `formatearFecha` | `formatearFechaCorta` |
| `formatearFechaHora` | `formatearFechaHoraMX` |
| `hoyLocalIso` | `hoyIsoLocal` |
| `normalizarCodigo` | `limpiarCodigoVerificacion` |
| `formatearCodigoVisual` | `normalizarCodigoConGuion` |
| `REGEX_FOLIO` | `PATRON_FOLIO` |
| `verificar` | `verificarDocumento` |
| `ErrorApi` | `ErrorClienteVerificacion` |
| `RolDocumentos` | `RolUsuario` |
| `TipoCampo` | `TipoCampoEsquema` |
| `DefinicionCampo` | `CampoEsquema` |
| `DocumentoDetalle` | `DocumentoPanel` |

Duplicados a unificar: `resolverEstadoIndicador` está en `DocumentosListaPage` y en `DocumentoDetallePage` → una sola en `components/EtiquetaEstado.tsx`; `formatearTamanoBytes` está en `formato.ts` y en `useCargaDiferida.ts` → solo en `formato.ts`.

Cómo se prueba: `npm run build` (TypeScript detecta cualquier import roto).

### E7 — Orden en `lib/`

- `lib/useCargaDiferida.ts` guarda cuatro hooks y un formateador: renómbralo `lib/hooks.ts` (y saca el formateador, ver E6).
- `lib/supabase.ts` reexporta constantes de `config.ts` que nadie importa desde ahí: deja solo el cliente.
- `config.ts`: cuando `import.meta.env.PROD` es verdadero y falta `VITE_SUPABASE_URL` o `VITE_SUPABASE_PUBLISHABLE_KEY`, lanza un error al arrancar en lugar de caer en silencio a la URL del proyecto de prueba. En desarrollo conserva los valores por defecto.
- `App.tsx`: la ruta `/storage/*` dibuja un `div` vacío; la URL firmada vive en el dominio de Supabase, así que esa ruta nunca se usa. Bórrala y comprueba que «Descargar PDF» sigue abriendo el archivo.

### E8 — Partir el CSS

`index.css` (2,438 líneas) se divide en `web/src/styles/`: `base.css` (tokens, reset, utilidades), `publico.css`, `panel.css`, `componentes.css` (botones, campos, alertas, estados, modal, esqueletos). `main.tsx` los importa en el orden `base`, `componentes`, `publico`, `panel` (los componentes genéricos antes que los estilos de página, para que estos los sigan sobrescribiendo); la apariencia resultante debe ser la misma. Los comentarios de sección nombran el componente («Modal de cancelación»), no la tarea («G9»). Borra las clases sin uso `btn-outline` y `break-all`.

Cómo se prueba: compilar antes y después y comparar `dist/assets/index-*.css` con un `diff` tras ordenar reglas; `qa:panel` 12/12 y auditoría sin problemas.

## Lo que no se toca

- Textos visibles, clases CSS, estructura HTML, contrato de API.
- `supabase/`, `qa/`, `docs/`.
