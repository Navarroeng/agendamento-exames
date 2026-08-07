-- Transição Laudos SST → Riscos Psicossociais + tracking de Riscos.

-- 1) Status de conclusão em Laudos SST
alter table public.orcamento_laudos_sst
  add column if not exists status text not null default 'em_andamento';

alter table public.orcamento_laudos_sst
  drop constraint if exists orcamento_laudos_sst_status_check;

alter table public.orcamento_laudos_sst
  add constraint orcamento_laudos_sst_status_check
  check (status in ('em_andamento', 'concluido'));

alter table public.orcamento_laudos_sst
  add column if not exists concluido_em timestamptz null;

comment on column public.orcamento_laudos_sst.status is
  'em_andamento | concluido. Concluído quando a etapa Envio para o cliente está OK (6/6).';

comment on column public.orcamento_laudos_sst.concluido_em is
  'Momento em que o Laudo SST foi marcado como concluído (entrada em Riscos Psicossociais).';

-- Backfill: 6 etapas concluídas ⇒ status concluido
update public.orcamento_laudos_sst
set
  status = 'concluido',
  concluido_em = coalesce(concluido_em, updated_at, now())
where etapas_concluidas >= 6
  and status <> 'concluido';

-- 2) Tracking Riscos Psicossociais (mesmo orçamento; sem duplicar cliente)
create table if not exists public.orcamento_riscos_psicossociais (
  orcamento_id uuid primary key
    references public.orcamentos (id) on delete cascade,
  etapa_atual text not null default 'lista_presenca'
    check (
      etapa_atual in (
        'lista_presenca',
        'cadastro_empresa',
        'envio_qr_code',
        'preenchimento_finalizado',
        'laudo_elaborado',
        'enviado_cliente'
      )
    ),
  etapas_concluidas integer not null default 0
    check (etapas_concluidas >= 0 and etapas_concluidas <= 6),
  status text not null default 'em_andamento'
    check (status in ('em_andamento', 'concluido')),
  entrada_em timestamptz not null default now(),
  concluido_em timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.orcamento_riscos_psicossociais is
  'Progresso das etapas de Riscos Psicossociais. Um registro por orçamento com Laudos SST concluído.';

create or replace function public.set_orcamento_riscos_psicossociais_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_orcamento_riscos_psicossociais_updated_at
  on public.orcamento_riscos_psicossociais;
create trigger trg_orcamento_riscos_psicossociais_updated_at
  before update on public.orcamento_riscos_psicossociais
  for each row
  execute function public.set_orcamento_riscos_psicossociais_updated_at();

alter table public.orcamento_riscos_psicossociais enable row level security;

drop policy if exists "authenticated_select_orcamento_riscos_psicossociais"
  on public.orcamento_riscos_psicossociais;
drop policy if exists "authenticated_insert_orcamento_riscos_psicossociais"
  on public.orcamento_riscos_psicossociais;
drop policy if exists "authenticated_update_orcamento_riscos_psicossociais"
  on public.orcamento_riscos_psicossociais;

create policy "authenticated_select_orcamento_riscos_psicossociais"
  on public.orcamento_riscos_psicossociais
  for select to authenticated
  using (true);

create policy "authenticated_insert_orcamento_riscos_psicossociais"
  on public.orcamento_riscos_psicossociais
  for insert to authenticated
  with check (true);

create policy "authenticated_update_orcamento_riscos_psicossociais"
  on public.orcamento_riscos_psicossociais
  for update to authenticated
  using (true)
  with check (true);
