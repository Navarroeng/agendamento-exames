-- Auditoria central do sistema (somente leitura para admin)
create table if not exists public.auditoria_sistema (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid null references auth.users (id) on delete set null,
  usuario_nome text not null,
  usuario_email text not null,
  modulo text not null,
  acao text not null,
  registro_id uuid null,
  registro_nome text null,
  descricao text not null,
  dados_antes jsonb null,
  dados_depois jsonb null,
  created_at timestamptz not null default now()
);

create index if not exists idx_auditoria_sistema_created_at
  on public.auditoria_sistema (created_at desc);

create index if not exists idx_auditoria_sistema_usuario_email
  on public.auditoria_sistema (usuario_email);

create index if not exists idx_auditoria_sistema_modulo
  on public.auditoria_sistema (modulo);

create index if not exists idx_auditoria_sistema_acao
  on public.auditoria_sistema (acao);

create index if not exists idx_auditoria_sistema_modulo_created_at
  on public.auditoria_sistema (modulo, created_at desc);

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.perfis_usuarios
    where user_id = auth.uid()
      and perfil = 'admin'
      and ativo = true
  );
$$;

alter table public.auditoria_sistema enable row level security;

drop policy if exists "authenticated_insert_auditoria_sistema" on public.auditoria_sistema;
create policy "authenticated_insert_auditoria_sistema"
  on public.auditoria_sistema
  for insert
  to authenticated
  with check (true);

drop policy if exists "admin_select_auditoria_sistema" on public.auditoria_sistema;
create policy "admin_select_auditoria_sistema"
  on public.auditoria_sistema
  for select
  to authenticated
  using (public.is_admin_user());
