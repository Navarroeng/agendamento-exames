-- 015: Fechar RLS público (anon) e restringir a authenticated
-- Executar no Supabase SQL Editor antes do go-live.
-- O frontend usa Supabase Auth; operações de dados exigem sessão autenticada.

-- =============================================================================
-- CLINICAS
-- =============================================================================
alter table public.clinicas enable row level security;

drop policy if exists "anon_select_clinicas" on public.clinicas;
drop policy if exists "anon_insert_clinicas" on public.clinicas;
drop policy if exists "anon_update_clinicas" on public.clinicas;
drop policy if exists "anon_delete_clinicas" on public.clinicas;

drop policy if exists "authenticated_select_clinicas" on public.clinicas;
create policy "authenticated_select_clinicas"
  on public.clinicas for select to authenticated using (true);

drop policy if exists "authenticated_insert_clinicas" on public.clinicas;
create policy "authenticated_insert_clinicas"
  on public.clinicas for insert to authenticated with check (true);

drop policy if exists "authenticated_update_clinicas" on public.clinicas;
create policy "authenticated_update_clinicas"
  on public.clinicas for update to authenticated using (true) with check (true);

-- =============================================================================
-- CLINICA_EXAMES
-- =============================================================================
alter table public.clinica_exames enable row level security;

drop policy if exists "anon_select_clinica_exames" on public.clinica_exames;
drop policy if exists "anon_insert_clinica_exames" on public.clinica_exames;
drop policy if exists "anon_update_clinica_exames" on public.clinica_exames;
drop policy if exists "anon_delete_clinica_exames" on public.clinica_exames;

drop policy if exists "authenticated_select_clinica_exames" on public.clinica_exames;
create policy "authenticated_select_clinica_exames"
  on public.clinica_exames for select to authenticated using (true);

drop policy if exists "authenticated_insert_clinica_exames" on public.clinica_exames;
create policy "authenticated_insert_clinica_exames"
  on public.clinica_exames for insert to authenticated with check (true);

drop policy if exists "authenticated_update_clinica_exames" on public.clinica_exames;
create policy "authenticated_update_clinica_exames"
  on public.clinica_exames for update to authenticated using (true) with check (true);

-- =============================================================================
-- EXAMES (catálogo)
-- =============================================================================
alter table public.exames enable row level security;

drop policy if exists "anon_select_exames" on public.exames;
drop policy if exists "anon_insert_exames" on public.exames;
drop policy if exists "anon_update_exames" on public.exames;
drop policy if exists "anon_delete_exames" on public.exames;

drop policy if exists "authenticated_select_exames" on public.exames;
create policy "authenticated_select_exames"
  on public.exames for select to authenticated using (true);

drop policy if exists "authenticated_insert_exames" on public.exames;
create policy "authenticated_insert_exames"
  on public.exames for insert to authenticated with check (true);

drop policy if exists "authenticated_update_exames" on public.exames;
create policy "authenticated_update_exames"
  on public.exames for update to authenticated using (true) with check (true);

-- =============================================================================
-- CARGOS
-- =============================================================================
alter table public.cargos enable row level security;

drop policy if exists "anon_select_cargos" on public.cargos;
drop policy if exists "anon_insert_cargos" on public.cargos;
drop policy if exists "anon_update_cargos" on public.cargos;
drop policy if exists "anon_delete_cargos" on public.cargos;

drop policy if exists "authenticated_select_cargos" on public.cargos;
create policy "authenticated_select_cargos"
  on public.cargos for select to authenticated using (true);

drop policy if exists "authenticated_insert_cargos" on public.cargos;
create policy "authenticated_insert_cargos"
  on public.cargos for insert to authenticated with check (true);

drop policy if exists "authenticated_update_cargos" on public.cargos;
create policy "authenticated_update_cargos"
  on public.cargos for update to authenticated using (true) with check (true);

-- =============================================================================
-- CARGO_EXAMES (DELETE mantido: sincronizar vínculos ao editar cargo)
-- =============================================================================
alter table public.cargo_exames enable row level security;

drop policy if exists "anon_select_cargo_exames" on public.cargo_exames;
drop policy if exists "anon_insert_cargo_exames" on public.cargo_exames;
drop policy if exists "anon_update_cargo_exames" on public.cargo_exames;
drop policy if exists "anon_delete_cargo_exames" on public.cargo_exames;

drop policy if exists "authenticated_select_cargo_exames" on public.cargo_exames;
create policy "authenticated_select_cargo_exames"
  on public.cargo_exames for select to authenticated using (true);

drop policy if exists "authenticated_insert_cargo_exames" on public.cargo_exames;
create policy "authenticated_insert_cargo_exames"
  on public.cargo_exames for insert to authenticated with check (true);

