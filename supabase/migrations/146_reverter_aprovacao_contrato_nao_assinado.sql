-- Reversão de aprovação com contrato gerado ou enviado, desde que não assinado.
-- O PDF e a aprovação permanecem. O contrato operacional sai da vigência
-- e não volta a contar como atual, fechamento ou implantação ativa.
-- Não apaga recebimento, agendamento nem documento. Não reaproveita número.

alter table public.orcamento_aprovacoes
  add column if not exists revertida_em timestamptz null,
  add column if not exists revertida_por text null,
  add column if not exists motivo_reversao text null;

comment on column public.orcamento_aprovacoes.revertida_em is
  'Preenchido enquanto a aprovação está revertida. Some na nova aprovação. O histórico fica na auditoria.';

alter table public.cliente_contratos
  add column if not exists aprovacao_revertida_em timestamptz null;

comment on column public.cliente_contratos.aprovacao_revertida_em is
  'Contrato da aprovação revertida. Conserva número e datas e não é o contrato vigente.';

alter table public.orcamento_contrato_documentos
  add column if not exists sem_validade_em timestamptz null;

comment on column public.orcamento_contrato_documentos.sem_validade_em is
  'PDF conservado após a reversão. Não é o contrato vigente e o número da versão não é reutilizado.';

alter table public.orcamento_contrato_vencimentos
  add column if not exists sem_vigencia_em timestamptz null;

comment on column public.orcamento_contrato_vencimentos.sem_vigencia_em is
  'Parcela prevista da aprovação revertida. Não é cobrança vigente.';

alter table public.orcamento_mensalidade_parcelas
  add column if not exists sem_vigencia_em timestamptz null;

comment on column public.orcamento_mensalidade_parcelas.sem_vigencia_em is
  'Mensalidade prevista da aprovação revertida, sem recebimento. Não é cobrança vigente.';

alter table public.orcamento_mensalidade_parcelas
  drop constraint if exists orcamento_mensalidade_parcelas_unica;

create unique index if not exists orcamento_mensalidade_parcelas_vigente_unica
  on public.orcamento_mensalidade_parcelas (aprovacao_id, vigencia_inicio, numero)
  where sem_vigencia_em is null;

alter table public.orcamento_contrato_vencimentos
  drop constraint if exists orcamento_contrato_vencimentos_unica;

create unique index if not exists orcamento_contrato_vencimentos_vigente_unica
  on public.orcamento_contrato_vencimentos (aprovacao_id, indice)
  where sem_vigencia_em is null;

drop index if exists public.idx_cliente_contratos_orcamento_id_unique;

create unique index if not exists idx_cliente_contratos_orcamento_vigente
  on public.cliente_contratos (orcamento_id)
  where orcamento_id is not null
    and aprovacao_revertida_em is null;

create or replace function public.reverter_aprovacao_orcamento_impedimento(
  p_orcamento_id uuid
)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_aprovacao public.orcamento_aprovacoes%rowtype;
  v_contrato public.cliente_contratos%rowtype;
  v_tem_aprovacao boolean := false;
