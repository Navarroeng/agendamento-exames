-- Diagnóstico do schema real da tabela public.agendamento_exames
select
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'agendamento_exames'
order by ordinal_position;