drop policy if exists "authenticated_update_cargo_exames" on public.cargo_exames;
create policy "authenticated_update_cargo_exames"
  on public.cargo_exames for update to authenticated using (true) with check (true);

drop policy if exists "authenticated_delete_cargo_exames" on public.cargo_exames;
create policy "authenticated_delete_cargo_exames"
  on public.cargo_exames for delete to authenticated using (true);

-- =============================================================================
-- CLIENTES
-- =============================================================================
alter table public.clientes enable row level security;

drop policy if exists "anon_select_clientes" on public.clientes;
drop policy if exists "anon_insert_clientes" on public.clientes;
drop policy if exists "anon_update_clientes" on public.clientes;
drop policy if exists "anon_delete_clientes" on public.clientes;

drop policy if exists "authenticated_select_clientes" on public.clientes;
create policy "authenticated_select_clientes"
  on public.clientes for select to authenticated using (true);

drop policy if exists "authenticated_insert_clientes" on public.clientes;
create policy "authenticated_insert_clientes"
  on public.clientes for insert to authenticated with check (true);

drop policy if exists "authenticated_update_clientes" on public.clientes;
create policy "authenticated_update_clientes"
  on public.clientes for update to authenticated using (true) with check (true);

-- =============================================================================
-- CLIENTE_CONTRATOS
-- =============================================================================
alter table public.cliente_contratos enable row level security;

drop policy if exists "anon_select_cliente_contratos" on public.cliente_contratos;
drop policy if exists "anon_insert_cliente_contratos" on public.cliente_contratos;
drop policy if exists "anon_update_cliente_contratos" on public.cliente_contratos;
drop policy if exists "anon_delete_cliente_contratos" on public.cliente_contratos;

drop policy if exists "authenticated_select_cliente_contratos" on public.cliente_contratos;
create policy "authenticated_select_cliente_contratos"
  on public.cliente_contratos for select to authenticated using (true);

drop policy if exists "authenticated_insert_cliente_contratos" on public.cliente_contratos;
create policy "authenticated_insert_cliente_contratos"
  on public.cliente_contratos for insert to authenticated with check (true);

drop policy if exists "authenticated_update_cliente_contratos" on public.cliente_contratos;
create policy "authenticated_update_cliente_contratos"
  on public.cliente_contratos for update to authenticated using (true) with check (true);

-- =============================================================================
-- FATURAS (sem DELETE — cancelamento via status)
-- =============================================================================
alter table public.faturas enable row level security;

drop policy if exists "anon_select_faturas" on public.faturas;
drop policy if exists "anon_insert_faturas" on public.faturas;
drop policy if exists "anon_update_faturas" on public.faturas;
drop policy if exists "anon_delete_faturas" on public.faturas;

drop policy if exists "authenticated_select_faturas" on public.faturas;
create policy "authenticated_select_faturas"
  on public.faturas for select to authenticated using (true);

drop policy if exists "authenticated_insert_faturas" on public.faturas;
create policy "authenticated_insert_faturas"
  on public.faturas for insert to authenticated with check (true);

drop policy if exists "authenticated_update_faturas" on public.faturas;
create policy "authenticated_update_faturas"
  on public.faturas for update to authenticated using (true) with check (true);

-- =============================================================================
-- FATURA_ITENS (DELETE mantido: reemitir/atualizar itens da fatura)
-- =============================================================================
alter table public.fatura_itens enable row level security;

drop policy if exists "anon_select_fatura_itens" on public.fatura_itens;
drop policy if exists "anon_insert_fatura_itens" on public.fatura_itens;
drop policy if exists "anon_update_fatura_itens" on public.fatura_itens;
drop policy if exists "anon_delete_fatura_itens" on public.fatura_itens;

drop policy if exists "authenticated_select_fatura_itens" on public.fatura_itens;
create policy "authenticated_select_fatura_itens"
  on public.fatura_itens for select to authenticated using (true);

drop policy if exists "authenticated_insert_fatura_itens" on public.fatura_itens;
create policy "authenticated_insert_fatura_itens"
  on public.fatura_itens for insert to authenticated with check (true);

drop policy if exists "authenticated_delete_fatura_itens" on public.fatura_itens;
create policy "authenticated_delete_fatura_itens"
  on public.fatura_itens for delete to authenticated using (true);

-- =============================================================================
-- AGENDAMENTOS (sem DELETE — cancelamento via status)
-- =============================================================================
alter table public.agendamentos enable row level security;

drop policy if exists "anon_select_agendamentos" on public.agendamentos;
drop policy if exists "anon_insert_agendamentos" on public.agendamentos;
drop policy if exists "anon_update_agendamentos" on public.agendamentos;
drop policy if exists "anon_delete_agendamentos" on public.agendamentos;

