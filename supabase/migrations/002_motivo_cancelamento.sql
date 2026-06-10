-- Motivo informado ao cancelar o agendamento
alter table public.agendamentos
  add column if not exists motivo_cancelamento text;
