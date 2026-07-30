-- Dispensa dos agendamentos iniciais previstos no contrato (etapa Implantação).
-- O cliente mantém o contrato ativo, mas a previsão inicial não é consumida.

alter table public.cliente_contratos
  add column if not exists agendamentos_iniciais_dispensados boolean not null default false,
  add column if not exists motivo_dispensa_agendamentos text null,
  add column if not exists dispensado_em timestamptz null,
  add column if not exists dispensado_por text null,
  add column if not exists reaberto_em timestamptz null,
  add column if not exists reaberto_por text null,
  add column if not exists motivo_reabertura text null;

comment on column public.cliente_contratos.agendamentos_iniciais_dispensados is
  'True quando o cliente optou por não realizar os agendamentos iniciais previstos.';

comment on column public.cliente_contratos.motivo_dispensa_agendamentos is
  'Motivo/observação informado na dispensa dos agendamentos iniciais.';

comment on column public.cliente_contratos.dispensado_em is
  'Data/hora da dispensa dos agendamentos iniciais.';

comment on column public.cliente_contratos.dispensado_por is
  'Usuário responsável pela dispensa dos agendamentos iniciais.';

comment on column public.cliente_contratos.reaberto_em is
  'Data/hora da reabertura da etapa de agendamentos iniciais após dispensa.';

comment on column public.cliente_contratos.reaberto_por is
  'Usuário responsável pela reabertura dos agendamentos iniciais.';

comment on column public.cliente_contratos.motivo_reabertura is
  'Motivo informado na reabertura dos agendamentos iniciais.';

create index if not exists idx_cliente_contratos_agendamentos_dispensados
  on public.cliente_contratos (agendamentos_iniciais_dispensados)
  where agendamentos_iniciais_dispensados = true;
