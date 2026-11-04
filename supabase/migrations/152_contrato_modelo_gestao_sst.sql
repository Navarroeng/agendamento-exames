-- Modelo novo da Gestão SST e vencimento da mensalidade no 5º dia útil.
-- Contratos já gravados permanecem no modelo 1.
-- Não regrava PDF, cobertura, parcela nem dia 10/20 já contratado.
-- O 5º dia útil não é o dia 05: a coluna de dia continua só 10, 20 ou nula.

alter table public.orcamento_aprovacoes
  add column if not exists contrato_modelo_versao smallint not null default 1;

alter table public.orcamento_aprovacoes
  drop constraint if exists orcamento_aprovacoes_contrato_modelo_versao_check;
alter table public.orcamento_aprovacoes
  add constraint orcamento_aprovacoes_contrato_modelo_versao_check
  check (contrato_modelo_versao in (1, 2));

alter table public.orcamento_aprovacoes
  add column if not exists mensalidade_vencimento_regra text null;

alter table public.orcamento_aprovacoes
  drop constraint if exists orcamento_aprovacoes_mensalidade_vencimento_regra_check;
alter table public.orcamento_aprovacoes
  add constraint orcamento_aprovacoes_mensalidade_vencimento_regra_check
  check (
    mensalidade_vencimento_regra is null
    or (
      mensalidade_vencimento_regra = 'quinto_dia_util'
      and mensalidade_dia_vencimento is null
    )
  );

comment on column public.orcamento_aprovacoes.contrato_modelo_versao is
  '1 = condições anteriores da Gestão SST. 2 = condições novas copiadas da proposta. Não reescreve contrato antigo nem promove renovação.';
comment on column public.orcamento_aprovacoes.mensalidade_vencimento_regra is
  'quinto_dia_util = mensalidade no 5º dia útil do mês, com dia de vencimento nulo. Não é o dia 05. Null mantém dia 10 ou 20.';

-- Não promove aprovação nova para a versão 2.
-- A versão acompanha a proposta (migration 153). Renovação que não
-- reinsere a aprovação permanece na versão já gravada.
create or replace function public.trg_aprovacao_modelo_gestao_sst()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  modalidade text;
  versao_proposta smallint;
begin
  select o.modalidade, o.proposta_modelo_versao
    into modalidade, versao_proposta
  from public.orcamentos o
  where o.id = new.orcamento_id;

  if modalidade = 'mensalidade' then
    new.contrato_modelo_versao := case when versao_proposta = 2 then 2 else 1 end;
  end if;
  return new;
exception
  when undefined_column then
    return new;
end;
$$;

drop trigger if exists trg_aprovacao_modelo_gestao_sst
  on public.orcamento_aprovacoes;
create trigger trg_aprovacao_modelo_gestao_sst
  before insert on public.orcamento_aprovacoes
  for each row
  execute function public.trg_aprovacao_modelo_gestao_sst();

revoke all on function public.trg_aprovacao_modelo_gestao_sst() from public;
revoke all on function public.trg_aprovacao_modelo_gestao_sst() from anon;
grant execute on function public.trg_aprovacao_modelo_gestao_sst() to authenticated;
grant execute on function public.trg_aprovacao_modelo_gestao_sst() to service_role;

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
    or new.mensalidade_vencimento_regra is distinct from old.mensalidade_vencimento_regra
    or new.mensalidade_renovacao_base_centavos is distinct from old.mensalidade_renovacao_base_centavos
    or new.mensalidade_renovacao_incremento_centavos is distinct from old.mensalidade_renovacao_incremento_centavos
    or new.mensalidade_exame_avulso_centavos is distinct from old.mensalidade_exame_avulso_centavos
    or new.mensalidade_exame_demissional_centavos is distinct from old.mensalidade_exame_demissional_centavos
    or new.mensalidade_renovacao_automatica is distinct from old.mensalidade_renovacao_automatica
  ) then
    new.condicoes_revisao := coalesce(old.condicoes_revisao, 1) + 1;
  else
    new.condicoes_revisao := coalesce(old.condicoes_revisao, 1);
  end if;
  return new;
end;
$$;
