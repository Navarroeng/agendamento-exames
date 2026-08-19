-- ROLLBACK da migration 109_rls_staff_user.sql
-- SOMENTE PARA REVISÃO. NÃO EXECUTAR automaticamente.
-- NÃO colocar esta pasta na sequência de migrations do Supabase.
--
-- Restaura using (true) / predicados originais de storage e remove
-- public.is_staff_user() + trigger de anti-escalonamento.
-- NÃO remove public.is_admin_user().
-- NÃO altera dados.

-- =============================================================================
-- 1) Restaurar policies public.* (authenticated + using/check true)
-- =============================================================================
-- BEGIN STAFF_TABLE_POLICIES

do $$
declare
  rec record;
begin
  for rec in
    select * from (values
      ('clinicas', 'authenticated_select_clinicas', 'SELECT'),
      ('clinicas', 'authenticated_insert_clinicas', 'INSERT'),
      ('clinicas', 'authenticated_update_clinicas', 'UPDATE'),
      ('clinica_exames', 'authenticated_select_clinica_exames', 'SELECT'),
      ('clinica_exames', 'authenticated_insert_clinica_exames', 'INSERT'),
      ('clinica_exames', 'authenticated_update_clinica_exames', 'UPDATE'),
      ('exames', 'authenticated_select_exames', 'SELECT'),
      ('exames', 'authenticated_insert_exames', 'INSERT'),
      ('exames', 'authenticated_update_exames', 'UPDATE'),
      ('cargos', 'authenticated_select_cargos', 'SELECT'),
      ('cargos', 'authenticated_insert_cargos', 'INSERT'),
      ('cargos', 'authenticated_update_cargos', 'UPDATE'),
      ('cargo_exames', 'authenticated_select_cargo_exames', 'SELECT'),
      ('cargo_exames', 'authenticated_insert_cargo_exames', 'INSERT'),
      ('cargo_exames', 'authenticated_update_cargo_exames', 'UPDATE'),
      ('cargo_exames', 'authenticated_delete_cargo_exames', 'DELETE'),
      ('clientes', 'authenticated_select_clientes', 'SELECT'),
      ('clientes', 'authenticated_insert_clientes', 'INSERT'),
      ('clientes', 'authenticated_update_clientes', 'UPDATE'),
      ('cliente_contratos', 'authenticated_select_cliente_contratos', 'SELECT'),
      ('cliente_contratos', 'authenticated_insert_cliente_contratos', 'INSERT'),
      ('cliente_contratos', 'authenticated_update_cliente_contratos', 'UPDATE'),
      ('faturas', 'authenticated_select_faturas', 'SELECT'),
      ('faturas', 'authenticated_insert_faturas', 'INSERT'),
      ('faturas', 'authenticated_update_faturas', 'UPDATE'),
      ('fatura_itens', 'authenticated_select_fatura_itens', 'SELECT'),
      ('fatura_itens', 'authenticated_insert_fatura_itens', 'INSERT'),
      ('fatura_itens', 'authenticated_delete_fatura_itens', 'DELETE'),
      ('agendamentos', 'authenticated_select_agendamentos', 'SELECT'),
      ('agendamentos', 'authenticated_insert_agendamentos', 'INSERT'),
      ('agendamentos', 'authenticated_update_agendamentos', 'UPDATE'),
      ('agendamento_exames', 'authenticated_select_agendamento_exames', 'SELECT'),
      ('agendamento_exames', 'authenticated_insert_agendamento_exames', 'INSERT'),
      ('agendamento_exames', 'authenticated_update_agendamento_exames', 'UPDATE'),
      ('agendamento_exames', 'authenticated_delete_agendamento_exames', 'DELETE'),
      ('agendamento_historico', 'authenticated_select_agendamento_historico', 'SELECT'),
      ('agendamento_historico', 'authenticated_insert_agendamento_historico', 'INSERT'),
      ('clinicas_historico', 'authenticated_select_clinicas_historico', 'SELECT'),
      ('clinicas_historico', 'authenticated_insert_clinicas_historico', 'INSERT'),
      ('clinica_exames_historico', 'authenticated_select_clinica_exames_historico', 'SELECT'),
      ('clinica_exames_historico', 'authenticated_insert_clinica_exames_historico', 'INSERT'),
      ('exames_historico', 'authenticated_select_exames_historico', 'SELECT'),
      ('exames_historico', 'authenticated_insert_exames_historico', 'INSERT'),
      ('servicos_sst', 'authenticated_select_servicos_sst', 'SELECT'),
      ('servicos_sst', 'authenticated_insert_servicos_sst', 'INSERT'),
      ('servicos_sst', 'authenticated_update_servicos_sst', 'UPDATE'),
      ('orcamentos', 'authenticated_select_orcamentos', 'SELECT'),
      ('orcamentos', 'authenticated_insert_orcamentos', 'INSERT'),
      ('orcamentos', 'authenticated_update_orcamentos', 'UPDATE'),
      ('orcamentos', 'authenticated_delete_orcamentos', 'DELETE'),
      ('orcamento_itens', 'authenticated_select_orcamento_itens', 'SELECT'),
      ('orcamento_itens', 'authenticated_insert_orcamento_itens', 'INSERT'),
      ('orcamento_itens', 'authenticated_update_orcamento_itens', 'UPDATE'),
      ('orcamento_itens', 'authenticated_delete_orcamento_itens', 'DELETE'),
      ('orcamento_aprovacoes', 'authenticated_select_orcamento_aprovacoes', 'SELECT'),
      ('orcamento_aprovacoes', 'authenticated_insert_orcamento_aprovacoes', 'INSERT'),
      ('orcamento_aprovacoes', 'authenticated_update_orcamento_aprovacoes', 'UPDATE'),
      ('orcamento_aprovacao_itens', 'authenticated_select_orcamento_aprovacao_itens', 'SELECT'),
      ('orcamento_aprovacao_itens', 'authenticated_insert_orcamento_aprovacao_itens', 'INSERT'),
      ('orcamento_aprovacao_itens', 'authenticated_update_orcamento_aprovacao_itens', 'UPDATE'),
      ('orcamento_aprovacao_itens', 'authenticated_delete_orcamento_aprovacao_itens', 'DELETE'),
      ('orcamento_aprovacao_condicoes_historico', 'authenticated_select_orcamento_aprovacao_condicoes_historico', 'SELECT'),
      ('orcamento_aprovacao_condicoes_historico', 'authenticated_insert_orcamento_aprovacao_condicoes_historico', 'INSERT'),
      ('periodicos_futuros', 'authenticated_select_periodicos_futuros', 'SELECT'),
      ('periodicos_futuros', 'authenticated_insert_periodicos_futuros', 'INSERT'),
      ('periodicos_futuros', 'authenticated_update_periodicos_futuros', 'UPDATE'),
      ('periodicos_futuros', 'authenticated_delete_periodicos_futuros', 'DELETE'),
      ('contrato_agendamentos', 'contrato_agendamentos_select_authenticated', 'SELECT'),
      ('contrato_agendamentos', 'contrato_agendamentos_insert_authenticated', 'INSERT'),
      ('contrato_agendamentos', 'contrato_agendamentos_update_authenticated', 'UPDATE'),
      ('contrato_agendamentos', 'contrato_agendamentos_delete_authenticated', 'DELETE'),
      ('contrato_creditos_aso', 'contrato_creditos_aso_select_authenticated', 'SELECT'),
      ('contrato_creditos_aso', 'contrato_creditos_aso_insert_authenticated', 'INSERT'),
      ('contrato_creditos_aso', 'contrato_creditos_aso_update_authenticated', 'UPDATE'),
      ('contrato_creditos_aso', 'contrato_creditos_aso_delete_authenticated', 'DELETE'),
      ('implantacao_treinamentos', 'authenticated_select_implantacao_treinamentos', 'SELECT'),
      ('implantacao_treinamentos', 'authenticated_insert_implantacao_treinamentos', 'INSERT'),
      ('implantacao_treinamentos', 'authenticated_update_implantacao_treinamentos', 'UPDATE'),
      ('implantacao_treinamentos_eventos', 'authenticated_select_implantacao_treinamentos_eventos', 'SELECT'),
      ('implantacao_treinamentos_eventos', 'authenticated_insert_implantacao_treinamentos_eventos', 'INSERT'),
      ('orcamento_laudos_sst', 'authenticated_select_orcamento_laudos_sst', 'SELECT'),
      ('orcamento_laudos_sst', 'authenticated_insert_orcamento_laudos_sst', 'INSERT'),
      ('orcamento_laudos_sst', 'authenticated_update_orcamento_laudos_sst', 'UPDATE'),
      ('orcamento_riscos_psicossociais', 'authenticated_select_orcamento_riscos_psicossociais', 'SELECT'),
      ('orcamento_riscos_psicossociais', 'authenticated_insert_orcamento_riscos_psicossociais', 'INSERT'),
      ('orcamento_riscos_psicossociais', 'authenticated_update_orcamento_riscos_psicossociais', 'UPDATE'),
      ('riscos_campanhas', 'authenticated_select_riscos_campanhas', 'SELECT'),
      ('riscos_campanhas', 'authenticated_insert_riscos_campanhas', 'INSERT'),
      ('riscos_campanhas', 'authenticated_update_riscos_campanhas', 'UPDATE'),
      ('riscos_campanha_participantes', 'authenticated_select_riscos_campanha_participantes', 'SELECT'),
      ('riscos_campanha_participantes', 'authenticated_insert_riscos_campanha_participantes', 'INSERT'),
      ('riscos_campanha_participantes', 'authenticated_update_riscos_campanha_participantes', 'UPDATE'),
      ('riscos_campanha_participantes', 'authenticated_delete_riscos_campanha_participantes', 'DELETE'),
      ('riscos_relatorios', 'authenticated_select_riscos_relatorios', 'SELECT'),
      ('riscos_relatorios', 'authenticated_insert_riscos_relatorios', 'INSERT'),
      ('riscos_relatorios', 'authenticated_update_riscos_relatorios', 'UPDATE'),
      ('riscos_campanha_fluxo', 'authenticated_select_riscos_campanha_fluxo', 'SELECT'),
      ('riscos_campanha_fluxo', 'authenticated_insert_riscos_campanha_fluxo', 'INSERT'),
      ('riscos_campanha_fluxo', 'authenticated_update_riscos_campanha_fluxo', 'UPDATE'),
      ('orcamento_riscos_lista_presenca_anexos_hist', 'authenticated_select_riscos_lista_anexos_hist', 'SELECT'),
      ('orcamento_riscos_lista_presenca_anexos_hist', 'authenticated_insert_riscos_lista_anexos_hist', 'INSERT'),
      ('gestao_comercial_historico_mensal', 'authenticated_select_gestao_comercial_historico_mensal', 'SELECT')
    ) as t(tbl, pol, cmd)
  loop
    execute format(
      'drop policy if exists %I on public.%I',
      rec.pol,
      rec.tbl
    );

    if rec.cmd = 'SELECT' then
      execute format(
        'create policy %I on public.%I for select to authenticated using (true)',
        rec.pol,
        rec.tbl
      );
    elsif rec.cmd = 'INSERT' then
      execute format(
        'create policy %I on public.%I for insert to authenticated with check (true)',
        rec.pol,
        rec.tbl
      );
    elsif rec.cmd = 'UPDATE' then
      execute format(
        'create policy %I on public.%I for update to authenticated using (true) with check (true)',
        rec.pol,
        rec.tbl
      );
    elsif rec.cmd = 'DELETE' then
      execute format(
        'create policy %I on public.%I for delete to authenticated using (true)',
        rec.pol,
        rec.tbl
      );
    else
      raise exception 'Comando RLS desconhecido: %', rec.cmd;
    end if;
  end loop;
