-- EXECUTE NO SUPABASE SQL EDITOR (confirmação + reseed)
-- 1) Conferir tabela/colunas
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'gestao_comercial_historico_mensal'
order by ordinal_position;

-- 2) Contar e listar
select count(*) as total from public.gestao_comercial_historico_mensal;

select ano, mes, valor_fechado, origem_dado, observacao
from public.gestao_comercial_historico_mensal
order by ano, mes;

-- 3) Se total = 0 (ou valores errados), rode a migration 080 completa
--    (arquivo: supabase/migrations/080_gestao_comercial_historico_grant_reseed.sql)
