-- Renovação da Gestão SST mensal, gravada na contratação.
-- true = automática; false = sem renovação automática; null = sem evidência.
-- Não classifica contrato pontual nem registro antigo sem orçamento mensal.
-- Não reescreve PDF já gerado.

alter table public.orcamento_aprovacoes
  add column if not exists mensalidade_renovacao_automatica boolean null;

comment on column public.orcamento_aprovacoes.mensalidade_renovacao_automatica is
  'Renovação da Gestão SST mensal nesta contratação. true = automática; false = sem renovação automática; null = sem evidência. Não é inferida por parcelas, forma de pagamento ou modalidade na tela.';

-- Contratos mensais já emitidos só tinham a cláusula de renovação automática.
update public.orcamento_aprovacoes oa
set mensalidade_renovacao_automatica = true
from public.orcamentos o
where o.id = oa.orcamento_id
  and o.modalidade = 'mensalidade'
  and oa.mensalidade_renovacao_automatica is null;

create or replace function public.trg_aprovacao_renovacao_padrao()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.mensalidade_renovacao_automatica is null
     and exists (
       select 1
       from public.orcamentos o
       where o.id = new.orcamento_id
         and o.modalidade = 'mensalidade'
     ) then
    new.mensalidade_renovacao_automatica := true;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_aprovacao_renovacao_padrao
  on public.orcamento_aprovacoes;
create trigger trg_aprovacao_renovacao_padrao
  before insert on public.orcamento_aprovacoes
  for each row
  execute function public.trg_aprovacao_renovacao_padrao();

revoke all on function public.trg_aprovacao_renovacao_padrao() from public;
revoke all on function public.trg_aprovacao_renovacao_padrao() from anon;
grant execute on function public.trg_aprovacao_renovacao_padrao() to authenticated;
grant execute on function public.trg_aprovacao_renovacao_padrao() to service_role;

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
    or new.mensalidade_renovacao_automatica is distinct from old.mensalidade_renovacao_automatica
  ) then
    new.condicoes_revisao := coalesce(old.condicoes_revisao, 1) + 1;
  else
    new.condicoes_revisao := coalesce(old.condicoes_revisao, 1);
  end if;
  return new;
end;
$$;
