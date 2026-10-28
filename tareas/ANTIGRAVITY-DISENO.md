# Fase 2 — Diseño · Antigravity (frontend)

## Prompt de arranque (copiar y pegar en Antigravity)

> Fase 2 de diseño. Lee `AGENTS.md`, `design-system/documentos-qr-proesa/MASTER.md`, `design-system/documentos-qr-proesa/pages/decisiones-proyecto.md` (manda sobre MASTER donde choquen) y este archivo (`tareas/ANTIGRAVITY-DISENO.md`). Implementa D1 a D10 en orden, solo dentro de `web/`. No cambies el contrato de API ni la lógica de verificación. Al terminar cada tarea márcala en `PROGRESO.md` → *Fase 2 — Antigravity* con una línea de cómo se prueba. `npm run build` debe pasar al final de cada tarea.

Punto de partida: la base actual ya está bien (tokens, estados AA, foco visible, SVG, `aria-live`). Esto es pulido e identidad, no reescritura.

## Tareas

- **D1 — Tokens.** Hay 41 colores en hex fuera de `:root` en `index.css`. Pasarlos todos a tokens y alinear la paleta con *decisiones-proyecto.md*. Al final: `0` hex fuera de `:root`.
- **D2 — Tipografía.** Agregar `@fontsource/atkinson-hyperlegible` (versión exacta fijada) con pesos 400 y 700, importados en `main.tsx`. Nada de Google Fonts CDN. Folio y código en monoespaciada con `tabular-nums`.
- **D3 — Resultado de verificación (`/v/:token` y `/verificar`).** Jerarquía en este orden:
  1. Banda de estado a todo el ancho: ícono + título ("DOCUMENTO VÁLIDO") + una línea de explicación.
  2. Tarjeta "Compare estos datos con su documento" con lista `<dl>` (Folio grande, Tipo, Destinatario, Área emisora, Emitido, Vigencia, campos públicos).
  3. Bloque de dominio oficial destacado: ícono de candado + "Esta es la página oficial de verificación de PROESA Electrónica: **{dominio}**".
  4. Botón secundario "Verificar otro documento".
  Probar a 360 y 375 px: sin desplazamiento horizontal, texto ≥ 16 px, folio ≥ 18 px.
- **D4 — Formulario `/verificar`.**
  - Pestañas accesibles (`role="tablist"`, flechas izquierda/derecha, `aria-selected`).
  - Folio: `autocapitalize="characters"`, `inputmode="text"`, `autocomplete="off"`, convierte a mayúsculas al escribir.
  - Código: inserta el guion automáticamente después del 5.º carácter; acepta pegar con o sin guion.
  - Validación al salir del campo (blur) con el error **junto al campo**; al enviar con errores, resumen enfocable arriba con enlaces a cada campo.
  - Zona de archivo operable con teclado y con un botón visible "Elegir archivo PDF"; mostrar nombre y tamaño del archivo elegido.
- **D5 — Estados de carga.** Esqueleto con la forma de la tarjeta de resultado (`aria-busy="true"`), mostrado solo si la consulta tarda más de 300 ms (sin parpadeo). Lo mismo en la lista y el detalle del panel.
- **D6 — Lista del panel en móvil.** Bajo 768 px la tabla se convierte en tarjetas (folio, destinatario, estado, fecha). Etiquetas de estado con ícono + texto. Estado vacío con mensaje y botón "Emitir documento" (si el rol puede).
- **D7 — Flujo de emisión.** Indicador de pasos: 1 Tipo → 2 Datos → 3 Confirmar → 4 Listo. En "Listo": folio y código grandes con botón **Copiar** (feedback "Copiado" con `aria-live`), botón principal **Descargar PDF**, aviso de que el enlace y el código solo se muestran una vez. Modal de cancelación: atrapa el foco, cierra con Esc, devuelve el foco al botón que lo abrió.
- **D8 — Movimiento e interacción.** Transiciones de 150–200 ms solo en hover/foco/estado; `@media (prefers-reduced-motion: reduce)` las anula. `cursor: pointer` en todo lo clicable; objetivos ≥ 44×44 px.
- **D9 — Identidad y metadatos.** `<title>` por ruta ("Verificación de documento · PROESA Electrónica", "Panel · Documentos", etc.). Favicon SVG con la marca. `logo.svg` queda listo para reemplazarse por el oficial (el usuario lo va a enviar); no inventar otro logo.
- **D10 — Lista de verificación final.** Correr la *Pre-Delivery Checklist* de MASTER.md a 375, 768, 1024 y 1440 px y Lighthouse (Accesibilidad ≥ 95, Rendimiento ≥ 90 en `/verificar`). Anotar los puntajes en `PROGRESO.md`.

## Fuera de alcance

Modo oscuro, animaciones de entrada, librerías de componentes, cambios en `supabase/`.
