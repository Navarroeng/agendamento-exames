-- 165: Acesso externo da AGROVIAS e conferência dos documentos de RH.
-- O bucket privado é recriado se a consulta anterior não o encontrou.
-- Documentos de RH continuam fora da postagem nas plataformas.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gestao-plataformas-anexos',
  'gestao-plataformas-anexos',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.gestao_plataforma_acessos_externos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id),
  email text not null,
  nome text not null,
  cliente_id uuid not null references public.clientes (id),
  concedido_em timestamptz not null default now(),
  concedido_por uuid null,
  revogado_em timestamptz null,
  revogado_por uuid null,
  constraint gestao_plataforma_acessos_externos_email_check
    check (position('@' in email) > 1)
);

create unique index if not exists idx_gestao_plataforma_acesso_externo_ativo
  on public.gestao_plataforma_acessos_externos (user_id)
  where revogado_em is null;

alter table public.gestao_plataforma_documentos_rh
  add column if not exists situacao text not null default 'recebido',
  add column if not exists observacao text null,
  add column if not exists enviado_em timestamptz null,
  add column if not exists enviado_por text null,
  add column if not exists conferido_em timestamptz null,
  add column if not exists conferido_por text null;

alter table public.gestao_plataforma_documentos_rh
  alter column arquivo_path drop not null,
  alter column arquivo_nome drop not null;

alter table public.gestao_plataforma_documentos_rh
  drop constraint if exists gestao_plataforma_documentos_rh_situacao_check;

alter table public.gestao_plataforma_documentos_rh
  add constraint gestao_plataforma_documentos_rh_situacao_check
  check (situacao in ('aguardando_envio', 'recebido', 'conferido', 'reenvio_solicitado'));

create table if not exists public.gestao_plataforma_documento_rh_eventos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id),
  documento_id uuid not null references public.gestao_plataforma_documentos_rh (id),
  situacao text not null,
  observacao text null,
  responsavel text null,
  registrado_em timestamptz not null default now(),
  constraint gestao_plataforma_documento_rh_eventos_situacao_check
    check (situacao in ('aguardando_envio', 'recebido', 'conferido', 'reenvio_solicitado'))
);

create index if not exists idx_gestao_plataforma_documento_rh_eventos_doc
  on public.gestao_plataforma_documento_rh_eventos (documento_id, registrado_em desc);

create or replace function public.acesso_externo_agrovias()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.gestao_plataforma_acessos_externos acesso
    join public.perfis_usuarios perfil on perfil.user_id = acesso.user_id
    where acesso.user_id = auth.uid()
      and acesso.revogado_em is null
      and acesso.cliente_id = public.cliente_gestao_plataformas_id()
      and perfil.ativo = true
      and perfil.perfil = 'portal_agrovias'
  );
$$;

revoke all on function public.acesso_externo_agrovias() from public;
grant execute on function public.acesso_externo_agrovias() to authenticated, service_role;

drop policy if exists self_select_perfil on public.perfis_usuarios;
create policy self_select_perfil
  on public.perfis_usuarios
  for select
  to authenticated
  using (user_id = auth.uid());

alter table public.gestao_plataforma_acessos_externos enable row level security;
alter table public.gestao_plataforma_documento_rh_eventos enable row level security;

drop policy if exists externo_select_acessos on public.gestao_plataforma_acessos_externos;
create policy externo_select_acessos
  on public.gestao_plataforma_acessos_externos
  for select
  to authenticated
  using (
    user_id = auth.uid()
    and revogado_em is null
    and cliente_id = public.cliente_gestao_plataformas_id()
    and public.acesso_externo_agrovias()
  );

drop policy if exists staff_select_acessos on public.gestao_plataforma_acessos_externos;
create policy staff_select_acessos
  on public.gestao_plataforma_acessos_externos
  for select
  to authenticated
  using (public.is_staff_user() and cliente_id = public.cliente_gestao_plataformas_id());

drop policy if exists externo_select_rh_eventos on public.gestao_plataforma_documento_rh_eventos;
create policy externo_select_rh_eventos
  on public.gestao_plataforma_documento_rh_eventos
  for select
  to authenticated
  using (
    public.acesso_externo_agrovias()
    and cliente_id = public.cliente_gestao_plataformas_id()
  );

drop policy if exists staff_select_rh_eventos on public.gestao_plataforma_documento_rh_eventos;
create policy staff_select_rh_eventos
  on public.gestao_plataforma_documento_rh_eventos
  for select
  to authenticated
  using (public.is_staff_user() and cliente_id = public.cliente_gestao_plataformas_id());

drop policy if exists externo_select_documentos_rh on public.gestao_plataforma_documentos_rh;
create policy externo_select_documentos_rh
  on public.gestao_plataforma_documentos_rh
  for select
  to authenticated
  using (
    public.acesso_externo_agrovias()
    and cliente_id = public.cliente_gestao_plataformas_id()
  );

grant select on table public.gestao_plataforma_acessos_externos to authenticated, service_role;
grant select on table public.gestao_plataforma_documento_rh_eventos to authenticated, service_role;

drop policy if exists externo_select_gestao_plataformas_rh on storage.objects;
create policy externo_select_gestao_plataformas_rh
  on storage.objects for select to authenticated
  using (
    bucket_id = 'gestao-plataformas-anexos'
    and public.acesso_externo_agrovias()
    and (storage.foldername(name))[1] = public.cliente_gestao_plataformas_id()::text
    and (storage.foldername(name))[2] = 'rh'
  );

comment on table public.gestao_plataforma_acessos_externos is
  'Contas externas da AGROVIAS. Revogar encerra a consulta e o envio.';
comment on column public.gestao_plataforma_documentos_rh.situacao is
  'aguardando_envio, recebido, conferido ou reenvio_solicitado.';
