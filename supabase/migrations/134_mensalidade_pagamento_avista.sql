-- Mensalidade já aprovada pode ser paga à vista (vigência inteira), com desconto.
-- A modalidade continua mensalidade e o orçamento continua aprovado.
-- Não quita o pagamento, não apaga cobrança com histórico e não substitui contrato assinado.

alter table public.orcamento_aprovacoes
  add column if not exists mensalidade_pagamento text null,
  add column if not exists mensalidade_valor_mensal numeric(12, 2) null,
  add column if not exists mensalidade_meses integer null,
  add column if not exists mensalidade_valor_bruto numeric(12, 2) null,
  add column if not exists mensalidade_valor_pontual numeric(12, 2) null,
  add column if not exists mensalidade_desconto_valor numeric(12, 2) null,
  add column if not exists mensalidade_desconto_tipo text null,
  add column if not exists mensalidade_vencimento date null;

alter table public.orcamento_aprovacoes
  drop constraint if exists orcamento_aprovacoes_mensalidade_pagamento_check;
alter table public.orcamento_aprovacoes
  add constraint orcamento_aprovacoes_mensalidade_pagamento_check
  check (
    mensalidade_pagamento is null
    or mensalidade_pagamento in ('mensal', 'avista')
  );

alter table public.orcamento_aprovacoes
  drop constraint if exists orcamento_aprovacoes_mensalidade_desconto_tipo_check;
alter table public.orcamento_aprovacoes
  add constraint orcamento_aprovacoes_mensalidade_desconto_tipo_check
  check (
    mensalidade_desconto_tipo is null
    or mensalidade_desconto_tipo in ('valor', 'percentual')
  );

comment on column public.orcamento_aprovacoes.mensalidade_pagamento is
  'Forma vigente da mensalidade aprovada: mensal ou avista. Null = mensal (registros antigos).';
comment on column public.orcamento_aprovacoes.mensalidade_valor_mensal is
  'Valor mensal de referência usado na base do período. Não é o total à vista.';
comment on column public.orcamento_aprovacoes.mensalidade_meses is
  'Meses da vigência usados no cálculo. Não altera a modalidade.';
comment on column public.orcamento_aprovacoes.mensalidade_valor_bruto is
  'Total bruto do período (gestão × meses + serviços pontuais, sem desconto).';
comment on column public.orcamento_aprovacoes.mensalidade_valor_pontual is
  'Serviços pontuais adicionais, somados uma vez e fora do desconto automático.';
comment on column public.orcamento_aprovacoes.mensalidade_desconto_valor is
  'Desconto em reais aplicado só sobre a gestão do período.';
comment on column public.orcamento_aprovacoes.mensalidade_vencimento is
  'Vencimento do pagamento único. Não significa que o valor foi pago.';

alter table public.orcamento_contrato_documentos
  add column if not exists desatualizado_em timestamptz null;

comment on column public.orcamento_contrato_documentos.desatualizado_em is
  'Preenchido quando as condições aprovadas mudam depois da geração. A versão permanece; a geração seguinte cria outro PDF.';

create or replace function public.format_moeda_br(p_valor numeric)
returns text
language plpgsql
immutable
as $$
declare
  v_abs numeric := abs(round(coalesce(p_valor, 0), 2));
  v_txt text := to_char(v_abs, 'FM999999990.00');
  v_int text := split_part(v_txt, '.', 1);
  v_dec text := split_part(v_txt, '.', 2);
  v_out text := '';
begin
  while length(v_int) > 3 loop
    v_out := '.' || right(v_int, 3) || v_out;
    v_int := left(v_int, length(v_int) - 3);
  end loop;
  v_out := v_int || v_out || ',' || v_dec;
  if coalesce(p_valor, 0) < 0 then
    v_out := '-' || v_out;
  end if;
  return 'R$ ' || v_out;
end;
$$;

