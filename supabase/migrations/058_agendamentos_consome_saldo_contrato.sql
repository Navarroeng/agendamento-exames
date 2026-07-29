-- Vínculo opcional ao contrato e consumo de saldo da implantação.

alter table public.agendamentos
  add column if not exists consome_saldo_contrato boolean null;

alter table public.agendamentos
  add column if not exists vinculado_contrato_em timestamptz null;

alter table public.agendamentos
  add column if not exists vinculado_contrato_por text null;

-- Legado: vínculos já gravados com contrato_id passam a consumir saldo.
update public.agendamentos
set consome_saldo_contrato = true
where contrato_id is not null
  and consome_saldo_contrato is null
  and status is distinct from 'cancelado';

create index if not exists idx_agendamentos_contrato_consome_saldo
  on public.agendamentos (contrato_id, consome_saldo_contrato)
  where contrato_id is not null;

comment on column public.agendamentos.consome_saldo_contrato is
  'Se true, o colaborador conta no saldo inicial da implantação do contrato.';
comment on column public.agendamentos.vinculado_contrato_em is
  'Data/hora em que o usuário vinculou o agendamento ao contrato.';
comment on column public.agendamentos.vinculado_contrato_por is
  'Usuário que vinculou o agendamento ao contrato.';
