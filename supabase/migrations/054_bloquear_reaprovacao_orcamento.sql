-- Bloqueia reaprovação de orçamento já aprovado (RPC).
-- Evita nova aprovação, cliente, contrato ou vínculo duplicado.

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
      'inativa',
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
      aprovado_em
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
      v_aprovado_em
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
      aprovado_em = v_aprovado_em
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
    'numero_orcamento', v_orcamento.numero
  );
end;
$$;

grant execute on function public.aprovar_orcamento_integrar_cliente(uuid, jsonb, jsonb)
  to authenticated;
