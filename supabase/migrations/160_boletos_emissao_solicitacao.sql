-- Registro de que a equipe já solicitou a emissão dos boletos da Gestão SST mensal.
-- Não preenche contratações antigas e não representa emissão nem pagamento.
-- A liberação das etapas seguintes usa este registro; a baixa das parcelas continua em pago_em.

alter table public.orcamento_aprovacoes
  add column if not exists boletos_emissao_solicitada boolean null,
  add column if not exists boletos_emissao_solicitada_em date null;

alter table public.orcamento_aprovacoes
  drop constraint if exists orcamento_aprovacoes_boletos_emissao_ck;

alter table public.orcamento_aprovacoes
  add constraint orcamento_aprovacoes_boletos_emissao_ck
  check (
    boletos_emissao_solicitada is distinct from true
    or boletos_emissao_solicitada_em is not null
  );

comment on column public.orcamento_aprovacoes.boletos_emissao_solicitada is
  'A equipe marcou que já solicitou a emissão dos boletos. Null nas contratações anteriores a este registro. Não indica que o boleto foi emitido ou pago.';

comment on column public.orcamento_aprovacoes.boletos_emissao_solicitada_em is
  'Data da solicitação de emissão dos boletos. Obrigatória quando a solicitação está marcada. Não é data de emissão nem de pagamento.';
