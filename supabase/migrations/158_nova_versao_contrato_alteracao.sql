-- Nova versão completa do contrato depois da alteração de contratação.
-- O PDF anterior permanece, com o envio e a assinatura daquela versão.
-- A versão atual começa sem envio e sem assinatura.
-- Não reescreve parcelas, não mexe na vigência, na renovação, na data de
-- início nem na liberação de agendamento.

alter table public.orcamento_aprovacoes
  add column if not exists contrato_versao_situacao text null;

alter table public.orcamento_aprovacoes
  drop constraint if exists orcamento_aprovacoes_contrato_versao_situacao_check;

alter table public.orcamento_aprovacoes
  add constraint orcamento_aprovacoes_contrato_versao_situacao_check
  check (
    contrato_versao_situacao is null
    or contrato_versao_situacao in ('pendente_geracao', 'gerado')
  );

comment on column public.orcamento_aprovacoes.contrato_versao_situacao is
  'Versão documental aberta pela alteração de contratação: pendente_geracao ou gerado. Nula quando essa versão não está em aberto.';

alter table public.orcamento_contrato_documentos
  add column if not exists versao_enviado boolean null,
  add column if not exists versao_enviado_em date null,
  add column if not exists versao_assinado boolean null,
  add column if not exists versao_assinado_em date null;

comment on column public.orcamento_contrato_documentos.versao_enviado is
  'Envio registrado na aprovação quando este PDF deixou de ser a versão atual.';

comment on column public.orcamento_contrato_documentos.versao_assinado is
  'Assinatura registrada na aprovação quando este PDF deixou de ser a versão atual.';

