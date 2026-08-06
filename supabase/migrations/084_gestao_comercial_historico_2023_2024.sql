-- Seed histórico consolidado 2023 e 2024 (Gestão Comercial).
-- Complementa gestao_comercial_historico_mensal (criada em 079).
-- Não altera 2025/2026 nem cria contratos fictícios.
-- Idempotente: upsert por (ano, mes).

insert into public.gestao_comercial_historico_mensal (
  ano, mes, valor_fechado, origem_dado, observacao, criado_por, atualizado_por
) values
  -- 2023
  (2023, 1, 32480.50, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_084', 'migration_084'),
  (2023, 2, 37766.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_084', 'migration_084'),
  (2023, 3, 46910.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_084', 'migration_084'),
  (2023, 4, 8200.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_084', 'migration_084'),
  (2023, 5, 9655.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_084', 'migration_084'),
  (2023, 6, 11240.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_084', 'migration_084'),
  (2023, 7, 10070.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_084', 'migration_084'),
  (2023, 8, 17095.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_084', 'migration_084'),
  (2023, 9, 6075.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_084', 'migration_084'),
  (2023, 10, 15775.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_084', 'migration_084'),
  (2023, 11, 15985.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_084', 'migration_084'),
  (2023, 12, 19120.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_084', 'migration_084'),
  -- 2024
  (2024, 1, 18455.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_084', 'migration_084'),
  (2024, 2, 22746.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_084', 'migration_084'),
  (2024, 3, 16390.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_084', 'migration_084'),
  (2024, 4, 43835.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_084', 'migration_084'),
  (2024, 5, 9790.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_084', 'migration_084'),
  (2024, 6, 6125.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_084', 'migration_084'),
  (2024, 7, 19645.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_084', 'migration_084'),
  (2024, 8, 22020.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_084', 'migration_084'),
  (2024, 9, 11589.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_084', 'migration_084'),
  (2024, 10, 20000.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_084', 'migration_084'),
  (2024, 11, 8500.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_084', 'migration_084'),
  (2024, 12, 17370.00, 'historico_manual', 'Valor consolidado anterior ao início do sistema', 'migration_084', 'migration_084')
on conflict (ano, mes) do update
set
  valor_fechado = excluded.valor_fechado,
  origem_dado = excluded.origem_dado,
  observacao = excluded.observacao,
  atualizado_em = now(),
  atualizado_por = excluded.atualizado_por;
