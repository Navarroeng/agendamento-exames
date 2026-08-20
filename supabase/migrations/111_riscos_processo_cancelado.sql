-- Cancelamento lógico do processo de Riscos Psicossociais (listagem).
-- Preserva tracking, campanha, participantes, anexos, relatório e auditoria.
-- status = cancelado prevalece sobre o sincronismo (não recria / não reativa).

-- 1) Tracking automático (orçamento)
alter table public.orcamento_riscos_psicossociais
  drop constraint if exists orcamento_riscos_psicossociais_status_check;

alter table public.orcamento_riscos_psicossociais
  add constraint orcamento_riscos_psicossociais_status_check
  check (status in ('em_andamento', 'concluido', 'cancelado'));

alter table public.orcamento_riscos_psicossociais
  add column if not exists cancelado_em timestamptz null;

alter table public.orcamento_riscos_psicossociais
  add column if not exists cancelado_por text null;

alter table public.orcamento_riscos_psicossociais
  add column if not exists motivo_cancelamento text null;

comment on column public.orcamento_riscos_psicossociais.status is
  'em_andamento | concluido | cancelado. Cancelado é histórico: não exclui dados e não é recriado pelo sincronismo.';
comment on column public.orcamento_riscos_psicossociais.cancelado_em is
  'Momento do cancelamento lógico do processo (sem exclusão física).';
comment on column public.orcamento_riscos_psicossociais.cancelado_por is
  'Usuário que cancelou o processo.';
comment on column public.orcamento_riscos_psicossociais.motivo_cancelamento is
  'Motivo obrigatório informado no cancelamento.';

-- 2) Tracking de inclusão manual (fluxo da campanha)
alter table public.riscos_campanha_fluxo
  drop constraint if exists riscos_campanha_fluxo_status_check;

alter table public.riscos_campanha_fluxo
  add constraint riscos_campanha_fluxo_status_check
  check (status in ('em_andamento', 'concluido', 'cancelado'));

alter table public.riscos_campanha_fluxo
  add column if not exists cancelado_em timestamptz null;

alter table public.riscos_campanha_fluxo
  add column if not exists cancelado_por text null;

alter table public.riscos_campanha_fluxo
  add column if not exists motivo_cancelamento text null;

comment on column public.riscos_campanha_fluxo.status is
  'em_andamento | concluido | cancelado. Cancelado é histórico: não exclui dados.';
comment on column public.riscos_campanha_fluxo.cancelado_em is
  'Momento do cancelamento lógico do processo manual (sem exclusão física).';
comment on column public.riscos_campanha_fluxo.cancelado_por is
  'Usuário que cancelou o processo.';
comment on column public.riscos_campanha_fluxo.motivo_cancelamento is
  'Motivo obrigatório informado no cancelamento.';
