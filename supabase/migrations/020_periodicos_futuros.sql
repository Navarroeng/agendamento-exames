-- Alerta de 6 meses por exame vinculado ao cargo
alter table public.cargo_exames
  add column if not exists gerar_alerta_6m boolean not null default false;

-- Acompanhamento de periódicos futuros gerados a partir de agendamentos
create table if not exists public.periodicos_futuros (
  id uuid primary key default gen_random_uuid(),
  agendamento_id uuid null references public.agendamentos (id) on delete set null,
  cliente_nome text not null,
  colaborador text not null,
  cargo_id uuid null references public.cargos (id) on delete set null,
  cargo_nome text null,
  exame_id uuid not null references public.exames (id) on delete restrict,
  tipo_exame text not null,
  exame_nome text not null,
  data_realizada date not null,
  proxima_data date not null,
  status text not null default 'ativo'
    check (status in ('ativo', 'reagendado', 'cancelado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint periodicos_futuros_agendamento_exame_unique unique (agendamento_id, exame_id)
);

create index if not exists idx_periodicos_futuros_proxima_data
  on public.periodicos_futuros (proxima_data);

create index if not exists idx_periodicos_futuros_status
  on public.periodicos_futuros (status);

create index if not exists idx_periodicos_futuros_cliente
  on public.periodicos_futuros (cliente_nome);

create index if not exists idx_periodicos_futuros_colaborador
  on public.periodicos_futuros (colaborador);

create index if not exists idx_periodicos_futuros_cargo
  on public.periodicos_futuros (cargo_id);

create index if not exists idx_periodicos_futuros_agendamento
  on public.periodicos_futuros (agendamento_id);

create or replace function public.set_periodicos_futuros_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_periodicos_futuros_updated_at on public.periodicos_futuros;
create trigger trg_periodicos_futuros_updated_at
  before update on public.periodicos_futuros
  for each row
  execute function public.set_periodicos_futuros_updated_at();

alter table public.periodicos_futuros enable row level security;

drop policy if exists "authenticated_select_periodicos_futuros" on public.periodicos_futuros;
create policy "authenticated_select_periodicos_futuros"
  on public.periodicos_futuros for select to authenticated using (true);

drop policy if exists "authenticated_insert_periodicos_futuros" on public.periodicos_futuros;
create policy "authenticated_insert_periodicos_futuros"
  on public.periodicos_futuros for insert to authenticated with check (true);

drop policy if exists "authenticated_update_periodicos_futuros" on public.periodicos_futuros;
create policy "authenticated_update_periodicos_futuros"
  on public.periodicos_futuros for update to authenticated using (true) with check (true);

drop policy if exists "authenticated_delete_periodicos_futuros" on public.periodicos_futuros;
create policy "authenticated_delete_periodicos_futuros"
  on public.periodicos_futuros for delete to authenticated using (true);
