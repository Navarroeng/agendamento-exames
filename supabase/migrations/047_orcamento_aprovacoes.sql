-- Cancelamento sem exclusão + aprovação comercial (condições finais + acompanhamento contrato).

-- 1) Campos de cancelamento no orçamento original
alter table public.orcamentos
  add column if not exists motivo_cancelamento text null,
  add column if not exists observacao_cancelamento text null,
  add column if not exists cancelado_em timestamptz null,
  add column if not exists cancelado_por text null;

comment on column public.orcamentos.motivo_cancelamento is
  'Motivo obrigatório ao cancelar o orçamento (sem exclusão física).';
comment on column public.orcamentos.cancelado_em is
  'Data/hora do cancelamento.';
comment on column public.orcamentos.cancelado_por is
  'Nome do usuário que cancelou.';

-- 2) Condições finais aprovadas (não sobrescreve o orçamento)
create table if not exists public.orcamento_aprovacoes (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null unique references public.orcamentos (id) on delete cascade,
  quantidade_colaboradores integer not null check (quantidade_colaboradores > 0),
  valor_final numeric(12, 2) not null default 0 check (valor_final >= 0),
  condicao_pagamento text null,
  quantidade_parcelas integer null check (quantidade_parcelas is null or quantidade_parcelas >= 1),
  valor_parcela numeric(12, 2) null check (valor_parcela is null or valor_parcela >= 0),
  desconto_percentual numeric(5, 2) not null default 0
    check (desconto_percentual >= 0 and desconto_percentual <= 100),
  valor_avista numeric(12, 2) null check (valor_avista is null or valor_avista >= 0),
  observacoes text null,
  aprovado_por text not null,
  aprovado_em timestamptz not null default now(),
  contrato_enviado boolean not null default false,
  contrato_enviado_em date null,
  contrato_assinado boolean not null default false,
  contrato_assinado_em date null,
  observacao_contrato text null,
  boleto_vencimento date null,
  boleto_pago boolean not null default false,
  boleto_pago_em date null,
  comprovante_path text null,
  comprovante_nome text null,
  comprovante_tipo text null,
  comprovante_tamanho integer null check (comprovante_tamanho is null or comprovante_tamanho > 0),
  observacao_pagamento text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orcamento_aprovacoes_orcamento_id
  on public.orcamento_aprovacoes (orcamento_id);

create table if not exists public.orcamento_aprovacao_itens (
  id uuid primary key default gen_random_uuid(),
  aprovacao_id uuid not null references public.orcamento_aprovacoes (id) on delete cascade,
  servico_id uuid null references public.servicos_sst (id) on delete set null,
  servico_nome text not null,
  quantidade numeric(10, 2) not null default 1 check (quantidade > 0),
  valor_unitario numeric(10, 2) not null default 0,
  valor_total numeric(12, 2) not null default 0,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_orcamento_aprovacao_itens_aprovacao_id
  on public.orcamento_aprovacao_itens (aprovacao_id, ordem);

-- updated_at trigger
create or replace function public.set_orcamento_aprovacoes_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_orcamento_aprovacoes_updated_at on public.orcamento_aprovacoes;
create trigger trg_orcamento_aprovacoes_updated_at
  before update on public.orcamento_aprovacoes
  for each row execute function public.set_orcamento_aprovacoes_updated_at();

alter table public.orcamento_aprovacoes enable row level security;
alter table public.orcamento_aprovacao_itens enable row level security;

drop policy if exists "authenticated_select_orcamento_aprovacoes" on public.orcamento_aprovacoes;
create policy "authenticated_select_orcamento_aprovacoes"
  on public.orcamento_aprovacoes for select to authenticated using (true);

drop policy if exists "authenticated_insert_orcamento_aprovacoes" on public.orcamento_aprovacoes;
create policy "authenticated_insert_orcamento_aprovacoes"
  on public.orcamento_aprovacoes for insert to authenticated with check (true);

drop policy if exists "authenticated_update_orcamento_aprovacoes" on public.orcamento_aprovacoes;
create policy "authenticated_update_orcamento_aprovacoes"
  on public.orcamento_aprovacoes for update to authenticated using (true) with check (true);

drop policy if exists "authenticated_select_orcamento_aprovacao_itens" on public.orcamento_aprovacao_itens;
create policy "authenticated_select_orcamento_aprovacao_itens"
  on public.orcamento_aprovacao_itens for select to authenticated using (true);

drop policy if exists "authenticated_insert_orcamento_aprovacao_itens" on public.orcamento_aprovacao_itens;
create policy "authenticated_insert_orcamento_aprovacao_itens"
  on public.orcamento_aprovacao_itens for insert to authenticated with check (true);

drop policy if exists "authenticated_update_orcamento_aprovacao_itens" on public.orcamento_aprovacao_itens;
create policy "authenticated_update_orcamento_aprovacao_itens"
  on public.orcamento_aprovacao_itens for update to authenticated using (true) with check (true);

drop policy if exists "authenticated_delete_orcamento_aprovacao_itens" on public.orcamento_aprovacao_itens;
create policy "authenticated_delete_orcamento_aprovacao_itens"
  on public.orcamento_aprovacao_itens for delete to authenticated using (true);

-- 3) Storage do comprovante de pagamento inicial
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'orcamentos-comprovantes',
  'orcamentos-comprovantes',
  false,
  5242880,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "authenticated_select_orcamentos_comprovantes" on storage.objects;
create policy "authenticated_select_orcamentos_comprovantes"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'orcamentos-comprovantes'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );

drop policy if exists "authenticated_insert_orcamentos_comprovantes" on storage.objects;
create policy "authenticated_insert_orcamentos_comprovantes"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'orcamentos-comprovantes'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );

drop policy if exists "authenticated_update_orcamentos_comprovantes" on storage.objects;
create policy "authenticated_update_orcamentos_comprovantes"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'orcamentos-comprovantes'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  )
  with check (
    bucket_id = 'orcamentos-comprovantes'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );

drop policy if exists "authenticated_delete_orcamentos_comprovantes" on storage.objects;
create policy "authenticated_delete_orcamentos_comprovantes"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'orcamentos-comprovantes'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );
