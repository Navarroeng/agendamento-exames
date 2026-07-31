-- Histórico imutável de edições das condições finais aprovadas.

create table if not exists public.orcamento_aprovacao_condicoes_historico (
  id uuid primary key default gen_random_uuid(),
  aprovacao_id uuid not null references public.orcamento_aprovacoes (id) on delete restrict,
  orcamento_id uuid not null references public.orcamentos (id) on delete restrict,
  alterado_em timestamptz not null default now(),
  alterado_por text not null,
  quantidade_anterior integer not null,
  quantidade_nova integer not null,
  valor_anterior numeric(12, 2) not null,
  valor_novo numeric(12, 2) not null,
  pagamento_anterior text not null,
  pagamento_novo text not null,
  observacoes_anteriores text null,
  observacoes_novas text null
);

create index if not exists idx_orcamento_aprovacao_condicoes_historico_aprovacao
  on public.orcamento_aprovacao_condicoes_historico (aprovacao_id, alterado_em desc);

create index if not exists idx_orcamento_aprovacao_condicoes_historico_orcamento
  on public.orcamento_aprovacao_condicoes_historico (orcamento_id, alterado_em desc);

comment on table public.orcamento_aprovacao_condicoes_historico is
  'Auditoria append-only das alterações nas condições finais aprovadas. Não permite update/delete.';

alter table public.orcamento_aprovacao_condicoes_historico enable row level security;

drop policy if exists "authenticated_select_orcamento_aprovacao_condicoes_historico"
  on public.orcamento_aprovacao_condicoes_historico;
create policy "authenticated_select_orcamento_aprovacao_condicoes_historico"
  on public.orcamento_aprovacao_condicoes_historico
  for select
  to authenticated
  using (true);

drop policy if exists "authenticated_insert_orcamento_aprovacao_condicoes_historico"
  on public.orcamento_aprovacao_condicoes_historico;
create policy "authenticated_insert_orcamento_aprovacao_condicoes_historico"
  on public.orcamento_aprovacao_condicoes_historico
  for insert
  to authenticated
  with check (true);

-- Bloqueia UPDATE/DELETE mesmo com privilégios elevados da role da aplicação.
create or replace function public.bloquear_mutacao_orcamento_aprovacao_condicoes_historico()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Histórico de condições aprovadas não pode ser alterado nem apagado.';
end;
$$;

drop trigger if exists trg_bloquear_update_orcamento_aprovacao_condicoes_historico
  on public.orcamento_aprovacao_condicoes_historico;
create trigger trg_bloquear_update_orcamento_aprovacao_condicoes_historico
  before update on public.orcamento_aprovacao_condicoes_historico
  for each row
  execute function public.bloquear_mutacao_orcamento_aprovacao_condicoes_historico();

drop trigger if exists trg_bloquear_delete_orcamento_aprovacao_condicoes_historico
  on public.orcamento_aprovacao_condicoes_historico;
create trigger trg_bloquear_delete_orcamento_aprovacao_condicoes_historico
  before delete on public.orcamento_aprovacao_condicoes_historico
  for each row
  execute function public.bloquear_mutacao_orcamento_aprovacao_condicoes_historico();
