-- 016: Remover TODAS as policies anon (e duplicadas) de agendamentos
-- Usa drop dinâmico por nome real em pg_policies — cobre policies fora do padrão anon_*.
-- Depois recria somente policies authenticated.

-- =============================================================================
-- 1. Remover TODAS as policies existentes nas 3 tabelas
-- =============================================================================
do $$
declare
  pol record;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'agendamentos',
        'agendamento_exames',
        'agendamento_historico'
      )
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      pol.policyname,
      pol.schemaname,
      pol.tablename
    );
    raise notice 'Dropped policy % on %', pol.policyname, pol.tablename;
  end loop;
end $$;

-- =============================================================================
-- 2. Garantir RLS habilitado
-- =============================================================================
alter table public.agendamentos enable row level security;
alter table public.agendamento_exames enable row level security;
alter table public.agendamento_historico enable row level security;

-- =============================================================================
-- 3. AGENDAMENTOS — authenticated only (sem DELETE)
-- =============================================================================
create policy "authenticated_select_agendamentos"
  on public.agendamentos for select to authenticated using (true);

create policy "authenticated_insert_agendamentos"
  on public.agendamentos for insert to authenticated with check (true);

create policy "authenticated_update_agendamentos"
  on public.agendamentos for update to authenticated using (true) with check (true);

-- =============================================================================
-- 4. AGENDAMENTO_EXAMES — authenticated (+ DELETE para editar agendamento)
-- =============================================================================
create policy "authenticated_select_agendamento_exames"
  on public.agendamento_exames for select to authenticated using (true);

create policy "authenticated_insert_agendamento_exames"
  on public.agendamento_exames for insert to authenticated with check (true);

create policy "authenticated_update_agendamento_exames"
  on public.agendamento_exames for update to authenticated using (true) with check (true);

create policy "authenticated_delete_agendamento_exames"
  on public.agendamento_exames for delete to authenticated using (true);

-- =============================================================================
-- 5. AGENDAMENTO_HISTORICO — authenticated only (append-only)
-- =============================================================================
create policy "authenticated_select_agendamento_historico"
  on public.agendamento_historico for select to authenticated using (true);

create policy "authenticated_insert_agendamento_historico"
  on public.agendamento_historico for insert to authenticated with check (true);
