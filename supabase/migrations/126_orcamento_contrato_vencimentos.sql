-- Cronograma de vencimentos da contratação pontual (AET e futuros serviços).
-- Pertence ao orçamento/aprovação. NÃO altera cliente_contratos SST.

create table if not exists public.orcamento_contrato_vencimentos (
  id uuid primary key default gen_random_uuid(),
  aprovacao_id uuid not null
    references public.orcamento_aprovacoes (id) on delete cascade,
  orcamento_id uuid not null
    references public.orcamentos (id) on delete cascade,
  indice integer not null check (indice >= 1),
  data_vencimento date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orcamento_contrato_vencimentos_unica
    unique (aprovacao_id, indice)
);

comment on table public.orcamento_contrato_vencimentos is
  'Datas reais de vencimento das parcelas do contrato documental pontual. Não integra cliente_contratos SST.';

create index if not exists idx_orcamento_contrato_vencimentos_aprovacao
  on public.orcamento_contrato_vencimentos (aprovacao_id, indice);

alter table public.orcamento_contrato_vencimentos enable row level security;

drop policy if exists "staff_select_orcamento_contrato_vencimentos"
  on public.orcamento_contrato_vencimentos;
drop policy if exists "staff_insert_orcamento_contrato_vencimentos"
  on public.orcamento_contrato_vencimentos;
drop policy if exists "staff_update_orcamento_contrato_vencimentos"
  on public.orcamento_contrato_vencimentos;
drop policy if exists "staff_delete_orcamento_contrato_vencimentos"
  on public.orcamento_contrato_vencimentos;

create policy "staff_select_orcamento_contrato_vencimentos"
  on public.orcamento_contrato_vencimentos
  for select to authenticated
  using (public.is_staff_user());

create policy "staff_insert_orcamento_contrato_vencimentos"
  on public.orcamento_contrato_vencimentos
  for insert to authenticated
  with check (public.is_staff_user());

create policy "staff_update_orcamento_contrato_vencimentos"
  on public.orcamento_contrato_vencimentos
  for update to authenticated
  using (public.is_staff_user())
  with check (public.is_staff_user());

create policy "staff_delete_orcamento_contrato_vencimentos"
  on public.orcamento_contrato_vencimentos
  for delete to authenticated
  using (public.is_staff_user());

grant select, insert, update, delete on table public.orcamento_contrato_vencimentos
  to authenticated;
grant select, insert, update, delete on table public.orcamento_contrato_vencimentos
  to service_role;
