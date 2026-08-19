-- 109: RLS staff Navarro — authenticated ≠ staff
--
-- NÃO EXECUTAR EM PRODUÇÃO SEM REVISÃO EXPLÍCITA.
-- Esta migration NÃO altera dados; só função + policies + trigger.
--
-- Fonte de verdade de staff: public.perfis_usuarios
--   auth.uid() + ativo = true + perfil in ('admin', 'operacional')
-- Não usa e-mail, domínio nem metadata.
--
-- Padrão: replica public.is_admin_user() (023) com SECURITY DEFINER
-- e search_path = public, para ler perfis_usuarios sem recursão RLS.
--
-- Esta migration RESTRINGE policies existentes (using/check true → is_staff_user).
-- Não cria DELETE/INSERT/UPDATE onde não existiam.
-- Não cria policy nas tabelas do colaborador (avaliacao_* / portal_auditoria).

-- =============================================================================
-- 1) Função central
-- =============================================================================

create or replace function public.is_staff_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.perfis_usuarios
    where user_id = auth.uid()
      and ativo = true
      and perfil in ('admin', 'operacional')
  );
$$;

comment on function public.is_staff_user() is
  'TRUE se o JWT atual é funcionário Navarro ativo (perfil admin ou operacional). SECURITY DEFINER para evitar recursão RLS em perfis_usuarios.';

revoke all on function public.is_staff_user() from public;
grant execute on function public.is_staff_user() to authenticated;
grant execute on function public.is_staff_user() to service_role;

-- =============================================================================
-- 2) perfis_usuarios — SELECT staff-only + anti-escalonamento
-- =============================================================================
-- SELECT usando is_staff_user() (DEFINER) não recorre: a função ignora RLS.
-- UPDATE próprio continua permitido só para staff, mas trigger bloqueia
-- mudança de perfil / ativo / user_id quando há JWT (PostgREST).
-- Sem JWT (SQL editor, service role, migrations) o trigger não interfere.
-- Sem policy de INSERT/DELETE: permanece apenas service role / SQL.

create or replace function public.perfis_usuarios_bloquear_escalonamento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return NEW;
  end if;

  if NEW.user_id is distinct from OLD.user_id
     or NEW.perfil is distinct from OLD.perfil
     or NEW.ativo is distinct from OLD.ativo then
    raise exception
      'Alteração de user_id, perfil ou ativo em perfis_usuarios não é permitida via cliente autenticado.';
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_perfis_usuarios_bloquear_escalonamento
  on public.perfis_usuarios;
create trigger trg_perfis_usuarios_bloquear_escalonamento
  before update on public.perfis_usuarios
  for each row
  execute function public.perfis_usuarios_bloquear_escalonamento();

drop policy if exists "authenticated_select_perfis" on public.perfis_usuarios;
create policy "authenticated_select_perfis"
  on public.perfis_usuarios
  for select
  to authenticated
  using (public.is_staff_user());

drop policy if exists "authenticated_update_own_perfil" on public.perfis_usuarios;
create policy "authenticated_update_own_perfil"
  on public.perfis_usuarios
  for update
  to authenticated
  using (auth.uid() = user_id and public.is_staff_user())
  with check (auth.uid() = user_id and public.is_staff_user());

-- =============================================================================
-- 3) auditoria_sistema — só INSERT (SELECT permanece is_admin_user)
-- =============================================================================
-- Quem escreve: services/auditoria.service.ts via JWT do browser (staff).
-- Operacional e admin precisam INSERT; só admin lê.
-- Restringir INSERT a is_staff_user() não amplia permissão e impede
-- JWT externo de gravar lixo na auditoria.

drop policy if exists "authenticated_insert_auditoria_sistema"
  on public.auditoria_sistema;
create policy "authenticated_insert_auditoria_sistema"
  on public.auditoria_sistema
  for insert
  to authenticated
  with check (public.is_staff_user());

-- =============================================================================
-- 4) Policies administrativas public.* (mesmos nomes e operações)
-- =============================================================================
-- Inventário explícito: (tabela, nome da policy, comando).
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
        'create policy %I on public.%I for select to authenticated using (public.is_staff_user())',
        rec.pol,
        rec.tbl
      );
    elsif rec.cmd = 'INSERT' then
      execute format(
        'create policy %I on public.%I for insert to authenticated with check (public.is_staff_user())',
        rec.pol,
        rec.tbl
      );
    elsif rec.cmd = 'UPDATE' then
      execute format(
        'create policy %I on public.%I for update to authenticated using (public.is_staff_user()) with check (public.is_staff_user())',
        rec.pol,
        rec.tbl
      );
    elsif rec.cmd = 'DELETE' then
      execute format(
        'create policy %I on public.%I for delete to authenticated using (public.is_staff_user())',
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
-- 5) Storage administrativo — restringe JWT autenticado aos buckets internos
-- =============================================================================
-- Predicados originais (bucket_id / pasta UUID) são preservados.
-- Apenas adiciona AND public.is_staff_user(). Não amplia operações.

