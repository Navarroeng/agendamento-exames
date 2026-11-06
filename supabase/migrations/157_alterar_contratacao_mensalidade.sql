-- Alteração da contratação de Gestão SST mensal já aprovada.
-- Atualiza o total das parcelas em aberto a partir da competência escolhida.
-- Não insere cobrança da diferença, não recria a série e não envia documento.

alter table public.orcamento_aprovacoes
  add column if not exists contratacao_efeito_vigencia_inicio date null,
  add column if not exists contratacao_efeito_numero smallint null,
  add column if not exists contratacao_efeito_vencimento date null,
  add column if not exists contratacao_valor_anterior numeric(12, 2) null,
  add column if not exists contratacao_quantidade_anterior integer null;

comment on column public.orcamento_aprovacoes.contratacao_efeito_numero is
  'Mensalidade a partir da qual a última alteração de contratação vale. Parcelas anteriores permanecem no valor já lançado.';

alter table public.orcamento_contrato_documentos
  add column if not exists substituido_em timestamptz null,
  add column if not exists substituido_motivo text null;

comment on column public.orcamento_contrato_documentos.substituido_em is
  'PDF anterior à alteração de contratação. Permanece no histórico e não é a versão atual. Não é a marca de aprovação revertida.';

create table if not exists public.orcamento_contratacao_alteracoes (
  id uuid primary key default gen_random_uuid(),
  idempotencia uuid not null unique,
  aprovacao_id uuid not null references public.orcamento_aprovacoes (id) on delete restrict,
  orcamento_id uuid not null references public.orcamentos (id) on delete restrict,
  contrato_id uuid null references public.cliente_contratos (id) on delete restrict,
  usuario_id uuid null,
  usuario_nome text not null,
  motivo text not null,
  quantidade_anterior integer not null,
  quantidade_nova integer not null,
  valor_anterior numeric(12, 2) not null,
  valor_novo numeric(12, 2) not null,
  efeito_vigencia_inicio date not null,
  efeito_numero smallint not null,
  efeito_vencimento date not null,
  parcelas_alteradas jsonb not null,
  parcelas_preservadas jsonb not null,
  contrato_assinado boolean not null,
  aditivo_id uuid null,
  resultado jsonb not null,
  created_at timestamptz not null default now()
);

comment on table public.orcamento_contratacao_alteracoes is
  'Histórico imutável da alteração de quantidade e mensalidade. A chave de idempotência impede uma segunda gravação da mesma confirmação.';

create table if not exists public.orcamento_contratacao_aditivos (
  id uuid primary key default gen_random_uuid(),
  aprovacao_id uuid not null references public.orcamento_aprovacoes (id) on delete restrict,
  orcamento_id uuid not null references public.orcamentos (id) on delete restrict,
  contrato_id uuid null references public.cliente_contratos (id) on delete restrict,
  quantidade_anterior integer not null,
  quantidade_nova integer not null,
  valor_anterior numeric(12, 2) not null,
  valor_novo numeric(12, 2) not null,
  efeito_vigencia_inicio date not null,
  efeito_numero smallint not null,
  efeito_vencimento date not null,
  motivo text not null,
  status text not null default 'pendente',
  criado_por uuid null,
  criado_em timestamptz not null default now(),
  constraint orcamento_contratacao_aditivos_status_pendente
    check (status = 'pendente')
);

comment on table public.orcamento_contratacao_aditivos is
  'Pendência de aditivo quando o contrato já está assinado. Esta ação não gera nem assina o aditivo.';

alter table public.orcamento_contratacao_alteracoes
  drop constraint if exists orcamento_contratacao_alteracoes_aditivo_id_fkey;
alter table public.orcamento_contratacao_alteracoes
  add constraint orcamento_contratacao_alteracoes_aditivo_id_fkey
  foreign key (aditivo_id) references public.orcamento_contratacao_aditivos (id);

create index if not exists idx_orcamento_contratacao_alteracoes_aprovacao
  on public.orcamento_contratacao_alteracoes (aprovacao_id, created_at desc);

