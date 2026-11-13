-- Valor da renovação do contrato de Gestão SST com administração de plataformas.
-- Congela a mensalidade apurada no início da nova vigência.
-- Não altera a vigência inicial nem a fórmula dos contratos comuns de Gestão SST.

alter table public.orcamento_aprovacoes
  add column if not exists mensalidade_renovacao_valor_centavos integer null,
  add column if not exists mensalidade_renovacao_vigencia_inicio date null,
  add column if not exists mensalidade_plataformas_limite integer null;

alter table public.orcamento_aprovacoes
  drop constraint if exists orcamento_aprovacoes_mensalidade_renovacao_valor_check;
alter table public.orcamento_aprovacoes
  add constraint orcamento_aprovacoes_mensalidade_renovacao_valor_check
  check (
    mensalidade_renovacao_valor_centavos is null
    or mensalidade_renovacao_valor_centavos > 0
  );

alter table public.orcamento_aprovacoes
  drop constraint if exists orcamento_aprovacoes_mensalidade_plataformas_limite_check;
alter table public.orcamento_aprovacoes
  add constraint orcamento_aprovacoes_mensalidade_plataformas_limite_check
  check (
    mensalidade_plataformas_limite is null
    or mensalidade_plataformas_limite > 0
  );

comment on column public.orcamento_aprovacoes.mensalidade_renovacao_valor_centavos is
  'Mensalidade apurada para a vigência renovada de Gestão SST com plataformas, em centavos. Não é o valor da vigência inicial nem a fórmula comum de Gestão SST.';
comment on column public.orcamento_aprovacoes.mensalidade_renovacao_vigencia_inicio is
  'Início da vigência à qual o valor de renovação gravado se refere. Outra vigência é calculada de novo.';
comment on column public.orcamento_aprovacoes.mensalidade_plataformas_limite is
  'Limite de plataformas acordado para a renovação. A quantidade em uso não reduz a mensalidade.';
