-- Catálogo de exames (valor padrão Navarro)
create table if not exists public.exames (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria text,
  valor_navarro numeric(12, 2) not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exames_nome_unique unique (nome)
);

create index if not exists idx_exames_ativo on public.exames (ativo);
create index if not exists idx_exames_nome on public.exames (nome);

-- Exames realizados por cada clínica (custo específico)
create table if not exists public.clinica_exames (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  exame_id uuid not null references public.exames(id) on delete restrict,
  custo_clinica numeric(12, 2) not null default 0,
  valor_navarro numeric(10, 2) not null default 0,
  prazo_resultado text,
  observacoes text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clinica_exames_unique unique (clinica_id, exame_id)
);

create index if not exists idx_clinica_exames_clinica on public.clinica_exames (clinica_id);
create index if not exists idx_clinica_exames_exame on public.clinica_exames (exame_id);
create index if not exists idx_clinica_exames_ativo on public.clinica_exames (ativo);

-- Histórico do catálogo de exames
create table if not exists public.exames_historico (
  id uuid primary key default gen_random_uuid(),
  exame_id uuid not null references public.exames(id) on delete cascade,
  usuario text not null,
  acao text not null,
  detalhes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_exames_historico_exame on public.exames_historico (exame_id);

-- Histórico de exames vinculados à clínica
create table if not exists public.clinica_exames_historico (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  clinica_exame_id uuid references public.clinica_exames(id) on delete set null,
  usuario text not null,
  acao text not null,
  detalhes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_clinica_exames_historico_clinica
  on public.clinica_exames_historico (clinica_id);

alter table public.exames enable row level security;
alter table public.clinica_exames enable row level security;
alter table public.exames_historico enable row level security;
alter table public.clinica_exames_historico enable row level security;

-- exames
drop policy if exists "anon_select_exames" on public.exames;
create policy "anon_select_exames" on public.exames for select to anon using (true);
drop policy if exists "anon_insert_exames" on public.exames;
create policy "anon_insert_exames" on public.exames for insert to anon with check (true);
drop policy if exists "anon_update_exames" on public.exames;
create policy "anon_update_exames" on public.exames for update to anon using (true) with check (true);

-- clinica_exames
drop policy if exists "anon_select_clinica_exames" on public.clinica_exames;
create policy "anon_select_clinica_exames" on public.clinica_exames for select to anon using (true);
drop policy if exists "anon_insert_clinica_exames" on public.clinica_exames;
create policy "anon_insert_clinica_exames" on public.clinica_exames for insert to anon with check (true);
drop policy if exists "anon_update_clinica_exames" on public.clinica_exames;
create policy "anon_update_clinica_exames" on public.clinica_exames for update to anon using (true) with check (true);

-- historicos
drop policy if exists "anon_select_exames_historico" on public.exames_historico;
create policy "anon_select_exames_historico" on public.exames_historico for select to anon using (true);
drop policy if exists "anon_insert_exames_historico" on public.exames_historico;
create policy "anon_insert_exames_historico" on public.exames_historico for insert to anon with check (true);

drop policy if exists "anon_select_clinica_exames_historico" on public.clinica_exames_historico;
create policy "anon_select_clinica_exames_historico"
  on public.clinica_exames_historico for select to anon using (true);
drop policy if exists "anon_insert_clinica_exames_historico" on public.clinica_exames_historico;
create policy "anon_insert_clinica_exames_historico"
  on public.clinica_exames_historico for insert to anon with check (true);

-- Catálogo inicial mínimo (valores definitivos vêm de seeds/005_exames_seed.sql)
insert into public.exames (nome, categoria, valor_navarro, ativo) values
  ('Clínico', 'Ocupacional', 0, true)
on conflict (nome) do nothing;
