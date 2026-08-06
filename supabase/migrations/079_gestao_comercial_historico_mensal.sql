-- Histórico mensal consolidado anterior ao sistema (Gestão Comercial).
-- Não cria contratos/orçamentos fictícios; só valores mensais para gráfico/comparativos.

-- ---------------------------------------------------------------------------
-- 1) Tabela
-- ---------------------------------------------------------------------------
create table if not exists public.gestao_comercial_historico_mensal (
  id uuid primary key default gen_random_uuid(),
  ano integer not null check (ano >= 2000 and ano <= 2100),
  mes integer not null check (mes >= 1 and mes <= 12),
  valor_fechado numeric(14, 2) not null check (valor_fechado >= 0),
  origem_dado text not null default 'historico_manual'
    check (origem_dado = 'historico_manual'),
  observacao text not null
    default 'Valor consolidado anterior ao início do sistema',
  criado_em timestamptz not null default now(),
  criado_por text null,
  atualizado_em timestamptz not null default now(),
  atualizado_por text null,
  constraint gestao_comercial_historico_mensal_ano_mes_uk unique (ano, mes)
);

comment on table public.gestao_comercial_historico_mensal is
  'Valores comerciais mensais consolidados anteriores ao sistema (somente totais).';

comment on column public.gestao_comercial_historico_mensal.valor_fechado is
  'Valor fechado consolidado do mês (numeric, sem formatação monetária).';

comment on column public.gestao_comercial_historico_mensal.origem_dado is
  'Sempre historico_manual — distingue de fechamentos reais do sistema.';

create index if not exists idx_gestao_comercial_historico_ano_mes
  on public.gestao_comercial_historico_mensal (ano, mes);

-- ---------------------------------------------------------------------------
-- 2) RLS (leitura autenticada; escrita via migration/service role)
-- ---------------------------------------------------------------------------
alter table public.gestao_comercial_historico_mensal enable row level security;

drop policy if exists "authenticated_select_gestao_comercial_historico_mensal"
  on public.gestao_comercial_historico_mensal;

create policy "authenticated_select_gestao_comercial_historico_mensal"
  on public.gestao_comercial_historico_mensal
  for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- 3) Seed (upsert por ano+mês)
-- ---------------------------------------------------------------------------
insert into public.gestao_comercial_historico_mensal (
  ano, mes, valor_fechado, origem_dado, observacao, criado_por, atualizado_por
) values
  -- 2025
  (2025, 1, 25910.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_079', 'migration_079'),
  (2025, 2, 25646.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_079', 'migration_079'),
  (2025, 3, 16980.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_079', 'migration_079'),
  (2025, 4, 36785.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_079', 'migration_079'),
  (2025, 5, 23300.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_079', 'migration_079'),
  (2025, 6, 20300.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_079', 'migration_079'),
  (2025, 7, 33600.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_079', 'migration_079'),
  (2025, 8, 39150.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_079', 'migration_079'),
  (2025, 9, 26900.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_079', 'migration_079'),
  (2025, 10, 25400.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_079', 'migration_079'),
  (2025, 11, 29295.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_079', 'migration_079'),
  (2025, 12, 40000.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_079', 'migration_079'),
  -- 2026 (até junho; a partir de julho usar dados reais)
  (2026, 1, 40900.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_079', 'migration_079'),
  (2026, 2, 37426.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_079', 'migration_079'),
  (2026, 3, 26070.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_079', 'migration_079'),
  (2026, 4, 56550.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_079', 'migration_079'),
  (2026, 5, 18525.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_079', 'migration_079'),
  (2026, 6, 19700.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_079', 'migration_079')
on conflict (ano, mes) do update
set
  valor_fechado = excluded.valor_fechado,
  origem_dado = excluded.origem_dado,
  observacao = excluded.observacao,
  atualizado_em = now(),
  atualizado_por = excluded.atualizado_por;
