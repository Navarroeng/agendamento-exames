-- Tabela de vínculo manual entre contratos e agendamentos (implantação).
-- Substitui a decisão no momento da criação do agendamento.

create table if not exists public.contrato_agendamentos (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null
    references public.cliente_contratos (id) on delete cascade,
  agendamento_id uuid not null
    references public.agendamentos (id) on delete cascade,
  contabiliza_previsao boolean not null default true,
  vinculado_por text null,
  vinculado_em timestamptz not null default now(),
  removido_por text null,
  removido_em timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contrato_agendamentos_unique unique (contrato_id, agendamento_id)
);

create index if not exists idx_contrato_agendamentos_contrato
  on public.contrato_agendamentos (contrato_id)
  where removido_em is null;

create index if not exists idx_contrato_agendamentos_agendamento
  on public.contrato_agendamentos (agendamento_id)
  where removido_em is null;

-- Um agendamento só pode contabilizar previsão em um contrato ativo por vez.
create unique index if not exists idx_contrato_agendamentos_unico_contabiliza
  on public.contrato_agendamentos (agendamento_id)
  where contabiliza_previsao = true and removido_em is null;

comment on table public.contrato_agendamentos is
  'Seleção manual de agendamentos contabilizados na previsão inicial do contrato.';

-- Backfill da regra anterior (contrato_id + consome_saldo).
insert into public.contrato_agendamentos (
  contrato_id,
  agendamento_id,
  contabiliza_previsao,
  vinculado_por,
  vinculado_em
)
select
  a.contrato_id,
  a.id,
  coalesce(a.consome_saldo_contrato, true),
  coalesce(nullif(trim(a.vinculado_contrato_por), ''), 'SISTEMA'),
  coalesce(a.vinculado_contrato_em, a.created_at, now())
from public.agendamentos a
where a.contrato_id is not null
on conflict (contrato_id, agendamento_id) do nothing;

alter table public.contrato_agendamentos enable row level security;

drop policy if exists "contrato_agendamentos_select_authenticated" on public.contrato_agendamentos;
create policy "contrato_agendamentos_select_authenticated"
  on public.contrato_agendamentos for select to authenticated using (true);

drop policy if exists "contrato_agendamentos_insert_authenticated" on public.contrato_agendamentos;
create policy "contrato_agendamentos_insert_authenticated"
  on public.contrato_agendamentos for insert to authenticated with check (true);

drop policy if exists "contrato_agendamentos_update_authenticated" on public.contrato_agendamentos;
create policy "contrato_agendamentos_update_authenticated"
  on public.contrato_agendamentos for update to authenticated using (true) with check (true);

drop policy if exists "contrato_agendamentos_delete_authenticated" on public.contrato_agendamentos;
create policy "contrato_agendamentos_delete_authenticated"
  on public.contrato_agendamentos for delete to authenticated using (true);