drop policy if exists "authenticated_select_agendamentos" on public.agendamentos;
create policy "authenticated_select_agendamentos"
  on public.agendamentos for select to authenticated using (true);

drop policy if exists "authenticated_insert_agendamentos" on public.agendamentos;
create policy "authenticated_insert_agendamentos"
  on public.agendamentos for insert to authenticated with check (true);

drop policy if exists "authenticated_update_agendamentos" on public.agendamentos;
create policy "authenticated_update_agendamentos"
  on public.agendamentos for update to authenticated using (true) with check (true);

-- =============================================================================
-- AGENDAMENTO_EXAMES (DELETE mantido: substituir exames ao editar agendamento)
-- =============================================================================
alter table public.agendamento_exames enable row level security;

drop policy if exists "anon_select_agendamento_exames" on public.agendamento_exames;
drop policy if exists "anon_insert_agendamento_exames" on public.agendamento_exames;
drop policy if exists "anon_update_agendamento_exames" on public.agendamento_exames;
drop policy if exists "anon_delete_agendamento_exames" on public.agendamento_exames;

drop policy if exists "authenticated_select_agendamento_exames" on public.agendamento_exames;
create policy "authenticated_select_agendamento_exames"
  on public.agendamento_exames for select to authenticated using (true);

drop policy if exists "authenticated_insert_agendamento_exames" on public.agendamento_exames;
create policy "authenticated_insert_agendamento_exames"
  on public.agendamento_exames for insert to authenticated with check (true);

drop policy if exists "authenticated_update_agendamento_exames" on public.agendamento_exames;
create policy "authenticated_update_agendamento_exames"
  on public.agendamento_exames for update to authenticated using (true) with check (true);

drop policy if exists "authenticated_delete_agendamento_exames" on public.agendamento_exames;
create policy "authenticated_delete_agendamento_exames"
  on public.agendamento_exames for delete to authenticated using (true);

-- =============================================================================
-- HISTÓRICOS (necessários para o frontend — sem anon)
-- =============================================================================

-- agendamento_historico
alter table public.agendamento_historico enable row level security;

drop policy if exists "anon_select_agendamento_historico" on public.agendamento_historico;
drop policy if exists "anon_insert_agendamento_historico" on public.agendamento_historico;

drop policy if exists "authenticated_select_agendamento_historico" on public.agendamento_historico;
create policy "authenticated_select_agendamento_historico"
  on public.agendamento_historico for select to authenticated using (true);

drop policy if exists "authenticated_insert_agendamento_historico" on public.agendamento_historico;
create policy "authenticated_insert_agendamento_historico"
  on public.agendamento_historico for insert to authenticated with check (true);

-- clinicas_historico
alter table public.clinicas_historico enable row level security;

drop policy if exists "anon_select_clinicas_historico" on public.clinicas_historico;
drop policy if exists "anon_insert_clinicas_historico" on public.clinicas_historico;

drop policy if exists "authenticated_select_clinicas_historico" on public.clinicas_historico;
create policy "authenticated_select_clinicas_historico"
  on public.clinicas_historico for select to authenticated using (true);

drop policy if exists "authenticated_insert_clinicas_historico" on public.clinicas_historico;
create policy "authenticated_insert_clinicas_historico"
  on public.clinicas_historico for insert to authenticated with check (true);

-- clinica_exames_historico
alter table public.clinica_exames_historico enable row level security;

drop policy if exists "anon_select_clinica_exames_historico" on public.clinica_exames_historico;
drop policy if exists "anon_insert_clinica_exames_historico" on public.clinica_exames_historico;

drop policy if exists "authenticated_select_clinica_exames_historico" on public.clinica_exames_historico;
create policy "authenticated_select_clinica_exames_historico"
  on public.clinica_exames_historico for select to authenticated using (true);

drop policy if exists "authenticated_insert_clinica_exames_historico" on public.clinica_exames_historico;
create policy "authenticated_insert_clinica_exames_historico"
  on public.clinica_exames_historico for insert to authenticated with check (true);

-- exames_historico
alter table public.exames_historico enable row level security;

drop policy if exists "anon_select_exames_historico" on public.exames_historico;
drop policy if exists "anon_insert_exames_historico" on public.exames_historico;

drop policy if exists "authenticated_select_exames_historico" on public.exames_historico;
create policy "authenticated_select_exames_historico"
  on public.exames_historico for select to authenticated using (true);

drop policy if exists "authenticated_insert_exames_historico" on public.exames_historico;
create policy "authenticated_insert_exames_historico"
  on public.exames_historico for insert to authenticated with check (true);
