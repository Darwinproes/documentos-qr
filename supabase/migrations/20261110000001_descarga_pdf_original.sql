-- =====================================================================
-- Descarga pública del PDF original (2026-11-10).
-- Dueño: orquestador. Decisión del usuario: solo documentos vigentes
-- (resultado «valido») y solo con QR o folio + código (quien tiene el
-- documento en la mano). Con «archivo» no aplica: ya tiene el PDF.
-- =====================================================================

-- Cada consulta registra si fue una verificación o una descarga.
-- Las descargas cuentan para el mismo límite de 20 por minuto por IP.
alter table public.verificaciones
  add column accion text not null default 'verificar'
  check (accion in ('verificar', 'descargar'));

-- Vuelve a verificar y, solo si el documento está vigente, devuelve la
-- ruta del PDF en Storage para que la Edge Function cree una URL firmada.
-- Nunca devuelve la ruta para vencidos, cancelados o pendientes.
create function public.ruta_pdf_descarga(
  p_metodo      text,
  p_token       text default null,
  p_folio       text default null,
  p_codigo      text default null,
  p_ip_hash     text default null,
  p_user_agent  text default null
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_doc       public.documentos;
  v_res       text;
  v_intentos  integer;
begin
  if p_metodo not in ('qr', 'manual') then
    raise exception 'Método de descarga no válido' using errcode = '22023';
  end if;

  if p_ip_hash is not null then
    select count(*) into v_intentos
    from public.verificaciones v
    where v.ip_hash = p_ip_hash and v.creado_en > now() - interval '1 minute';
    if v_intentos >= 20 then
      insert into public.verificaciones (metodo, resultado, ip_hash, user_agent, accion)
      values (p_metodo, 'limite_excedido', p_ip_hash, left(p_user_agent, 300), 'descargar');
      return jsonb_build_object('resultado', 'limite_excedido');
    end if;
  end if;

  if p_metodo = 'qr' then
    select * into v_doc from public.documentos d
    where d.token_hash = public.sha256_txt(p_token) and d.estado <> 'pendiente';
  else
    select * into v_doc from public.documentos d
    where d.folio = upper(trim(p_folio))
      and d.codigo_hash = public.sha256_txt(public.normalizar_codigo(p_codigo))
      and d.estado <> 'pendiente';
  end if;

  v_res := case
    when v_doc.id is null then 'no_encontrado'
    when v_doc.estado = 'cancelado' then 'cancelado'
    when v_doc.vigente_hasta is not null and v_doc.vigente_hasta < public.hoy_local() then 'vencido'
    else 'valido'
  end;

  insert into public.verificaciones (documento_id, metodo, resultado, ip_hash, user_agent, accion)
  values (v_doc.id, p_metodo, v_res, p_ip_hash, left(p_user_agent, 300), 'descargar');

  if v_res <> 'valido' or v_doc.pdf_path is null then
    return jsonb_build_object('resultado', v_res);
  end if;

  return jsonb_build_object('resultado', v_res, 'folio', v_doc.folio, 'pdf_path', v_doc.pdf_path);
end;
$$;

revoke execute on function public.ruta_pdf_descarga(text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.ruta_pdf_descarga(text, text, text, text, text, text)
  to service_role;
