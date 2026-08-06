-- Antecipação / vínculo de Periódico Futuro a novo agendamento.
-- Preserva data prevista original e flag de antecipação.
-- Corrige restauração quando o agendamento vinculado é cancelado.

-- ---------------------------------------------------------------------------
-- 1) Colunas
-- ---------------------------------------------------------------------------
alter table public.periodicos_futuros
  add column if not exists data_prevista_original date null;

alter table public.periodicos_futuros
  add column if not exists antecipado boolean not null default false;

comment on column public.periodicos_futuros.data_prevista_original is
  'Data prevista original do exame futuro (antes de eventual antecipação/vínculo).';

comment on column public.periodicos_futuros.antecipado is
  'true quando o agendamento vinculado foi feito com data anterior à prevista original.';

-- Backfill: original = próxima data atual enquanto não houver vínculo reagendado
update public.periodicos_futuros
set data_prevista_original = proxima_data
where data_prevista_original is null;

-- ---------------------------------------------------------------------------
-- 2) Índice auxiliar para busca por CPF + status
-- ---------------------------------------------------------------------------
create index if not exists idx_periodicos_futuros_cpf_status
  on public.periodicos_futuros (colaborador_cpf, status)
  where colaborador_cpf is not null;