create index if not exists idx_orcamento_contratacao_aditivos_aprovacao
  on public.orcamento_contratacao_aditivos (aprovacao_id, criado_em desc);

alter table public.orcamento_contratacao_alteracoes enable row level security;
alter table public.orcamento_contratacao_aditivos enable row level security;

drop policy if exists "staff_select_orcamento_contratacao_alteracoes"
  on public.orcamento_contratacao_alteracoes;
create policy "staff_select_orcamento_contratacao_alteracoes"
  on public.orcamento_contratacao_alteracoes
  for select to authenticated
  using (public.is_staff_user());

drop policy if exists "staff_select_orcamento_contratacao_aditivos"
  on public.orcamento_contratacao_aditivos;
create policy "staff_select_orcamento_contratacao_aditivos"
  on public.orcamento_contratacao_aditivos
  for select to authenticated
  using (public.is_staff_user());

grant select on public.orcamento_contratacao_alteracoes to authenticated, service_role;
grant select on public.orcamento_contratacao_aditivos to authenticated, service_role;

create or replace function public.bloquear_mutacao_contratacao_alteracao()
returns trigger
language plpgsql
as $$
begin
  raise exception 'O histórico da alteração de contratação não pode ser alterado nem apagado.';
end;
$$;

drop trigger if exists trg_bloquear_update_contratacao_alteracao
  on public.orcamento_contratacao_alteracoes;
create trigger trg_bloquear_update_contratacao_alteracao
  before update on public.orcamento_contratacao_alteracoes
  for each row execute function public.bloquear_mutacao_contratacao_alteracao();

drop trigger if exists trg_bloquear_delete_contratacao_alteracao
  on public.orcamento_contratacao_alteracoes;
create trigger trg_bloquear_delete_contratacao_alteracao
  before delete on public.orcamento_contratacao_alteracoes
  for each row execute function public.bloquear_mutacao_contratacao_alteracao();

drop trigger if exists trg_bloquear_update_contratacao_aditivo
  on public.orcamento_contratacao_aditivos;
create trigger trg_bloquear_update_contratacao_aditivo
  before update on public.orcamento_contratacao_aditivos
  for each row execute function public.bloquear_mutacao_contratacao_alteracao();

drop trigger if exists trg_bloquear_delete_contratacao_aditivo
  on public.orcamento_contratacao_aditivos;
create trigger trg_bloquear_delete_contratacao_aditivo
  before delete on public.orcamento_contratacao_aditivos
  for each row execute function public.bloquear_mutacao_contratacao_alteracao();

create or replace function public.bloquear_valor_mensalidade_fora_da_alteracao()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and new.valor is distinct from old.valor then
    if current_setting('navarro.alteracao_contratacao', true) is distinct from '1' then
      raise exception 'O valor da mensalidade só pode ser substituído pela ação Alterar contratação.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_bloquear_valor_mensalidade_fora_da_alteracao
  on public.orcamento_mensalidade_parcelas;
create trigger trg_bloquear_valor_mensalidade_fora_da_alteracao
  before update on public.orcamento_mensalidade_parcelas
  for each row execute function public.bloquear_valor_mensalidade_fora_da_alteracao();

