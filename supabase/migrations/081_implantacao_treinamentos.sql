-- Agendamento de treinamento na Implantação (fluxo Treinamentos).
-- Não altera processos existentes; apenas cria estrutura opcional.

create table if not exists public.implantacao_treinamentos (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references public.orcamentos (id) on delete cascade,
  aprovacao_id uuid not null references public.orcamento_aprovacoes (id) on delete cascade,
  data_treinamento date null,
  horario_inicio text null,
  horario_termino text null,
  modalidade text null
    check (
      modalidade is null
      or modalidade in ('presencial', 'online', 'hibrido')
    ),
  local_treinamento text null,
  endereco text null,
  link_reuniao text null,
  tipo_nome text null,
  quantidade_participantes integer null
    check (
      quantidade_participantes is null
      or quantidade_participantes >= 0
    ),
  instrutor_responsavel text null,
  contato_empresa text null,
  observacoes text null,
  status text not null default 'a_definir'
    check (
      status in (
        'a_definir',
        'agendado',
        'confirmado',
        'realizado',
        'cancelado',
        'reagendado'
      )
    ),
  motivo_cancelamento text null,
  motivo_reagendamento text null,
  data_anterior date null,
  horario_inicio_anterior text null,
  horario_termino_anterior text null,
  criado_em timestamptz not null default now(),
  criado_por text null,
  atualizado_em timestamptz not null default now(),
  atualizado_por text null,
  constraint implantacao_treinamentos_aprovacao_uk unique (aprovacao_id)
);

create index if not exists idx_implantacao_treinamentos_orcamento
  on public.implantacao_treinamentos (orcamento_id);

create index if not exists idx_implantacao_treinamentos_status
  on public.implantacao_treinamentos (status);

create table if not exists public.implantacao_treinamentos_eventos (
  id uuid primary key default gen_random_uuid(),
  treinamento_id uuid not null
    references public.implantacao_treinamentos (id) on delete cascade,
  tipo_evento text not null
    check (
      tipo_evento in (
        'criacao',
        'edicao',
        'confirmacao',
        'reagendamento',
        'realizacao',
        'cancelamento'
      )
    ),
  status_anterior text null,
  status_novo text null,
  data_anterior date null,
  data_nova date null,
  horario_inicio_anterior text null,
  horario_inicio_novo text null,
  motivo text null,
  usuario_nome text not null,
  criado_em timestamptz not null default now()
);

create index if not exists idx_implantacao_treinamentos_eventos_treino
  on public.implantacao_treinamentos_eventos (treinamento_id, criado_em desc);

comment on table public.implantacao_treinamentos is
  'Agendamento operacional do serviço Treinamentos na implantação.';

comment on table public.implantacao_treinamentos_eventos is
  'Histórico de alterações do agendamento de treinamento.';

alter table public.implantacao_treinamentos enable row level security;
alter table public.implantacao_treinamentos_eventos enable row level security;

drop policy if exists "authenticated_select_implantacao_treinamentos"
  on public.implantacao_treinamentos;
drop policy if exists "authenticated_insert_implantacao_treinamentos"
  on public.implantacao_treinamentos;
drop policy if exists "authenticated_update_implantacao_treinamentos"
  on public.implantacao_treinamentos;

create policy "authenticated_select_implantacao_treinamentos"
  on public.implantacao_treinamentos for select to authenticated using (true);
create policy "authenticated_insert_implantacao_treinamentos"
  on public.implantacao_treinamentos for insert to authenticated with check (true);
create policy "authenticated_update_implantacao_treinamentos"
  on public.implantacao_treinamentos for update to authenticated using (true) with check (true);

drop policy if exists "authenticated_select_implantacao_treinamentos_eventos"
  on public.implantacao_treinamentos_eventos;
drop policy if exists "authenticated_insert_implantacao_treinamentos_eventos"
  on public.implantacao_treinamentos_eventos;

create policy "authenticated_select_implantacao_treinamentos_eventos"
  on public.implantacao_treinamentos_eventos for select to authenticated using (true);
create policy "authenticated_insert_implantacao_treinamentos_eventos"
  on public.implantacao_treinamentos_eventos for insert to authenticated with check (true);

grant select, insert, update on table public.implantacao_treinamentos to authenticated;
grant select, insert on table public.implantacao_treinamentos_eventos to authenticated;
