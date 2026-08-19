-- 110: Proteção de RPCs — authenticated ≠ staff (complementa a 109)
--
-- REQUER a migration 109 (public.is_staff_user()).
-- NÃO EXECUTAR EM PRODUÇÃO SEM REVISÃO EXPLÍCITA.
-- NÃO altera dados nem regras de negócio: só autorização + GRANT/REVOKE.
--
-- Helpers puros NÃO alterados (sem tabelas / sem dados):
--   public.calcular_fim_vigencia_meses
--   public.resolve_status_contrato_from_aprovacao

-- Mensagem estável para testes e clientes PostgREST:
--   RPC_STAFF_ONLY: operação restrita a usuários internos da Navarro.

-- =============================================================================
-- 1) Funções de autorização — EXECUTE para RLS, não para PUBLIC/anon
-- =============================================================================

revoke all on function public.is_admin_user() from public;
revoke all on function public.is_admin_user() from anon;
grant execute on function public.is_admin_user() to authenticated;
grant execute on function public.is_admin_user() to service_role;

revoke all on function public.is_staff_user() from public;
revoke all on function public.is_staff_user() from anon;
grant execute on function public.is_staff_user() to authenticated;
grant execute on function public.is_staff_user() to service_role;

-- =============================================================================
-- 2) RPCs staff-only — barreira is_staff_user(); lógica interna intacta
-- =============================================================================
-- Equivalente seguro de `IF NOT is_staff_user()`:
--   JWT com auth.uid() (authenticated) sem perfil staff → bloqueado.
--   Sessão sem uid (service_role / SQL editor) → não é cliente; o EXECUTE
--   de PUBLIC/anon já foi revogado. Chamadas internas DEFINER preservam
--   o uid do JWT original do staff.

