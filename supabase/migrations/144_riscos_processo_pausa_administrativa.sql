-- Pausa administrativa do processo de Riscos Psicossociais (listagem).
-- Sem retorno / Adiado pelo cliente: overlay de controle interno.
-- NÃO altera status operacional (em_andamento | concluido | cancelado),
-- etapas, campanha, questionário COPSOQ, cálculo ou geração de relatório.
-- Não significa avaliação realizada nem dispensa de obrigações de SST.

-- 1) Tracking automático (orçamento)
alter table public.orcamento_riscos_psicossociais
  add column if not exists pausa_situacao text null;

alter table public.orcamento_riscos_psicossociais
  drop constraint if exists orcamento_riscos_psicossociais_pausa_situacao_check;

alter table public.orcamento_riscos_psicossociais
  add constraint orcamento_riscos_psicossociais_pausa_situacao_check
  check (
    pausa_situacao is null
    or pausa_situacao in ('sem_retorno', 'adiado_cliente')
  );

alter table public.orcamento_riscos_psicossociais
  add column if not exists pausa_em timestamptz null;

alter table public.orcamento_riscos_psicossociais
  add column if not exists pausa_por text null;

alter table public.orcamento_riscos_psicossociais
  add column if not exists pausa_observacao text null;

comment on column public.orcamento_riscos_psicossociais.pausa_situacao is
  'Overlay administrativo: sem_retorno | adiado_cliente. Null = fluxo operacional normal. Não altera status, etapas nem COPSOQ.';
comment on column public.orcamento_riscos_psicossociais.pausa_em is
  'Momento do registro da pausa administrativa.';
comment on column public.orcamento_riscos_psicossociais.pausa_por is
  'Usuário que registrou a pausa.';
comment on column public.orcamento_riscos_psicossociais.pausa_observacao is
  'Observação opcional da pausa administrativa.';

-- 2) Tracking de inclusão manual (fluxo da campanha)
alter table public.riscos_campanha_fluxo
  add column if not exists pausa_situacao text null;

alter table public.riscos_campanha_fluxo
  drop constraint if exists riscos_campanha_fluxo_pausa_situacao_check;

alter table public.riscos_campanha_fluxo
  add constraint riscos_campanha_fluxo_pausa_situacao_check
  check (
    pausa_situacao is null
    or pausa_situacao in ('sem_retorno', 'adiado_cliente')
  );

alter table public.riscos_campanha_fluxo
  add column if not exists pausa_em timestamptz null;

alter table public.riscos_campanha_fluxo
  add column if not exists pausa_por text null;

alter table public.riscos_campanha_fluxo
  add column if not exists pausa_observacao text null;

comment on column public.riscos_campanha_fluxo.pausa_situacao is
  'Overlay administrativo: sem_retorno | adiado_cliente. Null = fluxo operacional normal.';
comment on column public.riscos_campanha_fluxo.pausa_em is
  'Momento do registro da pausa administrativa (processo manual).';
comment on column public.riscos_campanha_fluxo.pausa_por is
  'Usuário que registrou a pausa.';
comment on column public.riscos_campanha_fluxo.pausa_observacao is
  'Observação opcional da pausa administrativa.';