-- riscos-psicossociais
drop policy if exists "riscos_psicossociais_auth_select" on storage.objects;
create policy "riscos_psicossociais_auth_select"
  on storage.objects for select to authenticated
  using (bucket_id = 'riscos-psicossociais' and public.is_staff_user());

drop policy if exists "riscos_psicossociais_auth_insert" on storage.objects;
create policy "riscos_psicossociais_auth_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'riscos-psicossociais' and public.is_staff_user());

drop policy if exists "riscos_psicossociais_auth_update" on storage.objects;
create policy "riscos_psicossociais_auth_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'riscos-psicossociais' and public.is_staff_user())
  with check (bucket_id = 'riscos-psicossociais' and public.is_staff_user());

drop policy if exists "riscos_psicossociais_auth_delete" on storage.objects;
create policy "riscos_psicossociais_auth_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'riscos-psicossociais' and public.is_staff_user());

-- orcamentos-onboarding
drop policy if exists "orcamentos_onboarding_auth_select" on storage.objects;
create policy "orcamentos_onboarding_auth_select"
  on storage.objects for select to authenticated
  using (bucket_id = 'orcamentos-onboarding' and public.is_staff_user());

drop policy if exists "orcamentos_onboarding_auth_insert" on storage.objects;
create policy "orcamentos_onboarding_auth_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'orcamentos-onboarding' and public.is_staff_user());

drop policy if exists "orcamentos_onboarding_auth_update" on storage.objects;
create policy "orcamentos_onboarding_auth_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'orcamentos-onboarding' and public.is_staff_user())
  with check (bucket_id = 'orcamentos-onboarding' and public.is_staff_user());

drop policy if exists "orcamentos_onboarding_auth_delete" on storage.objects;
create policy "orcamentos_onboarding_auth_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'orcamentos-onboarding' and public.is_staff_user());

-- agendamentos-aso-retido
drop policy if exists "authenticated_select_agendamentos_aso_retido" on storage.objects;
create policy "authenticated_select_agendamentos_aso_retido"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'agendamentos-aso-retido'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.is_staff_user()
  );

drop policy if exists "authenticated_insert_agendamentos_aso_retido" on storage.objects;
create policy "authenticated_insert_agendamentos_aso_retido"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'agendamentos-aso-retido'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.is_staff_user()
  );

drop policy if exists "authenticated_update_agendamentos_aso_retido" on storage.objects;
create policy "authenticated_update_agendamentos_aso_retido"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'agendamentos-aso-retido'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.is_staff_user()
  )
  with check (
    bucket_id = 'agendamentos-aso-retido'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.is_staff_user()
  );

drop policy if exists "authenticated_delete_agendamentos_aso_retido" on storage.objects;
create policy "authenticated_delete_agendamentos_aso_retido"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'agendamentos-aso-retido'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.is_staff_user()
  );

-- faturas-comprovantes
drop policy if exists "authenticated_select_faturas_comprovantes" on storage.objects;
create policy "authenticated_select_faturas_comprovantes"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'faturas-comprovantes'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.is_staff_user()
  );

drop policy if exists "authenticated_insert_faturas_comprovantes" on storage.objects;
create policy "authenticated_insert_faturas_comprovantes"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'faturas-comprovantes'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.is_staff_user()
  );

drop policy if exists "authenticated_update_faturas_comprovantes" on storage.objects;
create policy "authenticated_update_faturas_comprovantes"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'faturas-comprovantes'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.is_staff_user()
  )
  with check (
    bucket_id = 'faturas-comprovantes'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.is_staff_user()
  );

drop policy if exists "authenticated_delete_faturas_comprovantes" on storage.objects;
create policy "authenticated_delete_faturas_comprovantes"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'faturas-comprovantes'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.is_staff_user()
  );

-- orcamentos-comprovantes
drop policy if exists "authenticated_select_orcamentos_comprovantes" on storage.objects;
create policy "authenticated_select_orcamentos_comprovantes"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'orcamentos-comprovantes'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.is_staff_user()
  );

drop policy if exists "authenticated_insert_orcamentos_comprovantes" on storage.objects;
create policy "authenticated_insert_orcamentos_comprovantes"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'orcamentos-comprovantes'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.is_staff_user()
  );

drop policy if exists "authenticated_update_orcamentos_comprovantes" on storage.objects;
create policy "authenticated_update_orcamentos_comprovantes"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'orcamentos-comprovantes'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.is_staff_user()
  )
  with check (
    bucket_id = 'orcamentos-comprovantes'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.is_staff_user()
  );

drop policy if exists "authenticated_delete_orcamentos_comprovantes" on storage.objects;
create policy "authenticated_delete_orcamentos_comprovantes"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'orcamentos-comprovantes'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.is_staff_user()
  );
