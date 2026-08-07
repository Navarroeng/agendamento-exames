-- Tracking operacional do módulo Laudos SST (pós-implantação concluída).
-- Não duplica cliente/orçamento/contrato; apenas referencia o orçamento.

create table if not exists public.orcamento_laudos_sst (
  orcamento_id uuid primary key
    references public.orcamentos (id) on delete cascade,
  etapa_atual text not null default 'epis'
    check (
      etapa_atual in (
        'epis',
        'processo_inicial',
        'cronograma_acoes',
        'pgr_pcmso_ltcat',
        'autorizacao_pedro',
        'envio_cliente'
      )
    ),
  etapas_concluidas integer not null default 0
    check (etapas_concluidas >= 0 and etapas_concluidas <= 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.orcamento_laudos_sst is
  'Progresso das etapas do módulo Laudos SST. Um registro por orçamento elegível (implantação concluída).';

create or replace function public.set_orcamento_laudos_sst_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_orcamento_laudos_sst_updated_at
  on public.orcamento_laudos_sst;
create trigger trg_orcamento_laudos_sst_updated_at
  before update on public.orcamento_laudos_sst
  for each row
  execute function public.set_orcamento_laudos_sst_updated_at();

alter table public.orcamento_laudos_sst enable row level security;

drop policy if exists "authenticated_select_orcamento_laudos_sst"
  on public.orcamento_laudos_sst;
drop policy if exists "authenticated_insert_orcamento_laudos_sst"
  on public.orcamento_laudos_sst;
drop policy if exists "authenticated_update_orcamento_laudos_sst"
  on public.orcamento_laudos_sst;

create policy "authenticated_select_orcamento_laudos_sst"
  on public.orcamento_laudos_sst
  for select to authenticated
  using (true);

create policy "authenticated_insert_orcamento_laudos_sst"
  on public.orcamento_laudos_sst
  for insert to authenticated
  with check (true);

create policy "authenticated_update_orcamento_laudos_sst"
  on public.orcamento_laudos_sst
  for update to authenticated
  using (true)
  with check (true);
