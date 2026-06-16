-- Garante unicidade de CNPJ por cliente (ignorando máscara/formatação).

-- 1) Mesclar duplicatas existentes (mantém o registro mais antigo).
do $$
declare
  group_rec record;
  keeper_id uuid;
  dup_id uuid;
begin
  for group_rec in
    select regexp_replace(cnpj, '[^0-9]', '', 'g') as digits
    from public.clientes
    where regexp_replace(cnpj, '[^0-9]', '', 'g') <> ''
    group by 1
    having count(*) > 1
  loop
    select id
    into keeper_id
    from public.clientes
    where regexp_replace(cnpj, '[^0-9]', '', 'g') = group_rec.digits
    order by created_at asc nulls last, id asc
    limit 1;

    for dup_id in
      select id
      from public.clientes
      where regexp_replace(cnpj, '[^0-9]', '', 'g') = group_rec.digits
        and id <> keeper_id
    loop
      update public.cliente_contratos
      set cliente_id = keeper_id
      where cliente_id = dup_id;

      update public.orcamentos
      set cliente_id = keeper_id
      where cliente_id = dup_id;

      delete from public.clientes
      where id = dup_id;
    end loop;
  end loop;
end $$;

-- 2) Coluna normalizada (somente leitura) para consultas e índice único.
alter table public.clientes
  drop column if exists cnpj_digits;

alter table public.clientes
  add column cnpj_digits text generated always as (
    regexp_replace(cnpj, '[^0-9]', '', 'g')
  ) stored;

create unique index if not exists idx_clientes_cnpj_digits_unique
  on public.clientes (cnpj_digits)
  where char_length(cnpj_digits) = 14;
