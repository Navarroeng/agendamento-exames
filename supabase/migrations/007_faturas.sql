-- Histórico de faturas emitidas
create table if not exists public.faturas (
  id uuid primary key default gen_random_uuid(),
  numero text unique not null,
  tipo text not null,
  referencia_id uuid null,
  referencia_nome text not null,
  periodo_inicio date null,
  periodo_fim date null,
  data_emissao timestamptz null,
  data_vencimento date not null,
  valor_total numeric(10, 2) not null default 0,
  total_exames integer not null default 0,
  status text not null default 'rascunho',
  gerado_por text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint faturas_tipo_check check (tipo in ('cliente', 'clinica')),
  constraint faturas_status_check check (status in ('rascunho', 'emitida', 'cancelada'))
);

create index if not exists idx_faturas_status on public.faturas (status);
create index if not exists idx_faturas_tipo on public.faturas (tipo);
create index if not exists idx_faturas_data_emissao on public.faturas (data_emissao desc nulls last);
create index if not exists idx_faturas_referencia_nome on public.faturas (referencia_nome);

create table if not exists public.fatura_itens (
  id uuid primary key default gen_random_uuid(),
  fatura_id uuid not null references public.faturas (id) on delete cascade,
  agendamento_id uuid null,
  data_agendamento date not null,
  colaborador text not null,
  cliente_nome text not null default '',
  clinica_nome text not null default '',
  tipo_aso text not null default '',
  exame_nome text not null,
  valor_unitario numeric(10, 2) not null default 0,
  quantidade integer not null default 1,
  valor_total numeric(10, 2) not null default 0
);

create index if not exists idx_fatura_itens_fatura_id on public.fatura_itens (fatura_id);

create or replace function public.set_faturas_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_faturas_updated_at on public.faturas;
create trigger trg_faturas_updated_at
  before update on public.faturas
  for each row
  execute function public.set_faturas_updated_at();

alter table public.faturas enable row level security;
alter table public.fatura_itens enable row level security;

drop policy if exists "authenticated_select_faturas" on public.faturas;
create policy "authenticated_select_faturas"
  on public.faturas for select to authenticated using (true);

drop policy if exists "authenticated_insert_faturas" on public.faturas;
create policy "authenticated_insert_faturas"
  on public.faturas for insert to authenticated with check (true);

drop policy if exists "authenticated_update_faturas" on public.faturas;
create policy "authenticated_update_faturas"
  on public.faturas for update to authenticated using (true) with check (true);

drop policy if exists "authenticated_select_fatura_itens" on public.fatura_itens;
create policy "authenticated_select_fatura_itens"
  on public.fatura_itens for select to authenticated using (true);

drop policy if exists "authenticated_insert_fatura_itens" on public.fatura_itens;
create policy "authenticated_insert_fatura_itens"
  on public.fatura_itens for insert to authenticated with check (true);

drop policy if exists "authenticated_delete_fatura_itens" on public.fatura_itens;
create policy "authenticated_delete_fatura_itens"
  on public.fatura_itens for delete to authenticated using (true);
