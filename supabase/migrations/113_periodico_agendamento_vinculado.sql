-- Vínculo de cumprimento/antecipação do periódico futuro ao novo agendamento.
-- Separa a origem (agendamento_id que gerou a obrigação) do cumprimento
-- (agendamento_vinculado_id). Evita colidir com unique (agendamento_id, exame_id)
-- quando o ciclo possui linhas duplicadas do mesmo exame.

alter table public.periodicos_futuros
  add column if not exists agendamento_vinculado_id uuid null
    references public.agendamentos (id) on delete set null;

comment on column public.periodicos_futuros.agendamento_vinculado_id is
  'Agendamento que antecipa/cumpre este periódico. Distinto de agendamento_id (origem).';

create index if not exists idx_periodicos_futuros_agendamento_vinculado
  on public.periodicos_futuros (agendamento_vinculado_id)
  where agendamento_vinculado_id is not null;

-- Linhas já marcadas como reagendadas: o agendamento_id atual é o cumprimento
-- (a origem foi sobrescrita pela lógica antiga).
update public.periodicos_futuros
set agendamento_vinculado_id = agendamento_id
where status = 'reagendado'
  and agendamento_id is not null
  and agendamento_vinculado_id is null;

-- Restaura a próxima data original quando a antecipação a tinha substituído
-- pela data do novo agendamento.
update public.periodicos_futuros
set proxima_data = data_prevista_original
where status = 'reagendado'
  and data_prevista_original is not null
  and proxima_data is distinct from data_prevista_original;
