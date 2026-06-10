-- Diagnóstico: colunas de cargo em public.agendamentos
select
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'agendamentos'
  and column_name in ('cargo_id', 'cargo_nome')
order by ordinal_position;