begin
  if exists (
    select 1
    from public.orcamento_mensalidade_parcelas p
    join public.orcamento_aprovacoes a on a.id = p.aprovacao_id
    where a.orcamento_id = p_orcamento_id
      and a.revertida_em is null
      and p.sem_vigencia_em is null
      and p.pago_em is not null
  ) then
    return 'Não é possível reverter a aprovação porque já existe recebimento registrado nas mensalidades deste orçamento.';
  end if;

  for v_contrato in
    select *
    from public.cliente_contratos c
    where c.orcamento_id = p_orcamento_id
      and c.aprovacao_revertida_em is null
  loop
    if exists (
      select 1 from public.agendamentos a where a.contrato_id = v_contrato.id
    ) or exists (
      select 1
      from public.contrato_agendamentos ca
      where ca.contrato_id = v_contrato.id
    ) then
      return 'Não é possível reverter a aprovação porque já existem agendamentos vinculados a este orçamento.';
    end if;

    if exists (
      select 1 from public.contrato_vagas vg where vg.contrato_id = v_contrato.id
    ) then
      return 'Não é possível reverter a aprovação porque já existem vagas ou funcionários vinculados a este orçamento.';
    end if;

    if exists (
      select 1
      from public.contrato_creditos_aso cr
      where cr.contrato_id = v_contrato.id
    ) then
      return 'Não é possível reverter a aprovação porque já existem ASOs contratuais registrados para este orçamento.';
    end if;

    if exists (
      select 1
      from public.periodicos_futuros pf
      where pf.contrato_id = v_contrato.id
    ) then
      return 'Não é possível reverter a aprovação porque já existem exames futuros programados para este orçamento.';
    end if;

    if coalesce(v_contrato.boleto_pago, false)
       or v_contrato.boleto_pago_em is not null
       or v_contrato.boleto_vencimento is not null then
      return 'Não é possível reverter a aprovação porque já existe movimentação financeira vinculada a este orçamento.';
    end if;

    if v_contrato.contrato_assinado_em is not null
       or v_contrato.status in (
         'assinado',
         'aguardando_pagamento',
         'ativo',
         'em_renovacao',
         'pago'
       ) then
      return 'Não é possível reverter a aprovação porque o contrato deste orçamento já foi assinado.';
    end if;

    if (
         v_contrato.status is distinct from 'aguardando_envio'
         and v_contrato.status is distinct from 'enviado'
       )
       or v_contrato.encerrado_em is not null
       or coalesce(v_contrato.agendamentos_iniciais_dispensados, false) then
      return 'Não é possível reverter a aprovação porque já existe um contrato vinculado a este orçamento.';
    end if;
  end loop;

  select * into v_aprovacao
  from public.orcamento_aprovacoes
  where orcamento_id = p_orcamento_id
    and revertida_em is null;

  v_tem_aprovacao := found;

  if v_tem_aprovacao then
    if exists (
      select 1
      from public.orcamento_aprovacao_condicoes_historico h
      where (h.aprovacao_id = v_aprovacao.id or h.orcamento_id = p_orcamento_id)
        and h.alterado_em >= v_aprovacao.aprovado_em
    ) then
      return 'Não é possível reverter a aprovação porque as condições aprovadas já foram alteradas.';
    end if;

    if coalesce(v_aprovacao.boleto_pago, false)
       or v_aprovacao.boleto_pago_em is not null
       or v_aprovacao.boleto_vencimento is not null
       or nullif(trim(coalesce(v_aprovacao.comprovante_path, '')), '') is not null
       or nullif(trim(coalesce(v_aprovacao.observacao_pagamento, '')), '') is not null
       or v_aprovacao.financeiro_salvo_em is not null
       or v_aprovacao.pagamento_confirmado_em is not null then
      return 'Não é possível reverter a aprovação porque já existe movimentação financeira vinculada a este orçamento.';
    end if;

    if coalesce(v_aprovacao.contrato_assinado, false)
       or v_aprovacao.contrato_assinado_em is not null then
      return 'Não é possível reverter a aprovação porque o contrato deste orçamento já foi assinado.';
    end if;

    if v_aprovacao.visita_tecnica_salva_em is not null
       or v_aprovacao.visita_tecnica_necessaria is not null
       or v_aprovacao.visita_tecnica_data is not null
       or nullif(trim(coalesce(v_aprovacao.visita_tecnica_horario, '')), '') is not null
       or nullif(trim(coalesce(v_aprovacao.visita_tecnica_endereco, '')), '') is not null
       or nullif(trim(coalesce(v_aprovacao.visita_tecnica_observacoes, '')), '') is not null then
      return 'Não é possível reverter a aprovação porque já existe visita técnica registrada para este orçamento.';
    end if;

    if v_aprovacao.procuracao_salva_em is not null
       or nullif(trim(coalesce(v_aprovacao.observacao_procuracao, '')), '') is not null
       or coalesce(nullif(trim(v_aprovacao.procuracao_status), ''), 'pendente')
            is distinct from 'pendente'
       or nullif(trim(coalesce(v_aprovacao.funcionarios_lista_path, '')), '') is not null
       or v_aprovacao.funcionarios_lista_salva_em is not null
       or v_aprovacao.funcionarios_vagas_salvas_em is not null
       or nullif(trim(coalesce(v_aprovacao.logo_path, '')), '') is not null
       or v_aprovacao.logo_salva_em is not null
       or v_aprovacao.possui_logo is not null then
      return 'Não é possível reverter a aprovação porque já existem etapas da implantação preenchidas para este orçamento.';
    end if;
  end if;

  if exists (
    select 1
    from public.implantacao_aet a
    where a.orcamento_id = p_orcamento_id
      and (
        a.documentos_conferidos
        or a.documentos_conferidos_em is not null
        or a.visita_status is distinct from 'aguardando_agendamento'
        or a.visita_data is not null
        or nullif(trim(coalesce(a.visita_horario, '')), '') is not null
        or nullif(trim(coalesce(a.visita_responsavel, '')), '') is not null
        or nullif(trim(coalesce(a.visita_observacao, '')), '') is not null
        or a.visita_realizada_em is not null
        or a.elaboracao_status is distinct from 'aguardando'
        or nullif(trim(coalesce(a.elaboracao_observacao, '')), '') is not null
        or a.elaboracao_concluida_em is not null
        or nullif(trim(coalesce(a.laudo_path, '')), '') is not null
        or a.enviado_cliente
        or a.enviado_em is not null
        or nullif(trim(coalesce(a.envio_observacao, '')), '') is not null
        or exists (
          select 1
          from public.implantacao_aet_documentos d
          where d.aet_id = a.id
        )
      )
  ) then
    return 'Não é possível reverter a aprovação porque a implantação do laudo já foi iniciada.';
  end if;

  if exists (
    select 1
    from public.implantacao_treinamentos t
    where t.orcamento_id = p_orcamento_id
  ) then
    return 'Não é possível reverter a aprovação porque já existe treinamento vinculado a este orçamento.';
  end if;

  if exists (
    select 1
    from public.orcamento_laudos_sst l
    where l.orcamento_id = p_orcamento_id
      and (
        coalesce(l.etapas_concluidas, 0) > 0
        or l.status = 'concluido'
        or l.etapa_atual is distinct from 'epis'
        or l.epi_disponibiliza is not null
        or l.cadastro_realizado is not null
        or l.cronograma_elaborado is not null
        or l.pgr_realizado is not null
        or l.pcmso_realizado is not null
        or l.ltcat_realizado is not null
        or l.enviado_pedro is not null
        or l.aprovacao_pedro is not null
        or l.enviado_cliente is not null
        or nullif(trim(coalesce(l.pgr_anexo_path, '')), '') is not null
        or nullif(trim(coalesce(l.pcmso_anexo_path, '')), '') is not null
        or nullif(trim(coalesce(l.ltcat_anexo_path, '')), '') is not null
        or coalesce(l.cronograma_epi_respostas, '{}'::jsonb) <> '{}'::jsonb
      )
  ) then
    return 'Não é possível reverter a aprovação porque já existe trabalho registrado em laudos para este orçamento.';
  end if;

  if exists (
    select 1
    from public.riscos_campanhas rc
    where rc.orcamento_id = p_orcamento_id
  ) or exists (
    select 1
    from public.orcamento_riscos_psicossociais r
    where r.orcamento_id = p_orcamento_id
      and (
        r.status in ('concluido', 'cancelado')
        or coalesce(r.etapas_concluidas, 0) > 0
        or r.etapa_atual is distinct from 'lista_presenca'
        or coalesce(r.lista_solicitada, false)
        or coalesce(r.lista_recebida, false)
        or nullif(trim(coalesce(r.lista_anexo_path, '')), '') is not null
      )
  ) then
    return 'Não é possível reverter a aprovação porque já existe atividade de riscos psicossociais vinculada a este orçamento.';
  end if;

  return null;
