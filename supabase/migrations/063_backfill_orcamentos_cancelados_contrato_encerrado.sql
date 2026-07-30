-- Backfill seguro: orçamentos cancelados ANTES do fluxo de encerramento
-- (ex.: ORC-2026-0002) cujo contrato vinculado ainda não está Encerrado.
--
-- NÃO altera a regra de novos cancelamentos.
-- Idempotente: pode reexecutar sem efeito colateral.
--
-- Pré-visualização (rode no SQL Editor antes, se quiser listar):
--
-- select
--   o.numero as orcamento,
--   o.status as orcamento_status,
--   o.cancelado_em,
--   o.cancelado_por,
--   o.motivo_cancelamento,
--   c.numero as contrato,
--   c.status as contrato_status,
--   c.encerrado_em,
--   c.liberado_para_agendamento
-- from public.orcamentos o
-- join public.cliente_contratos c on c.orcamento_id = o.id
-- where o.status = 'cancelado'
--   and c.status is distinct from 'encerrado'
--   and c.encerrado_em is null
-- order by o.numero;

-- 1) Encerrar contratos vinculados a orçamentos já cancelados.
update public.cliente_contratos c
set
  status = 'encerrado',
  encerrado_em = coalesce(o.cancelado_em, c.updated_at, now()),
  encerrado_por = coalesce(
    nullif(trim(o.cancelado_por), ''),
    nullif(trim(c.encerrado_por), ''),
    'SISTEMA'
  ),
  motivo_encerramento = coalesce(
    nullif(trim(c.motivo_encerramento), ''),
    nullif(trim(o.motivo_cancelamento), ''),
    nullif(trim(o.observacao_cancelamento), ''),
    'Regularização: orçamento cancelado antes do fluxo de encerramento de contrato.'
  ),
  liberado_para_agendamento = false,
  updated_at = now()
from public.orcamentos o
where c.orcamento_id = o.id
  and o.status = 'cancelado'
  and c.status is distinct from 'encerrado'
  and c.encerrado_em is null;

-- 2) Alinhar status do orçamento para contrato_encerrado (mesma exibição
--    do fluxo novo nas telas Orçamentos / Implantação), sem apagar histórico.
update public.orcamentos o
set
  status = 'contrato_encerrado',
  updated_at = now()
where o.status = 'cancelado'
  and exists (
    select 1
    from public.cliente_contratos c
    where c.orcamento_id = o.id
      and (
        c.status = 'encerrado'
        or c.encerrado_em is not null
      )
  );
