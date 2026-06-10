-- Tabela de histórico de alterações dos agendamentos
create table if not exists public.agendamento_historico (
  id uuid primary key default gen_random_uuid(),
  agendamento_id uuid not null references public.agendamentos(id) on delete cascade,
  usuario text not null,
  acao text not null,
  detalhes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_agendamento_historico_agendamento_id
  on public.agendamento_historico (agendamento_id);

create index if not exists idx_agendamento_historico_created_at
  on public.agendamento_historico (created_at desc);

alter table public.agendamento_historico enable row level security;

-- Policies temporárias para desenvolvimento (anon)
drop policy if exists "anon_select_agendamento_historico" on public.agendamento_historico;
create policy "anon_select_agendamento_historico"
  on public.agendamento_historico
  for select
  to anon
  using (true);

drop policy if exists "anon_insert_agendamento_historico" on public.agendamento_historico;
create policy "anon_insert_agendamento_historico"
  on public.agendamento_historico
  for insert
  to anon
  with check (true);
