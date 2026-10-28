-- =====================================================================
-- Documentos con QR — Esquema inicial del piloto
-- Proyecto Supabase: "Sesion de prueba" (usbacyllkozqrcwbbuok)
-- Dueño del esquema: orquestador (Claude). Antigravity y Codex NO modifican
-- este archivo; si necesitan un cambio lo piden en PROGRESO.md.
--
-- Convive con un prototipo previo de tickets en el mismo proyecto (profiles,
-- tickets, catalogo_*, enum rol_usuario, trigger on_auth_user_created). No se
-- toca nada de eso; por eso el enum de roles aquí se llama rol_documentos.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- Tipos enumerados
-- ---------------------------------------------------------------------
create type public.estado_documento as enum ('pendiente', 'vigente', 'cancelado');
create type public.rol_documentos as enum ('admin', 'emisor', 'consulta');

-- ---------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------

-- Usuarios internos (1:1 con auth.users)
create table public.perfiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  nombre     text not null default '',
  area       text not null default '',
  rol        public.rol_documentos not null default 'consulta',
  activo     boolean not null default true,
  creado_en  timestamptz not null default now()
);

-- Catálogo de formatos. "campos" define el formulario y qué se muestra al verificar:
-- [{"clave":"concepto","etiqueta":"Concepto","tipo":"texto","requerido":true,"publico":true}, ...]
-- tipo ∈ texto | texto_largo | fecha | numero
create table public.tipos_documento (
  id             bigint generated always as identity primary key,
  clave          text not null unique check (clave ~ '^[A-Z0-9]{2,10}$'),
  nombre         text not null check (length(trim(nombre)) > 0),
  descripcion    text not null default '',
  prefijo_folio  text not null check (prefijo_folio ~ '^[A-Z0-9]{2,10}$'),
  vigencia_dias  integer check (vigencia_dias is null or vigencia_dias > 0),
  campos         jsonb not null default '[]'::jsonb check (jsonb_typeof(campos) = 'array'),
  activo         boolean not null default true,
  creado_en      timestamptz not null default now()
);

-- Consecutivo de folios por tipo y año (PREFIJO-AAAA-NNNNNN)
create table public.folios_contador (
  tipo_id  bigint not null references public.tipos_documento (id),
  anio     integer not null,
  ultimo   integer not null default 0,
  primary key (tipo_id, anio)
);

-- Documentos emitidos. El token del QR y el código manual NUNCA se guardan
-- en claro: solo su SHA-256. Se entregan una sola vez al emitir.
create table public.documentos (
  id                  uuid primary key default gen_random_uuid(),
  tipo_id             bigint not null references public.tipos_documento (id),
  folio               text not null unique,
  token_hash          bytea not null unique,
  codigo_hash         bytea not null,
  estado              public.estado_documento not null default 'pendiente',
  destinatario        text not null check (length(trim(destinatario)) > 0),
  datos               jsonb not null default '{}'::jsonb check (jsonb_typeof(datos) = 'object'),
  emitido_por         uuid not null references public.perfiles (id),
  emitido_en          timestamptz not null default now(),
  vigente_hasta       date,
  pdf_path            text,
  pdf_sha256          text unique check (pdf_sha256 is null or pdf_sha256 ~ '^[0-9a-f]{64}$'),
  confirmado_en       timestamptz,
  cancelado_por       uuid references public.perfiles (id),
  cancelado_en        timestamptz,
  motivo_cancelacion  text,
  constraint documentos_vigente_con_pdf check (
    estado = 'pendiente' or (pdf_path is not null and pdf_sha256 is not null and confirmado_en is not null)
  ),
  constraint documentos_cancelacion_completa check (
    estado <> 'cancelado' or (cancelado_por is not null and cancelado_en is not null and motivo_cancelacion is not null)
  )
);

-- Bitácora de acciones internas (solo inserción)
create table public.bitacora (
  id            bigint generated always as identity primary key,
  documento_id  uuid references public.documentos (id),
  accion        text not null check (accion in ('emitido', 'pdf_generado', 'cancelado')),
  actor         uuid references public.perfiles (id),
  detalle       jsonb not null default '{}'::jsonb,
  creado_en     timestamptz not null default now()
);