end;
$$;

create or replace function public.reverter_aprovacao_orcamento(
  p_orcamento_id uuid,
  p_motivo text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_orcamento public.orcamentos%rowtype;
  v_motivo text;
  v_bloqueio text;
  v_aprovacao_id uuid;
  v_aprovacao_json jsonb;
  v_itens_json jsonb;
  v_documentos_json jsonb;
  v_usuario_nome text;
  v_usuario_email text;
  v_cliente_ids uuid[];
  v_cliente_id uuid;
begin
  if auth.uid() is null or not public.is_admin_user() then
    raise exception
      'REVERSAO_SEM_PERMISSAO: Você não possui permissão para reverter a aprovação. Esta ação é exclusiva para administradores.'
      using errcode = '42501';
  end if;

  v_motivo := nullif(trim(coalesce(p_motivo, '')), '');
  if v_motivo is null then
    raise exception
      'REVERSAO_MOTIVO: Informe o motivo da reversão.'
      using errcode = 'P0001';
  end if;

  if p_orcamento_id is null then
    raise exception
      'REVERSAO_NAO_ENCONTRADO: Orçamento não encontrado.'
      using errcode = 'P0001';
  end if;

  select * into v_orcamento
  from public.orcamentos
  where id = p_orcamento_id
  for update;

  if not found then
    raise exception
      'REVERSAO_NAO_ENCONTRADO: Orçamento não encontrado.'
      using errcode = 'P0001';
  end if;

  if v_orcamento.status is distinct from 'aprovado' then
    raise exception
      'REVERSAO_STATUS: Só é possível reverter a aprovação de um orçamento que esteja aprovado.'
      using errcode = 'P0001';
  end if;

  perform 1
  from public.orcamento_aprovacoes
  where orcamento_id = p_orcamento_id
  for update;

  perform 1
  from public.cliente_contratos
  where orcamento_id = p_orcamento_id
  for update;

  perform 1
  from public.implantacao_aet
  where orcamento_id = p_orcamento_id
  for update;

  perform 1
  from public.implantacao_treinamentos
  where orcamento_id = p_orcamento_id
  for update;

  perform 1
  from public.orcamento_laudos_sst
  where orcamento_id = p_orcamento_id
  for update;

  perform 1
  from public.orcamento_riscos_psicossociais
  where orcamento_id = p_orcamento_id
  for update;

  perform 1
  from public.riscos_campanhas
  where orcamento_id = p_orcamento_id
  for update;

  perform 1
  from public.orcamento_contrato_documentos
  where orcamento_id = p_orcamento_id
  for update;

  perform 1
  from public.orcamento_contrato_vencimentos
  where orcamento_id = p_orcamento_id
  for update;

  perform 1
  from public.orcamento_mensalidade_parcelas p
  where p.aprovacao_id in (
    select a.id
    from public.orcamento_aprovacoes a
    where a.orcamento_id = p_orcamento_id
  )
  for update;

  perform 1
  from public.agendamentos a
  where a.contrato_id in (
    select c.id
    from public.cliente_contratos c
    where c.orcamento_id = p_orcamento_id
  )
  for update;

  v_bloqueio := public.reverter_aprovacao_orcamento_impedimento(p_orcamento_id);
  if v_bloqueio is not null then
    raise exception 'REVERSAO_BLOQUEADA: %', v_bloqueio
      using errcode = 'P0001';
  end if;

  select a.id, to_jsonb(a)
  into v_aprovacao_id, v_aprovacao_json
  from public.orcamento_aprovacoes a
  where a.orcamento_id = p_orcamento_id
    and a.revertida_em is null;

  select coalesce(jsonb_agg(to_jsonb(i) order by i.ordem), '[]'::jsonb)
  into v_itens_json
  from public.orcamento_aprovacao_itens i
  where i.aprovacao_id = v_aprovacao_id;

  select coalesce(jsonb_agg(to_jsonb(d) order by d.versao), '[]'::jsonb)
  into v_documentos_json
  from public.orcamento_contrato_documentos d
  where d.orcamento_id = p_orcamento_id
    and d.sem_validade_em is null;

  select p.nome, p.email
  into v_usuario_nome, v_usuario_email
  from public.perfis_usuarios p
  where p.user_id = auth.uid()
    and p.ativo = true
    and p.perfil = 'admin'
  limit 1;

  v_usuario_nome := coalesce(nullif(trim(v_usuario_nome), ''), 'Administrador');
  v_usuario_email := coalesce(
    nullif(trim(v_usuario_email), ''),
    'sistema@navarroeng.com.br'
  );

  delete from public.implantacao_aet_documentos d
  using public.implantacao_aet a
  where d.aet_id = a.id
    and a.orcamento_id = p_orcamento_id;

  delete from public.implantacao_aet
  where orcamento_id = p_orcamento_id;

  delete from public.orcamento_laudos_sst
  where orcamento_id = p_orcamento_id;

  delete from public.orcamento_riscos_psicossociais
  where orcamento_id = p_orcamento_id;

  update public.orcamento_contrato_documentos
  set sem_validade_em = now()
  where orcamento_id = p_orcamento_id
    and sem_validade_em is null;

  update public.orcamento_contrato_vencimentos
  set sem_vigencia_em = now(),
      updated_at = now()
  where orcamento_id = p_orcamento_id
    and sem_vigencia_em is null;

  update public.orcamento_mensalidade_parcelas p
  set sem_vigencia_em = now(),
      updated_at = now()
  where p.aprovacao_id = v_aprovacao_id
    and p.sem_vigencia_em is null
    and p.pago_em is null;

  update public.cliente_contratos
  set status = 'cancelado',
      encerrado_em = now(),
      encerrado_por = v_usuario_nome,
      liberado_para_agendamento = false,
      aprovacao_revertida_em = now(),
      updated_at = now()
  where orcamento_id = p_orcamento_id
    and aprovacao_revertida_em is null;

  update public.orcamento_aprovacoes
  set revertida_em = now(),
      revertida_por = v_usuario_nome,
      motivo_reversao = v_motivo,
      contrato_enviado = false,
      contrato_enviado_em = null,
      contrato_assinado = false,
      contrato_assinado_em = null,
      observacao_contrato = null,
      contrato_salvo_em = null,
      boleto_vencimento = null,
      boleto_pago = false,
      boleto_pago_em = null,
      comprovante_path = null,
      comprovante_nome = null,
      comprovante_tipo = null,
      comprovante_tamanho = null,
      observacao_pagamento = null,
      financeiro_salvo_em = null,
      pagamento_confirmado_em = null,
      pagamento_confirmado_por = null,
      procuracao_status = 'pendente',
      procuracao_salva_em = null,
      observacao_procuracao = null,
      funcionarios_lista_path = null,
      funcionarios_lista_salva_em = null,
      funcionarios_vagas_salvas_em = null,
      logo_path = null,
      logo_salva_em = null,
      possui_logo = null,
      visita_tecnica_necessaria = null,
      visita_tecnica_data = null,
      visita_tecnica_horario = null,
      visita_tecnica_endereco = null,
      visita_tecnica_observacoes = null,
      visita_tecnica_salva_em = null,
      mensalidade_dia_vencimento = null,
      mensalidade_renovacao_automatica = null,
      updated_at = now()
  where id = v_aprovacao_id;

  update public.orcamentos
  set status = 'enviado'
  where id = p_orcamento_id
    and status = 'aprovado';

  if not found then
    raise exception
      'REVERSAO_STATUS: Só é possível reverter a aprovação de um orçamento que esteja aprovado.'
      using errcode = 'P0001';
  end if;

  select array_agg(distinct c.cliente_id)
  into v_cliente_ids
  from public.cliente_contratos c
  where c.orcamento_id = p_orcamento_id;

  if v_orcamento.cliente_id is not null then
    v_cliente_ids := array_append(
      coalesce(v_cliente_ids, '{}'::uuid[]),
      v_orcamento.cliente_id
    );
  end if;

  if v_cliente_ids is not null then
    foreach v_cliente_id in array v_cliente_ids loop
      if v_cliente_id is not null then
        perform public.recompute_cliente_disponivel_agendamento(v_cliente_id);
      end if;
    end loop;
  end if;

  insert into public.auditoria_sistema (
    usuario_id,
    usuario_nome,
    usuario_email,
    modulo,
    acao,
    registro_id,
    registro_nome,
    descricao,
    dados_antes,
    dados_depois
  )
  values (
    auth.uid(),
    v_usuario_nome,
    v_usuario_email,
    'orcamentos',
    'orcamento_aprovacao_revertida',
    p_orcamento_id,
    v_orcamento.numero,
    format(
      'Aprovação revertida. Motivo: %s. Status anterior: Aprovado. Novo status: Enviado. O contrato gerado permanece no histórico, sem validade.',
      v_motivo
    ),
    jsonb_build_object(
      'status', 'aprovado',
      'aprovacao', v_aprovacao_json,
      'itens', coalesce(v_itens_json, '[]'::jsonb),
      'documentos', coalesce(v_documentos_json, '[]'::jsonb),
      'motivo', v_motivo
    ),
    jsonb_build_object(
      'status', 'enviado',
      'status_anterior', 'aprovado',
      'status_novo', 'enviado',
      'motivo', v_motivo,
      'aprovacao_id', v_aprovacao_id,
      'revertida_por', v_usuario_nome
    )
  );

  return jsonb_build_object(
    'orcamento_id', p_orcamento_id,
    'status_anterior', 'aprovado',
    'status_novo', 'enviado',
    'aprovacao_id', v_aprovacao_id,
    'motivo', v_motivo
  );
end;
$$;

comment on function public.reverter_aprovacao_orcamento(uuid, text) is
  'Admin reverte orçamento aprovado para Enviado mesmo com PDF gerado ou enviado, se não houver assinatura nem movimentação. Conserva o documento e o contrato no histórico.';

create or replace function public.trg_parcela_exige_aprovacao_vigente()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_revertida timestamptz;
begin
  if new.aprovacao_id is null then
    return new;
  end if;

  select o.status, a.revertida_em
  into v_status, v_revertida
  from public.orcamento_aprovacoes a
  join public.orcamentos o on o.id = a.orcamento_id
  where a.id = new.aprovacao_id
  for update;

  if v_revertida is not null or v_status is distinct from 'aprovado' then
    raise exception
      'REVERSAO_CONCORRENTE: Não é possível registrar esta parcela porque a aprovação do orçamento não está mais vigente.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_mensalidade_parcelas_exige_aprovacao_vigente
  on public.orcamento_mensalidade_parcelas;
create trigger trg_mensalidade_parcelas_exige_aprovacao_vigente
  before insert on public.orcamento_mensalidade_parcelas
  for each row
  execute function public.trg_parcela_exige_aprovacao_vigente();

revoke all on function public.trg_parcela_exige_aprovacao_vigente() from public;
revoke all on function public.trg_parcela_exige_aprovacao_vigente() from anon;
grant execute on function public.trg_parcela_exige_aprovacao_vigente() to authenticated;
grant execute on function public.trg_parcela_exige_aprovacao_vigente() to service_role;

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
    and cc.orcamento_id is not null
    and cc.aprovacao_revertida_em is null
    and oa.revertida_em is null;

  update public.cliente_contratos
  set liberado_para_agendamento = false
  where cliente_id = p_cliente_id
    and (
      status in ('encerrado', 'cancelado')
      or encerrado_em is not null
      or aprovacao_revertida_em is not null
    )
    and liberado_para_agendamento is distinct from false;

  update public.cliente_contratos cc
  set liberado_para_agendamento = coalesce(cc.boleto_pago, false)
  where cc.cliente_id = p_cliente_id
    and cc.orcamento_id is not null
    and cc.status not in ('encerrado', 'cancelado')
    and cc.encerrado_em is null
    and cc.aprovacao_revertida_em is null
    and not exists (
      select 1
      from public.orcamentos o
      join public.orcamento_aprovacoes oa on oa.orcamento_id = o.id
      where o.id = cc.orcamento_id
        and oa.revertida_em is null
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
    left join public.orcamento_aprovacoes oa
      on oa.orcamento_id = c.orcamento_id
     and oa.revertida_em is null
    where c.cliente_id = p_cliente_id
      and c.encerrado_em is null
      and c.aprovacao_revertida_em is null
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
  v_is_laudo_pontual boolean := false;
  v_is_ltcat boolean := false;
  v_is_parecer boolean := false;
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

  v_is_laudo_pontual := (
    p_itens is not null
    and jsonb_typeof(p_itens) = 'array'
    and jsonb_array_length(p_itens) > 0
    and (
      (
        select bool_and(public.is_servico_aet_nome(elem->>'servico_nome'))
        from jsonb_array_elements(p_itens) as t(elem)
      )
      or (
        select bool_and(public.is_servico_insalubridade_nome(elem->>'servico_nome'))
        from jsonb_array_elements(p_itens) as t(elem)
      )
    )
  );

  v_is_ltcat := (
    p_itens is not null
    and jsonb_typeof(p_itens) = 'array'
    and jsonb_array_length(p_itens) > 0
    and (
      select bool_and(public.is_servico_ltcat_nome(elem->>'servico_nome'))
      from jsonb_array_elements(p_itens) as t(elem)
    )
  );

  v_is_parecer := (
    p_itens is not null
    and jsonb_typeof(p_itens) = 'array'
    and jsonb_array_length(p_itens) > 0
    and (
      select bool_and(public.is_servico_parecer_tecnico_nome(elem->>'servico_nome'))
      from jsonb_array_elements(p_itens) as t(elem)
    )
  );

  v_qtd := coalesce((p_aprovacao->>'quantidade_colaboradores')::integer, 0);
  v_valor_final := coalesce((p_aprovacao->>'valor_final')::numeric, 0);
  if v_valor_final <= 0 then
    raise exception 'APROVACAO_INVALIDA: quantidade e valor final são obrigatórios.'
      using errcode = 'P0001';
  end if;
  if v_is_laudo_pontual or v_is_parecer then
    v_qtd := 0;
  elsif v_qtd < 1 then
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
      responsavel_no_fechamento = case
        when revertida_em is not null then v_responsavel_fechamento
        else coalesce(responsavel_no_fechamento, v_responsavel_fechamento)
      end,
      responsavel_no_fechamento_aproximado = case
        when revertida_em is not null then false
        when responsavel_no_fechamento is null then false
        else responsavel_no_fechamento_aproximado
      end,
      contrato_enviado = case when revertida_em is not null then false else contrato_enviado end,
      contrato_enviado_em = case when revertida_em is not null then null else contrato_enviado_em end,
      contrato_assinado = case when revertida_em is not null then false else contrato_assinado end,
      contrato_assinado_em = case when revertida_em is not null then null else contrato_assinado_em end,
      observacao_contrato = case when revertida_em is not null then null else observacao_contrato end,
      contrato_salvo_em = case when revertida_em is not null then null else contrato_salvo_em end,
      boleto_vencimento = case when revertida_em is not null then null else boleto_vencimento end,
      boleto_pago = case when revertida_em is not null then false else boleto_pago end,
      boleto_pago_em = case when revertida_em is not null then null else boleto_pago_em end,
      comprovante_path = case when revertida_em is not null then null else comprovante_path end,
      comprovante_nome = case when revertida_em is not null then null else comprovante_nome end,
      comprovante_tipo = case when revertida_em is not null then null else comprovante_tipo end,
      comprovante_tamanho = case when revertida_em is not null then null else comprovante_tamanho end,
      observacao_pagamento = case when revertida_em is not null then null else observacao_pagamento end,
      financeiro_salvo_em = case when revertida_em is not null then null else financeiro_salvo_em end,
      pagamento_confirmado_em = case when revertida_em is not null then null else pagamento_confirmado_em end,
      pagamento_confirmado_por = case when revertida_em is not null then null else pagamento_confirmado_por end,
      procuracao_status = case when revertida_em is not null then 'pendente' else procuracao_status end,
      procuracao_salva_em = case when revertida_em is not null then null else procuracao_salva_em end,
      observacao_procuracao = case when revertida_em is not null then null else observacao_procuracao end,
      funcionarios_lista_path = case when revertida_em is not null then null else funcionarios_lista_path end,
      funcionarios_lista_salva_em = case when revertida_em is not null then null else funcionarios_lista_salva_em end,
      funcionarios_vagas_salvas_em = case when revertida_em is not null then null else funcionarios_vagas_salvas_em end,
      logo_path = case when revertida_em is not null then null else logo_path end,
      logo_salva_em = case when revertida_em is not null then null else logo_salva_em end,
      possui_logo = case when revertida_em is not null then null else possui_logo end,
      visita_tecnica_necessaria = case when revertida_em is not null then null else visita_tecnica_necessaria end,
      visita_tecnica_data = case when revertida_em is not null then null else visita_tecnica_data end,
      visita_tecnica_horario = case when revertida_em is not null then null else visita_tecnica_horario end,
      visita_tecnica_endereco = case when revertida_em is not null then null else visita_tecnica_endereco end,
      visita_tecnica_observacoes = case when revertida_em is not null then null else visita_tecnica_observacoes end,
      visita_tecnica_salva_em = case when revertida_em is not null then null else visita_tecnica_salva_em end,
      mensalidade_dia_vencimento = case when revertida_em is not null then null else mensalidade_dia_vencimento end,
      mensalidade_renovacao_automatica = case when revertida_em is not null then null else mensalidade_renovacao_automatica end,
      motivo_reversao = case when revertida_em is not null then null else motivo_reversao end,
      revertida_por = case when revertida_em is not null then null else revertida_por end,
      revertida_em = case when revertida_em is not null then null else revertida_em end
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

  if v_is_laudo_pontual or v_is_ltcat or v_is_parecer then
    v_contrato_id := null;
    v_contrato_numero := null;
    v_contrato_criado := false;
    v_contrato_ja_existia := false;
  else
  select id, numero into v_contrato_id, v_contrato_numero
  from public.cliente_contratos
  where orcamento_id = p_orcamento_id
    and aprovacao_revertida_em is null
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
