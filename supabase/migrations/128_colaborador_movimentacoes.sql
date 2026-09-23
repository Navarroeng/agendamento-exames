-- 128: Movimentações administrativas de colaboradores (eventos, não flag).
-- Primeiro tipo: desligamento_admin (sem exame/agendamento/fatura/vaga).
-- Identidade: cliente_id + CPF normalizado (11 dígitos).
-- Desfazer = cancelamento lógico (cancelado_em), sem DELETE.

create table if not exists public.colaborador_movimentacoes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null
    references public.clientes (id) on delete cascade,
  cpf_digits text not null
    constraint colaborador_movimentacoes_cpf_digits_check
      check (cpf_digits ~ '^[0-9]{11}$'),
  tipo text not null
    constraint colaborador_movimentacoes_tipo_check
      check (tipo in ('desligamento_admin')),
  data_evento date not null,
  motivo text null,
  colaborador_nome text null,
  cargo_nome text null,
  criado_em timestamptz not null default now(),
  criado_por uuid null,
  criado_por_nome text null,
  cancelado_em timestamptz null,
  cancelado_por uuid null,
  cancelado_por_nome text null,
  cancelado_motivo text null
);

comment on table public.colaborador_movimentacoes is
  'Eventos administrativos de vínculo do colaborador (cliente + CPF). Não substitui agendamentos nem contrato_vagas.';

comment on column public.colaborador_movimentacoes.tipo is
  'Tipo do evento. Primeiro valor suportado: desligamento_admin.';

comment on column public.colaborador_movimentacoes.data_evento is
  'Data de negócio do evento (desligamento informado).';

comment on column public.colaborador_movimentacoes.cancelado_em is
  'Cancelamento lógico. Preenchido no desfazer; o registro permanece no histórico.';

create index if not exists idx_colaborador_movimentacoes_cliente_cpf_data
  on public.colaborador_movimentacoes (cliente_id, cpf_digits, data_evento);

create index if not exists idx_colaborador_movimentacoes_validas
  on public.colaborador_movimentacoes (cliente_id, cpf_digits, data_evento)
  where cancelado_em is null;

-- Impede duplo clique no mesmo dia; permite ciclos futuros em outras datas
-- e re-lançamento na mesma data depois de desfazer (cancelado_em preenchido).
create unique index if not exists idx_colaborador_movimentacoes_admin_data_unica
  on public.colaborador_movimentacoes (cliente_id, cpf_digits, data_evento)
  where tipo = 'desligamento_admin' and cancelado_em is null;

alter table public.colaborador_movimentacoes enable row level security;

drop policy if exists "staff_select_colaborador_movimentacoes"
  on public.colaborador_movimentacoes;
drop policy if exists "staff_insert_colaborador_movimentacoes"
  on public.colaborador_movimentacoes;
drop policy if exists "staff_update_colaborador_movimentacoes"
  on public.colaborador_movimentacoes;

create policy "staff_select_colaborador_movimentacoes"
  on public.colaborador_movimentacoes for select to authenticated
  using (public.is_staff_user());

create policy "staff_insert_colaborador_movimentacoes"
  on public.colaborador_movimentacoes for insert to authenticated
  with check (public.is_staff_user());

create policy "staff_update_colaborador_movimentacoes"
  on public.colaborador_movimentacoes for update to authenticated
  using (public.is_staff_user())
  with check (public.is_staff_user());

-- Sem policy de DELETE: desfazer é update de cancelamento lógico.

grant select, insert, update on table public.colaborador_movimentacoes
  to authenticated;
grant select, insert, update on table public.colaborador_movimentacoes
  to service_role;