end $$;

-- END STAFF_TABLE_POLICIES

-- =============================================================================
-- 2) perfis_usuarios — estado anterior à 109
-- =============================================================================

drop trigger if exists trg_perfis_usuarios_bloquear_escalonamento
  on public.perfis_usuarios;
drop function if exists public.perfis_usuarios_bloquear_escalonamento();

drop policy if exists "authenticated_select_perfis" on public.perfis_usuarios;
create policy "authenticated_select_perfis"
  on public.perfis_usuarios
  for select
  to authenticated
  using (true);

drop policy if exists "authenticated_update_own_perfil" on public.perfis_usuarios;
create policy "authenticated_update_own_perfil"
  on public.perfis_usuarios
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =============================================================================
-- 3) auditoria_sistema INSERT — estado anterior
-- =============================================================================

drop policy if exists "authenticated_insert_auditoria_sistema"
  on public.auditoria_sistema;
create policy "authenticated_insert_auditoria_sistema"
  on public.auditoria_sistema
  for insert
  to authenticated
  with check (true);

-- SELECT admin_select_auditoria_sistema permanece is_admin_user() (não mexer).

-- =============================================================================
-- 4) Storage — predicados originais, sem is_staff_user()
-- =============================================================================

drop policy if exists "riscos_psicossociais_auth_select" on storage.objects;
create policy "riscos_psicossociais_auth_select"
  on storage.objects for select to authenticated
  using (bucket_id = 'riscos-psicossociais');

