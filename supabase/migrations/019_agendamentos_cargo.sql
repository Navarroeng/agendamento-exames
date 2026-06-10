-- Cargo vinculado ao agendamento (opcional)
alter table public.agendamentos
  add column if not exists cargo_id uuid null references public.cargos (id) on delete set null;

alter table public.agendamentos
  add column if not exists cargo_nome text null;

create index if not exists idx_agendamentos_cargo_id on public.agendamentos (cargo_id);
