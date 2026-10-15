-- Contrato atual da Gestão SST mensal.
-- Diagnóstico primeiro. A alteração só alcança o contrato que já está
-- assinado, com vigência real em curso e cobrança mês a mês, sem marcar
-- pagamento. Não escolhe o último orçamento do cliente e não mexe em
-- datas, valor, número ou vínculo do contrato anterior.
--
-- Caso de conferência: JET SERVICE BOMBAS, CNPJ 45.724.418/0001-80.

-- 1) Diagnóstico
select
  c.id as cliente_id,
  c.nome,
  c.cnpj,
  cc.id as contrato_id,
  cc.numero,
  cc.status,
  cc.tipo_contrato,
  cc.data_inicio,
  cc.data_fim,
  cc.valor_contrato,
  cc.condicao_pagamento,
  cc.boleto_pago,
  cc.contrato_assinado_em,
  cc.aprovado_em,
  cc.orcamento_id,
  cc.numero_orcamento,
  o.modalidade,
  a.mensalidade_pagamento,
  a.mensalidade_dia_vencimento,
  a.contrato_assinado,
  (
    select count(*)
    from public.orcamento_mensalidade_parcelas p
    where p.aprovacao_id = a.id
      and p.pago_em is not null
  ) as parcelas_pagas
from public.clientes c
join public.cliente_contratos cc on cc.cliente_id = c.id
left join public.orcamentos o on o.id = cc.orcamento_id
left join public.orcamento_aprovacoes a on a.orcamento_id = cc.orcamento_id
where regexp_replace(coalesce(c.cnpj, ''), '[^0-9]', '', 'g') = '45724418000180'
   or cc.numero = 'CTR-2026-0043'
   or cc.numero_orcamento = 'ORC-2026-0075'
order by cc.data_inicio desc nulls last, cc.created_at desc;

-- 2) Prévia do que a correção alteraria, sem gravar.
with candidatos as (
  select
    cc.id as contrato_id,
    cc.cliente_id,
    cc.numero,
    cc.data_inicio,
    cc.data_fim
  from public.cliente_contratos cc
  join public.orcamentos o on o.id = cc.orcamento_id
  join public.orcamento_aprovacoes a on a.orcamento_id = cc.orcamento_id
  where cc.status in ('aguardando_pagamento', 'assinado')
    and cc.encerrado_em is null
    and coalesce(a.contrato_assinado, false)
    and cc.contrato_assinado_em is not null
    and cc.data_inicio is not null
    and cc.data_fim is not null
    and cc.data_fim > cc.data_inicio
    and current_date >= cc.data_inicio
    and current_date <= cc.data_fim
    and o.modalidade = 'mensalidade'
    and coalesce(a.mensalidade_pagamento, 'mensal') <> 'avista'
    and coalesce(cc.boleto_pago, false) = false
)
select
  'promover' as acao,
  novo.contrato_id,
  novo.numero,
  novo.data_inicio,
  novo.data_fim
from candidatos novo
union all
select
  'encerrar_status' as acao,
  antigo.id,
  antigo.numero,
  antigo.data_inicio,
  antigo.data_fim
from public.cliente_contratos antigo
join candidatos novo on novo.cliente_id = antigo.cliente_id
where antigo.status = 'ativo'
  and antigo.id <> novo.contrato_id
  and antigo.data_fim is not null
  and antigo.data_fim < current_date;

-- 3) Aplicar somente depois de conferir a prévia.
-- São dois comandos de propósito: o índice de um único contrato ativo
-- não vê o encerramento se ele ocorrer na mesma sentença.
-- Não quita parcela e não altera datas, valor ou vínculo do contrato antigo.
/*
begin;

create temporary table contrato_mensal_promover as
select cc.id as contrato_id, cc.cliente_id
from public.cliente_contratos cc
join public.orcamentos o on o.id = cc.orcamento_id
join public.orcamento_aprovacoes a on a.orcamento_id = cc.orcamento_id
where cc.status in ('aguardando_pagamento', 'assinado')
  and cc.encerrado_em is null
  and coalesce(a.contrato_assinado, false)
  and cc.contrato_assinado_em is not null
  and cc.data_inicio is not null
  and cc.data_fim is not null
  and cc.data_fim > cc.data_inicio
  and current_date >= cc.data_inicio
  and current_date <= cc.data_fim
  and o.modalidade = 'mensalidade'
  and coalesce(a.mensalidade_pagamento, 'mensal') <> 'avista'
  and coalesce(cc.boleto_pago, false) = false
  and not exists (
    select 1
    from public.cliente_contratos vigente
    where vigente.cliente_id = cc.cliente_id
      and vigente.status = 'ativo'
      and vigente.id <> cc.id
      and vigente.data_fim is not null
      and vigente.data_fim >= current_date
  );

update public.cliente_contratos antigo
set
  status = 'encerrado',
  encerrado_em = coalesce(antigo.encerrado_em, now()),
  updated_at = now()
from contrato_mensal_promover novo
where antigo.cliente_id = novo.cliente_id
  and antigo.status = 'ativo'
  and antigo.id <> novo.contrato_id
  and antigo.data_fim is not null
  and antigo.data_fim < current_date;

update public.cliente_contratos cc
set
  status = 'ativo',
  tipo_contrato = 'mensal',
  liberado_para_agendamento = false,
  updated_at = now()
from contrato_mensal_promover novo
where cc.id = novo.contrato_id
  and coalesce(cc.boleto_pago, false) = false;

commit;
*/
