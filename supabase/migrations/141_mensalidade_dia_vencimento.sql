-- Dia de vencimento das mensalidades da Gestão SST (10 ou 20) e
-- parâmetros comerciais congelados na contratação.
-- Não preenche contratos antigos.

alter table public.orcamento_aprovacoes
  add column if not exists mensalidade_dia_vencimento smallint null,
  add column if not exists mensalidade_renovacao_base_centavos integer null,
  add column if not exists mensalidade_renovacao_incremento_centavos integer null,
  add column if not exists mensalidade_exame_avulso_centavos integer null,
  add column if not exists mensalidade_exame_demissional_centavos integer null;

alter table public.orcamento_aprovacoes
  drop constraint if exists orcamento_aprovacoes_mensalidade_dia_vencimento_check;
alter table public.orcamento_aprovacoes
  add constraint orcamento_aprovacoes_mensalidade_dia_vencimento_check
  check (
    mensalidade_dia_vencimento is null
    or mensalidade_dia_vencimento in (10, 20)
  );

alter table public.orcamento_aprovacoes
  drop constraint if exists orcamento_aprovacoes_mensalidade_renovacao_base_check;
alter table public.orcamento_aprovacoes
  add constraint orcamento_aprovacoes_mensalidade_renovacao_base_check
  check (
    mensalidade_renovacao_base_centavos is null
    or mensalidade_renovacao_base_centavos > 0
  );

alter table public.orcamento_aprovacoes
  drop constraint if exists orcamento_aprovacoes_mensalidade_renovacao_incremento_check;
alter table public.orcamento_aprovacoes
  add constraint orcamento_aprovacoes_mensalidade_renovacao_incremento_check
  check (
    mensalidade_renovacao_incremento_centavos is null
    or mensalidade_renovacao_incremento_centavos > 0
  );

alter table public.orcamento_aprovacoes
  drop constraint if exists orcamento_aprovacoes_mensalidade_exame_avulso_check;
alter table public.orcamento_aprovacoes
  add constraint orcamento_aprovacoes_mensalidade_exame_avulso_check
  check (
    mensalidade_exame_avulso_centavos is null
    or mensalidade_exame_avulso_centavos > 0
  );

alter table public.orcamento_aprovacoes
  drop constraint if exists orcamento_aprovacoes_mensalidade_exame_demissional_check;
alter table public.orcamento_aprovacoes
  add constraint orcamento_aprovacoes_mensalidade_exame_demissional_check
  check (
    mensalidade_exame_demissional_centavos is null
    or mensalidade_exame_demissional_centavos > 0
  );

comment on column public.orcamento_aprovacoes.mensalidade_dia_vencimento is
  'Dia 10 ou 20 das mensalidades do plano e das renovações. Não é o prazo do pagamento antecipado nem o vencimento das faturas de exames. Null em contratos antigos.';
comment on column public.orcamento_aprovacoes.mensalidade_renovacao_base_centavos is
  'Base da fórmula de renovação da Gestão SST mensal, em centavos, congelada nesta contratação.';
comment on column public.orcamento_aprovacoes.mensalidade_renovacao_incremento_centavos is
  'Acréscimo mensal por colaborador a partir do segundo, em centavos, congelado nesta contratação.';
comment on column public.orcamento_aprovacoes.mensalidade_exame_avulso_centavos is
  'Preço do exame clínico avulso admissional, em centavos, congelado nesta contratação.';
comment on column public.orcamento_aprovacoes.mensalidade_exame_demissional_centavos is
  'Preço do exame clínico avulso demissional, em centavos, congelado nesta contratação.';

create or replace function public.trg_aprovacao_condicoes_revisao()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (
    new.quantidade_colaboradores is distinct from old.quantidade_colaboradores
    or new.valor_final is distinct from old.valor_final
    or new.condicao_pagamento is distinct from old.condicao_pagamento
    or new.quantidade_parcelas is distinct from old.quantidade_parcelas
    or new.valor_parcela is distinct from old.valor_parcela
    or new.desconto_percentual is distinct from old.desconto_percentual
    or new.valor_avista is distinct from old.valor_avista
    or new.observacoes is distinct from old.observacoes
    or new.mensalidade_pagamento is distinct from old.mensalidade_pagamento
    or new.mensalidade_valor_mensal is distinct from old.mensalidade_valor_mensal
    or new.mensalidade_meses is distinct from old.mensalidade_meses
    or new.mensalidade_valor_bruto is distinct from old.mensalidade_valor_bruto
    or new.mensalidade_valor_pontual is distinct from old.mensalidade_valor_pontual
    or new.mensalidade_desconto_valor is distinct from old.mensalidade_desconto_valor
    or new.mensalidade_desconto_tipo is distinct from old.mensalidade_desconto_tipo
    or new.mensalidade_vencimento is distinct from old.mensalidade_vencimento
    or new.mensalidade_dia_vencimento is distinct from old.mensalidade_dia_vencimento
    or new.mensalidade_renovacao_base_centavos is distinct from old.mensalidade_renovacao_base_centavos
    or new.mensalidade_renovacao_incremento_centavos is distinct from old.mensalidade_renovacao_incremento_centavos
    or new.mensalidade_exame_avulso_centavos is distinct from old.mensalidade_exame_avulso_centavos
    or new.mensalidade_exame_demissional_centavos is distinct from old.mensalidade_exame_demissional_centavos
  ) then
    new.condicoes_revisao := coalesce(old.condicoes_revisao, 1) + 1;
  else
    new.condicoes_revisao := coalesce(old.condicoes_revisao, 1);
  end if;
  return new;
end;
$$;
