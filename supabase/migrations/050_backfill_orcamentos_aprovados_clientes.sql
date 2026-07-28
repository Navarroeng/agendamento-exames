-- Corrige integração orçamento aprovado → cliente/contrato:
-- 1) status de acompanhamento no contrato
-- 2) espelho de envio/assinatura/boleto
-- 3) RPC: cria contrato ANTES de marcar orçamento como aprovado
-- 4) trigger: impede aprovação parcial sem contrato
-- 5) backfill seguro dos orçamentos já aprovados sem vínculo

-- ---------------------------------------------------------------------------
-- Status de acompanhamento comercial
-- ---------------------------------------------------------------------------
alter table public.cliente_contratos
  drop constraint if exists cliente_contratos_status_check;

alter table public.cliente_contratos
  add constraint cliente_contratos_status_check
  check (
    status in (
      'ativo',
      'encerrado',
      'em_renovacao',
      'cancelado',
      'aguardando_envio',
      'enviado',
      'assinado',
      'aguardando_pagamento',
      'pago'
    )
  );

alter table public.cliente_contratos
  add column if not exists contrato_enviado_em date null,
  add column if not exists contrato_assinado_em date null,
  add column if not exists boleto_vencimento date null,
  add column if not exists boleto_pago boolean not null default false,
  add column if not exists boleto_pago_em date null;

comment on column public.cliente_contratos.status is
  'ativo | encerrado | em_renovacao | cancelado | aguardando_envio | enviado | assinado | aguardando_pagamento | pago';

-- ---------------------------------------------------------------------------
-- Mapeia andamento da aprovação → status do contrato
-- ---------------------------------------------------------------------------
create or replace function public.resolve_status_contrato_from_aprovacao(
  p_enviado boolean,
  p_assinado boolean,
  p_pago boolean,
  p_boleto_vencimento date
)
returns text
language plpgsql
immutable
as $$
begin
  if coalesce(p_pago, false) then
    return 'pago';
  end if;
  if coalesce(p_assinado, false) then
    if p_boleto_vencimento is not null then
      return 'aguardando_pagamento';
    end if;
    return 'assinado';
  end if;
  if coalesce(p_enviado, false) then
    return 'enviado';
  end if;
  return 'aguardando_envio';
end;
$$;

-- ---------------------------------------------------------------------------
-- Proteção: não marcar Aprovado sem contrato vinculado
-- ---------------------------------------------------------------------------
create or replace function public.trg_orcamento_aprovado_exige_contrato()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'aprovado'
     and (tg_op = 'INSERT' or old.status is distinct from 'aprovado') then
    if not exists (
      select 1
      from public.cliente_contratos c
      where c.orcamento_id = new.id
    ) then
      raise exception
        'APROVACAO_INCOMPLETA: o orçamento só pode ficar Aprovado após criar/vincular cliente e contrato. Use a RPC aprovar_orcamento_integrar_cliente.'
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_orcamento_aprovado_exige_contrato on public.orcamentos;
create trigger trg_orcamento_aprovado_exige_contrato
  before insert or update of status on public.orcamentos
  for each row
  execute function public.trg_orcamento_aprovado_exige_contrato();

-- ---------------------------------------------------------------------------
-- RPC de aprovação: contrato ANTES do status Aprovado
-- ---------------------------------------------------------------------------
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
      contato, telefone, email, endereco, setor
    )
    values (
      trim(v_orcamento.cliente_nome),
      coalesce(nullif(trim(v_orcamento.cliente_cnpj), ''), v_cnpj_digits),
      'inativa',
      true,
      v_orcamento.contato,
      v_orcamento.telefone,
      v_orcamento.email,
      v_orcamento.cliente_endereco,
      v_orcamento.cliente_setor
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
        aprovacao_id,
        servico_id,
        servico_nome,
        quantidade,
        valor_unitario,
        valor_total,
        ordem
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

  -- Contrato ANTES de marcar orçamento como Aprovado (trigger exige vínculo).
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
      cliente_id,
      data_inicio,
      data_fim,
      quantidade_colaboradores,
      valor_contrato,
      condicao_pagamento,
      tipo_contrato,
      reajuste_percentual,
      observacoes,
      status,
      orcamento_id,
      numero_orcamento,
      numero,
      quantidade_parcelas,
      valor_parcela,
      valor_avista,
      desconto_percentual,
      aprovado_em,
      aprovado_por
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
      v_aprovado_por
    )
    returning id into v_contrato_id;

    v_contrato_criado := true;
  end if;

  update public.orcamentos
  set
    status = 'aprovado',
    cliente_id = v_cliente.id
  where id = p_orcamento_id;

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

