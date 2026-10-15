-- Controle manual das 12 mensalidades da Gestão SST cobrada mês a mês.
-- Não converte boleto_pago antigo em quitação, não preenche data de pagamento
-- e não cria parcelas para pagamento antecipado, pontual, AET ou demais serviços.

create table if not exists public.orcamento_mensalidade_parcelas (
  id uuid primary key default gen_random_uuid(),
  aprovacao_id uuid not null
    references public.orcamento_aprovacoes (id) on delete cascade,
  vigencia_inicio date not null,
  vigencia_fim date null,
  numero smallint not null check (numero between 1 and 12),
  vencimento date not null,
  valor numeric(12, 2) not null check (valor > 0),
  pago_em date null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orcamento_mensalidade_parcelas_unica
    unique (aprovacao_id, vigencia_inicio, numero)
);

comment on table public.orcamento_mensalidade_parcelas is
  'Parcelas da vigência da Gestão SST mensal. Recebimento manual. Não emite boleto e não quita o contrato.';

create index if not exists idx_orcamento_mensalidade_parcelas_aprovacao
  on public.orcamento_mensalidade_parcelas (aprovacao_id, vigencia_inicio, numero);

alter table public.orcamento_mensalidade_parcelas enable row level security;

drop policy if exists "staff_select_orcamento_mensalidade_parcelas"
  on public.orcamento_mensalidade_parcelas;
drop policy if exists "staff_insert_orcamento_mensalidade_parcelas"
  on public.orcamento_mensalidade_parcelas;
drop policy if exists "staff_update_orcamento_mensalidade_parcelas"
  on public.orcamento_mensalidade_parcelas;

create policy "staff_select_orcamento_mensalidade_parcelas"
  on public.orcamento_mensalidade_parcelas
  for select to authenticated
  using (public.is_staff_user());

create policy "staff_insert_orcamento_mensalidade_parcelas"
  on public.orcamento_mensalidade_parcelas
  for insert to authenticated
  with check (public.is_staff_user());

create policy "staff_update_orcamento_mensalidade_parcelas"
  on public.orcamento_mensalidade_parcelas
  for update to authenticated
  using (public.is_staff_user())
  with check (public.is_staff_user());

grant select, insert, update on table public.orcamento_mensalidade_parcelas
  to authenticated;
grant select, insert, update on table public.orcamento_mensalidade_parcelas
  to service_role;
