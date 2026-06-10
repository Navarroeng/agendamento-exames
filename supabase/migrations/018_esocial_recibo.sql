-- Nº Recibo e-Social (renomeia esocial_protocolo legado, se existir)
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'agendamentos'
      and column_name = 'esocial_protocolo'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'agendamentos'
      and column_name = 'esocial_recibo'
  ) then
    alter table public.agendamentos
    rename column esocial_protocolo to esocial_recibo;
  end if;
end $$;

alter table public.agendamentos
add column if not exists esocial_recibo text;
