-- RLS para public.clientes (SELECT, INSERT, UPDATE para authenticated)
alter table public.clientes enable row level security;

drop policy if exists "authenticated_select_clientes" on public.clientes;
create policy "authenticated_select_clientes"
  on public.clientes for select to authenticated using (true);

drop policy if exists "authenticated_insert_clientes" on public.clientes;
create policy "authenticated_insert_clientes"
  on public.clientes for insert to authenticated with check (true);

drop policy if exists "authenticated_update_clientes" on public.clientes;
create policy "authenticated_update_clientes"
  on public.clientes for update to authenticated using (true) with check (true);
