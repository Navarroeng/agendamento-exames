-- Tabela de clínicas credenciadas
create table if not exists public.clinicas (
  id uuid primary key default gen_random_uuid(),
  razao_social text not null,
  nome_fantasia text not null,
  cnpj text not null,
  responsavel text not null,
  telefone text not null,
  whatsapp text,
  email text not null,
  site text,
  cep text,
  rua text,
  numero text,
  bairro text,
  cidade text not null,
  estado text not null,
  forma_pagamento text,
  prazo_pagamento text,
  observacoes_financeiras text,
  horario_atendimento text,
  possui_coleta boolean not null default false,
  possui_sistema_online boolean not null default false,
  exames_atendidos text,
  observacoes text,
  status text not null default 'ativa' check (status in ('ativa', 'inativa')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_clinicas_created_at
  on public.clinicas (created_at desc);

create index if not exists idx_clinicas_status
  on public.clinicas (status);

create index if not exists idx_clinicas_nome_fantasia
  on public.clinicas (nome_fantasia);

alter table public.clinicas enable row level security;

drop policy if exists "anon_select_clinicas" on public.clinicas;
create policy "anon_select_clinicas"
  on public.clinicas for select to anon using (true);

drop policy if exists "anon_insert_clinicas" on public.clinicas;
create policy "anon_insert_clinicas"
  on public.clinicas for insert to anon with check (true);

drop policy if exists "anon_update_clinicas" on public.clinicas;
create policy "anon_update_clinicas"
  on public.clinicas for update to anon using (true) with check (true);

-- Histórico de alterações das clínicas
create table if not exists public.clinicas_historico (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  usuario text not null,
  acao text not null,
  detalhes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_clinicas_historico_clinica_id
  on public.clinicas_historico (clinica_id);

create index if not exists idx_clinicas_historico_created_at
  on public.clinicas_historico (created_at desc);

alter table public.clinicas_historico enable row level security;

drop policy if exists "anon_select_clinicas_historico" on public.clinicas_historico;
create policy "anon_select_clinicas_historico"
  on public.clinicas_historico for select to anon using (true);

drop policy if exists "anon_insert_clinicas_historico" on public.clinicas_historico;
create policy "anon_insert_clinicas_historico"
  on public.clinicas_historico for insert to anon with check (true);
