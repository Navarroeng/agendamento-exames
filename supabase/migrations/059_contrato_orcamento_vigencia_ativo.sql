-- Vigência e status contratual dos contratos originados de orçamento.
-- Separação: status contratual (ativo) ≠ financeiro (boleto_pago).
-- Backfill seguro: não altera contratos que já possuem data_inicio e data_fim.

create or replace function public.calcular_fim_vigencia_meses(
  p_inicio date,
  p_meses integer default 12
)
returns date
language sql
immutable
as $$
  select (p_inicio + make_interval(months => greatest(coalesce(p_meses, 12), 1)))::date;
$$;

comment on function public.calcular_fim_vigencia_meses(date, integer) is
  'Fim da vigência por meses de calendário (padrão 12).';

-- Espelha a regra TS: assinado+pago → ativo (não usa mais "pago" como status principal).
-- DROP necessário: CREATE OR REPLACE não pode renomear parâmetros (p_enviado → p_contrato_enviado).
drop function if exists public.resolve_status_contrato_from_aprovacao(boolean, boolean, boolean, date);

create function public.resolve_status_contrato_from_aprovacao(
  p_enviado boolean,
  p_assinado boolean,
  p_pago boolean,
  p_boleto_vencimento date
)
returns text
language plpgsql
immutable
as $$
begin
  -- Assinado + pago → status contratual ativo (financeiro continua em boleto_pago).
  if coalesce(p_pago, false) and coalesce(p_assinado, false) then
    return 'ativo';
  end if;
  if coalesce(p_assinado, false) then
    if p_boleto_vencimento is not null then
      return 'aguardando_pagamento';
    end if;
    return 'assinado';
  end if;
  if coalesce(p_enviado, false) then
    return 'enviado';
  end if;
  return 'aguardando_envio';
end;
$$;

-- Backfill: assinados sem vigência completa
with alvo as (
  select
    c.id,
    c.cliente_id,
    c.status,
    c.boleto_pago,
    c.contrato_assinado_em,
    (c.contrato_assinado_em at time zone 'America/Sao_Paulo')::date as data_assinatura
  from public.cliente_contratos c
  where c.orcamento_id is not null
    and c.contrato_assinado_em is not null
    and c.status is distinct from 'cancelado'
    and c.status is distinct from 'encerrado'
    and (
      c.data_inicio is null
      or nullif(btrim(c.data_inicio::text), '') is null
      or c.data_fim is null
    )
)
update public.cliente_contratos c
set
  data_inicio = a.data_assinatura,
  data_fim = public.calcular_fim_vigencia_meses(a.data_assinatura, 12),
  tipo_contrato = coalesce(c.tipo_contrato, 'anual'),
  status = case
    when coalesce(c.boleto_pago, false) then 'ativo'::text
    when c.status in ('pago', 'aguardando_pagamento', 'assinado', 'enviado', 'aguardando_envio')
      then case
        when coalesce(c.boleto_pago, false) then 'ativo'
        when c.boleto_vencimento is not null then 'aguardando_pagamento'
        else 'assinado'
      end
    else c.status
  end,
  liberado_para_agendamento = coalesce(c.boleto_pago, false),
  updated_at = now()
from alvo a
where c.id = a.id;

-- Contratos já com vigência, mas status ainda "pago" e boleto pago → ativo
update public.cliente_contratos c
set
  status = 'ativo',
  liberado_para_agendamento = true,
  tipo_contrato = coalesce(c.tipo_contrato, 'anual'),
  updated_at = now()
where c.orcamento_id is not null
  and c.status = 'pago'
  and coalesce(c.boleto_pago, false) = true
  and c.data_inicio is not null
  and c.data_fim is not null
  and c.status is distinct from 'cancelado'
  and c.status is distinct from 'encerrado';

-- Recompute disponibilidade dos clientes afetados
do $$
declare
  r record;
begin
  for r in
    select distinct cliente_id
    from public.cliente_contratos
    where orcamento_id is not null
      and status = 'ativo'
  loop
    begin
      perform public.recompute_cliente_disponivel_agendamento(r.cliente_id);
    exception
      when others then
        raise notice 'recompute falhou para %: %', r.cliente_id, sqlerrm;
    end;
  end loop;
end $$;
