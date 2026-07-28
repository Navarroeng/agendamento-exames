-- Origem comercial do cliente no orçamento (uso interno; não vai no PDF).

alter table public.orcamentos
  add column if not exists origem_cliente text null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orcamentos_origem_cliente_check'
  ) then
    alter table public.orcamentos
      add constraint orcamentos_origem_cliente_check
      check (
        origem_cliente is null
        or origem_cliente in ('indicacao', 'google')
      );
  end if;
end $$;

comment on column public.orcamentos.origem_cliente is
  'Origem comercial do cliente: indicacao | google. Uso interno.';
