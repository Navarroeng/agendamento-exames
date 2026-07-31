-- Reparo: migration 071 falhou ao atualizar para 'pendente' com a constraint antiga ainda ativa.
-- Idempotente: drop → convert → default → nova check (orcamento_aprovacoes e clientes).

begin;

alter table public.orcamento_aprovacoes
  add column if not exists procuracao_atualizada_em timestamptz null;

alter table public.orcamento_aprovacoes
  add column if not exists procuracao_atualizada_por text null;

alter table public.orcamento_aprovacoes
  drop constraint if exists orcamento_aprovacoes_procuracao_status_check;

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

alter table public.clientes
  drop constraint if exists clientes_procuracao_check;

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

commit;
