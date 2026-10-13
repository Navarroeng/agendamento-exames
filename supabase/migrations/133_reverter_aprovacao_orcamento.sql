-- Reverte orçamento aprovado por engano para o status existente "enviado".
-- Atômica: trava o orçamento, revalida admin/status/contrato/atividade e só então desfaz
-- vínculos automáticos ainda vazios. Não apaga contrato gerado nem trabalho iniciado.
-- O snapshot da aprovação vai para auditoria_sistema; o evento "orcamento_aprovado" permanece.

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
    from public.orcamento_contrato_documentos d
    where d.orcamento_id = p_orcamento_id
  ) then
    return 'Não é possível reverter a aprovação porque já existe um contrato gerado para este orçamento.';
  end if;

  if exists (
    select 1
    from public.orcamento_contrato_vencimentos v
    where v.orcamento_id = p_orcamento_id
  ) then
    return 'Não é possível reverter a aprovação porque já existem vencimentos de contrato registrados para este orçamento.';
  end if;

  for v_contrato in
    select *
    from public.cliente_contratos c
    where c.orcamento_id = p_orcamento_id
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

    if v_contrato.status is distinct from 'aguardando_envio'
       or v_contrato.contrato_enviado_em is not null
       or v_contrato.contrato_assinado_em is not null
       or coalesce(v_contrato.liberado_para_agendamento, false)
       or v_contrato.encerrado_em is not null
       or coalesce(v_contrato.agendamentos_iniciais_dispensados, false) then
      return 'Não é possível reverter a aprovação porque já existe um contrato vinculado a este orçamento.';
    end if;
  end loop;

  select * into v_aprovacao
  from public.orcamento_aprovacoes
  where orcamento_id = p_orcamento_id;

  v_tem_aprovacao := found;

  if v_tem_aprovacao then
    if exists (
      select 1
      from public.orcamento_aprovacao_condicoes_historico h
      where h.aprovacao_id = v_aprovacao.id
         or h.orcamento_id = p_orcamento_id
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

    if coalesce(v_aprovacao.contrato_enviado, false)
       or v_aprovacao.contrato_enviado_em is not null
       or coalesce(v_aprovacao.contrato_assinado, false)
       or v_aprovacao.contrato_assinado_em is not null
       or v_aprovacao.contrato_salvo_em is not null
       or nullif(trim(coalesce(v_aprovacao.observacao_contrato, '')), '') is not null then
      return 'Não é possível reverter a aprovação porque o contrato deste orçamento já foi acompanhado na implantação.';
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

create or replace function public.motivo_bloqueio_reverter_aprovacao_orcamento(
  p_orcamento_id uuid
)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  if auth.uid() is null or not public.is_admin_user() then
    return 'Você não possui permissão para reverter a aprovação. Esta ação é exclusiva para administradores.';
  end if;

  if p_orcamento_id is null then
    return 'Orçamento não encontrado.';
  end if;

  select status into v_status
  from public.orcamentos
  where id = p_orcamento_id;

  if not found then
    return 'Orçamento não encontrado.';
  end if;

  if v_status is distinct from 'aprovado' then
    return 'Só é possível reverter a aprovação de um orçamento que esteja aprovado.';
  end if;

  return public.reverter_aprovacao_orcamento_impedimento(p_orcamento_id);
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

  -- Serializa com geração de contrato, visita e demais inserts que travam o pai.
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
  where a.orcamento_id = p_orcamento_id;

  select coalesce(jsonb_agg(to_jsonb(i) order by i.ordem), '[]'::jsonb)
  into v_itens_json
  from public.orcamento_aprovacao_itens i
  where i.aprovacao_id = v_aprovacao_id;

  select array_agg(distinct c.cliente_id)
  into v_cliente_ids
  from public.cliente_contratos c
  where c.orcamento_id = p_orcamento_id;

  -- Shells vazios. O impedimento já barrou qualquer linha com atividade.
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

  delete from public.cliente_contratos
  where orcamento_id = p_orcamento_id;

  delete from public.orcamento_aprovacao_itens
  where aprovacao_id = v_aprovacao_id;

  delete from public.orcamento_aprovacoes
  where orcamento_id = p_orcamento_id;

  update public.orcamentos
  set status = 'enviado'
  where id = p_orcamento_id
    and status = 'aprovado';

  if not found then
    raise exception
      'REVERSAO_STATUS: Só é possível reverter a aprovação de um orçamento que esteja aprovado.'
      using errcode = 'P0001';
  end if;

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
      'Aprovação revertida. Motivo: %s. Status anterior: Aprovado. Novo status: Enviado.',
      v_motivo
    ),
    jsonb_build_object(
      'status', 'aprovado',
      'aprovacao', v_aprovacao_json,
      'itens', coalesce(v_itens_json, '[]'::jsonb),
      'motivo', v_motivo
    ),
    jsonb_build_object(
      'status', 'enviado',
      'status_anterior', 'aprovado',
      'status_novo', 'enviado',
      'motivo', v_motivo
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
  'Admin reverte orçamento aprovado para Enviado quando não há contrato gerado nem atividade. Desfaz contrato automático vazio e implantação vazia.';

-- Inserts concorrentes esperam o lock do orçamento/contrato.
-- Contrato documental exige status aprovado. Demais inserts só travam o pai
-- para a reversão não apagar uma linha criada no meio da transação.
create or replace function public.trg_lock_orcamento_pai()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.orcamento_id is not null then
    perform 1
    from public.orcamentos
    where id = new.orcamento_id
    for update;
  end if;
  return new;
end;
$$;

create or replace function public.trg_lock_orcamento_exige_aprovado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  if new.orcamento_id is null then
    return new;
  end if;

  select o.status into v_status
  from public.orcamentos o
  where o.id = new.orcamento_id
  for update;

  if v_status is distinct from 'aprovado' then
    raise exception
      'REVERSAO_CONCORRENTE: Não é possível registrar este vínculo porque a aprovação do orçamento não está mais vigente.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create or replace function public.trg_lock_contrato_pai()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.contrato_id is not null then
    perform 1
    from public.cliente_contratos
    where id = new.contrato_id
    for update;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_orcamento_contrato_documentos_exige_aprovado
  on public.orcamento_contrato_documentos;
create trigger trg_orcamento_contrato_documentos_exige_aprovado
  before insert on public.orcamento_contrato_documentos
  for each row
  execute function public.trg_lock_orcamento_exige_aprovado();

drop trigger if exists trg_orcamento_contrato_vencimentos_exige_aprovado
  on public.orcamento_contrato_vencimentos;
create trigger trg_orcamento_contrato_vencimentos_exige_aprovado
  before insert on public.orcamento_contrato_vencimentos
  for each row
  execute function public.trg_lock_orcamento_exige_aprovado();

drop trigger if exists trg_implantacao_aet_lock_orcamento
  on public.implantacao_aet;
create trigger trg_implantacao_aet_lock_orcamento
  before insert on public.implantacao_aet
  for each row
  execute function public.trg_lock_orcamento_pai();

drop trigger if exists trg_implantacao_treinamentos_lock_orcamento
  on public.implantacao_treinamentos;
create trigger trg_implantacao_treinamentos_lock_orcamento
  before insert on public.implantacao_treinamentos
  for each row
  execute function public.trg_lock_orcamento_pai();

drop trigger if exists trg_orcamento_laudos_sst_lock_orcamento
  on public.orcamento_laudos_sst;
create trigger trg_orcamento_laudos_sst_lock_orcamento
  before insert on public.orcamento_laudos_sst
  for each row
  execute function public.trg_lock_orcamento_pai();

drop trigger if exists trg_orcamento_riscos_lock_orcamento
  on public.orcamento_riscos_psicossociais;
create trigger trg_orcamento_riscos_lock_orcamento
  before insert on public.orcamento_riscos_psicossociais
  for each row
  execute function public.trg_lock_orcamento_pai();

drop trigger if exists trg_riscos_campanhas_lock_orcamento
  on public.riscos_campanhas;
create trigger trg_riscos_campanhas_lock_orcamento
  before insert on public.riscos_campanhas
  for each row
  execute function public.trg_lock_orcamento_pai();

drop trigger if exists trg_agendamentos_lock_contrato_pai
  on public.agendamentos;
create trigger trg_agendamentos_lock_contrato_pai
  before insert or update of contrato_id on public.agendamentos
  for each row
  execute function public.trg_lock_contrato_pai();

drop trigger if exists trg_contrato_agendamentos_lock_pai
  on public.contrato_agendamentos;
create trigger trg_contrato_agendamentos_lock_pai
  before insert on public.contrato_agendamentos
  for each row
  execute function public.trg_lock_contrato_pai();

drop trigger if exists trg_contrato_vagas_lock_pai
  on public.contrato_vagas;
create trigger trg_contrato_vagas_lock_pai
  before insert on public.contrato_vagas
  for each row
  execute function public.trg_lock_contrato_pai();

drop trigger if exists trg_contrato_creditos_aso_lock_pai
  on public.contrato_creditos_aso;
create trigger trg_contrato_creditos_aso_lock_pai
  before insert on public.contrato_creditos_aso
  for each row
  execute function public.trg_lock_contrato_pai();

drop trigger if exists trg_periodicos_futuros_lock_contrato_pai
  on public.periodicos_futuros;
create trigger trg_periodicos_futuros_lock_contrato_pai
  before insert or update of contrato_id on public.periodicos_futuros
  for each row
  execute function public.trg_lock_contrato_pai();

revoke all on function public.reverter_aprovacao_orcamento_impedimento(uuid) from public;
revoke all on function public.reverter_aprovacao_orcamento_impedimento(uuid) from anon;
revoke all on function public.reverter_aprovacao_orcamento_impedimento(uuid) from authenticated;
grant execute on function public.reverter_aprovacao_orcamento_impedimento(uuid) to service_role;

revoke all on function public.motivo_bloqueio_reverter_aprovacao_orcamento(uuid) from public;
revoke all on function public.motivo_bloqueio_reverter_aprovacao_orcamento(uuid) from anon;
grant execute on function public.motivo_bloqueio_reverter_aprovacao_orcamento(uuid) to authenticated;
grant execute on function public.motivo_bloqueio_reverter_aprovacao_orcamento(uuid) to service_role;

revoke all on function public.reverter_aprovacao_orcamento(uuid, text) from public;
revoke all on function public.reverter_aprovacao_orcamento(uuid, text) from anon;
grant execute on function public.reverter_aprovacao_orcamento(uuid, text) to authenticated;
grant execute on function public.reverter_aprovacao_orcamento(uuid, text) to service_role;

-- Triggers disparam como o usuário do INSERT. EXECUTE em authenticated é necessário;
-- as funções só travam a linha pai e, no caso do orçamento, exigem status aprovado.
revoke all on function public.trg_lock_orcamento_pai() from public;
revoke all on function public.trg_lock_orcamento_pai() from anon;
grant execute on function public.trg_lock_orcamento_pai() to authenticated;
grant execute on function public.trg_lock_orcamento_pai() to service_role;

revoke all on function public.trg_lock_orcamento_exige_aprovado() from public;
revoke all on function public.trg_lock_orcamento_exige_aprovado() from anon;
grant execute on function public.trg_lock_orcamento_exige_aprovado() to authenticated;
grant execute on function public.trg_lock_orcamento_exige_aprovado() to service_role;

revoke all on function public.trg_lock_contrato_pai() from public;
revoke all on function public.trg_lock_contrato_pai() from anon;
grant execute on function public.trg_lock_contrato_pai() to authenticated;
grant execute on function public.trg_lock_contrato_pai() to service_role;
