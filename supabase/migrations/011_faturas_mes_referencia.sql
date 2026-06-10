-- Mês de referência da fatura (YYYY-MM) para evitar duplicidades
alter table public.faturas
add column if not exists mes_referencia text null;

update public.faturas
set mes_referencia = to_char(periodo_inicio::date, 'YYYY-MM')
where periodo_inicio is not null
  and mes_referencia is null;

create unique index if not exists idx_faturas_unique_mes_ativa
on public.faturas (tipo, referencia_nome, mes_referencia)
where status <> 'cancelada'
  and mes_referencia is not null;
