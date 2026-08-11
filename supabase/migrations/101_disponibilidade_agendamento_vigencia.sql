-- Alinha recompute de disponibilidade com a regra central de vigência.
-- Contrato encerrado/cancelado/vencido NÃO libera agendamento.

create or replace function public.recompute_cliente_disponivel_agendamento(
  p_cliente_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bloqueio_manual boolean;
  v_pode boolean;
begin
  if p_cliente_id is null then
    return false;
  end if;

  select coalesce(agendamento_bloqueio_manual, false)
  into v_bloqueio_manual
  from public.clientes
  where id = p_cliente_id;

  if not found then
    return false;
  end if;

  -- Prioridade 1: bloqueio manual
  if v_bloqueio_manual then
    update public.clientes
    set disponivel_agendamento = false
    where id = p_cliente_id
      and disponivel_agendamento is distinct from false;
    return false;
  end if;

  -- Sync boleto → liberado apenas em contratos não encerrados/cancelados
  update public.cliente_contratos cc
  set
    boleto_pago = coalesce(oa.boleto_pago, cc.boleto_pago, false),
    boleto_pago_em = coalesce(oa.boleto_pago_em, cc.boleto_pago_em),
    boleto_vencimento = coalesce(oa.boleto_vencimento, cc.boleto_vencimento),
    liberado_para_agendamento = case
      when cc.status in ('encerrado', 'cancelado') then false
      else coalesce(oa.boleto_pago, cc.boleto_pago, false)
    end
  from public.orcamento_aprovacoes oa
  where cc.cliente_id = p_cliente_id
    and cc.orcamento_id = oa.orcamento_id
    and cc.orcamento_id is not null;

  update public.cliente_contratos
  set liberado_para_agendamento = false
  where cliente_id = p_cliente_id
    and status in ('encerrado', 'cancelado')
    and liberado_para_agendamento is distinct from false;

  update public.cliente_contratos
  set liberado_para_agendamento = coalesce(boleto_pago, false)
  where cliente_id = p_cliente_id
    and orcamento_id is not null
    and status not in ('encerrado', 'cancelado')
    and liberado_para_agendamento is distinct from coalesce(boleto_pago, false);

  -- Regra central: status vigente + período contém hoje + libera boleto/flag
  select exists (
    select 1
    from public.cliente_contratos c
    where c.cliente_id = p_cliente_id
      and c.status in ('ativo', 'em_renovacao')
      and c.data_inicio is not null
      and c.data_fim is not null
      and current_date >= c.data_inicio
      and current_date <= c.data_fim
      and public.contrato_libera_agendamento(
        c.orcamento_id,
        c.boleto_pago,
        c.liberado_para_agendamento
      )
  ) into v_pode;

  update public.clientes
  set disponivel_agendamento = v_pode
  where id = p_cliente_id
    and disponivel_agendamento is distinct from v_pode;

  return coalesce(v_pode, false);
end;
$$;

grant execute on function public.recompute_cliente_disponivel_agendamento(uuid)
  to authenticated;

-- Backfill para clientes com contrato (corrige J A HIDRAULICA e similares)
do $$
declare
  r record;
begin
  for r in
    select distinct cliente_id
    from public.cliente_contratos
    where cliente_id is not null
  loop
    perform public.recompute_cliente_disponivel_agendamento(r.cliente_id);
  end loop;
end;
$$;
