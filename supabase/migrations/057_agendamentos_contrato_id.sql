-- Vínculo de agendamento ao contrato (implantação / renovação).
-- Sem backfill por CNPJ: só vínculos explícitos futuros.

alter table public.agendamentos
  add column if not exists contrato_id uuid null
    references public.cliente_contratos (id) on delete set null;

create index if not exists idx_agendamentos_contrato_id
  on public.agendamentos (contrato_id)
  where contrato_id is not null;

create index if not exists idx_agendamentos_contrato_status
  on public.agendamentos (contrato_id, status)
  where contrato_id is not null;

comment on column public.agendamentos.contrato_id is
  'Contrato do cliente ao qual o agendamento pertence (implantação/renovação).';
