-- Procuração: pendente | ativa | nao_necessaria (substitui "inativa").

-- 1) Campos de auditoria operacional na aprovação
alter table public.orcamento_aprovacoes
  add column if not exists procuracao_atualizada_em timestamptz null;

alter table public.orcamento_aprovacoes
  add column if not exists procuracao_atualizada_por text null;

comment on column public.orcamento_aprovacoes.procuracao_atualizada_em is
  'Data/hora da última alteração de status da procuração na implantação.';

comment on column public.orcamento_aprovacoes.procuracao_atualizada_por is
  'Usuário que atualizou o status da procuração na implantação.';

-- 2) Migrar inativa → pendente (não marcar como nao_necessaria)
update public.orcamento_aprovacoes
set procuracao_status = 'pendente'
where procuracao_status = 'inativa';

alter table public.orcamento_aprovacoes
  alter column procuracao_status set default 'pendente';

alter table public.orcamento_aprovacoes
  drop constraint if exists orcamento_aprovacoes_procuracao_status_check;

alter table public.orcamento_aprovacoes
  add constraint orcamento_aprovacoes_procuracao_status_check
  check (procuracao_status in ('pendente', 'ativa', 'nao_necessaria'));

comment on column public.orcamento_aprovacoes.procuracao_status is
  'Status da procuração na implantação: pendente | ativa | nao_necessaria.';

-- 3) Clientes: alinhar status e default
update public.clientes
set procuracao = 'pendente'
where procuracao = 'inativa';

alter table public.clientes
  alter column procuracao set default 'pendente';

alter table public.clientes
  drop constraint if exists clientes_procuracao_check;

alter table public.clientes
  add constraint clientes_procuracao_check
  check (procuracao in ('pendente', 'ativa', 'nao_necessaria'));

comment on column public.clientes.procuracao is
  'Status da procuração SST/eSocial: pendente | ativa | nao_necessaria.';
