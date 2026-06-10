-- Permite substituir exames ao editar agendamento (delete + insert no update).
-- Sem policy de DELETE, o RLS bloqueia a remoção silenciosamente e os inserts duplicam linhas.

alter table public.agendamento_exames enable row level security;

drop policy if exists "anon_delete_agendamento_exames" on public.agendamento_exames;
create policy "anon_delete_agendamento_exames"
  on public.agendamento_exames
  for delete
  to anon
  using (true);

drop policy if exists "authenticated_delete_agendamento_exames" on public.agendamento_exames;
create policy "authenticated_delete_agendamento_exames"
  on public.agendamento_exames
  for delete
  to authenticated
  using (true);
