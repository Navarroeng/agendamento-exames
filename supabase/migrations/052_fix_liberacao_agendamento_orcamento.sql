-- Corrige liberação de agendamento para contratos originados de orçamento:
-- só libera com boleto_pago = true. Centraliza em recompute_cliente_disponivel_agendamento.

-- Espelha pagamento da aprovação → contrato e força bloqueio sem pagamento
update public.cliente_contratos cc
set
  boleto_pago = coalesce(oa.boleto_pago, false),
  boleto_pago_em = coalesce(oa.boleto_pago_em, cc.boleto_pago_em),
  boleto_vencimento = coalesce(oa.boleto_vencimento, cc.boleto_vencimento),
  liberado_para_agendamento = coalesce(oa.boleto_pago, false)
from public.orcamento_aprovacoes oa
where oa.orcamento_id = cc.orcamento_id
  and cc.orcamento_id is not null;

-- Contratos de orçamento sem aprovação espelhada: liberação = boleto_pago
update public.cliente_contratos
set liberado_para_agendamento = coalesce(boleto_pago, false)
where orcamento_id is not null
  and liberado_para_agendamento is distinct from coalesce(boleto_pago, false);

-- ---------------------------------------------------------------------------
-- Regra única no banco (espelha lib/cliente-pode-agendar.ts)
-- ---------------------------------------------------------------------------
create or replace function public.contrato_libera_agendamento(
  p_orcamento_id uuid,
  p_boleto_pago boolean,
  p_liberado_para_agendamento boolean
)
returns boolean
language sql
immutable
as $$
  select case
    when p_orcamento_id is not null then coalesce(p_boleto_pago, false)
    else coalesce(p_liberado_para_agendamento, false)
  end;
$$;

create or replace function public.recompute_cliente_disponivel_agendamento(
  p_cliente_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pode boolean;
  v_tem_orcamento boolean;
  v_flag_legado boolean;
begin
  if p_cliente_id is null then
    return false;
  end if;

  -- Mantém liberado_para_agendamento coerente com boleto nos contratos de orçamento
  update public.cliente_contratos cc
  set
    boleto_pago = coalesce(oa.boleto_pago, cc.boleto_pago, false),
    boleto_pago_em = coalesce(oa.boleto_pago_em, cc.boleto_pago_em),
    boleto_vencimento = coalesce(oa.boleto_vencimento, cc.boleto_vencimento),
    liberado_para_agendamento = coalesce(oa.boleto_pago, cc.boleto_pago, false)
  from public.orcamento_aprovacoes oa
  where cc.cliente_id = p_cliente_id
    and cc.orcamento_id = oa.orcamento_id
    and cc.orcamento_id is not null;

  update public.cliente_contratos
  set liberado_para_agendamento = coalesce(boleto_pago, false)
  where cliente_id = p_cliente_id
    and orcamento_id is not null
    and liberado_para_agendamento is distinct from coalesce(boleto_pago, false);

  select exists (
    select 1
    from public.cliente_contratos c
    where c.cliente_id = p_cliente_id
      and public.contrato_libera_agendamento(
        c.orcamento_id,
        c.boleto_pago,
        c.liberado_para_agendamento
      )
  ) into v_pode;

  if v_pode then
    update public.clientes
    set disponivel_agendamento = true
    where id = p_cliente_id
      and disponivel_agendamento is distinct from true;
    return true;
  end if;

  select exists (
    select 1
    from public.cliente_contratos c
    where c.cliente_id = p_cliente_id
      and c.orcamento_id is not null
  ) into v_tem_orcamento;

  if v_tem_orcamento then
    -- Só contratos de orçamento (ou manuais sem liberação): bloqueado
    update public.clientes
    set disponivel_agendamento = false
    where id = p_cliente_id
      and disponivel_agendamento is distinct from false;
    return false;
  end if;

  -- Sem contrato de orçamento: preserva flag legado (clientes manuais)
  select coalesce(disponivel_agendamento, true)
  into v_flag_legado
  from public.clientes
  where id = p_cliente_id;

  return coalesce(v_flag_legado, true);
end;
$$;

grant execute on function public.contrato_libera_agendamento(uuid, boolean, boolean)
  to authenticated;
grant execute on function public.recompute_cliente_disponivel_agendamento(uuid)
  to authenticated;

-- Regulariza todos os clientes (inclui J A Hidráulica / ORC-2026-0002)
do $$
declare
  r record;
begin
  for r in select id from public.clientes
  loop
    perform public.recompute_cliente_disponivel_agendamento(r.id);
  end loop;
end $$;
