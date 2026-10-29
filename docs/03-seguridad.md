# 03 — Seguridad

## Amenazas y cómo se frenan

| # | Ataque | Control |
|---|---|---|
| A1 | Usar el formato oficial en blanco, llenado fuera de PROESA | Política: solo vale el documento verificable. Sin registro → `no_encontrado`. |
| A2 | Copiar el QR de un documento real en uno falso | La verificación muestra destinatario, fechas y campos públicos reales; quien verifica ve que no coinciden. La página lo pide de forma explícita. |
| A3 | Inventar o adivinar un QR/folio | Token de 256 bits (no adivinable). Folio solo sirve junto con el código de 10 caracteres (50 bits) y hay límite de 20 consultas/min por IP. |
| A4 | QR que apunta a una página falsa que dice "válido" | El PDF y la página indican el **dominio oficial**; la página de verificación lo repite. Comunicación a clientes/proveedores. (Riesgo residual: depende de que la persona revise el dominio.) |
| A5 | Editar un PDF legítimo (cambiar nombre, fechas) | **Digital:** firma PAdES de PROESA en cada PDF; Adobe Reader marca «modificado después de firmarse» sin entrar al sitio. Además, SHA-256 del PDF registrado: el método `archivo` detecta cualquier cambio. **En papel**, A2 aplica (el QR apunta al registro, no comprueba el texto impreso). |
| A6 | Documento que ya no debe valer (error, baja de personal) | Cancelación por admin con motivo; la verificación responde `cancelado`. |
| A7 | Robo de la base de datos | Solo hay hashes del token y del código: no se pueden reconstruir QR válidos. |
| A8 | Usuario interno emite documentos indebidos | Roles; bitácora de solo inserción con quién emitió y canceló. |
| A9 | Extraer datos personales con la página pública | Solo se ve un documento si ya tienes su token, su folio+código o el archivo, es decir, el documento mismo. Solo se muestran campos marcados `publico`. |
| A10 | Abuso de la verificación (fuerza bruta, scraping) | Límite por IP en la base; IP guardada como hash con sal. |

## Controles técnicos (no negociables)

- `service_role` key **solo** dentro de las Edge Functions. Nunca en `web/`, nunca en el repositorio.
- Tablas sin acceso para `anon`. `authenticated` solo lee lo que permiten RLS y los permisos por columna. Todas las escrituras pasan por funciones `security definer` con `search_path = ''`.
- `token_hash` y `codigo_hash` no se exponen a ningún rol del cliente.
- `bitacora` y `verificaciones` rechazan UPDATE y DELETE (trigger).
- Bucket `documentos` privado; descargas solo con URL firmada de corta duración.
- Edge Functions: validar todo lo que entra (tipos, longitudes, regex del contrato), limitar el cuerpo a 32 KB, CORS solo para `ALLOWED_ORIGINS`, mensajes de error genéricos hacia fuera (el detalle al log, sin token ni código).
- **Nunca** escribir en logs el token, el código ni la URL de verificación completa.
- Página pública: `<meta name="referrer" content="no-referrer">` (el token no se filtra a otros sitios), `noindex` en `/v/*`, sin scripts de analítica de terceros.
- Sin `dangerouslySetInnerHTML` ni HTML armado con datos del documento.

## Firma digital del PDF (desde 2026-10-29)

- `emitir-documento` (v8) firma cada PDF con PAdES (`adbe.pkcs7.detached`, SHA-256, RSA 3072) usando `@signpdf` 3.3.0 + node-forge (MIT/BSD). La huella registrada es la del PDF **ya firmado**, así que el método `archivo` sigue funcionando.
- Certificado propio del piloto: `CN=PROESA Electronica - Registro central de documentos`, vigente hasta 2028-10-28. Sin acentos en el certificado a propósito: node-forge daña los caracteres UTF-8 del nombre y la firma deja de asociarse con su certificado (detectado al validar con pyHanko).
- La llave privada vive **solo** en los secretos `FIRMA_P12_BASE64` y `FIRMA_P12_CLAVE` de las Edge Functions y en la carpeta privada del responsable (`C:\Users\USUARIO\Documents\certificado-proesa`, fuera del repositorio). El certificado público está en `web/public/certificado-proesa.cer` y se descarga desde el pie del sitio.
- Sin `FIRMA_P12_BASE64` el PDF sale sin firma. Si el secreto existe y la firma falla, la emisión responde error: nunca se entrega en silencio un documento sin firmar.
- Validado con pyHanko: el original sale íntegro y confiable; una edición incremental (como Acrobat) sale «modificado»; una edición que reescribe el archivo sale con la firma rota.
- Límites: los navegadores y celulares no revisan firmas (para ellos queda el método `archivo`); en papel la firma no existe. Con un certificado propio, Adobe avisa «identidad desconocida» hasta que se confía en el `.cer`; con un certificado AATL (producción, aprox. US$300–600 al año) no hace falta.

## Lo que este piloto no resuelve todavía

- **Dominio propio:** `*.onrender.com` sirve para probar, pero para producción hace falta un subdominio de PROESA (A4).
- **Papel alterado con un QR legítimo (A2):** la página muestra los datos del registro pero no puede leer el papel. Opciones evaluadas: marca de agua con el nombre del destinatario, veredicto que diga a nombre de quién está el documento y lectura automática del papel con la cámara (OCR); pendientes de decisión.
- **MFA** para cuentas `admin` y política de contraseñas.
- **Respaldo** del proyecto Supabase (el plan gratuito no tiene PITR) y monitoreo de las verificaciones `no_encontrado` (indican intentos de fraude).