drop policy if exists "riscos_psicossociais_auth_insert" on storage.objects;
create policy "riscos_psicossociais_auth_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'riscos-psicossociais');

drop policy if exists "riscos_psicossociais_auth_update" on storage.objects;
create policy "riscos_psicossociais_auth_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'riscos-psicossociais')
  with check (bucket_id = 'riscos-psicossociais');

drop policy if exists "riscos_psicossociais_auth_delete" on storage.objects;
create policy "riscos_psicossociais_auth_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'riscos-psicossociais');

drop policy if exists "orcamentos_onboarding_auth_select" on storage.objects;
create policy "orcamentos_onboarding_auth_select"
  on storage.objects for select to authenticated
  using (bucket_id = 'orcamentos-onboarding');

drop policy if exists "orcamentos_onboarding_auth_insert" on storage.objects;
create policy "orcamentos_onboarding_auth_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'orcamentos-onboarding');

drop policy if exists "orcamentos_onboarding_auth_update" on storage.objects;
create policy "orcamentos_onboarding_auth_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'orcamentos-onboarding')
  with check (bucket_id = 'orcamentos-onboarding');

drop policy if exists "orcamentos_onboarding_auth_delete" on storage.objects;
create policy "orcamentos_onboarding_auth_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'orcamentos-onboarding');

