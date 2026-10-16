-- Gestão SST mês a mês: vigência assinada libera agendamento sem a primeira parcela.
-- À vista, pontual e contrato sem orçamento continuam na regra anterior.
-- Não quita boleto, não altera datas, valor, número ou vínculo, e não conclui etapas.

create or replace function public.contrato_mensal_operacional_na_data(
  p_modalidade text,
  p_mensalidade_pagamento text,
  p_tipo_contrato text,
  p_condicao_pagamento text,
  p_orcamento_id uuid,
  p_status text,
  p_contrato_assinado_em timestamptz,
  p_contrato_assinado boolean,
  p_data_inicio date,
  p_data_fim date,
  p_encerrado_em timestamptz,
  p_data date
)
returns boolean
language sql
immutable
as $$
  select
    p_orcamento_id is not null
    and p_encerrado_em is null
    and p_status in ('ativo', 'em_renovacao', 'assinado', 'aguardando_pagamento')
    and p_data_inicio is not null
    and p_data_fim is not null
    and p_data >= p_data_inicio
    and p_data <= p_data_fim
    -- Status operacional não comprova assinatura.
    and (
      p_contrato_assinado_em is not null
      or coalesce(p_contrato_assinado, false)
    )
    and (
      (
        p_modalidade = 'mensalidade'
        and coalesce(p_mensalidade_pagamento, 'mensal') <> 'avista'
      )
      or (
        p_modalidade is null
        and p_tipo_contrato = 'mensal'
        and coalesce(p_condicao_pagamento, '') ~* 'mensalidade'
        and coalesce(p_condicao_pagamento, '') !~* 'vista'
      )
    );
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
  v_bloqueio_manual boolean;
  v_pode boolean;
begin
  if auth.uid() is not null and not public.is_staff_user() then
    raise exception
      'RPC_STAFF_ONLY: operação restrita a usuários internos da Navarro.'
      using errcode = '42501';
  end if;

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

  if v_bloqueio_manual then
    update public.clientes
    set disponivel_agendamento = false
    where id = p_cliente_id
      and disponivel_agendamento is distinct from false;
    return false;
  end if;

  update public.cliente_contratos cc
  set
    boleto_pago = coalesce(oa.boleto_pago, cc.boleto_pago, false),
    boleto_pago_em = coalesce(oa.boleto_pago_em, cc.boleto_pago_em),
    boleto_vencimento = coalesce(oa.boleto_vencimento, cc.boleto_vencimento),
    liberado_para_agendamento = case
      when cc.status in ('encerrado', 'cancelado') or cc.encerrado_em is not null then false
      when public.contrato_mensal_operacional_na_data(
        o.modalidade,
        oa.mensalidade_pagamento,
        cc.tipo_contrato,
        cc.condicao_pagamento,
        cc.orcamento_id,
        cc.status,
        cc.contrato_assinado_em,
        coalesce(oa.contrato_assinado, false),
        cc.data_inicio,
        cc.data_fim,
        cc.encerrado_em,
        current_date
      ) then true
      else coalesce(oa.boleto_pago, cc.boleto_pago, false)
    end
  from public.orcamento_aprovacoes oa
  join public.orcamentos o on o.id = oa.orcamento_id
  where cc.cliente_id = p_cliente_id
    and cc.orcamento_id = oa.orcamento_id
    and cc.orcamento_id is not null;

  update public.cliente_contratos
  set liberado_para_agendamento = false
  where cliente_id = p_cliente_id
    and (
      status in ('encerrado', 'cancelado')
      or encerrado_em is not null
    )
    and liberado_para_agendamento is distinct from false;

  update public.cliente_contratos cc
  set liberado_para_agendamento = coalesce(cc.boleto_pago, false)
  where cc.cliente_id = p_cliente_id
    and cc.orcamento_id is not null
    and cc.status not in ('encerrado', 'cancelado')
    and cc.encerrado_em is null
    and not exists (
      select 1
      from public.orcamentos o
      join public.orcamento_aprovacoes oa on oa.orcamento_id = o.id
      where o.id = cc.orcamento_id
        and public.contrato_mensal_operacional_na_data(
          o.modalidade,
          oa.mensalidade_pagamento,
          cc.tipo_contrato,
          cc.condicao_pagamento,
          cc.orcamento_id,
          cc.status,
          cc.contrato_assinado_em,
          coalesce(oa.contrato_assinado, false),
          cc.data_inicio,
          cc.data_fim,
          cc.encerrado_em,
          current_date
        )
    )
    and cc.liberado_para_agendamento is distinct from coalesce(cc.boleto_pago, false);

  select exists (
    select 1
    from public.cliente_contratos c
    left join public.orcamentos o on o.id = c.orcamento_id
    left join public.orcamento_aprovacoes oa on oa.orcamento_id = c.orcamento_id
    where c.cliente_id = p_cliente_id
      and c.encerrado_em is null
      and c.data_inicio is not null
      and c.data_fim is not null
      and current_date >= c.data_inicio
      and current_date <= c.data_fim
      and (
        public.contrato_mensal_operacional_na_data(
          o.modalidade,
          oa.mensalidade_pagamento,
          c.tipo_contrato,
          c.condicao_pagamento,
          c.orcamento_id,
          c.status,
          c.contrato_assinado_em,
          coalesce(oa.contrato_assinado, false),
          c.data_inicio,
          c.data_fim,
          c.encerrado_em,
          current_date
        )
        or (
          c.status in ('ativo', 'em_renovacao')
          and public.contrato_libera_agendamento(
            c.orcamento_id,
            c.boleto_pago,
            c.liberado_para_agendamento
          )
        )
      )
  ) into v_pode;

  update public.clientes
  set disponivel_agendamento = v_pode
  where id = p_cliente_id
    and disponivel_agendamento is distinct from v_pode;

  return coalesce(v_pode, false);
