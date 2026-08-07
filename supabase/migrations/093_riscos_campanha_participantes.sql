-- Participantes da Pesquisa Psicossocial (campanha).

create table if not exists public.riscos_campanha_participantes (
  id uuid primary key default gen_random_uuid(),
  campanha_id uuid not null
    references public.riscos_campanhas (id) on delete cascade,
  orcamento_id uuid not null
    references public.orcamentos (id) on delete cascade,
  cliente_id uuid null
    references public.clientes (id) on delete set null,
  nome_completo text not null,
  cpf text not null,
  cargo text null,
  setor text null,
  email text null,
  status text not null default 'pendente'
    check (status in ('pendente', 'respondido')),
  codigo_acesso text not null,
  origem text not null default 'manual'
    check (origem in ('manual', 'importacao')),
  criado_por text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint riscos_campanha_participantes_cpf_campanha_unico
    unique (campanha_id, cpf),
  constraint riscos_campanha_participantes_codigo_unico
    unique (codigo_acesso),
  constraint riscos_campanha_participantes_cpf_digits
    check (cpf ~ '^\d{11}$')
);

comment on table public.riscos_campanha_participantes is
  'Participantes autorizados de uma pesquisa psicossocial (campanha).';
comment on column public.riscos_campanha_participantes.codigo_acesso is
  'Identificador único do participante para futuro acesso/QR/respostas.';
comment on column public.riscos_campanha_participantes.status is
  'pendente | respondido';
comment on column public.riscos_campanha_participantes.origem is
  'manual | importacao (importação Excel preparada para etapa futura).';

create index if not exists idx_riscos_campanha_participantes_campanha
  on public.riscos_campanha_participantes (campanha_id, created_at desc);

create index if not exists idx_riscos_campanha_participantes_orcamento
  on public.riscos_campanha_participantes (orcamento_id);

create index if not exists idx_riscos_campanha_participantes_cliente
  on public.riscos_campanha_participantes (cliente_id);

create or replace function public.set_riscos_campanha_participantes_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_riscos_campanha_participantes_updated_at
  on public.riscos_campanha_participantes;
create trigger trg_riscos_campanha_participantes_updated_at
  before update on public.riscos_campanha_participantes
  for each row
  execute function public.set_riscos_campanha_participantes_updated_at();

alter table public.riscos_campanha_participantes enable row level security;

drop policy if exists "authenticated_select_riscos_campanha_participantes"
  on public.riscos_campanha_participantes;
drop policy if exists "authenticated_insert_riscos_campanha_participantes"
  on public.riscos_campanha_participantes;
drop policy if exists "authenticated_update_riscos_campanha_participantes"
  on public.riscos_campanha_participantes;
drop policy if exists "authenticated_delete_riscos_campanha_participantes"
  on public.riscos_campanha_participantes;

create policy "authenticated_select_riscos_campanha_participantes"
  on public.riscos_campanha_participantes
  for select to authenticated
  using (true);

create policy "authenticated_insert_riscos_campanha_participantes"
  on public.riscos_campanha_participantes
  for insert to authenticated
  with check (true);

create policy "authenticated_update_riscos_campanha_participantes"
  on public.riscos_campanha_participantes
  for update to authenticated
  using (true)
  with check (true);

create policy "authenticated_delete_riscos_campanha_participantes"
  on public.riscos_campanha_participantes
  for delete to authenticated
  using (true);
