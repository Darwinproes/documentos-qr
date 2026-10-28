-- =====================================================================
-- Fase 3 — apoyo al panel: resumen por estado y bitácora con nombres.
-- Dueño: orquestador. Ambas exigen un perfil activo (cualquier rol).
-- =====================================================================

-- Conteos para los indicadores de la lista de documentos
create function public.resumen_documentos()
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select case when public.rol_actual() is null then null else jsonb_build_object(
    'vigentes',    count(*) filter (where d.estado = 'vigente' and (d.vigente_hasta is null or d.vigente_hasta >= public.hoy_local())),
    'por_vencer',  count(*) filter (where d.estado = 'vigente' and d.vigente_hasta between public.hoy_local() and public.hoy_local() + 30),
    'vencidos',    count(*) filter (where d.estado = 'vigente' and d.vigente_hasta < public.hoy_local()),
    'cancelados',  count(*) filter (where d.estado = 'cancelado'),
    'total',       count(*) filter (where d.estado <> 'pendiente')
  ) end
  from public.documentos d
$$;

-- Bitácora de un documento con el nombre y área de quien actuó
-- (un usuario Consulta no puede leer perfiles ajenos por RLS; esto expone solo nombre y área)
create function public.bitacora_documento(p_documento_id uuid)
returns table (id bigint, accion text, actor_nombre text, actor_area text, detalle jsonb, creado_en timestamptz)
language sql stable security definer
set search_path = ''
as $$
  select b.id, b.accion,
         coalesce(nullif(p.nombre, ''), 'Usuario interno'),
         nullif(p.area, ''),
         b.detalle, b.creado_en
  from public.bitacora b
  left join public.perfiles p on p.id = b.actor
  where b.documento_id = p_documento_id
    and public.rol_actual() is not null
  order by b.creado_en, b.id
$$;

revoke execute on function public.resumen_documentos(), public.bitacora_documento(uuid) from public, anon;
grant execute on function public.resumen_documentos(), public.bitacora_documento(uuid) to authenticated;
