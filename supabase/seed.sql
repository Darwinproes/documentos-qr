-- Tipo de documento de ejemplo para el piloto (genérico).
-- Los formatos reales se dan de alta después desde el panel (admin) o con un INSERT igual a este.
insert into public.tipos_documento (clave, nombre, descripcion, prefijo_folio, vigencia_dias, campos)
values (
  'CONST',
  'Constancia (ejemplo piloto)',
  'Formato genérico para probar el flujo de emisión y verificación.',
  'CONST',
  365,
  '[
    {"clave": "concepto",     "etiqueta": "Concepto",     "tipo": "texto",       "requerido": true,  "publico": true},
    {"clave": "fecha_evento", "etiqueta": "Fecha",        "tipo": "fecha",       "requerido": false, "publico": true},
    {"clave": "horas",        "etiqueta": "Horas",        "tipo": "numero",      "requerido": false, "publico": true},
    {"clave": "observaciones","etiqueta": "Observaciones","tipo": "texto_largo", "requerido": false, "publico": false}
  ]'::jsonb
)
on conflict (clave) do nothing;
