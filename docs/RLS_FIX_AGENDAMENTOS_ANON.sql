-- Corretivo anon em agendamentos — copie e execute no Supabase SQL Editor.
-- Arquivo canônico: supabase/migrations/016_agendamentos_remove_anon_rls.sql

-- 1. Remover TODAS as policies das 3 tabelas (qualquer nome)
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
  end loop;
end $$;

alter table public.agendamentos enable row level security;
alter table public.agendamento_exames enable row level security;
alter table public.agendamento_historico enable row level security;

create policy "authenticated_select_agendamentos"
  on public.agendamentos for select to authenticated using (true);
create policy "authenticated_insert_agendamentos"
  on public.agendamentos for insert to authenticated with check (true);
create policy "authenticated_update_agendamentos"
  on public.agendamentos for update to authenticated using (true) with check (true);

create policy "authenticated_select_agendamento_exames"
  on public.agendamento_exames for select to authenticated using (true);
create policy "authenticated_insert_agendamento_exames"
  on public.agendamento_exames for insert to authenticated with check (true);
create policy "authenticated_update_agendamento_exames"
  on public.agendamento_exames for update to authenticated using (true) with check (true);
create policy "authenticated_delete_agendamento_exames"
  on public.agendamento_exames for delete to authenticated using (true);

create policy "authenticated_select_agendamento_historico"
  on public.agendamento_historico for select to authenticated using (true);
create policy "authenticated_insert_agendamento_historico"
  on public.agendamento_historico for insert to authenticated with check (true);

-- 2. Auditar (deve retornar 0 linhas):
-- select tablename, policyname, roles from pg_policies
-- where schemaname = 'public' and 'anon' = any(roles);
