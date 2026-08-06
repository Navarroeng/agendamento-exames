-- Bloqueio manual de agendamento com prioridade sobre liberação automática.
-- Restaura clientes sobrescritos pelo recompute (migration 052+) sem liberação manual.

-- ---------------------------------------------------------------------------
-- 1) Campos de origem do bloqueio manual
-- ---------------------------------------------------------------------------
alter table public.clientes
  add column if not exists agendamento_bloqueio_manual boolean not null default false;

alter table public.clientes
  add column if not exists agendamento_bloqueio_motivo text null;

alter table public.clientes
  add column if not exists agendamento_bloqueado_em timestamptz null;

alter table public.clientes
  add column if not exists agendamento_bloqueado_por text null;

comment on column public.clientes.agendamento_bloqueio_manual is
  'true = bloqueio manual (ADM). Tem prioridade sobre liberação automática por contrato/financeiro.';

comment on column public.clientes.agendamento_bloqueio_motivo is
  'Motivo do bloqueio ou da liberação manual mais recente.';

comment on column public.clientes.agendamento_bloqueado_em is
  'Data/hora do bloqueio manual vigente.';

comment on column public.clientes.agendamento_bloqueado_por is
  'Usuário (nome) que aplicou o bloqueio manual vigente.';

create index if not exists idx_clientes_agendamento_bloqueio_manual
  on public.clientes (agendamento_bloqueio_manual)
  where agendamento_bloqueio_manual = true;

-- ---------------------------------------------------------------------------
-- 2) Recompute: bloqueio manual nunca é sobrescrito
-- ---------------------------------------------------------------------------
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
  v_tem_orcamento boolean;
  v_flag_legado boolean;
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

  -- Prioridade 1: bloqueio manual → sempre indisponível
  if v_bloqueio_manual then
    update public.clientes
    set disponivel_agendamento = false
    where id = p_cliente_id
      and disponivel_agendamento is distinct from false;
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
    update public.clientes
    set disponivel_agendamento = false
    where id = p_cliente_id
      and disponivel_agendamento is distinct from false;
    return false;
  end if;

  select coalesce(disponivel_agendamento, true)
  into v_flag_legado
  from public.clientes
  where id = p_cliente_id;

  return coalesce(v_flag_legado, true);
end;
$$;

grant execute on function public.recompute_cliente_disponivel_agendamento(uuid)
  to authenticated;

-- A restauração em massa dos bloqueios sobrescritos NÃO roda nesta migration.
-- Use scripts/preview-bloqueio-manual-restauracao.sql (SELECT) e, após revisão,
-- scripts/restaurar-bloqueio-manual.sql.
