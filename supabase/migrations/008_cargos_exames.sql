-- Cargos e exames obrigatórios por cargo
create table if not exists public.cargos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cargos_ativo on public.cargos (ativo);
create index if not exists idx_cargos_nome on public.cargos (nome);

create table if not exists public.cargo_exames (
  id uuid primary key default gen_random_uuid(),
  cargo_id uuid not null references public.cargos (id) on delete cascade,
  exame_id uuid not null references public.exames (id) on delete cascade,
  obrigatorio boolean not null default true,
  observacoes text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cargo_exames_cargo_exame_unique unique (cargo_id, exame_id)
);

create index if not exists idx_cargo_exames_cargo on public.cargo_exames (cargo_id);
create index if not exists idx_cargo_exames_exame on public.cargo_exames (exame_id);
create index if not exists idx_cargo_exames_ativo on public.cargo_exames (ativo);

create or replace function public.set_cargos_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_cargos_updated_at on public.cargos;
create trigger trg_cargos_updated_at
  before update on public.cargos
  for each row
  execute function public.set_cargos_updated_at();

create or replace function public.set_cargo_exames_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_cargo_exames_updated_at on public.cargo_exames;
create trigger trg_cargo_exames_updated_at
  before update on public.cargo_exames
  for each row
  execute function public.set_cargo_exames_updated_at();

alter table public.cargos enable row level security;
alter table public.cargo_exames enable row level security;

drop policy if exists "authenticated_select_cargos" on public.cargos;
create policy "authenticated_select_cargos"
  on public.cargos for select to authenticated using (true);

drop policy if exists "authenticated_insert_cargos" on public.cargos;
create policy "authenticated_insert_cargos"
  on public.cargos for insert to authenticated with check (true);

drop policy if exists "authenticated_update_cargos" on public.cargos;
create policy "authenticated_update_cargos"
  on public.cargos for update to authenticated using (true) with check (true);

drop policy if exists "authenticated_select_cargo_exames" on public.cargo_exames;
create policy "authenticated_select_cargo_exames"
  on public.cargo_exames for select to authenticated using (true);

drop policy if exists "authenticated_insert_cargo_exames" on public.cargo_exames;
create policy "authenticated_insert_cargo_exames"
  on public.cargo_exames for insert to authenticated with check (true);

drop policy if exists "authenticated_update_cargo_exames" on public.cargo_exames;
create policy "authenticated_update_cargo_exames"
  on public.cargo_exames for update to authenticated using (true) with check (true);

-- Necessário para sincronizar vínculos ao editar cargo
drop policy if exists "authenticated_delete_cargo_exames" on public.cargo_exames;
create policy "authenticated_delete_cargo_exames"
  on public.cargo_exames for delete to authenticated using (true);
