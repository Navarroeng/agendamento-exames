-- Pertencimento exato cliente↔fatura: cliente_id em agendamentos,
-- backfill de referencia_id e limpeza de fatura_itens inconsistentes.

-- ---------------------------------------------------------------------------
-- 1) agendamentos.cliente_id
-- ---------------------------------------------------------------------------
alter table public.agendamentos
  add column if not exists cliente_id uuid null
    references public.clientes (id) on delete set null;

create index if not exists idx_agendamentos_cliente_id
  on public.agendamentos (cliente_id)
  where cliente_id is not null;

comment on column public.agendamentos.cliente_id is
  'Cliente do cadastro vinculado ao agendamento (preferencial para faturamento).';

-- Backfill por igualdade exata de nome (trim + lower), sem substring.
update public.agendamentos a
set cliente_id = c.id
from public.clientes c
where a.cliente_id is null
  and lower(trim(a.cliente_nome)) = lower(trim(c.nome));

-- ---------------------------------------------------------------------------
-- 2) faturas.referencia_id (tipo cliente)
-- ---------------------------------------------------------------------------
update public.faturas f
set referencia_id = c.id
from public.clientes c
where f.tipo = 'cliente'
  and f.referencia_id is null
  and lower(trim(f.referencia_nome)) = lower(trim(c.nome));

-- ---------------------------------------------------------------------------
-- 3) Remover fatura_itens cujo agendamento atual pertence a outro cliente
-- ---------------------------------------------------------------------------
with inconsistentes as (
  select fi.id as item_id, fi.fatura_id
  from public.fatura_itens fi
  inner join public.faturas f on f.id = fi.fatura_id
  inner join public.agendamentos a on a.id = fi.agendamento_id
  left join public.clientes c_fat on c_fat.id = f.referencia_id
  left join public.clientes c_fat_nome
    on f.referencia_id is null
   and lower(trim(c_fat_nome.nome)) = lower(trim(f.referencia_nome))
  left join public.clientes c_ag on c_ag.id = a.cliente_id
  left join public.clientes c_ag_nome
    on a.cliente_id is null
   and lower(trim(c_ag_nome.nome)) = lower(trim(a.cliente_nome))
  where f.tipo = 'cliente'
    and fi.agendamento_id is not null
    and (
      -- IDs resolvidos e diferentes
      (
        coalesce(c_fat.id, c_fat_nome.id) is not null
        and coalesce(c_ag.id, c_ag_nome.id) is not null
        and coalesce(c_fat.id, c_fat_nome.id)
          is distinct from coalesce(c_ag.id, c_ag_nome.id)
      )
      -- Ou CNPJs diferentes (14 dígitos)
      or (
        length(regexp_replace(coalesce(c_fat.cnpj, c_fat_nome.cnpj, ''), '[^0-9]', '', 'g')) = 14
        and length(regexp_replace(coalesce(c_ag.cnpj, c_ag_nome.cnpj, ''), '[^0-9]', '', 'g')) = 14
        and regexp_replace(coalesce(c_fat.cnpj, c_fat_nome.cnpj, ''), '[^0-9]', '', 'g')
          is distinct from
          regexp_replace(coalesce(c_ag.cnpj, c_ag_nome.cnpj, ''), '[^0-9]', '', 'g')
      )
      -- Fallback: nomes exatos diferentes (quando não há id/cnpj)
      or (
        coalesce(c_fat.id, c_fat_nome.id) is null
        and coalesce(c_ag.id, c_ag_nome.id) is null
        and lower(trim(f.referencia_nome)) is distinct from lower(trim(a.cliente_nome))
      )
    )
),
deleted as (
  delete from public.fatura_itens fi
  using inconsistentes i
  where fi.id = i.item_id
  returning fi.fatura_id
)
update public.faturas f
set
  valor_total = coalesce((
    select sum(fi.valor_total)::numeric(10,2)
    from public.fatura_itens fi
    where fi.fatura_id = f.id
  ), 0),
  total_exames = coalesce((
    select count(*)::integer
    from public.fatura_itens fi
    where fi.fatura_id = f.id
  ), 0),
  updated_at = now()
where f.id in (select distinct fatura_id from deleted);
