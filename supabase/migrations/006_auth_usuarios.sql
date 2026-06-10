-- Perfis de usuários vinculados ao Supabase Auth
create table if not exists public.perfis_usuarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  email text not null,
  perfil text not null default 'operacional',
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  constraint perfis_usuarios_user_id_unique unique (user_id),
  constraint perfis_usuarios_email_unique unique (email)
);

create index if not exists idx_perfis_usuarios_user_id
  on public.perfis_usuarios (user_id);

create index if not exists idx_perfis_usuarios_ativo
  on public.perfis_usuarios (ativo);

alter table public.perfis_usuarios enable row level security;

drop policy if exists "authenticated_select_perfis" on public.perfis_usuarios;
create policy "authenticated_select_perfis"
  on public.perfis_usuarios
  for select
  to authenticated
  using (true);

drop policy if exists "authenticated_update_own_perfil" on public.perfis_usuarios;
create policy "authenticated_update_own_perfil"
  on public.perfis_usuarios
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Após criar usuários no Auth Dashboard, vincule os perfis (substitua os UUIDs):
-- insert into public.perfis_usuarios (user_id, nome, email, perfil) values
--   ('uuid-bruna', 'Bruna', 'bruna@navarro.com.br', 'operacional'),
--   ('uuid-rafaela', 'Rafaela', 'rafaela@navarro.com.br', 'operacional'),
--   ('uuid-admin', 'Admin', 'admin@navarro.com.br', 'admin');
