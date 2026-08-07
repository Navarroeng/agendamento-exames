-- Campanhas de avaliação psicossocial (fundação — sem questionário/QR ainda).

create table if not exists public.riscos_campanhas (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null
    references public.orcamentos (id) on delete cascade,
  cliente_id uuid null
    references public.clientes (id) on delete set null,
  cnpj text not null,
  empresa_nome text not null,
  data_inicio date not null,
  data_encerramento date not null,
  quantidade_prevista integer not null
    check (quantidade_prevista > 0),
  status text not null default 'em_preparacao'
    check (status in ('em_preparacao', 'aberta', 'encerrada')),
  codigo_publico text not null,
  criado_por text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint riscos_campanhas_periodo_check
    check (data_encerramento >= data_inicio),
  constraint riscos_campanhas_codigo_unico unique (codigo_publico),
  constraint riscos_campanhas_orcamento_unico unique (orcamento_id)
);

comment on table public.riscos_campanhas is
  'Campanha de avaliação psicossocial vinculada a um processo de Riscos (orçamento).';
comment on column public.riscos_campanhas.codigo_publico is
  'Identificador público único para futuro link/QR (/avaliacao/CODIGO).';
comment on column public.riscos_campanhas.status is
  'em_preparacao | aberta | encerrada';

create index if not exists idx_riscos_campanhas_cliente
  on public.riscos_campanhas (cliente_id);

create index if not exists idx_riscos_campanhas_cnpj
  on public.riscos_campanhas (cnpj);

create or replace function public.set_riscos_campanhas_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_riscos_campanhas_updated_at
  on public.riscos_campanhas;
create trigger trg_riscos_campanhas_updated_at
  before update on public.riscos_campanhas
  for each row
  execute function public.set_riscos_campanhas_updated_at();

alter table public.riscos_campanhas enable row level security;

drop policy if exists "authenticated_select_riscos_campanhas"
  on public.riscos_campanhas;
drop policy if exists "authenticated_insert_riscos_campanhas"
  on public.riscos_campanhas;
drop policy if exists "authenticated_update_riscos_campanhas"
  on public.riscos_campanhas;

create policy "authenticated_select_riscos_campanhas"
  on public.riscos_campanhas
  for select to authenticated
  using (true);

create policy "authenticated_insert_riscos_campanhas"
  on public.riscos_campanhas
  for insert to authenticated
  with check (true);

create policy "authenticated_update_riscos_campanhas"
  on public.riscos_campanhas
  for update to authenticated
  using (true)
  with check (true);
