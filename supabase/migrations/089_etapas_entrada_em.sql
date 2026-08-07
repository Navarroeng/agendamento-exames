-- Datas de entrada por etapa operacional.
-- Cada módulo filtra pelo momento em que o processo entrou naquela etapa,
-- não pela data do orçamento (salvo o próprio módulo Orçamentos).

-- 1) Laudos SST: entrada quando o processo passa a ser elegível / tracking criado
alter table public.orcamento_laudos_sst
  add column if not exists entrada_em timestamptz;

update public.orcamento_laudos_sst
set entrada_em = coalesce(entrada_em, created_at, now())
where entrada_em is null;

alter table public.orcamento_laudos_sst
  alter column entrada_em set default now();

alter table public.orcamento_laudos_sst
  alter column entrada_em set not null;

comment on column public.orcamento_laudos_sst.entrada_em is
  'Momento em que o processo entrou na etapa Laudos SST (pós-implantação concluída).';

-- 2) eSocial: entrada do agendamento na fila/etapa eSocial
alter table public.agendamentos
  add column if not exists esocial_entrada_em timestamptz;

update public.agendamentos
set esocial_entrada_em = coalesce(
  esocial_entrada_em,
  created_at,
  (data_agendamento::timestamptz),
  now()
)
where esocial_entrada_em is null;

alter table public.agendamentos
  alter column esocial_entrada_em set default now();

alter table public.agendamentos
  alter column esocial_entrada_em set not null;

comment on column public.agendamentos.esocial_entrada_em is
  'Momento em que o agendamento entrou na etapa eSocial (não usar data do orçamento).';

-- Implantação: data de entrada = orcamento_aprovacoes.aprovado_em
-- Riscos Psicossociais: já possui entrada_em (migration 088)
comment on column public.orcamento_aprovacoes.aprovado_em is
  'Data/hora da aprovação = data de entrada na etapa Implantação de Clientes.';