create or replace function public.aprovar_orcamento_integrar_cliente(
  p_orcamento_id uuid,
  p_aprovacao jsonb,
  p_itens jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orcamento public.orcamentos%rowtype;
  v_cliente public.clientes%rowtype;
  v_aprovacao_id uuid;
  v_contrato_id uuid;
  v_contrato_numero text;
  v_cnpj_digits text;
  v_cliente_criado boolean := false;
  v_cliente_localizado boolean := false;
  v_contrato_criado boolean := false;
  v_contrato_ja_existia boolean := false;
  v_aprovado_em timestamptz := now();
  v_aprovado_por text;
  v_responsavel_fechamento text;
  v_qtd integer;
  v_valor_final numeric(12, 2);
  v_condicao text;
  v_qtd_parcelas integer;
  v_valor_parcela numeric(12, 2);
  v_desconto numeric(5, 2);
  v_valor_avista numeric(12, 2);
  v_observacoes text;
  v_item jsonb;
  v_ordem integer := 0;
begin
  if auth.uid() is not null and not public.is_staff_user() then
    raise exception
      'RPC_STAFF_ONLY: operação restrita a usuários internos da Navarro.'
      using errcode = '42501';
  end if;

  if p_orcamento_id is null then
    raise exception 'ORCAMENTO_INVALIDO: id do orçamento é obrigatório.'
      using errcode = 'P0001';
  end if;

  select * into v_orcamento
  from public.orcamentos
  where id = p_orcamento_id
  for update;

  if not found then
    raise exception 'ORCAMENTO_INVALIDO: orçamento não encontrado.'
      using errcode = 'P0001';
  end if;

  if v_orcamento.status = 'cancelado' then
    raise exception 'ORCAMENTO_CANCELADO: orçamento cancelado não pode ser aprovado.'
      using errcode = 'P0001';
  end if;

  if v_orcamento.status = 'aprovado' then
    raise exception 'ORCAMENTO_JA_APROVADO: Este orçamento já foi aprovado.'
      using errcode = 'P0001';
  end if;

  v_cnpj_digits := regexp_replace(coalesce(v_orcamento.cliente_cnpj, ''), '[^0-9]', '', 'g');
  if length(v_cnpj_digits) <> 14 then
    raise exception
      'CNPJ_OBRIGATORIO: Para concluir a aprovação e vincular o contrato ao cliente, informe um CNPJ válido.'
      using errcode = 'P0001';
  end if;

  v_aprovado_por := nullif(trim(coalesce(p_aprovacao->>'aprovado_por', '')), '');
  if v_aprovado_por is null then
    raise exception 'APROVACAO_INVALIDA: aprovado_por é obrigatório.'
      using errcode = 'P0001';
  end if;

  v_responsavel_fechamento := coalesce(
    nullif(trim(coalesce(p_aprovacao->>'responsavel_no_fechamento', '')), ''),
    nullif(trim(coalesce(v_orcamento.responsavel, '')), ''),
    v_aprovado_por
  );

  v_qtd := coalesce((p_aprovacao->>'quantidade_colaboradores')::integer, 0);
  v_valor_final := coalesce((p_aprovacao->>'valor_final')::numeric, 0);
  if v_qtd < 1 or v_valor_final <= 0 then
    raise exception 'APROVACAO_INVALIDA: quantidade e valor final são obrigatórios.'
      using errcode = 'P0001';
  end if;

  v_condicao := nullif(trim(coalesce(p_aprovacao->>'condicao_pagamento', '')), '');
  v_qtd_parcelas := nullif(p_aprovacao->>'quantidade_parcelas', '')::integer;
  v_valor_parcela := nullif(p_aprovacao->>'valor_parcela', '')::numeric;
  v_desconto := coalesce(nullif(p_aprovacao->>'desconto_percentual', '')::numeric, 0);
  v_valor_avista := nullif(p_aprovacao->>'valor_avista', '')::numeric;
  v_observacoes := nullif(trim(coalesce(p_aprovacao->>'observacoes', '')), '');

  select * into v_cliente
  from public.clientes
  where cnpj_digits = v_cnpj_digits
  limit 1;

  if found then
    v_cliente_localizado := true;
  else
    insert into public.clientes (
      nome, cnpj, procuracao, disponivel_agendamento,
      contato, telefone, email, endereco, setor, origem_cadastro
    )
    values (
      trim(v_orcamento.cliente_nome),
      coalesce(nullif(trim(v_orcamento.cliente_cnpj), ''), v_cnpj_digits),
      'pendente',
      false,
      v_orcamento.contato,
      v_orcamento.telefone,
      v_orcamento.email,
      v_orcamento.cliente_endereco,
      v_orcamento.cliente_setor,
      'orcamento'
    )
    returning * into v_cliente;

    v_cliente_criado := true;
  end if;

  select id into v_aprovacao_id
  from public.orcamento_aprovacoes
  where orcamento_id = p_orcamento_id;

  if v_aprovacao_id is null then
    insert into public.orcamento_aprovacoes (
      orcamento_id,
      quantidade_colaboradores,
      valor_final,
      condicao_pagamento,
      quantidade_parcelas,
      valor_parcela,
      desconto_percentual,
      valor_avista,
      observacoes,
      aprovado_por,
      aprovado_em,
      responsavel_no_fechamento,
      responsavel_no_fechamento_aproximado
    )
    values (
      p_orcamento_id,
      v_qtd,
      v_valor_final,
      v_condicao,
      v_qtd_parcelas,
      v_valor_parcela,
      v_desconto,
      v_valor_avista,
      v_observacoes,
      v_aprovado_por,
      v_aprovado_em,
      v_responsavel_fechamento,
      false
    )
    returning id into v_aprovacao_id;
  else
    update public.orcamento_aprovacoes
    set
      quantidade_colaboradores = v_qtd,
      valor_final = v_valor_final,
      condicao_pagamento = v_condicao,
      quantidade_parcelas = v_qtd_parcelas,
      valor_parcela = v_valor_parcela,
      desconto_percentual = v_desconto,
      valor_avista = v_valor_avista,
      observacoes = v_observacoes,
      aprovado_por = v_aprovado_por,
      aprovado_em = v_aprovado_em,
      responsavel_no_fechamento = coalesce(
        responsavel_no_fechamento,
        v_responsavel_fechamento
      ),
      responsavel_no_fechamento_aproximado = case
        when responsavel_no_fechamento is null then false
        else responsavel_no_fechamento_aproximado
      end
    where id = v_aprovacao_id;

    delete from public.orcamento_aprovacao_itens
    where aprovacao_id = v_aprovacao_id;
  end if;

  if p_itens is not null and jsonb_typeof(p_itens) = 'array' then
    for v_item in
      select value from jsonb_array_elements(p_itens)
    loop
      insert into public.orcamento_aprovacao_itens (
        aprovacao_id, servico_id, servico_nome,
        quantidade, valor_unitario, valor_total, ordem
      )
      values (
        v_aprovacao_id,
        nullif(v_item->>'servico_id', '')::uuid,
        coalesce(nullif(trim(v_item->>'servico_nome'), ''), 'Serviço'),
        coalesce(nullif(v_item->>'quantidade', '')::numeric, 1),
        coalesce(nullif(v_item->>'valor_unitario', '')::numeric, 0),
        coalesce(nullif(v_item->>'valor_total', '')::numeric, 0),
        coalesce(nullif(v_item->>'ordem', '')::integer, v_ordem)
      );
      v_ordem := v_ordem + 1;
    end loop;
  end if;

  select id, numero into v_contrato_id, v_contrato_numero
  from public.cliente_contratos
  where orcamento_id = p_orcamento_id
  limit 1;

  if v_contrato_id is not null then
    v_contrato_ja_existia := true;
    if v_contrato_numero is null or trim(v_contrato_numero) = '' then
      v_contrato_numero := public.gerar_numero_contrato();
      update public.cliente_contratos
      set numero = v_contrato_numero
      where id = v_contrato_id;
    end if;

    update public.cliente_contratos
    set
      cliente_id = v_cliente.id,
      numero_orcamento = coalesce(numero_orcamento, v_orcamento.numero),
      quantidade_colaboradores = v_qtd,
      valor_contrato = v_valor_final,
      condicao_pagamento = v_condicao,
      quantidade_parcelas = v_qtd_parcelas,
      valor_parcela = v_valor_parcela,
      valor_avista = v_valor_avista,
      desconto_percentual = v_desconto,
      observacoes = coalesce(v_observacoes, observacoes),
      aprovado_em = coalesce(aprovado_em, v_aprovado_em),
      aprovado_por = coalesce(aprovado_por, v_aprovado_por)
    where id = v_contrato_id;
  else
    v_contrato_numero := public.gerar_numero_contrato();

    insert into public.cliente_contratos (
      cliente_id, data_inicio, data_fim,
      quantidade_colaboradores, valor_contrato, condicao_pagamento,
      tipo_contrato, reajuste_percentual, observacoes, status,
      orcamento_id, numero_orcamento, numero,
      quantidade_parcelas, valor_parcela, valor_avista, desconto_percentual,
      aprovado_em, aprovado_por, liberado_para_agendamento
    )
    values (
      v_cliente.id,
      (v_aprovado_em at time zone 'America/Sao_Paulo')::date,
      null,
      v_qtd,
      v_valor_final,
      v_condicao,
      'anual',
      null,
      v_observacoes,
      'aguardando_envio',
      p_orcamento_id,
      v_orcamento.numero,
      v_contrato_numero,
      v_qtd_parcelas,
      v_valor_parcela,
      v_valor_avista,
      v_desconto,
      v_aprovado_em,
      v_aprovado_por,
      false
    )
    returning id into v_contrato_id;

    v_contrato_criado := true;
  end if;

  update public.orcamentos
  set
    status = 'aprovado',
    cliente_id = v_cliente.id
  where id = p_orcamento_id;

  if v_cliente_criado then
    perform public.recompute_cliente_disponivel_agendamento(v_cliente.id);
  end if;

  return jsonb_build_object(
    'aprovacao_id', v_aprovacao_id,
    'cliente_id', v_cliente.id,
    'contrato_id', v_contrato_id,
    'numero_contrato', v_contrato_numero,
    'cliente_criado', v_cliente_criado,
    'cliente_localizado', v_cliente_localizado,
    'contrato_criado', v_contrato_criado,
    'contrato_ja_existia', v_contrato_ja_existia,
    'cnpj_digits', v_cnpj_digits,
    'cliente_nome', v_cliente.nome,
    'numero_orcamento', v_orcamento.numero,
    'responsavel_no_fechamento', v_responsavel_fechamento
  );
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

create or replace function public.assert_cliente_sem_inadimplencia(
  p_referencia_nome text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_mes_atual text;
begin
  if auth.uid() is not null and not public.is_staff_user() then
    raise exception
      'RPC_STAFF_ONLY: operação restrita a usuários internos da Navarro.'
      using errcode = '42501';
  end if;

  if trim(coalesce(p_referencia_nome, '')) = '' then
    return;
  end if;

  v_mes_atual := to_char(timezone('America/Sao_Paulo', now()), 'YYYY-MM');

  select count(*) into v_count
  from public.faturas f
  where f.tipo = 'cliente'
    and f.pago = false
    and f.status in ('emitida', 'vencida')
    and f.referencia_nome = trim(p_referencia_nome)
    and (
      f.status = 'vencida'
      or to_char(f.data_vencimento, 'YYYY-MM') < v_mes_atual
    );

  if v_count > 0 then
    raise exception
      'CLIENTE_INADIMPLENTE: cliente possui fatura(s) vencida(s) pendente(s) de pagamento.'
      using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.alterar_responsavel_orcamento(
  p_orcamento_id uuid,
  p_novo_responsavel_user_id uuid,
  p_novo_responsavel_nome text,
  p_motivo text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orcamento public.orcamentos%rowtype;
  v_novo_nome text := nullif(trim(coalesce(p_novo_responsavel_nome, '')), '');
  v_motivo text := nullif(trim(coalesce(p_motivo, '')), '');
  v_caller_id uuid := auth.uid();
  v_is_admin boolean := public.is_admin_user();
  v_perfil_novo public.perfis_usuarios%rowtype;
begin
  if v_caller_id is not null and not public.is_staff_user() then
    raise exception
      'RPC_STAFF_ONLY: operação restrita a usuários internos da Navarro.'
      using errcode = '42501';
  end if;

  if v_caller_id is null then
    raise exception 'Não autenticado.';
  end if;

  if v_novo_nome is null then
    raise exception 'Informe o novo responsável.';
  end if;

  if v_motivo is null then
    raise exception 'Informe o motivo da alteração.';
  end if;

  if p_novo_responsavel_user_id is null then
    raise exception 'Informe o novo responsável.';
  end if;

  select * into v_orcamento
  from public.orcamentos
  where id = p_orcamento_id
  for update;

  if not found then
    raise exception 'Orçamento não encontrado.';
  end if;

  if v_orcamento.status in ('cancelado', 'contrato_encerrado') then
    raise exception
      'Não é possível alterar o responsável de um processo cancelado ou encerrado.';
  end if;

  if not v_is_admin then
    if v_orcamento.responsavel_user_id is not null then
      if v_orcamento.responsavel_user_id is distinct from v_caller_id then
        raise exception
          'Você não possui permissão para alterar o responsável deste processo.';
      end if;
    else
      -- Fallback legado: compara pelo nome do perfil do caller.
      if not exists (
        select 1
        from public.perfis_usuarios p
        where p.user_id = v_caller_id
          and p.ativo = true
          and lower(trim(p.nome)) = lower(trim(coalesce(v_orcamento.responsavel, '')))
      ) then
        raise exception
          'Você não possui permissão para alterar o responsável deste processo.';
      end if;
    end if;
  end if;

  select * into v_perfil_novo
  from public.perfis_usuarios
  where user_id = p_novo_responsavel_user_id
    and ativo = true;

  if not found then
    raise exception 'Novo responsável inválido ou inativo.';
  end if;

  if p_novo_responsavel_user_id is not distinct from v_orcamento.responsavel_user_id
     or lower(trim(v_perfil_novo.nome)) = lower(trim(coalesce(v_orcamento.responsavel, '')))
  then
    raise exception 'Selecione um responsável diferente do atual.';
  end if;

  update public.orcamentos
  set
    responsavel = coalesce(nullif(trim(v_perfil_novo.nome), ''), v_novo_nome),
    responsavel_user_id = p_novo_responsavel_user_id,
    updated_at = now()
  where id = p_orcamento_id;

  return jsonb_build_object(
    'orcamento_id', p_orcamento_id,
    'numero', v_orcamento.numero,
    'responsavel_anterior', v_orcamento.responsavel,
    'responsavel_anterior_user_id', v_orcamento.responsavel_user_id,
    'responsavel_novo', coalesce(nullif(trim(v_perfil_novo.nome), ''), v_novo_nome),
    'responsavel_novo_user_id', p_novo_responsavel_user_id,
    'motivo', v_motivo
  );
end;
$$;

create or replace function public.gerar_numero_orcamento()
returns text
language plpgsql
set search_path = public
as $$
declare
  ano int := extract(year from current_date);
  proximo int;
begin
  if auth.uid() is not null and not public.is_staff_user() then
    raise exception
      'RPC_STAFF_ONLY: operação restrita a usuários internos da Navarro.'
      using errcode = '42501';
  end if;

  select coalesce(
    max(
      nullif(
        regexp_replace(numero, '^ORC-' || ano::text || '-', ''),
        ''
      )::int
    ),
    0
  ) + 1
  into proximo
  from public.orcamentos
  where numero like 'ORC-' || ano::text || '-%';

  return 'ORC-' || ano::text || '-' || lpad(proximo::text, 4, '0');
end;
$$;

-- Staff-only: PUBLIC/anon fora; JWT staff + service_role
revoke all on function public.aprovar_orcamento_integrar_cliente(uuid, jsonb, jsonb) from public;
revoke all on function public.aprovar_orcamento_integrar_cliente(uuid, jsonb, jsonb) from anon;
revoke all on function public.aprovar_orcamento_integrar_cliente(uuid, jsonb, jsonb) from authenticated;
grant execute on function public.aprovar_orcamento_integrar_cliente(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.aprovar_orcamento_integrar_cliente(uuid, jsonb, jsonb) to service_role;

revoke all on function public.recompute_cliente_disponivel_agendamento(uuid) from public;
revoke all on function public.recompute_cliente_disponivel_agendamento(uuid) from anon;
revoke all on function public.recompute_cliente_disponivel_agendamento(uuid) from authenticated;
grant execute on function public.recompute_cliente_disponivel_agendamento(uuid) to authenticated;
grant execute on function public.recompute_cliente_disponivel_agendamento(uuid) to service_role;

revoke all on function public.assert_cliente_sem_inadimplencia(text) from public;
revoke all on function public.assert_cliente_sem_inadimplencia(text) from anon;
revoke all on function public.assert_cliente_sem_inadimplencia(text) from authenticated;
grant execute on function public.assert_cliente_sem_inadimplencia(text) to authenticated;
grant execute on function public.assert_cliente_sem_inadimplencia(text) to service_role;

revoke all on function public.alterar_responsavel_orcamento(uuid, uuid, text, text) from public;
revoke all on function public.alterar_responsavel_orcamento(uuid, uuid, text, text) from anon;
revoke all on function public.alterar_responsavel_orcamento(uuid, uuid, text, text) from authenticated;
grant execute on function public.alterar_responsavel_orcamento(uuid, uuid, text, text) to authenticated;
grant execute on function public.alterar_responsavel_orcamento(uuid, uuid, text, text) to service_role;

revoke all on function public.gerar_numero_orcamento() from public;
revoke all on function public.gerar_numero_orcamento() from anon;
revoke all on function public.gerar_numero_orcamento() from authenticated;
grant execute on function public.gerar_numero_orcamento() to authenticated;
grant execute on function public.gerar_numero_orcamento() to service_role;

-- =============================================================================
-- 3) RPCs server-only — sem EXECUTE para JWT (anon/authenticated/PUBLIC)
-- =============================================================================
-- Continuaam invocáveis por:
--   owner / SQL editor
--   funções SECURITY DEFINER (aprovar_*, recompute_*)
--   service_role (GRANT explícito)

revoke all on function public.backfill_orcamentos_aprovados_clientes() from public;
revoke all on function public.backfill_orcamentos_aprovados_clientes() from anon;
revoke all on function public.backfill_orcamentos_aprovados_clientes() from authenticated;
grant execute on function public.backfill_orcamentos_aprovados_clientes() to service_role;

revoke all on function public.gerar_numero_contrato() from public;
revoke all on function public.gerar_numero_contrato() from anon;
revoke all on function public.gerar_numero_contrato() from authenticated;
grant execute on function public.gerar_numero_contrato() to service_role;

revoke all on function public.contrato_libera_agendamento(uuid, boolean, boolean) from public;
revoke all on function public.contrato_libera_agendamento(uuid, boolean, boolean) from anon;
revoke all on function public.contrato_libera_agendamento(uuid, boolean, boolean) from authenticated;
grant execute on function public.contrato_libera_agendamento(uuid, boolean, boolean) to service_role;
