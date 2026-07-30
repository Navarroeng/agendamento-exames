-- 066: Corrige sync financeiro → contrato (AFDY + backfill seguro)
-- Causa: ao marcar status=ativo com outro contrato ativo do mesmo cliente,
-- o UPDATE inteiro falhava (idx_cliente_contratos_um_ativo) e boleto_pago
-- não era espelhado — Financeiro Pago na aprovação, histórico "Aguardando vencimento",
-- Implantação Bloqueado.

-- ---------------------------------------------------------------------------
-- A) Diagnóstico AFDY / ORC-2026-0010 / CTR-2026-0005
-- ---------------------------------------------------------------------------
select
  o.numero as orcamento,
  o.cliente_nome,
  a.boleto_pago as apr_boleto_pago,
  a.boleto_pago_em as apr_boleto_pago_em,
  a.contrato_assinado,
  c.numero as contrato,
  c.status as contrato_status,
  c.boleto_pago as ctr_boleto_pago,
  c.liberado_para_agendamento,
  c.data_inicio,
  c.data_fim
from public.orcamentos o
left join public.orcamento_aprovacoes a on a.orcamento_id = o.id
left join public.cliente_contratos c on c.orcamento_id = o.id
where o.numero = 'ORC-2026-0010'
   or c.numero = 'CTR-2026-0005';

-- Casos inconsistentes (listagem antes do backfill)
select
  o.numero as orcamento,
  c.numero as contrato,
  c.status,
  a.boleto_pago as apr_pago,
  c.boleto_pago as ctr_pago,
  c.liberado_para_agendamento
from public.cliente_contratos c
join public.orcamento_aprovacoes a on a.orcamento_id = c.orcamento_id
join public.orcamentos o on o.id = c.orcamento_id
where c.orcamento_id is not null
  and c.status not in ('encerrado', 'cancelado')
  and coalesce(a.boleto_pago, false) = true
  and (
    coalesce(c.boleto_pago, false) = false
    or coalesce(c.liberado_para_agendamento, false) = false
    or (
      coalesce(a.contrato_assinado, false) = true
      and c.status is distinct from 'ativo'
    )
  );

-- ---------------------------------------------------------------------------
-- B) Correção pontual AFDY: encerrar outro ativo, depois espelhar CTR-2026-0005
-- ---------------------------------------------------------------------------
do $$
declare
  v_cliente_id uuid;
  v_contrato_id uuid;
  v_inicio date;
begin
  select c.id, c.cliente_id, c.data_inicio
    into v_contrato_id, v_cliente_id, v_inicio
  from public.cliente_contratos c
  join public.orcamentos o on o.id = c.orcamento_id
  where o.numero = 'ORC-2026-0010'
    and c.status not in ('encerrado', 'cancelado')
  order by c.created_at desc
  limit 1;

  if v_contrato_id is null then
    select c.id, c.cliente_id, c.data_inicio
      into v_contrato_id, v_cliente_id, v_inicio
    from public.cliente_contratos c
    where c.numero = 'CTR-2026-0005'
      and c.status not in ('encerrado', 'cancelado')
    limit 1;
  end if;

  if v_contrato_id is null or v_cliente_id is null then
    raise notice 'AFDY: contrato alvo não encontrado — pulando correção pontual.';
    return;
  end if;

  -- Encerrar outros ativos do mesmo cliente
  update public.cliente_contratos o
  set
    status = 'encerrado',
    data_fim = coalesce(
      o.data_fim,
      case when v_inicio is not null then v_inicio - 1 else current_date end
    ),
    updated_at = now()
  where o.cliente_id = v_cliente_id
    and o.status = 'ativo'
    and o.id is distinct from v_contrato_id;

  -- Espelhar aprovação → contrato (preserva data_inicio/data_fim existentes)
  update public.cliente_contratos cc
  set
    boleto_pago = coalesce(oa.boleto_pago, false),
    boleto_pago_em = coalesce(oa.boleto_pago_em, cc.boleto_pago_em),
    boleto_vencimento = coalesce(oa.boleto_vencimento, cc.boleto_vencimento),
    contrato_assinado_em = coalesce(oa.contrato_assinado_em, cc.contrato_assinado_em),
    contrato_enviado_em = coalesce(oa.contrato_enviado_em, cc.contrato_enviado_em),
    liberado_para_agendamento =
      (coalesce(oa.boleto_pago, false) and coalesce(oa.contrato_assinado, false)),
    status = case
      when coalesce(oa.boleto_pago, false) and coalesce(oa.contrato_assinado, false)
        then 'ativo'
      when coalesce(oa.contrato_assinado, false) and oa.boleto_vencimento is not null
        then 'aguardando_pagamento'
      when coalesce(oa.contrato_assinado, false)
        then 'assinado'
      when coalesce(oa.contrato_enviado, false)
        then 'enviado'
      else cc.status
    end,
    updated_at = now()
  from public.orcamento_aprovacoes oa
  where oa.orcamento_id = cc.orcamento_id
    and cc.id = v_contrato_id;

  perform public.recompute_cliente_disponivel_agendamento(v_cliente_id);
  raise notice 'AFDY: contrato % sincronizado para cliente %', v_contrato_id, v_cliente_id;