-- Registro de cada verificación pública (solo inserción)
create table public.verificaciones (
  id            bigint generated always as identity primary key,
  documento_id  uuid references public.documentos (id),
  metodo        text not null check (metodo in ('qr', 'manual', 'archivo')),
  resultado     text not null check (resultado in ('valido', 'cancelado', 'vencido', 'no_encontrado', 'limite_excedido')),
  ip_hash       text,
  user_agent    text,
  creado_en     timestamptz not null default now()
);

create index documentos_tipo_emitido_idx   on public.documentos (tipo_id, emitido_en desc);
create index documentos_emitido_por_idx    on public.documentos (emitido_por);
create index documentos_cancelado_por_idx  on public.documentos (cancelado_por);
create index bitacora_documento_idx        on public.bitacora (documento_id, creado_en desc);
create index bitacora_actor_idx            on public.bitacora (actor);
create index verificaciones_ip_idx         on public.verificaciones (ip_hash, creado_en desc);
create index verificaciones_documento_idx  on public.verificaciones (documento_id, creado_en desc);

-- ---------------------------------------------------------------------
-- Funciones auxiliares
-- ---------------------------------------------------------------------

-- Fecha "de hoy" en la zona horaria de la organización (único lugar a cambiar)
create function public.hoy_local()
returns date
language sql stable
set search_path = ''
as $$
  select (now() at time zone 'America/Mexico_City')::date
$$;

-- Normaliza el código manual: mayúsculas, sin guiones/espacios, O→0, I/L→1 (Crockford)
create function public.normalizar_codigo(p text)
returns text
language sql immutable
set search_path = ''
as $$
  select regexp_replace(translate(upper(coalesce(p, '')), 'OIL', '011'), '[^0-9A-Z]', '', 'g')
$$;

create function public.sha256_txt(p text)
returns bytea
language sql immutable
set search_path = ''
as $$
  select extensions.digest(convert_to(p, 'UTF8'), 'sha256')
$$;

-- Rol del usuario autenticado (null si no tiene perfil activo)
create function public.rol_actual()
returns public.rol_documentos
language sql stable security definer
set search_path = ''
as $$
  select p.rol from public.perfiles p where p.id = auth.uid() and p.activo
$$;

create function public.bloquear_modificacion()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'La tabla % es de solo inserción', tg_table_name;
end
$$;

create trigger bitacora_solo_insercion
  before update or delete on public.bitacora
  for each row execute function public.bloquear_modificacion();

create trigger verificaciones_solo_insercion
  before update or delete on public.verificaciones
  for each row execute function public.bloquear_modificacion();

-- Crea el perfil al dar de alta un usuario en Supabase Auth (rol "consulta")
create function public.crear_perfil()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.perfiles (id, nombre)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nombre', new.email, ''))
  on conflict (id) do nothing;
  return new;
end
$$;

create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil();