create or replace function public.classificar_alteracao_contratacao_mensalidade(
  p_aprovacao_id uuid,
  p_quantidade integer,
  p_valor_mensal numeric,
  p_numero_inicio integer,
  p_motivo text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orc public.orcamentos%rowtype;
  v_aprov public.orcamento_aprovacoes%rowtype;
  v_contrato public.cliente_contratos%rowtype;
  v_motivo text := nullif(trim(coalesce(p_motivo, '')), '');
  v_valor_novo numeric(12, 2) := round(coalesce(p_valor_mensal, 0), 2);
  v_valor_anterior numeric(12, 2);
  v_inicio date;
  v_fim date;
  v_tem_contrato boolean := false;
  v_assinado boolean := false;
  v_boleto boolean := false;
  v_ocupadas integer := 0;
  v_indice_ocupado integer := 0;
  v_vagas_novas integer := 0;
  v_existem integer := 0;
  v_faltam integer := 0;
  v_fingerprint text := '';
  v_token text;
  v_impedimentos jsonb := '[]'::jsonb;
  v_atualizar jsonb := '[]'::jsonb;
  v_preservar jsonb := '[]'::jsonb;
  v_providencias jsonb := '[]'::jsonb;
  v_ajustes jsonb := '[]'::jsonb;
  v_houve boolean := false;
  r record;
  v_motivo_codigo text;
  v_sugerido numeric(12, 2);
begin
  select * into v_aprov
  from public.orcamento_aprovacoes
  where id = p_aprovacao_id;

  if not found then
    return jsonb_build_object('impedimentos', jsonb_build_array('Aprovação não encontrada.'));
  end if;

  select * into v_orc from public.orcamentos where id = v_aprov.orcamento_id;
  if not found then
    return jsonb_build_object('impedimentos', jsonb_build_array('Orçamento não encontrado.'));
  end if;

  select * into v_contrato
  from public.cliente_contratos c
  where c.orcamento_id = v_orc.id
    and c.aprovacao_revertida_em is null
    and c.status not in ('encerrado', 'cancelado')
  order by c.created_at desc
  limit 1;
  v_tem_contrato := found;

  v_valor_anterior := round(coalesce(v_aprov.mensalidade_valor_mensal, v_aprov.valor_final, 0), 2);
  v_sugerido := round(130 + 10 * greatest(coalesce(p_quantidade, 0) - 1, 0), 2);

  if v_motivo is null or char_length(v_motivo) < 3 then
    v_impedimentos := v_impedimentos || jsonb_build_array('Informe o motivo da alteração.');
  end if;
  if coalesce(p_quantidade, 0) < 1 then
    v_impedimentos := v_impedimentos || jsonb_build_array('Informe a nova quantidade de colaboradores.');
  end if;
  if v_valor_novo < 130 then
    v_impedimentos := v_impedimentos || jsonb_build_array('A nova mensalidade não pode ser menor que R$ 130,00.');
  end if;
  if p_numero_inicio is null or p_numero_inicio < 1 or p_numero_inicio > 12 then
    v_impedimentos := v_impedimentos || jsonb_build_array('Escolha a parcela a partir da qual a alteração vale.');
  end if;
  if v_orc.status is distinct from 'aprovado' or v_aprov.revertida_em is not null then
    v_impedimentos := v_impedimentos || jsonb_build_array('Só é possível alterar a contratação de um orçamento aprovado e vigente.');
  end if;
  if v_orc.modalidade is distinct from 'mensalidade'
     or coalesce(v_aprov.mensalidade_pagamento, 'mensal') = 'avista' then
    v_impedimentos := v_impedimentos || jsonb_build_array('Esta ação vale somente para a Gestão SST com cobrança mensal.');
  end if;
  if not exists (
    select 1
    from public.orcamento_aprovacao_itens i
    where i.aprovacao_id = v_aprov.id
      and public.normalizar_nome_servico(i.servico_nome) in (
        'gestao sst - mensal',
        'gestao sst mensal',
        'gestao completa sst'
      )
  ) then
    v_impedimentos := v_impedimentos || jsonb_build_array('Esta ação vale somente para a Gestão SST com cobrança mensal.');
  end if;
  if not v_tem_contrato then
    v_impedimentos := v_impedimentos || jsonb_build_array('Contrato vigente do cliente não encontrado.');
  elsif v_contrato.id is null then
    v_impedimentos := v_impedimentos || jsonb_build_array('Contrato vigente do cliente não encontrado.');
  elsif v_contrato.data_inicio is null
        or v_contrato.data_fim is null
        or v_contrato.data_fim <= v_contrato.data_inicio then
    v_impedimentos := v_impedimentos || jsonb_build_array('Não foi possível identificar a vigência atual do contrato.');
  else
    v_inicio := v_contrato.data_inicio;
    v_fim := v_contrato.data_fim;
  end if;

  if v_inicio is not null then
    select count(*) into v_existem
    from public.orcamento_mensalidade_parcelas p
    where p.aprovacao_id = v_aprov.id
      and p.vigencia_inicio = v_inicio
      and p.sem_vigencia_em is null;

    if v_existem = 0 then
      v_impedimentos := v_impedimentos || jsonb_build_array(
        'Não há mensalidades geradas nesta vigência. Esta ação não cria a série inicial de parcelas.'
      );
    elsif p_numero_inicio between 1 and 12 and not exists (
      select 1 from public.orcamento_mensalidade_parcelas p
      where p.aprovacao_id = v_aprov.id
        and p.vigencia_inicio = v_inicio
        and p.sem_vigencia_em is null
        and p.numero = p_numero_inicio
    ) then
      v_impedimentos := v_impedimentos || jsonb_build_array(
        'A parcela de início não existe nesta vigência. Esta ação não cria parcela nova.'
      );
    else
      select count(*) into v_faltam
      from generate_series(1, greatest(coalesce(p_numero_inicio, 1) - 1, 0)) as g(numero)
      where not exists (
        select 1 from public.orcamento_mensalidade_parcelas p
        where p.aprovacao_id = v_aprov.id
          and p.vigencia_inicio = v_inicio
          and p.sem_vigencia_em is null
          and p.numero = g.numero
      );
      if v_faltam > 0 then
        v_impedimentos := v_impedimentos || jsonb_build_array(
          'Há mensalidade anterior ao início que ainda não foi gerada. Esta ação não cria parcelas.'
        );
      end if;
    end if;

    select
      count(*) filter (
        where v.status is distinct from 'aberta'
          or nullif(trim(coalesce(v.colaborador, '')), '') is not null
          or nullif(trim(coalesce(v.colaborador_cpf, '')), '') is not null
          or v.agendamento_id is not null
          or v.credito_aso_id is not null
          or v.periodico_futuro_id is not null
      ),
      coalesce(max(v.indice) filter (
        where v.status is distinct from 'aberta'
          or nullif(trim(coalesce(v.colaborador, '')), '') is not null
          or nullif(trim(coalesce(v.colaborador_cpf, '')), '') is not null
          or v.agendamento_id is not null
          or v.credito_aso_id is not null
          or v.periodico_futuro_id is not null
      ), 0)
      into v_ocupadas, v_indice_ocupado
    from public.contrato_vagas v
    where v.contrato_id = v_contrato.id;

    if coalesce(p_quantidade, 0) >= 1 and v_ocupadas > p_quantidade then
      v_impedimentos := v_impedimentos || jsonb_build_array(
        'A nova quantidade é menor que as vagas já utilizadas. Funcionários, agendamentos e periódicos não são apagados.'
      );
    end if;
    if coalesce(p_quantidade, 0) >= 1 and v_indice_ocupado > p_quantidade then
      v_impedimentos := v_impedimentos || jsonb_build_array(
        'Há vaga utilizada acima da nova quantidade. Esta ação não remove utilização.'
      );
    end if;

    select count(*) into v_vagas_novas
    from generate_series(1, greatest(coalesce(p_quantidade, 0), 0)) as g(indice)
    where not exists (
      select 1 from public.contrato_vagas v
      where v.contrato_id = v_contrato.id and v.indice = g.indice
    );

    for r in
      select p.*
      from public.orcamento_mensalidade_parcelas p
      where p.aprovacao_id = v_aprov.id
        and p.vigencia_inicio = v_inicio
        and p.sem_vigencia_em is null
      order by p.numero
    loop
      v_motivo_codigo := null;
      if r.numero < p_numero_inicio then
        v_motivo_codigo := 'anterior';
      elsif r.pago_em is not null then
        v_motivo_codigo := 'paga';
      elsif r.valor_recebido is not null and round(r.valor_recebido * 100) < round(r.valor * 100) then
        v_motivo_codigo := 'parcial';
      elsif r.valor_recebido is not null then
        v_motivo_codigo := 'recebimento';
      elsif nullif(trim(coalesce(r.comprovante_path, '')), '') is not null then
        v_motivo_codigo := 'comprovante';
      end if;

      v_fingerprint := v_fingerprint || r.id::text || ':' || r.numero::text || ':'
        || round(r.valor * 100)::text || ':' || coalesce(r.pago_em::text, '') || ':'
        || coalesce(round(r.valor_recebido * 100)::text, '') || ':'
        || coalesce(r.comprovante_path, '') || ',';

      if v_motivo_codigo is null then
        if round(r.valor * 100) is distinct from round(v_valor_anterior * 100) then
          v_ajustes := v_ajustes || jsonb_build_array(jsonb_build_object(
            'numero', r.numero,
            'valor', r.valor,
            'mensagem', 'O total desta parcela difere da mensalidade contratada. A confirmação substitui esse total. Não há coluna separada de desconto ou encargo.'
          ));
        end if;
        if round(r.valor * 100) is distinct from round(v_valor_novo * 100) then
          v_houve := true;
        end if;
        v_atualizar := v_atualizar || jsonb_build_array(jsonb_build_object(
          'id', r.id,
          'numero', r.numero,
          'vencimento', r.vencimento,
          'valor_anterior', r.valor,
          'valor_novo', v_valor_novo
        ));
      else
        v_preservar := v_preservar || jsonb_build_array(jsonb_build_object(
          'id', r.id,
          'numero', r.numero,
          'vencimento', r.vencimento,
          'valor', r.valor,
          'motivo', v_motivo_codigo
        ));
      end if;
    end loop;
  end if;

  if coalesce(p_quantidade, 0) is distinct from v_aprov.quantidade_colaboradores
     or round(v_valor_novo * 100) is distinct from round(v_valor_anterior * 100) then
    v_houve := true;
  end if;
  if v_vagas_novas > 0 then
    v_houve := true;
  end if;
  if jsonb_array_length(v_impedimentos) = 0 and not v_houve then
    v_impedimentos := v_impedimentos || jsonb_build_array(
      'A contratação já está com essa quantidade e essa mensalidade. Nenhuma parcela elegível precisa ser atualizada.'
    );
  end if;

  v_assinado := coalesce(v_aprov.contrato_assinado, false)
    or v_aprov.contrato_assinado_em is not null
    or (
      v_tem_contrato and (
        v_contrato.contrato_assinado_em is not null
        or v_contrato.status = 'assinado'
      )
    );

  v_boleto := v_aprov.boleto_vencimento is not null
    or coalesce(v_aprov.boleto_pago, false)
    or v_aprov.boleto_pago_em is not null
    or nullif(trim(coalesce(v_aprov.comprovante_path, '')), '') is not null
    or (
      v_tem_contrato and (
        v_contrato.boleto_vencimento is not null
        or coalesce(v_contrato.boleto_pago, false)
        or v_contrato.boleto_pago_em is not null
      )
    );

  if v_boleto then
    v_providencias := v_providencias || jsonb_build_array(
      'Há boleto ou comprovante registrado na contratação. Esta ação não cancela, não reemite e não envia esse documento. A atualização do documento externo, se já tiver sido emitido, precisa ser feita à parte.'
    );
  end if;
  if coalesce(v_aprov.mensalidade_desconto_valor, 0) > 0 then
    v_providencias := v_providencias || jsonb_build_array(
      'Há desconto gravado na aprovação. Esse campo não é apagado. O total de cada parcela elegível passa a ser o novo valor informado.'
    );
  end if;

  v_token := md5(
    v_aprov.id::text || '|' || coalesce(v_aprov.quantidade_colaboradores, 0)::text || '|'
    || round(v_valor_anterior * 100)::text || '|' || coalesce(v_inicio::text, '') || '|'
    || v_fingerprint || '|' || v_ocupadas::text || '|' || v_indice_ocupado::text || '|'
    || v_assinado::text || '|' || v_boleto::text || '|'
    || coalesce(p_quantidade, 0)::text || '|' || round(v_valor_novo * 100)::text || '|'
    || coalesce(p_numero_inicio, 0)::text || '|' || coalesce(v_motivo, '')
  );

  return jsonb_build_object(
    'token', v_token,
    'orcamento_id', v_orc.id,
    'numero_orcamento', v_orc.numero,
    'cliente', v_orc.cliente_nome,
    'contrato_id', case when v_tem_contrato then v_contrato.id else null end,
    'numero_contrato', case when v_tem_contrato then v_contrato.numero else null end,
    'quantidade_anterior', v_aprov.quantidade_colaboradores,
    'quantidade_nova', p_quantidade,
    'valor_anterior', v_valor_anterior,
    'valor_novo', v_valor_novo,
    'valor_sugerido', v_sugerido,
    'vigencia_inicio', v_inicio,
    'vigencia_fim', v_fim,
    'efeito_numero', p_numero_inicio,
    'efeito_vencimento', (
      select p.vencimento
      from public.orcamento_mensalidade_parcelas p
      where p.aprovacao_id = v_aprov.id
        and p.vigencia_inicio = v_inicio
        and p.numero = p_numero_inicio
        and p.sem_vigencia_em is null
      limit 1
    ),
    'contrato_assinado', v_assinado,
    'contrato_situacao', case when v_assinado then 'aditivo_pendente' else 'nova_versao' end,
    'parcelas_atualizar', v_atualizar,
    'parcelas_preservar', v_preservar,
    'ajustes', v_ajustes,
    'providencias', v_providencias,
    'vagas_novas', v_vagas_novas,
    'impedimentos', v_impedimentos,
    'motivo', v_motivo
  );
end;
$$;

create or replace function public.prever_alteracao_contratacao_mensalidade(
  p_aprovacao_id uuid,
  p_quantidade integer,
  p_valor_mensal numeric,
  p_numero_inicio integer,
  p_motivo text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin_user() then
    raise exception 'Você não possui permissão para alterar a contratação. Esta ação é exclusiva para administradores.';
  end if;
  return public.classificar_alteracao_contratacao_mensalidade(
    p_aprovacao_id, p_quantidade, p_valor_mensal, p_numero_inicio, p_motivo
  );
end;
$$;

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

  if v_assinado then
    insert into public.orcamento_contratacao_aditivos (
      aprovacao_id, orcamento_id, contrato_id,
      quantidade_anterior, quantidade_nova, valor_anterior, valor_novo,
      efeito_vigencia_inicio, efeito_numero, efeito_vencimento,
      motivo, status, criado_por
    ) values (
      p_aprovacao_id, v_orcamento, v_contrato,
      (v_class->>'quantidade_anterior')::integer, p_quantidade,
      (v_class->>'valor_anterior')::numeric, round(p_valor_mensal, 2),
      v_inicio, p_numero_inicio, v_vencimento,
      v_class->>'motivo', 'pendente', v_usuario
    )
    returning id into v_aditivo;
  else
    update public.orcamento_contrato_documentos
    set substituido_em = now(),
        substituido_motivo = 'Alteração de contratação'
    where aprovacao_id = p_aprovacao_id
      and sem_validade_em is null
      and substituido_em is null;
    get diagnostics v_docs = row_count;
  end if;

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
  'Substitui o total das mensalidades elegíveis já existentes. Não cria cobrança da diferença, não reexecuta a geração inicial e não envia documento.';

revoke all on function public.classificar_alteracao_contratacao_mensalidade(uuid, integer, numeric, integer, text) from public, anon, authenticated;
grant execute on function public.classificar_alteracao_contratacao_mensalidade(uuid, integer, numeric, integer, text) to service_role;

revoke all on function public.prever_alteracao_contratacao_mensalidade(uuid, integer, numeric, integer, text) from public, anon;
grant execute on function public.prever_alteracao_contratacao_mensalidade(uuid, integer, numeric, integer, text) to authenticated, service_role;

revoke all on function public.aplicar_alteracao_contratacao_mensalidade(uuid, integer, numeric, integer, text, text, uuid) from public, anon;
grant execute on function public.aplicar_alteracao_contratacao_mensalidade(uuid, integer, numeric, integer, text, text, uuid) to authenticated, service_role;

revoke all on function public.bloquear_valor_mensalidade_fora_da_alteracao() from public, anon;
revoke all on function public.bloquear_mutacao_contratacao_alteracao() from public, anon;
