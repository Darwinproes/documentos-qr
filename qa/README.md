# QA automatizada del piloto

Requiere Node.js 20 o posterior, Chrome instalado y `npm install` dentro de `qa/`.
Playwright usa el Chrome del sistema: define `QA_CHROME_PATH` si no está en la ruta
habitual. La clave ficticia del simulador se entrega solo por la variable `QA_CLAVE`.

## Panel y auditoría visual

Desde la raíz del proyecto:

```sh
cd qa
npm install
npm run qa:panel
```

El comando compila `web/` con la URL local `http://127.0.0.1:54399`, copia la
compilación a `qa/salida/dist`, levanta el Supabase simulado y `vite preview`, corre
los casos del panel y la auditoría a 360, 768 y 1440 px, genera capturas de estados
a 360 y 1440 px y apaga ambos servidores. El simulador incluye cinco tipos, fechas
capturadas y vacías, eventos de emisión y cancelación y perfiles con nombres largos.
La auditoría registra desplazamiento horizontal interno, identificadores partidos,
fechas ISO visibles y controles de selección mayores a 28 px. Reporte y capturas
quedan en `qa/salida/` (ignorada en git).

Ejemplo de ejecución:

```sh
QA_CLAVE="clave-local-de-prueba" QA_CHROME_PATH="/usr/bin/google-chrome" npm run qa:panel
```

Para generar solo las capturas de estados usando el simulador:

```sh
npm run qa:estados
```

Las imágenes se guardan en `qa/salida/estados/360/` y `qa/salida/estados/1440/`.
Incluyen login vacío y con error, listas normal y vacía, detalle, modal de cancelación,
los cuatro pasos de emisión, tipos, usuarios, menú móvil y rol Consulta.

## Verificación pública real

La suite pública es de solo lectura y consume el sitio y documento de prueba reales.
Define `QA_URL`, `QA_TOKEN`, `QA_FOLIO` y `QA_CODIGO`; no guarda estas credenciales
en el repositorio. Para correrla:

```sh
QA_URL="https://documentos-qr.onrender.com" \
QA_TOKEN="<token-de-prueba>" QA_FOLIO="<folio-de-prueba>" \
QA_CODIGO="<codigo-de-prueba>" npm run qa:publica
```

No se ejecuta en CI para no consumir el límite de consultas del sitio real.
