-- Controle de procuração SST/eSocial no cadastro de clientes.
-- Clientes existentes: procuração ativa (base já em atendimento).
-- Novos cadastros após a migration: padrão inativa.

alter table public.clientes
  add column if not exists procuracao text;

update public.clientes
set procuracao = 'ativa'
where procuracao is null;

alter table public.clientes
  alter column procuracao set default 'inativa';

alter table public.clientes
  alter column procuracao set not null;

alter table public.clientes
  drop constraint if exists clientes_procuracao_check;

alter table public.clientes
  add constraint clientes_procuracao_check
  check (procuracao in ('ativa', 'inativa'));

comment on column public.clientes.procuracao is
  'Status da procuração para envio/gestão de eventos SST/eSocial.';