-- Usuarios que ya existían en el proyecto: perfil con rol "consulta"
insert into public.perfiles (id, nombre)
select u.id, coalesce(u.raw_user_meta_data ->> 'nombre', u.email, '')
from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- RPC: emitir (paso 1 de 2). Solo service_role (Edge Function emitir-documento).
-- Reserva folio y crea el documento en estado "pendiente".
-- ---------------------------------------------------------------------
create function public.emitir_documento(
  p_actor            uuid,
  p_tipo_clave       text,
  p_destinatario     text,
  p_datos            jsonb,
  p_token            text,
  p_codigo           text,
  p_vigente_hasta    date default null,
  p_sin_vencimiento  boolean default false
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_rol    public.rol_documentos;
  v_tipo   public.tipos_documento;
  v_anio   integer := extract(year from public.hoy_local())::integer;
  v_num    integer;
  v_folio  text;
  v_vig    date;
  v_campo  jsonb;
  v_datos  jsonb;
  v_id     uuid;
begin
  select p.rol into v_rol from public.perfiles p where p.id = p_actor and p.activo;
  if v_rol is null or v_rol not in ('admin', 'emisor') then
    raise exception 'El usuario no tiene permiso para emitir documentos' using errcode = '42501';
  end if;

  select * into v_tipo from public.tipos_documento t where t.clave = upper(trim(p_tipo_clave)) and t.activo;
  if not found then
    raise exception 'Tipo de documento no válido: %', p_tipo_clave using errcode = '22023';
  end if;

  if length(coalesce(p_token, '')) < 32 then
    raise exception 'Token inválido' using errcode = '22023';
  end if;
  if length(public.normalizar_codigo(p_codigo)) <> 10 then
    raise exception 'Código de verificación inválido' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_destinatario, ''))) = 0 then
    raise exception 'El destinatario es obligatorio' using errcode = '22023';
  end if;
  if p_datos is null or jsonb_typeof(p_datos) <> 'object' then
    raise exception 'Los datos deben ser un objeto JSON' using errcode = '22023';
  end if;

  for v_campo in select c from jsonb_array_elements(v_tipo.campos) c loop
    if coalesce((v_campo ->> 'requerido')::boolean, false)
       and length(trim(coalesce(p_datos ->> (v_campo ->> 'clave'), ''))) = 0 then
      raise exception 'Falta el campo requerido: %', v_campo ->> 'etiqueta' using errcode = '22023';
    end if;
  end loop;

  -- Solo se guardan las claves definidas en el tipo
  select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into v_datos
  from jsonb_each(p_datos) e
  where e.key in (select c ->> 'clave' from jsonb_array_elements(v_tipo.campos) c);

  v_vig := case
    when p_sin_vencimiento then null
    when p_vigente_hasta is not null then p_vigente_hasta
    when v_tipo.vigencia_dias is not null then public.hoy_local() + v_tipo.vigencia_dias
    else null
  end;
  if v_vig is not null and v_vig < public.hoy_local() then
    raise exception 'La vigencia no puede ser anterior a hoy' using errcode = '22023';
  end if;

  insert into public.folios_contador as fc (tipo_id, anio, ultimo)
  values (v_tipo.id, v_anio, 1)
  on conflict (tipo_id, anio) do update set ultimo = fc.ultimo + 1
  returning fc.ultimo into v_num;

  v_folio := v_tipo.prefijo_folio || '-' || v_anio || '-' || lpad(v_num::text, 6, '0');

  insert into public.documentos (tipo_id, folio, token_hash, codigo_hash, destinatario, datos, emitido_por, vigente_hasta)
  values (v_tipo.id, v_folio, public.sha256_txt(p_token), public.sha256_txt(public.normalizar_codigo(p_codigo)),
          trim(p_destinatario), v_datos, p_actor, v_vig)
  returning id into v_id;

  insert into public.bitacora (documento_id, accion, actor, detalle)
  values (v_id, 'emitido', p_actor, jsonb_build_object('folio', v_folio));

  return jsonb_build_object(
    'documento_id', v_id,
    'folio', v_folio,
    'tipo_nombre', v_tipo.nombre,
    'destinatario', trim(p_destinatario),
    'datos', v_datos,
    'campos', v_tipo.campos,
    'emitido_en', now(),
    'vigente_hasta', v_vig
  );
end
$$;

-- ---------------------------------------------------------------------
-- RPC: emitir (paso 2 de 2). Solo service_role.
-- Registra el PDF generado y deja el documento "vigente".
-- ---------------------------------------------------------------------
create function public.confirmar_documento(
  p_actor         uuid,
  p_documento_id  uuid,
  p_pdf_path      text,
  p_pdf_sha256    text
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_folio text;
begin
  update public.documentos d
     set estado = 'vigente',
         pdf_path = p_pdf_path,
         pdf_sha256 = lower(trim(p_pdf_sha256)),
         confirmado_en = now()
   where d.id = p_documento_id
     and d.estado = 'pendiente'
     and d.emitido_por = p_actor
  returning d.folio into v_folio;

  if v_folio is null then
    raise exception 'Documento no encontrado o ya confirmado' using errcode = '22023';
  end if;

  insert into public.bitacora (documento_id, accion, actor, detalle)
  values (p_documento_id, 'pdf_generado', p_actor,
          jsonb_build_object('pdf_path', p_pdf_path, 'pdf_sha256', lower(trim(p_pdf_sha256))));

  return jsonb_build_object('documento_id', p_documento_id, 'folio', v_folio, 'estado', 'vigente');
end
$$;

-- ---------------------------------------------------------------------
-- RPC: cancelar. La llama el panel con la sesión del usuario (solo admin).
-- ---------------------------------------------------------------------
create function public.cancelar_documento(
  p_documento_id  uuid,
  p_motivo        text
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_folio text;
begin
  if public.rol_actual() is distinct from 'admin' then
    raise exception 'Solo un administrador puede cancelar documentos' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_motivo, ''))) < 5 then
    raise exception 'Indique el motivo de la cancelación (mínimo 5 caracteres)' using errcode = '22023';
  end if;

  update public.documentos d
     set estado = 'cancelado',
         cancelado_por = v_actor,
         cancelado_en = now(),
         motivo_cancelacion = trim(p_motivo)
   where d.id = p_documento_id
     and d.estado = 'vigente'
  returning d.folio into v_folio;

  if v_folio is null then
    raise exception 'Solo se pueden cancelar documentos vigentes' using errcode = '22023';
  end if;

  insert into public.bitacora (documento_id, accion, actor, detalle)
  values (p_documento_id, 'cancelado', v_actor, jsonb_build_object('motivo', trim(p_motivo)));

  return jsonb_build_object('documento_id', p_documento_id, 'folio', v_folio, 'estado', 'cancelado');
