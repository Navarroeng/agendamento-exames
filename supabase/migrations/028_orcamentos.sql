-- Módulo Orçamentos (Gestão Comercial SST)

create table if not exists public.servicos_sst (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  descricao text null,
  valor_sugerido numeric(10, 2) null,
  ativo boolean not null default true,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.orcamentos (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,
  data_proposta date not null default current_date,
  cliente_id uuid null references public.clientes (id) on delete set null,
  cliente_nome text not null,
  contato text null,
  email text null,
  telefone text null,
  responsavel text not null,
  observacoes text null,
  desconto_percentual numeric(5, 2) not null default 0,
  forma_pagamento text null,
  validade_proposta date null,
  subtotal numeric(12, 2) not null default 0,
  valor_total numeric(12, 2) not null default 0,
  status text not null default 'em_elaboracao',
  assinatura_status text not null default 'nao_aplicavel',
  assinatura_token uuid null,
  aceite_em timestamptz null,
  aceite_ip text null,
  aceite_usuario_nome text null,
  link_aceite_expira_em timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orcamentos_status_check check (
    status in (
      'em_elaboracao',
      'enviado',
      'em_negociacao',
      'aprovado',
      'reprovado',
      'cancelado'
    )
  ),
  constraint orcamentos_assinatura_status_check check (
    assinatura_status in (
      'nao_aplicavel',
      'pendente',
      'assinado',
      'recusado'
    )
  ),
  constraint orcamentos_desconto_percentual_check check (
    desconto_percentual >= 0
    and desconto_percentual <= 100
  )
);

create table if not exists public.orcamento_itens (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references public.orcamentos (id) on delete cascade,
  servico_id uuid null references public.servicos_sst (id) on delete set null,
  servico_nome text not null,
  quantidade numeric(10, 2) not null default 1,
  valor_unitario numeric(10, 2) not null default 0,
  valor_total numeric(12, 2) not null default 0,
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  constraint orcamento_itens_quantidade_check check (quantidade > 0)
);

create index if not exists idx_orcamentos_data_proposta
  on public.orcamentos (data_proposta desc);

create index if not exists idx_orcamentos_status
  on public.orcamentos (status);

create index if not exists idx_orcamentos_cliente_nome
  on public.orcamentos (cliente_nome);

create index if not exists idx_orcamento_itens_orcamento
  on public.orcamento_itens (orcamento_id);

create or replace function public.set_orcamentos_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_orcamentos_updated_at on public.orcamentos;
create trigger trg_orcamentos_updated_at
  before update on public.orcamentos
  for each row
  execute function public.set_orcamentos_updated_at();

create or replace function public.gerar_numero_orcamento()
returns text
language plpgsql
as $$
declare
  ano int := extract(year from current_date);
  proximo int;
begin
  select coalesce(
    max(
      nullif(
        regexp_replace(numero, '^ORC-' || ano::text || '-', ''),
        ''
      )::int
    ),
    0
  ) + 1
  into proximo
  from public.orcamentos
  where numero like 'ORC-' || ano::text || '-%';

  return 'ORC-' || ano::text || '-' || lpad(proximo::text, 4, '0');
end;
$$;

insert into public.servicos_sst (nome, ordem)
values
  ('PGR', 1),
  ('PCMSO', 2),
  ('LTCAT', 3),
  ('LIP', 4),
  ('NR01 Psicossocial', 5),
  ('Treinamentos', 6),
  ('Gestão SST Mensal', 7),
  ('Exames Ocupacionais', 8),
  ('Outros', 9)
on conflict (nome) do nothing;

alter table public.servicos_sst enable row level security;
alter table public.orcamentos enable row level security;
alter table public.orcamento_itens enable row level security;

drop policy if exists "authenticated_select_servicos_sst" on public.servicos_sst;
create policy "authenticated_select_servicos_sst"
  on public.servicos_sst for select to authenticated using (true);

drop policy if exists "authenticated_insert_servicos_sst" on public.servicos_sst;
create policy "authenticated_insert_servicos_sst"
  on public.servicos_sst for insert to authenticated with check (true);

drop policy if exists "authenticated_update_servicos_sst" on public.servicos_sst;
create policy "authenticated_update_servicos_sst"
  on public.servicos_sst for update to authenticated using (true) with check (true);

drop policy if exists "authenticated_select_orcamentos" on public.orcamentos;
create policy "authenticated_select_orcamentos"
  on public.orcamentos for select to authenticated using (true);

drop policy if exists "authenticated_insert_orcamentos" on public.orcamentos;
create policy "authenticated_insert_orcamentos"
  on public.orcamentos for insert to authenticated with check (true);

drop policy if exists "authenticated_update_orcamentos" on public.orcamentos;
create policy "authenticated_update_orcamentos"
  on public.orcamentos for update to authenticated using (true) with check (true);

drop policy if exists "authenticated_delete_orcamentos" on public.orcamentos;
create policy "authenticated_delete_orcamentos"
  on public.orcamentos for delete to authenticated using (true);

drop policy if exists "authenticated_select_orcamento_itens" on public.orcamento_itens;
create policy "authenticated_select_orcamento_itens"
  on public.orcamento_itens for select to authenticated using (true);

drop policy if exists "authenticated_insert_orcamento_itens" on public.orcamento_itens;
create policy "authenticated_insert_orcamento_itens"
  on public.orcamento_itens for insert to authenticated with check (true);

drop policy if exists "authenticated_update_orcamento_itens" on public.orcamento_itens;
create policy "authenticated_update_orcamento_itens"
  on public.orcamento_itens for update to authenticated using (true) with check (true);

drop policy if exists "authenticated_delete_orcamento_itens" on public.orcamento_itens;
create policy "authenticated_delete_orcamento_itens"
  on public.orcamento_itens for delete to authenticated using (true);