end $$;

-- ---------------------------------------------------------------------------
-- C) Backfill seguro (demais inconsistentes): financeiro pago na aprovação
--     mas não espelhado / não ativo. Não altera encerrado/cancelado.
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
  v_inicio date;
begin
  for r in
    select
      c.id as contrato_id,
      c.cliente_id,
      c.data_inicio,
      a.boleto_pago,
      a.boleto_pago_em,
      a.boleto_vencimento,
      a.contrato_assinado,
      a.contrato_assinado_em,
      a.contrato_enviado,
      a.contrato_enviado_em
    from public.cliente_contratos c
    join public.orcamento_aprovacoes a on a.orcamento_id = c.orcamento_id
    where c.orcamento_id is not null
      and c.status not in ('encerrado', 'cancelado')
      and coalesce(a.boleto_pago, false) = true
      and coalesce(a.contrato_assinado, false) = true
      and (
        coalesce(c.boleto_pago, false) = false
        or coalesce(c.liberado_para_agendamento, false) = false
        or c.status is distinct from 'ativo'
      )
  loop
    v_inicio := r.data_inicio;

    update public.cliente_contratos o
    set
      status = 'encerrado',
      data_fim = coalesce(
        o.data_fim,
        case when v_inicio is not null then v_inicio - 1 else current_date end
      ),
      updated_at = now()
    where o.cliente_id = r.cliente_id
      and o.status = 'ativo'
      and o.id is distinct from r.contrato_id;

    update public.cliente_contratos cc
    set
      boleto_pago = true,
      boleto_pago_em = coalesce(r.boleto_pago_em, cc.boleto_pago_em),
      boleto_vencimento = coalesce(r.boleto_vencimento, cc.boleto_vencimento),
      contrato_assinado_em = coalesce(r.contrato_assinado_em, cc.contrato_assinado_em),
      contrato_enviado_em = coalesce(r.contrato_enviado_em, cc.contrato_enviado_em),
      liberado_para_agendamento = true,
      status = 'ativo',
      updated_at = now()
    where cc.id = r.contrato_id;

    perform public.recompute_cliente_disponivel_agendamento(r.cliente_id);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- D) Conferência AFDY
-- ---------------------------------------------------------------------------
select
  o.numero as orcamento,
  c.numero as contrato,
  c.status,
  a.boleto_pago as apr_pago,
  c.boleto_pago as ctr_pago,
  c.liberado_para_agendamento,
  cl.disponivel_agendamento
from public.orcamentos o
left join public.orcamento_aprovacoes a on a.orcamento_id = o.id
left join public.cliente_contratos c on c.orcamento_id = o.id
left join public.clientes cl on cl.id = c.cliente_id
where o.numero = 'ORC-2026-0010'
   or c.numero = 'CTR-2026-0005';