create or replace function public.normalizar_nome_servico(p_nome text)
returns text
language sql
immutable
as $$
  select trim(
    regexp_replace(
      lower(
        translate(
          coalesce(p_nome, ''),
          'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ',
          'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn'
        )
      ),
      '\s+',
      ' ',
      'g'
    )
  );
$$;

create or replace function public.atualizar_condicoes_mensalidade_aprovadas(
  p_aprovacao_id uuid,
  p_quantidade integer,
  p_valor_mensal numeric,
  p_forma text,
  p_desconto_tipo text,
  p_desconto numeric,
  p_valor_final numeric,
  p_vencimento date,
  p_observacoes text,
  p_alterado_por text,
  p_fonte text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orc public.orcamentos%rowtype;
  v_aprov public.orcamento_aprovacoes%rowtype;
  v_orcamento_id uuid;
  v_meses integer;
  v_mensal_cents bigint;
  v_pontual_cents bigint := 0;
  v_base_cents bigint;
  v_bruto_cents bigint;
  v_desconto_cents bigint := 0;
  v_final_cents bigint := 0;
  v_percent numeric(12, 4) := 0;
  v_forma text;
  v_fonte text;
  v_tipo text;
  v_condicao text;
  v_obs text;
  v_pag_anterior text;
  v_pag_novo text;
  v_assinado boolean := false;
  v_movimento boolean := false;
  v_forma_atual text;
  v_contratos integer := 0;
  r record;
begin
  if not public.is_staff_user() then
    raise exception 'Você não tem permissão para editar as condições aprovadas.';
  end if;

  if nullif(trim(coalesce(p_alterado_por, '')), '') is null then
    raise exception 'Informe o usuário responsável pela alteração.';
  end if;

  v_forma := lower(trim(coalesce(p_forma, '')));
  if v_forma not in ('mensal', 'avista') then
    raise exception 'Informe a forma de pagamento da mensalidade.';
  end if;

  select a.orcamento_id
    into v_orcamento_id
  from public.orcamento_aprovacoes a
  where a.id = p_aprovacao_id;

  if v_orcamento_id is null then
    raise exception 'Aprovação não encontrada.';
  end if;

  select *
    into v_orc
  from public.orcamentos
  where id = v_orcamento_id
  for update;

  if not found then
    raise exception 'Orçamento não encontrado.';
  end if;

  select *
    into v_aprov
  from public.orcamento_aprovacoes
  where id = p_aprovacao_id
  for update;

  if v_orc.status is distinct from 'aprovado' then
    raise exception 'Só é possível editar as condições de um orçamento aprovado.';
  end if;
  if v_orc.modalidade is distinct from 'mensalidade' then
    raise exception 'Esta alteração vale somente para a modalidade Mensalidade.';
  end if;
  if coalesce(p_quantidade, 0) < 1 then
    raise exception 'Informe a quantidade de colaboradores.';
  end if;
  if coalesce(p_valor_mensal, 0) <= 0 then
    raise exception 'Informe o valor da mensalidade.';
  end if;

  perform 1
  from public.cliente_contratos c
  where c.orcamento_id = v_orcamento_id
  for update;

  v_assinado := coalesce(v_aprov.contrato_assinado, false)
    or exists (
      select 1
      from public.cliente_contratos c
      where c.orcamento_id = v_orcamento_id
        and c.status not in ('encerrado', 'cancelado')
        and (
          c.contrato_assinado_em is not null
          or c.status in ('assinado', 'ativo')
        )
    );

  if v_assinado then
    raise exception 'Não é possível alterar as condições de pagamento porque o contrato já está assinado. O documento assinado não é substituído. Use o fluxo de alteração contratual.';
  end if;

  v_forma_atual := coalesce(v_aprov.mensalidade_pagamento, 'mensal');
  v_movimento := coalesce(v_aprov.boleto_pago, false)
    or v_aprov.boleto_vencimento is not null
    or v_aprov.boleto_pago_em is not null
    or nullif(trim(coalesce(v_aprov.comprovante_path, '')), '') is not null
    or v_aprov.pagamento_confirmado_em is not null
    or exists (
      select 1
      from public.cliente_contratos c
      where c.orcamento_id = v_orcamento_id
        and c.status not in ('encerrado', 'cancelado')
        and (
          coalesce(c.boleto_pago, false)
          or c.boleto_vencimento is not null
          or c.boleto_pago_em is not null
          or c.status in ('pago', 'aguardando_pagamento', 'ativo')
        )
    );

  if (v_forma = 'avista' or v_forma_atual = 'avista') and v_movimento then
    raise exception 'Não é possível alterar o pagamento à vista porque já existe cobrança emitida, boleto ou pagamento registrado. Cobranças com histórico não são apagadas e boletos não são cancelados por esta alteração.';
  end if;

  select
    (
      extract(year from age(c.data_fim, c.data_inicio))::int * 12
      + extract(month from age(c.data_fim, c.data_inicio))::int
    )
    into v_meses
  from public.cliente_contratos c
  where c.orcamento_id = v_orcamento_id
    and c.status not in ('encerrado', 'cancelado')
    and c.data_inicio is not null
    and c.data_fim is not null
    and c.data_fim > c.data_inicio
  order by c.created_at desc
  limit 1;

  if v_meses is null or v_meses < 1 then
    v_meses := (
      extract(year from age(
        public.calcular_fim_vigencia_meses(date '2000-01-01'),
        date '2000-01-01'
      ))::int * 12
      + extract(month from age(
        public.calcular_fim_vigencia_meses(date '2000-01-01'),
        date '2000-01-01'
      ))::int
    );
  end if;

  if v_meses is null or v_meses < 1 then
    raise exception 'Não foi possível identificar a vigência contratada.';
  end if;

  v_mensal_cents := round(p_valor_mensal * 100)::bigint;

  for r in
    select i.servico_nome, i.valor_total
    from public.orcamento_aprovacao_itens i
    where i.aprovacao_id = p_aprovacao_id
  loop
    if public.normalizar_nome_servico(r.servico_nome) not in (
      'gestao sst - mensal',
      'gestao sst mensal',
      'gestao completa sst'
    ) and coalesce(r.valor_total, 0) > 0 then
      v_pontual_cents := v_pontual_cents + round(r.valor_total * 100)::bigint;
    end if;
  end loop;

  v_base_cents := v_mensal_cents * v_meses;
  v_bruto_cents := v_base_cents + v_pontual_cents;
  v_fonte := lower(trim(coalesce(p_fonte, 'desconto')));
  v_tipo := lower(trim(coalesce(p_desconto_tipo, 'valor')));
  if v_tipo not in ('valor', 'percentual') then
    v_tipo := 'valor';
  end if;
  v_obs := nullif(trim(coalesce(p_observacoes, '')), '');

  if v_forma = 'avista' then
    if v_fonte = 'final' then
      v_final_cents := round(coalesce(p_valor_final, 0) * 100)::bigint;
      v_desconto_cents := v_bruto_cents - v_final_cents;
    elsif v_tipo = 'percentual' then
      if coalesce(p_desconto, 0) < 0 then
        raise exception 'O desconto não pode ser negativo.';
      end if;
      v_desconto_cents := round(v_base_cents * coalesce(p_desconto, 0) / 100.0)::bigint;
      v_final_cents := v_bruto_cents - v_desconto_cents;
    else
      if coalesce(p_desconto, 0) < 0 then
        raise exception 'O desconto não pode ser negativo.';
      end if;
      v_desconto_cents := round(coalesce(p_desconto, 0) * 100)::bigint;
      v_final_cents := v_bruto_cents - v_desconto_cents;
    end if;

    if v_desconto_cents < 0 then
      if v_final_cents > v_bruto_cents then
        raise exception 'O valor final à vista não pode ser maior que o total bruto.';
      end if;
      raise exception 'O desconto não pode ser negativo.';
    end if;
    if v_desconto_cents > v_base_cents then
      raise exception 'O desconto não pode ser maior que a base da gestão no período.';
    end if;
    if v_final_cents <= 0 then
      raise exception 'O valor final à vista deve ser maior que zero.';
    end if;
    if v_final_cents > v_bruto_cents then
      raise exception 'O valor final à vista não pode ser maior que o total bruto.';
    end if;
    if p_vencimento is null then
      raise exception 'Informe o vencimento do pagamento único.';
    end if;

    if v_base_cents > 0 then
      v_percent := round((v_desconto_cents::numeric * 100) / v_base_cents, 4);
    else
      v_percent := 0;
    end if;

    v_condicao := 'À vista';
  else
    v_desconto_cents := 0;
    v_final_cents := 0;
    v_percent := 0;
    v_condicao := v_meses::text || ' mensalidades';
  end if;

  if v_aprov.quantidade_colaboradores = p_quantidade
     and round(v_aprov.valor_final * 100)::bigint = v_mensal_cents
     and coalesce(v_aprov.mensalidade_pagamento, 'mensal') = v_forma
     and coalesce(v_aprov.observacoes, '') = coalesce(v_obs, '')
     and (
       v_forma = 'mensal'
       or (
         round(coalesce(v_aprov.valor_avista, 0) * 100)::bigint = v_final_cents
         and v_aprov.mensalidade_vencimento is not distinct from p_vencimento
         and round(coalesce(v_aprov.mensalidade_desconto_valor, 0) * 100)::bigint = v_desconto_cents
       )
     )
  then
    raise exception 'Nenhuma alteração nas condições aprovadas.';
  end if;

  if coalesce(v_aprov.mensalidade_pagamento, 'mensal') = 'avista' then
    v_pag_anterior :=
      'À vista. Vigência: ' || coalesce(v_aprov.mensalidade_meses, v_meses)::text
      || ' meses. Valor mensal de referência: '
      || public.format_moeda_br(coalesce(v_aprov.mensalidade_valor_mensal, v_aprov.valor_final))
      || '. Total bruto: ' || public.format_moeda_br(v_aprov.mensalidade_valor_bruto)
      || '. Desconto: ' || public.format_moeda_br(v_aprov.mensalidade_desconto_valor)
      || '. Valor final: ' || public.format_moeda_br(v_aprov.valor_avista)
      || '. Vencimento: ' || coalesce(to_char(v_aprov.mensalidade_vencimento, 'DD/MM/YYYY'), '—')
      || '.';
  else
    v_pag_anterior :=
      coalesce(nullif(trim(v_aprov.condicao_pagamento), ''), 'Mensal')
      || ' de ' || public.format_moeda_br(v_aprov.valor_final) || '.';
  end if;

  if v_forma = 'avista' then
    v_pag_novo :=
      'À vista. Vigência: ' || v_meses::text
      || ' meses. Valor mensal de referência: ' || public.format_moeda_br(p_valor_mensal)
      || '. Total bruto: ' || public.format_moeda_br(v_bruto_cents / 100.0)
      || '. Desconto: ' || public.format_moeda_br(v_desconto_cents / 100.0)
      || ' (' || replace(to_char(round(v_percent, 2), 'FM990.00'), '.', ',') || '%)'
      || '. Valor final: ' || public.format_moeda_br(v_final_cents / 100.0)
      || '. Vencimento: ' || to_char(p_vencimento, 'DD/MM/YYYY') || '.';
    if v_pontual_cents > 0 then
      v_pag_novo := v_pag_novo
        || ' Serviços pontuais adicionais: '
        || public.format_moeda_br(v_pontual_cents / 100.0) || '.';
    end if;
  else
    v_pag_novo := v_condicao || ' de ' || public.format_moeda_br(p_valor_mensal) || '.';
  end if;

  update public.orcamento_aprovacoes
  set
    quantidade_colaboradores = p_quantidade,
    valor_final = round(p_valor_mensal, 2),
    condicao_pagamento = v_condicao,
    quantidade_parcelas = case when v_forma = 'avista' then 1 else null end,
    valor_parcela = case when v_forma = 'avista' then round(v_final_cents / 100.0, 2) else null end,
    desconto_percentual = case when v_forma = 'avista' then v_percent else 0 end,
    valor_avista = case when v_forma = 'avista' then round(v_final_cents / 100.0, 2) else null end,
    observacoes = v_obs,
    mensalidade_pagamento = v_forma,
    mensalidade_valor_mensal = round(p_valor_mensal, 2),
    mensalidade_meses = v_meses,
    mensalidade_valor_bruto = case when v_forma = 'avista' then round(v_bruto_cents / 100.0, 2) else null end,
    mensalidade_valor_pontual = case when v_forma = 'avista' then round(v_pontual_cents / 100.0, 2) else null end,
    mensalidade_desconto_valor = case when v_forma = 'avista' then round(v_desconto_cents / 100.0, 2) else null end,
    mensalidade_desconto_tipo = case when v_forma = 'avista' then v_tipo else null end,
    mensalidade_vencimento = case when v_forma = 'avista' then p_vencimento else null end,
    updated_at = now()
  where id = p_aprovacao_id;

  update public.cliente_contratos
  set
    quantidade_colaboradores = p_quantidade,
    valor_contrato = round(p_valor_mensal, 2),
    condicao_pagamento = case
      when v_forma = 'avista' then v_pag_novo
      else v_condicao
    end,
    updated_at = now()
  where orcamento_id = v_orcamento_id
    and status not in ('encerrado', 'cancelado');

  get diagnostics v_contratos = row_count;
  if v_contratos < 1 then
    raise exception 'Contrato do cliente não encontrado para sincronizar as condições aprovadas.';
  end if;

  update public.orcamento_contrato_documentos
  set desatualizado_em = now()
  where orcamento_id = v_orcamento_id
    and desatualizado_em is null;

  insert into public.orcamento_aprovacao_condicoes_historico (
    aprovacao_id,
    orcamento_id,
    alterado_por,
    quantidade_anterior,
    quantidade_nova,
    valor_anterior,
    valor_novo,
    pagamento_anterior,
    pagamento_novo,
    observacoes_anteriores,
    observacoes_novas
  ) values (
    p_aprovacao_id,
    v_orcamento_id,
    trim(p_alterado_por),
    coalesce(v_aprov.quantidade_colaboradores, 0),
    p_quantidade,
    coalesce(v_aprov.valor_final, 0),
    round(p_valor_mensal, 2),
    v_pag_anterior,
    v_pag_novo,
    v_aprov.observacoes,
    v_obs
  );
end;
$$;

comment on function public.atualizar_condicoes_mensalidade_aprovadas(
  uuid, integer, numeric, text, text, numeric, numeric, date, text, text, text
) is
  'Atualiza condições aprovadas da mensalidade (mensal ou à vista) na mesma transação da aprovação, do contrato e do histórico. Bloqueia contrato assinado e movimentação financeira incompatível.';

revoke all on function public.format_moeda_br(numeric) from public;
revoke all on function public.normalizar_nome_servico(text) from public;
revoke all on function public.atualizar_condicoes_mensalidade_aprovadas(
  uuid, integer, numeric, text, text, numeric, numeric, date, text, text, text
) from public;

grant execute on function public.atualizar_condicoes_mensalidade_aprovadas(
  uuid, integer, numeric, text, text, numeric, numeric, date, text, text, text
) to authenticated;
grant execute on function public.atualizar_condicoes_mensalidade_aprovadas(
  uuid, integer, numeric, text, text, numeric, numeric, date, text, text, text
) to service_role;
