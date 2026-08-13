-- Workflow das 6 etapas do módulo Laudos SST.
-- Amplia orcamento_laudos_sst (já 1:1 com orcamentos). Datas manuais em date (sem timezone).

alter table public.orcamento_laudos_sst
  add column if not exists epi_disponibiliza boolean,
  add column if not exists cadastro_realizado boolean,
  add column if not exists cadastro_data date,
  add column if not exists cronograma_elaborado boolean,
  add column if not exists cronograma_data date,
  add column if not exists cronograma_epi_respostas jsonb not null default '{}'::jsonb,
  add column if not exists pgr_realizado boolean,
  add column if not exists pgr_data date,
  add column if not exists pcmso_realizado boolean,
  add column if not exists pcmso_data date,
  add column if not exists ltcat_realizado boolean,
  add column if not exists ltcat_data date,
  add column if not exists enviado_pedro boolean,
  add column if not exists enviado_pedro_em timestamptz,
  add column if not exists aprovacao_pedro boolean,
  add column if not exists aprovacao_pedro_em timestamptz,
  add column if not exists aprovacao_pedro_por uuid,
  add column if not exists aprovacao_pedro_por_nome text,
  add column if not exists enviado_cliente boolean,
  add column if not exists enviado_cliente_email text,
  add column if not exists enviado_cliente_data date;

comment on column public.orcamento_laudos_sst.epi_disponibiliza is
  'Caracterização: empresa disponibiliza EPIs (Sim/Não). Ambos concluem a etapa.';
comment on column public.orcamento_laudos_sst.cronograma_epi_respostas is
  'Respostas extras do cronograma quando EPI=Sim. Chaves definidas no código (ex.: itens_considerados).';
comment on column public.orcamento_laudos_sst.cadastro_data is
  'Data civil do cadastro (YYYY-MM-DD), sem conversão UTC.';
comment on column public.orcamento_laudos_sst.enviado_pedro_em is
  'Timestamp automático ao confirmar envio para validação do Pedro.';
comment on column public.orcamento_laudos_sst.aprovacao_pedro_em is
  'Timestamp da aprovação dos documentos pelo Pedro.';
