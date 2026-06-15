-- Regras operacionais de atendimento por clínica
alter table public.clinicas
  add column if not exists tipo_atendimento text not null default 'horario_agendado'
    check (tipo_atendimento in ('horario_agendado', 'ordem_chegada'));

alter table public.clinicas
  add column if not exists dias_atendimento smallint[] null;

alter table public.clinicas
  add column if not exists horario_padrao_inicio time null,
  add column if not exists horario_padrao_fim time null,
  add column if not exists horario_clinico_inicio time null,
  add column if not exists horario_clinico_fim time null,
  add column if not exists horario_complementar_inicio time null,
  add column if not exists horario_complementar_fim time null,
  add column if not exists janelas_adicionais jsonb null,
  add column if not exists observacao_operacional text null;

comment on column public.clinicas.dias_atendimento is
  'Dias permitidos (0=dom … 6=sáb, convenção JS Date.getDay())';
comment on column public.clinicas.janelas_adicionais is
  'Janelas extras de horário, ex.: [{"inicio":"13:00","fim":"14:30"}]';

-- PREVINE → PREVINE ITAQUERA
update public.clinicas
set
  nome_fantasia = 'PREVINE ITAQUERA',
  razao_social = case
    when razao_social = 'PREVINE' then 'PREVINE ITAQUERA'
    else razao_social
  end,
  updated_at = now()
where nome_fantasia = 'PREVINE';

-- BC WORK
update public.clinicas
set
  tipo_atendimento = 'ordem_chegada',
  dias_atendimento = array[1, 2, 3, 4, 5],
  horario_padrao_inicio = '08:00',
  horario_padrao_fim = '16:00',
  updated_at = now()
where nome_fantasia = 'BC WORK';

-- PREVINE ITAQUERA
update public.clinicas
set
  tipo_atendimento = 'ordem_chegada',
  dias_atendimento = array[1, 2, 3, 4, 5],
  horario_clinico_inicio = '08:00',
  horario_clinico_fim = '16:00',
  horario_complementar_inicio = '08:00',
  horario_complementar_fim = '12:00',
  updated_at = now()
where nome_fantasia = 'PREVINE ITAQUERA';

-- PREVINE SANTANA
update public.clinicas
set
  tipo_atendimento = 'ordem_chegada',
  dias_atendimento = array[1, 3, 5],
  horario_clinico_inicio = '08:00',
  horario_clinico_fim = '16:00',
  horario_complementar_inicio = '08:00',
  horario_complementar_fim = '11:00',
  updated_at = now()
where nome_fantasia = 'PREVINE SANTANA';

-- PREVINE SANTO ANDRÉ
update public.clinicas
set
  tipo_atendimento = 'ordem_chegada',
  dias_atendimento = array[1, 3, 5],
  horario_clinico_inicio = '08:00',
  horario_clinico_fim = '16:00',
  horario_complementar_inicio = '08:00',
  horario_complementar_fim = '11:00',
  updated_at = now()
where nome_fantasia = 'PREVINE SANTO ANDRÉ';

-- PRIME
update public.clinicas
set
  tipo_atendimento = 'ordem_chegada',
  dias_atendimento = array[1, 2, 3, 4, 5],
  horario_padrao_inicio = '08:00',
  horario_padrao_fim = '11:30',
  updated_at = now()
where nome_fantasia = 'PRIME';

-- LABORMESP IPIRANGA
update public.clinicas
set
  tipo_atendimento = 'horario_agendado',
  dias_atendimento = array[2, 4],
  horario_padrao_inicio = '08:00',
  horario_padrao_fim = '12:00',
  updated_at = now()
where nome_fantasia = 'LABORMESP IPIRANGA';

-- LABORMESP JABAQUARA
update public.clinicas
set
  tipo_atendimento = 'horario_agendado',
  dias_atendimento = array[1, 3, 5],
  horario_padrao_inicio = '08:00',
  horario_padrao_fim = '12:00',
  janelas_adicionais = '[{"inicio":"13:00","fim":"14:30"}]'::jsonb,
  updated_at = now()
where nome_fantasia = 'LABORMESP JABAQUARA';