end
$$;

-- ---------------------------------------------------------------------
-- RPC: verificar. Solo service_role (Edge Function pública "verificar").
-- Devuelve únicamente datos públicos. Límite: 20 consultas/minuto por IP.
-- ---------------------------------------------------------------------
create function public.verificar_documento(
  p_metodo      text,
  p_token       text default null,
  p_folio       text default null,
  p_codigo      text default null,
  p_pdf_sha256  text default null,
  p_ip_hash     text default null,
  p_user_agent  text default null
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_doc       public.documentos;
  v_tipo      public.tipos_documento;
  v_res       text;
  v_intentos  integer;
  v_area      text;
  v_campos    jsonb;
begin
  if p_metodo not in ('qr', 'manual', 'archivo') then
    raise exception 'Método de verificación no válido' using errcode = '22023';
  end if;

  if p_ip_hash is not null then
    select count(*) into v_intentos
    from public.verificaciones v
    where v.ip_hash = p_ip_hash and v.creado_en > now() - interval '1 minute';
    if v_intentos >= 20 then
      insert into public.verificaciones (metodo, resultado, ip_hash, user_agent)
      values (p_metodo, 'limite_excedido', p_ip_hash, left(p_user_agent, 300));
      return jsonb_build_object('resultado', 'limite_excedido', 'documento', null, 'verificado_en', now());
    end if;
  end if;

  if p_metodo = 'qr' then
    select * into v_doc from public.documentos d
    where d.token_hash = public.sha256_txt(p_token) and d.estado <> 'pendiente';
  elsif p_metodo = 'manual' then
    select * into v_doc from public.documentos d
    where d.folio = upper(trim(p_folio))
      and d.codigo_hash = public.sha256_txt(public.normalizar_codigo(p_codigo))
      and d.estado <> 'pendiente';
  else
    select * into v_doc from public.documentos d
    where d.pdf_sha256 = lower(trim(p_pdf_sha256)) and d.estado <> 'pendiente';
  end if;

  v_res := case
    when v_doc.id is null then 'no_encontrado'
    when v_doc.estado = 'cancelado' then 'cancelado'
    when v_doc.vigente_hasta is not null and v_doc.vigente_hasta < public.hoy_local() then 'vencido'
    else 'valido'
  end;

  insert into public.verificaciones (documento_id, metodo, resultado, ip_hash, user_agent)
  values (v_doc.id, p_metodo, v_res, p_ip_hash, left(p_user_agent, 300));

  if v_doc.id is null then
    return jsonb_build_object('resultado', v_res, 'documento', null, 'verificado_en', now());
  end if;

  select * into v_tipo from public.tipos_documento t where t.id = v_doc.tipo_id;
  select p.area into v_area from public.perfiles p where p.id = v_doc.emitido_por;

  select coalesce(jsonb_agg(jsonb_build_object('etiqueta', c.campo ->> 'etiqueta',
                                               'tipo', c.campo ->> 'tipo',
                                               'valor', v_doc.datos -> (c.campo ->> 'clave'))
                            order by c.orden), '[]'::jsonb)
    into v_campos
  from jsonb_array_elements(v_tipo.campos) with ordinality as c(campo, orden)
  where coalesce((c.campo ->> 'publico')::boolean, false)
    and v_doc.datos ? (c.campo ->> 'clave');

  return jsonb_build_object(
    'resultado', v_res,
    'documento', jsonb_build_object(
      'folio', v_doc.folio,
      'tipo', v_tipo.nombre,
      'destinatario', v_doc.destinatario,
      'area_emisora', nullif(v_area, ''),
      'emitido_en', v_doc.emitido_en,
      'vigente_hasta', v_doc.vigente_hasta,
      'cancelado_en', v_doc.cancelado_en,
      'campos', v_campos
    ),
    'verificado_en', now()
  );
end
$$;

-- ---------------------------------------------------------------------
-- Permisos. Supabase da acceso por defecto a anon/authenticated: se retira.
-- ---------------------------------------------------------------------
revoke all on public.perfiles, public.tipos_documento, public.folios_contador,
              public.documentos, public.bitacora, public.verificaciones
  from anon, authenticated;

revoke execute on function
  public.hoy_local(), public.normalizar_codigo(text), public.sha256_txt(text),
  public.rol_actual(), public.bloquear_modificacion(), public.crear_perfil(),
  public.emitir_documento(uuid, text, text, jsonb, text, text, date, boolean),
  public.confirmar_documento(uuid, uuid, text, text),
  public.cancelar_documento(uuid, text),
  public.verificar_documento(text, text, text, text, text, text, text)
  from public, anon, authenticated;

grant execute on function public.rol_actual() to authenticated;
grant execute on function public.cancelar_documento(uuid, text) to authenticated;
grant execute on function
  public.emitir_documento(uuid, text, text, jsonb, text, text, date, boolean),
  public.confirmar_documento(uuid, uuid, text, text),
  public.verificar_documento(text, text, text, text, text, text, text)
  to service_role;

-- Lectura para el panel interno (las columnas *_hash nunca se exponen)
grant select on public.perfiles to authenticated;
grant update (nombre, area, rol, activo) on public.perfiles to authenticated;
grant select on public.tipos_documento to authenticated;
grant insert (clave, nombre, descripcion, prefijo_folio, vigencia_dias, campos, activo),
      update (nombre, descripcion, vigencia_dias, campos, activo)
  on public.tipos_documento to authenticated;
grant select (id, tipo_id, folio, estado, destinatario, datos, emitido_por, emitido_en, vigente_hasta,
              pdf_path, pdf_sha256, confirmado_en, cancelado_por, cancelado_en, motivo_cancelacion)
  on public.documentos to authenticated;
grant select on public.bitacora to authenticated;
grant select on public.verificaciones to authenticated;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.perfiles        enable row level security;
alter table public.tipos_documento enable row level security;
alter table public.folios_contador enable row level security;
alter table public.documentos      enable row level security;
alter table public.bitacora        enable row level security;
alter table public.verificaciones  enable row level security;

create policy perfiles_lectura on public.perfiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.rol_actual()) = 'admin');

