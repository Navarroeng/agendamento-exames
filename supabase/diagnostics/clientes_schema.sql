-- Diagnóstico do schema real da tabela public.clientes
select
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'clientes'
order by ordinal_position;
