-- Inclusão manual de Pesquisa Psicossocial a partir do cadastro do cliente.
-- Permite campanha sem orçamento/contrato fictícios; origem centralizada.

-- 1) Origem + metadados na campanha
alter table public.riscos_campanhas
  add column if not exists origem text not null default 'orcamento';

alter table public.riscos_campanhas
  drop constraint if exists riscos_campanhas_origem_check;

alter table public.riscos_campanhas
  add constraint riscos_campanhas_origem_check
  check (origem in ('orcamento', 'manual_cliente'));

alter table public.riscos_campanhas
  add column if not exists observacoes text null;

alter table public.riscos_campanhas
  add column if not exists responsavel text null;

comment on column public.riscos_campanhas.origem is
  'orcamento = fluxo normal (Implantação/Laudos); manual_cliente = inclusão pelo cadastro do cliente.';
comment on column public.riscos_campanhas.observacoes is
  'Observações administrativas (criação manual ou notas).';
comment on column public.riscos_campanhas.responsavel is
  'Responsável interno pela pesquisa (nome).';

-- 2) Orçamento opcional (fluxo manual)
alter table public.riscos_campanhas
  alter column orcamento_id drop not null;

alter table public.riscos_campanhas
  drop constraint if exists riscos_campanhas_orcamento_unico;

create unique index if not exists idx_riscos_campanhas_orcamento_unico
  on public.riscos_campanhas (orcamento_id)
  where orcamento_id is not null;

create index if not exists idx_riscos_campanhas_cliente_origem_status
  on public.riscos_campanhas (cliente_id, origem, status)
  where cliente_id is not null;

-- 3) Participantes: orçamento opcional quando campanha manual
alter table public.riscos_campanha_participantes
  alter column orcamento_id drop not null;

-- 4) Tracking / lista de presença por campanha (fluxo manual sem orçamento)
create table if not exists public.riscos_campanha_fluxo (
  campanha_id uuid primary key
    references public.riscos_campanhas (id) on delete cascade,
  etapa_atual text not null default 'lista_presenca'
    check (etapa_atual in (
      'lista_presenca',
      'cadastro_empresa',
      'envio_qr_code',
      'preenchimento_finalizado',
      'laudo_elaborado',
      'enviado_cliente'
    )),
  etapas_concluidas integer not null default 0
    check (etapas_concluidas >= 0 and etapas_concluidas <= 6),
  status text not null default 'em_andamento'
    check (status in ('em_andamento', 'concluido')),
  entrada_em timestamptz null,
  concluido_em timestamptz null,
  lista_solicitada boolean not null default false,
  lista_solicitada_em timestamptz null,
  lista_solicitada_email text null,
  lista_solicitada_por text null,
  lista_solicitada_registrado_em timestamptz null,
  lista_recebida boolean not null default false,
  lista_anexo_path text null,
  lista_anexo_nome text null,
  lista_anexo_tipo text null,
  lista_anexo_tamanho integer null,
  lista_recebida_em timestamptz null,
  lista_recebida_por text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.riscos_campanha_fluxo is
  'Tracking de etapas e lista de presença para campanhas manuais (sem orçamento).';

create or replace function public.set_riscos_campanha_fluxo_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_riscos_campanha_fluxo_updated_at
  on public.riscos_campanha_fluxo;
create trigger trg_riscos_campanha_fluxo_updated_at
  before update on public.riscos_campanha_fluxo
  for each row
  execute function public.set_riscos_campanha_fluxo_updated_at();

alter table public.riscos_campanha_fluxo enable row level security;

drop policy if exists "authenticated_select_riscos_campanha_fluxo"
  on public.riscos_campanha_fluxo;
drop policy if exists "authenticated_insert_riscos_campanha_fluxo"
  on public.riscos_campanha_fluxo;
drop policy if exists "authenticated_update_riscos_campanha_fluxo"
  on public.riscos_campanha_fluxo;

create policy "authenticated_select_riscos_campanha_fluxo"
  on public.riscos_campanha_fluxo
  for select to authenticated
  using (true);

create policy "authenticated_insert_riscos_campanha_fluxo"
  on public.riscos_campanha_fluxo
  for insert to authenticated
  with check (true);

create policy "authenticated_update_riscos_campanha_fluxo"
  on public.riscos_campanha_fluxo
  for update to authenticated
  using (true)
  with check (true);
