-- Correção pontual: ORC-2026-0010 / AFDY ARTIGOS ESPORTIVOS
-- Espelha pagamento/liberação da aprovação no contrato e recomputa disponibilidade.

-- 1) Diagnóstico (só leitura)
select
  o.numero,
  o.cliente_nome,
  a.boleto_pago as aprovacao_boleto_pago,
  a.contrato_assinado,
  c.numero as contrato_numero,
  c.status as contrato_status,
  c.boleto_pago as contrato_boleto_pago,
  c.liberado_para_agendamento
from public.orcamentos o
left join public.orcamento_aprovacoes a on a.orcamento_id = o.id
left join public.cliente_contratos c on c.orcamento_id = o.id
where o.numero = 'ORC-2026-0010';

-- 2) Espelhar aprovação → contrato (não encerrado/cancelado)
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
join public.orcamentos o on o.id = oa.orcamento_id
where oa.orcamento_id = cc.orcamento_id
  and o.numero = 'ORC-2026-0010'
  and cc.status not in ('encerrado', 'cancelado');

-- 3) Recomputar disponibilidade do cliente
select public.recompute_cliente_disponivel_agendamento(c.cliente_id) as disponivel
from public.cliente_contratos c
join public.orcamentos o on o.id = c.orcamento_id
where o.numero = 'ORC-2026-0010'
limit 1;

-- 4) Conferência
select
  o.numero,
  o.cliente_nome,
  a.boleto_pago as aprovacao_boleto_pago,
  c.numero as contrato_numero,
  c.status as contrato_status,
  c.boleto_pago as contrato_boleto_pago,
  c.liberado_para_agendamento,
  cl.disponivel_agendamento
from public.orcamentos o
left join public.orcamento_aprovacoes a on a.orcamento_id = o.id
left join public.cliente_contratos c on c.orcamento_id = o.id
left join public.clientes cl on cl.id = c.cliente_id
where o.numero = 'ORC-2026-0010';