-- ---------------------------------------------------------------------------
-- Backfill seguro (idempotente)
-- ---------------------------------------------------------------------------
create or replace function public.backfill_orcamentos_aprovados_clientes()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_cnpj_digits text;
  v_cliente public.clientes%rowtype;
  v_cliente_criado boolean;
  v_contrato_id uuid;
  v_contrato_numero text;
  v_aprovacao public.orcamento_aprovacoes%rowtype;
  v_tem_aprovacao boolean;
  v_status text;
  v_qtd integer;
  v_valor numeric(12, 2);
  v_condicao text;
  v_qtd_parcelas integer;
  v_valor_parcela numeric(12, 2);
  v_desconto numeric(5, 2);
  v_valor_avista numeric(12, 2);
  v_observacoes text;
  v_aprovado_em timestamptz;
  v_aprovado_por text;
  v_clientes_criados integer := 0;
  v_clientes_localizados integer := 0;
  v_contratos_criados integer := 0;
  v_contratos_atualizados integer := 0;
  v_pulados_sem_cnpj integer := 0;
  v_ja_vinculados integer := 0;
begin
  for r in
    select o.*
    from public.orcamentos o
    where o.status = 'aprovado'
    order by o.updated_at asc nulls last, o.created_at asc
  loop
    v_cnpj_digits := regexp_replace(coalesce(r.cliente_cnpj, ''), '[^0-9]', '', 'g');
    if length(v_cnpj_digits) <> 14 then
      v_pulados_sem_cnpj := v_pulados_sem_cnpj + 1;
      continue;
    end if;

    v_cliente_criado := false;
    select * into v_cliente
    from public.clientes
    where cnpj_digits = v_cnpj_digits
    limit 1;

    if not found then
      insert into public.clientes (
        nome, cnpj, procuracao, disponivel_agendamento,
        contato, telefone, email, endereco, setor
      )
      values (
        trim(r.cliente_nome),
        coalesce(nullif(trim(r.cliente_cnpj), ''), v_cnpj_digits),
        'inativa',
        true,
        r.contato,
        r.telefone,
        r.email,
        r.cliente_endereco,
        r.cliente_setor
      )
      returning * into v_cliente;
      v_cliente_criado := true;
      v_clientes_criados := v_clientes_criados + 1;
    else
      v_clientes_localizados := v_clientes_localizados + 1;
    end if;

    update public.orcamentos
    set cliente_id = v_cliente.id
    where id = r.id
      and (cliente_id is distinct from v_cliente.id);

    v_tem_aprovacao := false;
    select * into v_aprovacao
    from public.orcamento_aprovacoes
    where orcamento_id = r.id
    limit 1;

    if found then
      v_tem_aprovacao := true;
      v_qtd := v_aprovacao.quantidade_colaboradores;
      v_valor := v_aprovacao.valor_final;
      v_condicao := v_aprovacao.condicao_pagamento;
      v_qtd_parcelas := v_aprovacao.quantidade_parcelas;
      v_valor_parcela := v_aprovacao.valor_parcela;
      v_desconto := v_aprovacao.desconto_percentual;
      v_valor_avista := v_aprovacao.valor_avista;
      v_observacoes := v_aprovacao.observacoes;
      v_aprovado_em := v_aprovacao.aprovado_em;
      v_aprovado_por := v_aprovacao.aprovado_por;
      v_status := public.resolve_status_contrato_from_aprovacao(
        v_aprovacao.contrato_enviado,
        v_aprovacao.contrato_assinado,
        v_aprovacao.boleto_pago,
        v_aprovacao.boleto_vencimento
      );
    else
      v_qtd := coalesce(
        (
          select round(max(oi.quantidade))::integer
          from public.orcamento_itens oi
          where oi.orcamento_id = r.id
        ),
        1
      );
      v_valor := coalesce(r.valor_total, r.subtotal, 0);
      v_condicao := r.forma_pagamento;
      v_qtd_parcelas := null;
      v_valor_parcela := null;
      v_desconto := coalesce(r.desconto_percentual, 0);
      v_valor_avista := null;
      v_observacoes := r.observacoes;
      v_aprovado_em := coalesce(r.updated_at, r.created_at, now());
      v_aprovado_por := coalesce(nullif(trim(r.responsavel), ''), 'SISTEMA');
      v_status := 'aguardando_envio';
    end if;

    select id, numero into v_contrato_id, v_contrato_numero
    from public.cliente_contratos
    where orcamento_id = r.id
    limit 1;

    if v_contrato_id is not null then
      if v_contrato_numero is null or trim(v_contrato_numero) = '' then
        v_contrato_numero := public.gerar_numero_contrato();
      end if;

      update public.cliente_contratos
      set
        cliente_id = v_cliente.id,
        numero = coalesce(nullif(trim(numero), ''), v_contrato_numero),
        numero_orcamento = coalesce(numero_orcamento, r.numero),
        quantidade_colaboradores = coalesce(quantidade_colaboradores, v_qtd),
        valor_contrato = coalesce(valor_contrato, v_valor),
        condicao_pagamento = coalesce(condicao_pagamento, v_condicao),
        quantidade_parcelas = coalesce(quantidade_parcelas, v_qtd_parcelas),
        valor_parcela = coalesce(valor_parcela, v_valor_parcela),
        valor_avista = coalesce(valor_avista, v_valor_avista),
        desconto_percentual = coalesce(desconto_percentual, v_desconto),
        observacoes = coalesce(observacoes, v_observacoes),
        aprovado_em = coalesce(aprovado_em, v_aprovado_em),
        aprovado_por = coalesce(aprovado_por, v_aprovado_por),
        status = case
          when status in ('ativo', 'encerrado', 'em_renovacao', 'cancelado') then status
          else v_status
        end,
        contrato_enviado_em = coalesce(
          contrato_enviado_em,
          case when v_tem_aprovacao then v_aprovacao.contrato_enviado_em else null end
        ),
        contrato_assinado_em = coalesce(
          contrato_assinado_em,
          case when v_tem_aprovacao then v_aprovacao.contrato_assinado_em else null end
        ),
        boleto_vencimento = coalesce(
          boleto_vencimento,
          case when v_tem_aprovacao then v_aprovacao.boleto_vencimento else null end
        ),
        boleto_pago = case
          when v_tem_aprovacao then coalesce(v_aprovacao.boleto_pago, boleto_pago)
          else boleto_pago
        end,
        boleto_pago_em = coalesce(
          boleto_pago_em,
          case when v_tem_aprovacao then v_aprovacao.boleto_pago_em else null end
        )
      where id = v_contrato_id;

      v_contratos_atualizados := v_contratos_atualizados + 1;
      v_ja_vinculados := v_ja_vinculados + 1;
    else
      v_contrato_numero := public.gerar_numero_contrato();

      insert into public.cliente_contratos (
        cliente_id,
        data_inicio,
        data_fim,
        quantidade_colaboradores,
        valor_contrato,
        condicao_pagamento,
        tipo_contrato,
        reajuste_percentual,
        observacoes,
        status,
        orcamento_id,
        numero_orcamento,
        numero,
        quantidade_parcelas,
        valor_parcela,
        valor_avista,
        desconto_percentual,
        aprovado_em,
        aprovado_por,
        contrato_enviado_em,
        contrato_assinado_em,
        boleto_vencimento,
        boleto_pago,
        boleto_pago_em
      )
      values (
        v_cliente.id,
        (coalesce(v_aprovado_em, now()) at time zone 'America/Sao_Paulo')::date,
        null,
        v_qtd,
        v_valor,
        v_condicao,
        'anual',
        null,
        v_observacoes,
        v_status,
        r.id,
        r.numero,
        v_contrato_numero,
        v_qtd_parcelas,
        v_valor_parcela,
        v_valor_avista,
        v_desconto,
        v_aprovado_em,
        v_aprovado_por,
        case when v_tem_aprovacao then v_aprovacao.contrato_enviado_em else null end,
        case when v_tem_aprovacao then v_aprovacao.contrato_assinado_em else null end,
        case when v_tem_aprovacao then v_aprovacao.boleto_vencimento else null end,
        case when v_tem_aprovacao then coalesce(v_aprovacao.boleto_pago, false) else false end,
        case when v_tem_aprovacao then v_aprovacao.boleto_pago_em else null end
      );

      v_contratos_criados := v_contratos_criados + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'clientes_criados', v_clientes_criados,
    'clientes_localizados', v_clientes_localizados,
    'contratos_criados', v_contratos_criados,
    'contratos_atualizados', v_contratos_atualizados,
    'pulados_sem_cnpj', v_pulados_sem_cnpj,
    'orcamentos_ja_vinculados', v_ja_vinculados
  );
end;
$$;

grant execute on function public.backfill_orcamentos_aprovados_clientes() to authenticated;

-- Executa regularização imediatamente ao aplicar a migration
do $$
declare
  v_result jsonb;
begin
  v_result := public.backfill_orcamentos_aprovados_clientes();
  raise notice 'backfill_orcamentos_aprovados_clientes: %', v_result;
end $$;
