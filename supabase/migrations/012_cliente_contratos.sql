-- Histórico de contratos e renovações por cliente
create table if not exists public.cliente_contratos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  data_inicio date not null,
  data_fim date null,
  quantidade_colaboradores integer null,
  valor_contrato numeric(10, 2) null,
  condicao_pagamento text null,
  tipo_contrato text null,
  reajuste_percentual numeric(5, 2) null,
  observacoes text null,
  status text not null default 'ativo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cliente_contratos_status_check
    check (status in ('ativo', 'encerrado', 'em_renovacao', 'cancelado')),
  constraint cliente_contratos_tipo_check
    check (
      tipo_contrato is null
      or tipo_contrato in ('mensal', 'anual', 'avulso', 'sem_contrato')
    )
);

create index if not exists idx_cliente_contratos_cliente
  on public.cliente_contratos (cliente_id);

create index if not exists idx_cliente_contratos_status
  on public.cliente_contratos (status);

create index if not exists idx_cliente_contratos_data_inicio
  on public.cliente_contratos (data_inicio desc);

-- Apenas um contrato ativo por cliente
create unique index if not exists idx_cliente_contratos_um_ativo
  on public.cliente_contratos (cliente_id)
  where status = 'ativo';

create or replace function public.set_cliente_contratos_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_cliente_contratos_updated_at on public.cliente_contratos;
create trigger trg_cliente_contratos_updated_at
  before update on public.cliente_contratos
  for each row
  execute function public.set_cliente_contratos_updated_at();

alter table public.cliente_contratos enable row level security;

drop policy if exists "authenticated_select_cliente_contratos" on public.cliente_contratos;
create policy "authenticated_select_cliente_contratos"
  on public.cliente_contratos for select to authenticated using (true);

drop policy if exists "authenticated_insert_cliente_contratos" on public.cliente_contratos;
create policy "authenticated_insert_cliente_contratos"
  on public.cliente_contratos for insert to authenticated with check (true);

drop policy if exists "authenticated_update_cliente_contratos" on public.cliente_contratos;
create policy "authenticated_update_cliente_contratos"
  on public.cliente_contratos for update to authenticated using (true) with check (true);
