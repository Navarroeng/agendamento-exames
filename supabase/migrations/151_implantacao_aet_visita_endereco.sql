-- 151: Endereço próprio da visita técnica nos laudos pontuais.
-- Não copia a observação para o endereço e não altera visitas já salvas.

alter table public.implantacao_aet
  add column if not exists visita_endereco text null;

comment on column public.implantacao_aet.visita_endereco is
  'Endereço informado para esta visita. Não altera o cadastro da empresa e não reaproveita a observação.';

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
        or nullif(trim(coalesce(a.visita_endereco, '')), '') is not null
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