end;
$$;

revoke all on function public.contrato_mensal_operacional_na_data(
  text, text, text, text, uuid, text, timestamptz, boolean, date, date, timestamptz, date
) from public;
revoke all on function public.contrato_mensal_operacional_na_data(
  text, text, text, text, uuid, text, timestamptz, boolean, date, date, timestamptz, date
) from anon;
revoke all on function public.contrato_mensal_operacional_na_data(
  text, text, text, text, uuid, text, timestamptz, boolean, date, date, timestamptz, date
) from authenticated;
grant execute on function public.contrato_mensal_operacional_na_data(
  text, text, text, text, uuid, text, timestamptz, boolean, date, date, timestamptz, date
) to service_role;

revoke all on function public.recompute_cliente_disponivel_agendamento(uuid) from public;
revoke all on function public.recompute_cliente_disponivel_agendamento(uuid) from anon;
revoke all on function public.recompute_cliente_disponivel_agendamento(uuid) from authenticated;
grant execute on function public.recompute_cliente_disponivel_agendamento(uuid)
  to authenticated;
grant execute on function public.recompute_cliente_disponivel_agendamento(uuid)
  to service_role;

-- Corrige registros já assinados e em vigência. Dois updates: o índice de um
-- único contrato ativo não enxerga o encerramento na mesma sentença.
drop table if exists contrato_mensal_operacional;
create temporary table contrato_mensal_operacional as
select cc.id as contrato_id, cc.cliente_id
from public.cliente_contratos cc
join public.orcamentos o on o.id = cc.orcamento_id
join public.orcamento_aprovacoes a on a.orcamento_id = cc.orcamento_id
where cc.encerrado_em is null
  and cc.status in ('ativo', 'em_renovacao', 'assinado', 'aguardando_pagamento')
  and (
    cc.contrato_assinado_em is not null
    or coalesce(a.contrato_assinado, false)
  )
  and cc.data_inicio is not null
  and cc.data_fim is not null
  and cc.data_fim > cc.data_inicio
  and current_date >= cc.data_inicio
  and current_date <= cc.data_fim
  and o.modalidade = 'mensalidade'
  and coalesce(a.mensalidade_pagamento, 'mensal') <> 'avista'
  and not exists (
    select 1
    from public.cliente_contratos vigente
    where vigente.cliente_id = cc.cliente_id
      and vigente.status = 'ativo'
      and vigente.id <> cc.id
      and vigente.encerrado_em is null
      and vigente.data_fim is not null
      and vigente.data_fim >= current_date
  );

-- Substituição automática da vigência anterior: só o status.
-- trg_cliente_contratos_encerrar_somente_admin trata encerrado_em preenchido
-- como encerramento manual e exige is_admin_user() via auth.uid().
-- Não preencher encerrado_em mantém o trigger e não simula administrador.
update public.cliente_contratos antigo
set
  status = 'encerrado',
  updated_at = now()
from contrato_mensal_operacional novo
where antigo.cliente_id = novo.cliente_id
  and antigo.status = 'ativo'
  and antigo.id <> novo.contrato_id
  and antigo.encerrado_em is null
  and antigo.data_fim is not null
  and antigo.data_fim < current_date;

update public.cliente_contratos cc
set
  status = 'ativo',
  tipo_contrato = case
    when cc.tipo_contrato is null or cc.tipo_contrato = 'anual' then 'mensal'
    else cc.tipo_contrato
  end,
  liberado_para_agendamento = true,
  updated_at = now()
from contrato_mensal_operacional novo
where cc.id = novo.contrato_id
  and not exists (
    select 1
    from public.cliente_contratos outro
    where outro.cliente_id = cc.cliente_id
      and outro.status = 'ativo'
      and outro.id <> cc.id
  );

do $$
declare
  r record;
begin
  for r in
    select distinct cliente_id
    from contrato_mensal_operacional
    where cliente_id is not null
  loop
    perform public.recompute_cliente_disponivel_agendamento(r.cliente_id);
  end loop;
end;
$$;
