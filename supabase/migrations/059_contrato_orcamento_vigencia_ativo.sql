-- Vigência e status contratual dos contratos originados de orçamento.
-- Separação: status contratual (ativo) × financeiro (boleto_pago).
-- Backfill seguro: não altera contratos que já possuem data_inicio e data_fim.
-- Respeita idx_cliente_contratos_um_ativo (encerra ativo anterior antes de ativar).

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

-- DROP necessário: CREATE OR REPLACE não pode renomear parâmetros.
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

-- 1) Preenche vigência sem ativar ainda (evita conflito com índice um_ativo)
update public.cliente_contratos c
set
  data_inicio = (c.contrato_assinado_em at time zone 'America/Sao_Paulo')::date,
  data_fim = public.calcular_fim_vigencia_meses(
    (c.contrato_assinado_em at time zone 'America/Sao_Paulo')::date,
    12
  ),
  tipo_contrato = coalesce(c.tipo_contrato, 'anual'),
  status = case
    when coalesce(c.boleto_pago, false) then 'pago'
    when c.boleto_vencimento is not null then 'aguardando_pagamento'
    else 'assinado'
  end,
  liberado_para_agendamento = coalesce(c.boleto_pago, false),
  updated_at = now()
where c.orcamento_id is not null
  and c.contrato_assinado_em is not null
  and c.status is distinct from 'cancelado'
  and c.status is distinct from 'encerrado'
  and c.status is distinct from 'ativo'
  and (
    c.data_inicio is null
    or c.data_fim is null
  );

-- 2) Ativa contratos de orçamento pagos, um a um, encerrando ativo anterior
do $$
declare
  r record;
begin
  for r in
    select
      c.id,
      c.cliente_id,
      c.data_inicio
    from public.cliente_contratos c
    where c.orcamento_id is not null
      and coalesce(c.boleto_pago, false) = true
      and c.contrato_assinado_em is not null
      and c.data_inicio is not null
      and c.data_fim is not null
      and c.status in ('pago', 'aguardando_pagamento', 'assinado', 'enviado', 'aguardando_envio')
    order by
      coalesce(c.aprovado_em, c.contrato_assinado_em, c.created_at) desc,
      c.created_at desc
  loop
    -- Encerra outro ativo do mesmo cliente (se houver)
    update public.cliente_contratos o
    set
      status = 'encerrado',
      data_fim = coalesce(
        o.data_fim,
        (r.data_inicio - 1)
      ),
      updated_at = now()
    where o.cliente_id = r.cliente_id
      and o.status = 'ativo'
      and o.id is distinct from r.id;

    update public.cliente_contratos c
    set
      status = 'ativo',
      liberado_para_agendamento = true,
      tipo_contrato = coalesce(c.tipo_contrato, 'anual'),
      updated_at = now()
    where c.id = r.id
      and c.status is distinct from 'ativo';
  end loop;
end $$;

-- 3) Recompute disponibilidade dos clientes afetados
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
