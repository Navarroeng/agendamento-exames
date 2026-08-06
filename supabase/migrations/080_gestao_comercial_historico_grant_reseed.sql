-- Garante grants + reseed do histórico comercial (idempotente).
-- Corrige caso a tabela exista sem privilégio de SELECT para authenticated
-- ou o seed anterior não tenha sido aplicado.

grant select on table public.gestao_comercial_historico_mensal to authenticated;
grant select on table public.gestao_comercial_historico_mensal to service_role;

alter table public.gestao_comercial_historico_mensal enable row level security;

drop policy if exists "authenticated_select_gestao_comercial_historico_mensal"
  on public.gestao_comercial_historico_mensal;

create policy "authenticated_select_gestao_comercial_historico_mensal"
  on public.gestao_comercial_historico_mensal
  for select
  to authenticated
  using (true);

insert into public.gestao_comercial_historico_mensal (
  ano, mes, valor_fechado, origem_dado, observacao, criado_por, atualizado_por
) values
  (2025, 1, 25910.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_080', 'migration_080'),
  (2025, 2, 25646.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_080', 'migration_080'),
  (2025, 3, 16980.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_080', 'migration_080'),
  (2025, 4, 36785.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_080', 'migration_080'),
  (2025, 5, 23300.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_080', 'migration_080'),
  (2025, 6, 20300.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_080', 'migration_080'),
  (2025, 7, 33600.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_080', 'migration_080'),
  (2025, 8, 39150.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_080', 'migration_080'),
  (2025, 9, 26900.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_080', 'migration_080'),
  (2025, 10, 25400.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_080', 'migration_080'),
  (2025, 11, 29295.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_080', 'migration_080'),
  (2025, 12, 40000.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_080', 'migration_080'),
  (2026, 1, 40900.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_080', 'migration_080'),
  (2026, 2, 37426.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_080', 'migration_080'),
  (2026, 3, 26070.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_080', 'migration_080'),
  (2026, 4, 56550.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_080', 'migration_080'),
  (2026, 5, 18525.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_080', 'migration_080'),
  (2026, 6, 19700.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_080', 'migration_080')
on conflict (ano, mes) do update
set
  valor_fechado = excluded.valor_fechado,
  origem_dado = excluded.origem_dado,
  observacao = excluded.observacao,
  atualizado_em = now(),
  atualizado_por = excluded.atualizado_por;
