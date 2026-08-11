-- Relatório final persistido de Riscos Psicossociais (1 por campanha).

create table if not exists public.riscos_relatorios (
  id uuid primary key default gen_random_uuid(),
  campanha_id uuid not null
    references public.riscos_campanhas (id) on delete cascade,
  cliente_id uuid null
    references public.clientes (id) on delete set null,
  codigo_publico text not null,
  empresa_nome text not null,
  gerado_em timestamptz not null default now(),
  gerado_por text null,
  gerado_por_user_id uuid null,
  participantes integer not null default 0
    check (participantes >= 0),
  respondentes integer not null default 0
    check (respondentes >= 0),
  pendentes integer not null default 0
    check (pendentes >= 0),
  taxa_participacao numeric(6, 2) null,
  resultado_json jsonb not null default '{}'::jsonb,
  status text not null default 'gerado'
    check (status in ('gerado', 'substituido')),
  pdf_url text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint riscos_relatorios_campanha_unica unique (campanha_id)
);

comment on table public.riscos_relatorios is
  'Relatório final COPSOQ persistido por campanha (geração única; regeneração admin substitui o JSON).';
comment on column public.riscos_relatorios.resultado_json is
  'Snapshot consolidado anônimo (capa, resumo, dimensões, placeholders).';
comment on column public.riscos_relatorios.pdf_url is
  'Reservado para exportação PDF futura.';

create index if not exists idx_riscos_relatorios_codigo
  on public.riscos_relatorios (codigo_publico);

create index if not exists idx_riscos_relatorios_cliente
  on public.riscos_relatorios (cliente_id);

create or replace function public.set_riscos_relatorios_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_riscos_relatorios_updated_at
  on public.riscos_relatorios;
create trigger trg_riscos_relatorios_updated_at
  before update on public.riscos_relatorios
  for each row
  execute function public.set_riscos_relatorios_updated_at();

alter table public.riscos_relatorios enable row level security;

drop policy if exists "authenticated_select_riscos_relatorios"
  on public.riscos_relatorios;
drop policy if exists "authenticated_insert_riscos_relatorios"
  on public.riscos_relatorios;
drop policy if exists "authenticated_update_riscos_relatorios"
  on public.riscos_relatorios;

create policy "authenticated_select_riscos_relatorios"
  on public.riscos_relatorios
  for select to authenticated
  using (true);

create policy "authenticated_insert_riscos_relatorios"
  on public.riscos_relatorios
  for insert to authenticated
  with check (true);

create policy "authenticated_update_riscos_relatorios"
  on public.riscos_relatorios
  for update to authenticated
  using (true)
  with check (true);
