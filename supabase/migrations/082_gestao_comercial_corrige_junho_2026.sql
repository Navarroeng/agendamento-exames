-- Corrige valor histórico de Junho/2026 na Gestão Comercial.
-- Valor incorreto: R$ 11.500,00 → valor correto: R$ 19.700,00
-- Apenas atualiza o registro existente; não cria novo e não altera contratos.

update public.gestao_comercial_historico_mensal
set
  valor_fechado = 19700.00,
  observacao = 'Valor consolidado anterior ao início do sistema (corrigido em migration_082)',
  atualizado_em = now(),
  atualizado_por = 'migration_082'
where ano = 2026
  and mes = 6
  and origem_dado = 'historico_manual';
