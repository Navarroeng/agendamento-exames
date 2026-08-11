-- Cancelamento lógico de campanha de Riscos Psicossociais.
-- Preserva dados; status cancelada sai das campanhas ativas.

alter table public.riscos_campanhas
  drop constraint if exists riscos_campanhas_status_check;

alter table public.riscos_campanhas
  add constraint riscos_campanhas_status_check
  check (status in ('em_preparacao', 'aberta', 'encerrada', 'cancelada'));

alter table public.riscos_campanhas
  add column if not exists cancelada_em timestamptz null;

alter table public.riscos_campanhas
  add column if not exists cancelada_por text null;

alter table public.riscos_campanhas
  add column if not exists motivo_cancelamento text null;

comment on column public.riscos_campanhas.status is
  'em_preparacao | aberta | encerrada | cancelada';
comment on column public.riscos_campanhas.cancelada_em is
  'Momento do cancelamento lógico do processo (sem exclusão física).';
comment on column public.riscos_campanhas.cancelada_por is
  'Usuário administrativo que cancelou o processo.';
comment on column public.riscos_campanhas.motivo_cancelamento is
  'Motivo obrigatório informado no cancelamento.';
