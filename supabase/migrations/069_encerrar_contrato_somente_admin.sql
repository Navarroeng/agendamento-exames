-- Encerramento manual de contrato (encerrado_em) exige perfil administrador.

create or replace function public.trg_cliente_contratos_encerrar_somente_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Encerramento automático (substituição de contrato ativo) não preenche encerrado_em.
  if new.encerrado_em is not null
     and (old.encerrado_em is null or old.encerrado_em is distinct from new.encerrado_em)
  then
    if not public.is_admin_user() then
      raise exception
        'Você não possui permissão para encerrar este contrato. Esta ação é exclusiva para administradores.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_cliente_contratos_encerrar_somente_admin
  on public.cliente_contratos;
create trigger trg_cliente_contratos_encerrar_somente_admin
  before update on public.cliente_contratos
  for each row
  execute function public.trg_cliente_contratos_encerrar_somente_admin();

comment on function public.trg_cliente_contratos_encerrar_somente_admin() is
  'Bloqueia encerramento manual (encerrado_em) para não-administradores.';
