-- Garante coluna de observações gerais em agendamentos (idempotente).
alter table public.agendamentos
  add column if not exists observacoes text null;