create policy perfiles_edicion_admin on public.perfiles
  for update to authenticated
  using ((select public.rol_actual()) = 'admin')
  with check ((select public.rol_actual()) = 'admin');

create policy tipos_lectura on public.tipos_documento
  for select to authenticated
  using ((select public.rol_actual()) is not null);

create policy tipos_alta_admin on public.tipos_documento
  for insert to authenticated
  with check ((select public.rol_actual()) = 'admin');

create policy tipos_edicion_admin on public.tipos_documento
  for update to authenticated
  using ((select public.rol_actual()) = 'admin')
  with check ((select public.rol_actual()) = 'admin');

create policy documentos_lectura on public.documentos
  for select to authenticated
  using ((select public.rol_actual()) is not null);

create policy bitacora_lectura on public.bitacora
  for select to authenticated
  using ((select public.rol_actual()) is not null);

create policy verificaciones_lectura_admin on public.verificaciones
  for select to authenticated
  using ((select public.rol_actual()) = 'admin');

-- folios_contador: sin políticas (solo lo usa emitir_documento)

-- ---------------------------------------------------------------------
-- Storage: PDFs privados. Solo service_role sube; usuarios activos descargan.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documentos', 'documentos', false, 5242880, array['application/pdf'])
on conflict (id) do nothing;

create policy documentos_pdf_lectura on storage.objects
  for select to authenticated
  using (bucket_id = 'documentos' and (select public.rol_actual()) is not null);