drop policy if exists "authenticated_select_agendamentos_aso_retido" on storage.objects;
create policy "authenticated_select_agendamentos_aso_retido"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'agendamentos-aso-retido'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );

drop policy if exists "authenticated_insert_agendamentos_aso_retido" on storage.objects;
create policy "authenticated_insert_agendamentos_aso_retido"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'agendamentos-aso-retido'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );

drop policy if exists "authenticated_update_agendamentos_aso_retido" on storage.objects;
create policy "authenticated_update_agendamentos_aso_retido"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'agendamentos-aso-retido'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  )
  with check (
    bucket_id = 'agendamentos-aso-retido'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );

drop policy if exists "authenticated_delete_agendamentos_aso_retido" on storage.objects;
create policy "authenticated_delete_agendamentos_aso_retido"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'agendamentos-aso-retido'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );

drop policy if exists "authenticated_select_faturas_comprovantes" on storage.objects;
create policy "authenticated_select_faturas_comprovantes"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'faturas-comprovantes'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );

drop policy if exists "authenticated_insert_faturas_comprovantes" on storage.objects;
create policy "authenticated_insert_faturas_comprovantes"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'faturas-comprovantes'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );

drop policy if exists "authenticated_update_faturas_comprovantes" on storage.objects;
create policy "authenticated_update_faturas_comprovantes"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'faturas-comprovantes'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  )
  with check (
    bucket_id = 'faturas-comprovantes'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );

drop policy if exists "authenticated_delete_faturas_comprovantes" on storage.objects;
create policy "authenticated_delete_faturas_comprovantes"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'faturas-comprovantes'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );

drop policy if exists "authenticated_select_orcamentos_comprovantes" on storage.objects;
create policy "authenticated_select_orcamentos_comprovantes"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'orcamentos-comprovantes'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );

drop policy if exists "authenticated_insert_orcamentos_comprovantes" on storage.objects;
create policy "authenticated_insert_orcamentos_comprovantes"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'orcamentos-comprovantes'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );

drop policy if exists "authenticated_update_orcamentos_comprovantes" on storage.objects;
create policy "authenticated_update_orcamentos_comprovantes"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'orcamentos-comprovantes'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  )
  with check (
    bucket_id = 'orcamentos-comprovantes'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );

drop policy if exists "authenticated_delete_orcamentos_comprovantes" on storage.objects;
create policy "authenticated_delete_orcamentos_comprovantes"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'orcamentos-comprovantes'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );

-- =============================================================================
-- 5) Remover função staff
-- =============================================================================

drop function if exists public.is_staff_user();