create or replace function public.abrir_revisao_contratual_apos_alteracao(
  p_aprovacao_id uuid,
  p_modo text default 'alteracao'
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_aprov public.orcamento_aprovacoes%rowtype;
  v_docs integer := 0;
  v_usuario uuid := auth.uid();
  v_nome text;
  v_email text;
  v_numero text;
begin
  if v_usuario is null or not public.is_admin_user() then
    raise exception 'Você não possui permissão para preparar a nova versão do contrato. Esta ação é exclusiva para administradores.';
  end if;

  if p_modo not in ('alteracao', 'preparar') then
    raise exception 'Modo de revisão contratual inválido.';
  end if;

  select * into v_aprov
  from public.orcamento_aprovacoes
  where id = p_aprovacao_id
  for update;

  if not found or v_aprov.revertida_em is not null then
    raise exception 'Aprovação não encontrada.';
  end if;

  if p_modo = 'preparar' and not exists (
    select 1
    from public.orcamento_contratacao_alteracoes
    where aprovacao_id = p_aprovacao_id
  ) then
    raise exception 'Não há alteração de contratação confirmada para preparar uma nova versão.';
  end if;

  if v_aprov.contrato_versao_situacao = 'pendente_geracao'
     and coalesce(v_aprov.contrato_assinado, false) = false
     and coalesce(v_aprov.contrato_enviado, false) = false then
    return jsonb_build_object(
      'preparada', true,
      'repetida', true,
      'situacao', 'pendente_geracao',
      'documentos_preservados', 0
    );
  end if;

  if p_modo = 'preparar'
     and v_aprov.contrato_versao_situacao = 'gerado'
     and coalesce(v_aprov.contrato_assinado, false) = false then
    raise exception 'A nova versão já foi gerada. Ela continua sem envio e sem assinatura.';
  end if;

  update public.orcamento_contrato_documentos
  set substituido_em = now(),
      substituido_motivo = 'Nova versão após alteração de contratação',
      versao_enviado = coalesce(v_aprov.contrato_enviado, false),
      versao_enviado_em = v_aprov.contrato_enviado_em,
      versao_assinado = coalesce(v_aprov.contrato_assinado, false),
      versao_assinado_em = v_aprov.contrato_assinado_em
  where aprovacao_id = p_aprovacao_id
    and sem_validade_em is null
    and substituido_em is null;
  get diagnostics v_docs = row_count;

  update public.orcamento_aprovacoes
  set contrato_enviado = false,
      contrato_enviado_em = null,
      contrato_assinado = false,
      contrato_assinado_em = null,
      contrato_versao_situacao = 'pendente_geracao',
      updated_at = now()
  where id = p_aprovacao_id;

  select o.numero into v_numero
  from public.orcamentos o
  where o.id = v_aprov.orcamento_id;

  select nome, email into v_nome, v_email
  from public.perfis_usuarios
  where user_id = v_usuario
    and perfil = 'admin'
    and ativo = true;

  insert into public.auditoria_sistema (
    usuario_id, usuario_nome, usuario_email, modulo, acao,
    registro_id, registro_nome, descricao, dados_antes, dados_depois
  ) values (
    v_usuario,
    coalesce(v_nome, ''),
    coalesce(v_email, ''),
    'implantacao_clientes',
    'nova_versao_contrato_contratacao',
    v_aprov.orcamento_id,
    v_numero,
    coalesce(v_nome, 'Administrador')
      || ' preparou a nova versão do contrato do orçamento '
      || coalesce(v_numero, '')
      || '. O PDF anterior permanece no histórico. A nova versão ainda não foi gerada, enviada nem assinada.',
    jsonb_build_object(
      'contrato_enviado', v_aprov.contrato_enviado,
      'contrato_enviado_em', v_aprov.contrato_enviado_em,
      'contrato_assinado', v_aprov.contrato_assinado,
      'contrato_assinado_em', v_aprov.contrato_assinado_em,
      'documentos_preservados', v_docs
    ),
    jsonb_build_object(
      'contrato_enviado', false,
      'contrato_assinado', false,
      'contrato_versao_situacao', 'pendente_geracao'
    )
  );

  return jsonb_build_object(
    'preparada', true,
    'repetida', false,
    'situacao', 'pendente_geracao',
    'documentos_preservados', v_docs
  );
end;
$$;

comment on function public.abrir_revisao_contratual_apos_alteracao(uuid, text) is
  'Arquiva o PDF atual com o envio e a assinatura daquela versão e abre a versão seguinte como pendente de geração. Não altera parcelas, vigência, renovação, data de início nem liberação de agendamento.';

revoke all on function public.abrir_revisao_contratual_apos_alteracao(uuid, text) from public, anon, authenticated;
grant execute on function public.abrir_revisao_contratual_apos_alteracao(uuid, text) to service_role;

create or replace function public.preparar_nova_versao_contrato_contratacao(
  p_aprovacao_id uuid
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  return public.abrir_revisao_contratual_apos_alteracao(p_aprovacao_id, 'preparar');
end;
$$;

comment on function public.preparar_nova_versao_contrato_contratacao(uuid) is
  'Prepara a nova versão de um contrato cuja alteração já foi confirmada, sem reaplicar quantidade, mensalidade ou parcelas.';

revoke all on function public.preparar_nova_versao_contrato_contratacao(uuid) from public, anon;
grant execute on function public.preparar_nova_versao_contrato_contratacao(uuid) to authenticated, service_role;

create or replace function public.trg_revisao_contratual_apos_alteracao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.abrir_revisao_contratual_apos_alteracao(new.aprovacao_id, 'alteracao');
  return new;
end;
$$;

drop trigger if exists trg_revisao_contratual_apos_alteracao
  on public.orcamento_contratacao_alteracoes;

create trigger trg_revisao_contratual_apos_alteracao
  after insert on public.orcamento_contratacao_alteracoes
  for each row execute function public.trg_revisao_contratual_apos_alteracao();

revoke all on function public.trg_revisao_contratual_apos_alteracao() from public, anon, authenticated;
grant execute on function public.trg_revisao_contratual_apos_alteracao() to service_role;

create or replace function public.aplicar_alteracao_contratacao_mensalidade(
  p_aprovacao_id uuid,
  p_quantidade integer,
  p_valor_mensal numeric,
  p_numero_inicio integer,
  p_motivo text,
  p_token text,
  p_idempotencia uuid
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_existente jsonb;
  v_class jsonb;
  v_nome text;
  v_email text;
  v_usuario uuid := auth.uid();
  v_aditivo uuid;
  v_alteracao uuid;
  v_docs integer := 0;
  v_atualizadas integer := 0;
  v_resultado jsonb;
  v_revisao jsonb;
  v_inicio date;
  v_vencimento date;
  v_contrato uuid;
  v_orcamento uuid;
  v_assinado boolean;
  r record;
begin
  if v_usuario is null or not public.is_admin_user() then
    raise exception 'Você não possui permissão para alterar a contratação. Esta ação é exclusiva para administradores.';
  end if;
  if p_idempotencia is null or nullif(trim(coalesce(p_token, '')), '') is null then
    raise exception 'A confirmação precisa de uma prévia válida.';
  end if;

  select resultado into v_existente
  from public.orcamento_contratacao_alteracoes
  where idempotencia = p_idempotencia;
  if found then
    return v_existente;
  end if;

  select nome, email into v_nome, v_email
  from public.perfis_usuarios
  where user_id = v_usuario
    and perfil = 'admin'
    and ativo = true;
  if v_nome is null then
    raise exception 'Você não possui permissão para alterar a contratação. Esta ação é exclusiva para administradores.';
  end if;

  perform 1 from public.orcamento_aprovacoes where id = p_aprovacao_id for update;
  perform 1
  from public.cliente_contratos c
  join public.orcamento_aprovacoes a on a.orcamento_id = c.orcamento_id
  where a.id = p_aprovacao_id
  for update;
  perform 1
  from public.orcamento_mensalidade_parcelas
  where aprovacao_id = p_aprovacao_id
    and sem_vigencia_em is null
  for update;
  perform 1
  from public.contrato_vagas v
  join public.cliente_contratos c on c.id = v.contrato_id
  join public.orcamento_aprovacoes a on a.orcamento_id = c.orcamento_id
  where a.id = p_aprovacao_id
  for update;

  v_class := public.classificar_alteracao_contratacao_mensalidade(
    p_aprovacao_id, p_quantidade, p_valor_mensal, p_numero_inicio, p_motivo
  );

  if coalesce(v_class->>'token', '') is distinct from p_token then
    select resultado into v_existente
    from public.orcamento_contratacao_alteracoes
    where idempotencia = p_idempotencia;
    if found then
      return v_existente;
    end if;
    raise exception 'Os dados mudaram depois da prévia. Gere uma nova prévia antes de confirmar.';
  end if;

  if jsonb_array_length(coalesce(v_class->'impedimentos', '[]'::jsonb)) > 0 then
    raise exception '%', v_class->'impedimentos'->>0;
  end if;

  v_inicio := (v_class->>'vigencia_inicio')::date;
  v_vencimento := (v_class->>'efeito_vencimento')::date;
  v_contrato := (v_class->>'contrato_id')::uuid;
  v_orcamento := (v_class->>'orcamento_id')::uuid;
  v_assinado := coalesce((v_class->>'contrato_assinado')::boolean, false);
  if v_inicio is null or v_vencimento is null or v_contrato is null then
    raise exception 'Não foi possível confirmar a vigência da alteração.';
  end if;

  perform set_config('navarro.alteracao_contratacao', '1', true);

  for r in
    select value as item
    from jsonb_array_elements(v_class->'parcelas_atualizar')
  loop
    update public.orcamento_mensalidade_parcelas
    set valor = round(p_valor_mensal, 2),
        updated_at = now()
    where id = (r.item->>'id')::uuid
      and numero >= p_numero_inicio
      and pago_em is null
      and valor_recebido is null
      and nullif(trim(coalesce(comprovante_path, '')), '') is null
      and sem_vigencia_em is null;
    if not found then
      raise exception 'Uma parcela mudou durante a confirmação. Gere uma nova prévia.';
    end if;
    v_atualizadas := v_atualizadas + 1;
  end loop;

  if v_atualizadas is distinct from jsonb_array_length(v_class->'parcelas_atualizar') then
    raise exception 'Nem todas as parcelas elegíveis puderam ser atualizadas. Nada foi salvo.';
  end if;

  update public.orcamento_aprovacoes
  set quantidade_colaboradores = p_quantidade,
      valor_final = round(p_valor_mensal, 2),
      mensalidade_valor_mensal = round(p_valor_mensal, 2),
      contratacao_efeito_vigencia_inicio = v_inicio,
      contratacao_efeito_numero = p_numero_inicio,
      contratacao_efeito_vencimento = v_vencimento,
      contratacao_valor_anterior = (v_class->>'valor_anterior')::numeric,
      contratacao_quantidade_anterior = (v_class->>'quantidade_anterior')::integer,
      updated_at = now()
  where id = p_aprovacao_id
    and revertida_em is null;

  update public.orcamento_aprovacao_itens
  set valor_unitario = case
        when round(valor_total * 100) = round((v_class->>'valor_anterior')::numeric * 100)
          then round(p_valor_mensal, 2)
        else valor_unitario
      end,
      valor_total = case
        when round(valor_total * 100) = round((v_class->>'valor_anterior')::numeric * 100)
          then round(p_valor_mensal, 2)
        else valor_total
      end,
      quantidade = case
        when quantidade = (v_class->>'quantidade_anterior')::numeric then p_quantidade
        else quantidade
      end
  where aprovacao_id = p_aprovacao_id
    and public.normalizar_nome_servico(servico_nome) in (
      'gestao sst - mensal',
      'gestao sst mensal',
      'gestao completa sst'
    )
    and (
      round(valor_total * 100) = round((v_class->>'valor_anterior')::numeric * 100)
      or quantidade = (v_class->>'quantidade_anterior')::numeric
    );

  update public.cliente_contratos
  set quantidade_colaboradores = p_quantidade,
      valor_contrato = round(p_valor_mensal, 2),
      updated_at = now()
  where id = v_contrato
    and aprovacao_revertida_em is null
    and status not in ('encerrado', 'cancelado');

  insert into public.contrato_vagas (contrato_id, orcamento_id, indice, status)
  select v_contrato, v_orcamento, g.indice, 'aberta'
  from generate_series(1, p_quantidade) as g(indice)
  where not exists (
    select 1 from public.contrato_vagas v
    where v.contrato_id = v_contrato and v.indice = g.indice
  );

  v_revisao := public.abrir_revisao_contratual_apos_alteracao(p_aprovacao_id, 'alteracao');
  v_docs := coalesce((v_revisao->>'documentos_preservados')::integer, 0);

  insert into public.orcamento_aprovacao_condicoes_historico (
    aprovacao_id, orcamento_id, alterado_por,
    quantidade_anterior, quantidade_nova, valor_anterior, valor_novo,
    pagamento_anterior, pagamento_novo,
    observacoes_anteriores, observacoes_novas
  )
  select
    a.id, a.orcamento_id, v_nome,
    (v_class->>'quantidade_anterior')::integer, p_quantidade,
    (v_class->>'valor_anterior')::numeric, round(p_valor_mensal, 2),
    coalesce(nullif(trim(a.condicao_pagamento), ''), 'Mensal')
      || ' de ' || public.format_moeda_br((v_class->>'valor_anterior')::numeric) || '.',
    coalesce(nullif(trim(a.condicao_pagamento), ''), 'Mensal')
      || ' de ' || public.format_moeda_br(round(p_valor_mensal, 2))
      || ' a partir da mensalidade ' || p_numero_inicio::text
      || ' (' || to_char(v_vencimento, 'DD/MM/YYYY') || ').',
    a.observacoes, a.observacoes
  from public.orcamento_aprovacoes a
  where a.id = p_aprovacao_id;

  v_resultado := v_class || jsonb_build_object(
    'aplicada', true,
    'aditivo_id', v_aditivo,
    'documentos_substituidos', v_docs,
    'nova_versao', true,
    'parcelas_atualizadas_total', v_atualizadas
  );

  insert into public.orcamento_contratacao_alteracoes (
    idempotencia, aprovacao_id, orcamento_id, contrato_id,
    usuario_id, usuario_nome, motivo,
    quantidade_anterior, quantidade_nova, valor_anterior, valor_novo,
    efeito_vigencia_inicio, efeito_numero, efeito_vencimento,
    parcelas_alteradas, parcelas_preservadas, contrato_assinado,
    aditivo_id, resultado
  ) values (
    p_idempotencia, p_aprovacao_id, v_orcamento, v_contrato,
    v_usuario, v_nome, v_class->>'motivo',
    (v_class->>'quantidade_anterior')::integer, p_quantidade,
    (v_class->>'valor_anterior')::numeric, round(p_valor_mensal, 2),
    v_inicio, p_numero_inicio, v_vencimento,
    v_class->'parcelas_atualizar', v_class->'parcelas_preservar', v_assinado,
    v_aditivo, v_resultado
  )
  returning id into v_alteracao;

  insert into public.auditoria_sistema (
    usuario_id, usuario_nome, usuario_email, modulo, acao,
    registro_id, registro_nome, descricao, dados_antes, dados_depois
  ) values (
    v_usuario, v_nome, coalesce(v_email, ''),
    'implantacao_clientes', 'alteracao_contratacao_mensalidade',
    v_orcamento, v_class->>'numero_orcamento',
    v_nome || ' alterou a contratação do orçamento ' || coalesce(v_class->>'numero_orcamento', '')
      || ': ' || coalesce(v_class->>'quantidade_anterior', '') || ' para ' || p_quantidade::text
      || ' colaboradores e ' || public.format_moeda_br((v_class->>'valor_anterior')::numeric)
      || ' para ' || public.format_moeda_br(round(p_valor_mensal, 2))
      || ', a partir da mensalidade ' || p_numero_inicio::text
      || '. Motivo: ' || coalesce(v_class->>'motivo', '')
      || '. Parcelas atualizadas no próprio registro: ' || v_atualizadas::text || '.',
    jsonb_build_object(
      'quantidade', v_class->'quantidade_anterior',
      'mensalidade', v_class->'valor_anterior'
    ),
    jsonb_build_object(
      'quantidade', p_quantidade,
      'mensalidade', round(p_valor_mensal, 2),
      'efeito_numero', p_numero_inicio,
      'efeito_vencimento', v_vencimento,
      'alteracao_id', v_alteracao,
      'parcelas', v_class->'parcelas_atualizar'
    )
  );

  return v_resultado || jsonb_build_object('alteracao_id', v_alteracao);
end;
$$;

comment on function public.aplicar_alteracao_contratacao_mensalidade(
  uuid, integer, numeric, integer, text, text, uuid
) is
  'Atualiza a contratação e abre a nova versão do contrato. Não cria cobrança da diferença, não envia e não assina o documento novo.';


create or replace function public.registrar_contrato_documento_gerado(
  p_aprovacao_id uuid,
  p_condicoes_revisao bigint,
  p_orcamento_id uuid,
  p_cliente_id uuid,
  p_modalidade text,
  p_data_contrato date,
  p_storage_path text,
  p_arquivo_nome text,
  p_arquivo_tipo text,
  p_arquivo_tamanho integer,
  p_gerado_por text,
  p_gerado_por_user_id uuid
)
returns public.orcamento_contrato_documentos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orcamento_id uuid;
  v_rev bigint;
  v_assinado boolean;
  v_status text;
  v_versao integer;
  v_row public.orcamento_contrato_documentos;
begin
  if not public.is_staff_user() then
    raise exception 'Você não tem permissão para gerar o contrato.';
  end if;

  if p_condicoes_revisao is null or p_condicoes_revisao < 1 then
    raise exception 'Não foi possível identificar a versão das condições aprovadas. Recarregue a tela e gere o contrato novamente.';
  end if;

  if p_modalidade not in ('pontual', 'mensalidade') then
    raise exception 'Modalidade do contrato inválida.';
  end if;

  if nullif(trim(coalesce(p_storage_path, '')), '') is null
    or nullif(trim(coalesce(p_arquivo_nome, '')), '') is null
    or p_data_contrato is null then
    raise exception 'O arquivo do contrato está incompleto.';
  end if;

  select a.orcamento_id
    into v_orcamento_id
  from public.orcamento_aprovacoes a
  where a.id = p_aprovacao_id;

  if v_orcamento_id is null then
    raise exception 'Aprovação não encontrada.';
  end if;

  if v_orcamento_id is distinct from p_orcamento_id then
    raise exception 'O contrato não corresponde ao orçamento aprovado.';
  end if;

  perform 1
  from public.orcamentos
  where id = v_orcamento_id
  for update;

  select
    a.condicoes_revisao,
    coalesce(a.contrato_assinado, false),
    o.status
  into v_rev, v_assinado, v_status
  from public.orcamento_aprovacoes a
  join public.orcamentos o on o.id = a.orcamento_id
  where a.id = p_aprovacao_id
  for update of a;

  if not found then
    raise exception 'Aprovação não encontrada.';
  end if;

  if v_assinado then
    raise exception 'Contrato assinado. O PDF não pode ser substituído.';
  end if;

  if v_status is distinct from 'aprovado' then
    raise exception 'Só é possível gerar o contrato de um orçamento aprovado.';
  end if;

  if v_rev is distinct from p_condicoes_revisao then
    raise exception 'As condições aprovadas mudaram durante a geração. O PDF não foi armazenado e o contrato anterior permanece desatualizado. Gere novamente a partir das condições vigentes.';
  end if;

  select coalesce(max(d.versao), 0) + 1
    into v_versao
  from public.orcamento_contrato_documentos d
  where d.aprovacao_id = p_aprovacao_id;

  insert into public.orcamento_contrato_documentos (
    orcamento_id,
    aprovacao_id,
    cliente_id,
    modalidade,
    data_contrato,
    versao,
    storage_path,
    arquivo_nome,
    arquivo_tipo,
    arquivo_tamanho,
    gerado_por,
    gerado_por_user_id,
    condicoes_revisao,
    desatualizado_em
  ) values (
    p_orcamento_id,
    p_aprovacao_id,
    p_cliente_id,
    p_modalidade,
    p_data_contrato,
    v_versao,
    trim(p_storage_path),
    trim(p_arquivo_nome),
    nullif(trim(coalesce(p_arquivo_tipo, '')), ''),
    p_arquivo_tamanho,
    nullif(trim(coalesce(p_gerado_por, '')), ''),
    p_gerado_por_user_id,
    p_condicoes_revisao,
    null
  )
  returning * into v_row;

  update public.orcamento_aprovacoes
  set contrato_versao_situacao = 'gerado',
      updated_at = now()
  where id = p_aprovacao_id
    and contrato_versao_situacao = 'pendente_geracao'
    and coalesce(contrato_assinado, false) = false
    and coalesce(contrato_enviado, false) = false;

  return v_row;
end;
$$;

comment on function public.registrar_contrato_documento_gerado(
  uuid, bigint, uuid, uuid, text, date, text, text, text, integer, text, uuid
) is
  'Grava a próxima versão do PDF. Se havia revisão pendente, marca a versão atual como gerada, sem enviar nem assinar.';
