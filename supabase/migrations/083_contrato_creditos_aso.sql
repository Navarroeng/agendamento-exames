-- Créditos de ASO contratual em aberto (1 linha = 1 vaga).
-- Sem backfill: créditos só nascem por ação explícita na Implantação.

-- ---------------------------------------------------------------------------
-- Tabela principal
-- ---------------------------------------------------------------------------
create table if not exists public.contrato_creditos_aso (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null
    references public.cliente_contratos (id) on delete cascade,
  orcamento_id uuid null
    references public.orcamentos (id) on delete set null,
  cliente_id uuid null
    references public.clientes (id) on delete set null,
  cliente_cnpj text null,
  -- Sempre 1 por linha (modelo unitário); mantido para clareza/consultas.
  quantidade integer not null default 1
    constraint contrato_creditos_aso_quantidade_check check (quantidade = 1),
  status text not null default 'disponivel'
    constraint contrato_creditos_aso_status_check
      check (status in ('disponivel', 'utilizado', 'expirado', 'removido')),
  valido_ate date null,
  observacao text null,
  agendamento_id uuid null
    references public.agendamentos (id) on delete set null,
  colaborador text null,
  colaborador_cpf text null,
  criado_por text null,
  criado_em timestamptz not null default now(),
  utilizado_por text null,
  utilizado_em timestamptz null,
  removido_por text null,
  removido_em timestamptz null,
  expirado_em timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.contrato_creditos_aso is
  'ASOs contratuais em aberto: 1 registro = 1 vaga contratada sem colaborador definido.';

comment on column public.contrato_creditos_aso.contrato_id is
  'Contrato ao qual a vaga pertence.';

comment on column public.contrato_creditos_aso.orcamento_id is
  'Orçamento/implantação de origem, quando aplicável.';

comment on column public.contrato_creditos_aso.cliente_id is
  'Cliente do contrato (denormalizado para consulta no Novo Agendamento).';

comment on column public.contrato_creditos_aso.cliente_cnpj is
  'CNPJ do cliente no momento da criação (consulta auxiliar).';

comment on column public.contrato_creditos_aso.quantidade is
  'Sempre 1. Modelo unitário: cada linha é uma vaga independente.';

comment on column public.contrato_creditos_aso.status is
  'disponivel | utilizado | expirado | removido';

comment on column public.contrato_creditos_aso.valido_ate is
  'Fim da vigência do contrato no momento do registro (limite de uso).';

comment on column public.contrato_creditos_aso.observacao is
  'Observação opcional registrada na Implantação.';

comment on column public.contrato_creditos_aso.agendamento_id is
  'Agendamento que consumiu o crédito (status utilizado).';

comment on column public.contrato_creditos_aso.colaborador is
  'Nome do colaborador preenchido na utilização.';

comment on column public.contrato_creditos_aso.colaborador_cpf is
  'CPF do colaborador preenchido na utilização.';

comment on column public.contrato_creditos_aso.criado_por is
  'Usuário que registrou o ASO em aberto.';

comment on column public.contrato_creditos_aso.utilizado_por is
  'Usuário que vinculou o crédito a um agendamento.';

comment on column public.contrato_creditos_aso.removido_por is
  'Usuário que removeu a classificação (status removido).';

comment on column public.contrato_creditos_aso.expirado_em is
  'Momento em que o crédito foi marcado como expirado.';

-- ---------------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------------
create index if not exists idx_contrato_creditos_aso_contrato_status
  on public.contrato_creditos_aso (contrato_id, status);

create index if not exists idx_contrato_creditos_aso_cliente_status
  on public.contrato_creditos_aso (cliente_id, status)
  where cliente_id is not null;

create index if not exists idx_contrato_creditos_aso_cnpj_status
  on public.contrato_creditos_aso (cliente_cnpj, status)
  where cliente_cnpj is not null;

create index if not exists idx_contrato_creditos_aso_disponiveis
  on public.contrato_creditos_aso (contrato_id)
  where status = 'disponivel';

-- Um agendamento só pode consumir um crédito ativo por vez.
create unique index if not exists idx_contrato_creditos_aso_agendamento_utilizado
  on public.contrato_creditos_aso (agendamento_id)
  where status = 'utilizado' and agendamento_id is not null;

-- ---------------------------------------------------------------------------
-- updated_at (padrão do projeto)
-- ---------------------------------------------------------------------------
create or replace function public.set_contrato_creditos_aso_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_contrato_creditos_aso_updated_at
  on public.contrato_creditos_aso;
create trigger trg_contrato_creditos_aso_updated_at
  before update on public.contrato_creditos_aso
  for each row
  execute function public.set_contrato_creditos_aso_updated_at();

-- ---------------------------------------------------------------------------
-- Flag por exame: parte coberta pelo crédito (faturamento item a item)
-- ---------------------------------------------------------------------------
alter table public.agendamento_exames
  add column if not exists incluso_credito_contrato boolean not null default false;

comment on column public.agendamento_exames.incluso_credito_contrato is
  'True quando o exame/ASO foi coberto por crédito contratual (não faturar ao cliente).';

create index if not exists idx_agendamento_exames_incluso_credito
  on public.agendamento_exames (agendamento_id)
  where incluso_credito_contrato = true;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.contrato_creditos_aso enable row level security;

drop policy if exists "contrato_creditos_aso_select_authenticated"
  on public.contrato_creditos_aso;
create policy "contrato_creditos_aso_select_authenticated"
  on public.contrato_creditos_aso for select to authenticated using (true);

drop policy if exists "contrato_creditos_aso_insert_authenticated"
  on public.contrato_creditos_aso;
create policy "contrato_creditos_aso_insert_authenticated"
  on public.contrato_creditos_aso for insert to authenticated with check (true);

drop policy if exists "contrato_creditos_aso_update_authenticated"
  on public.contrato_creditos_aso;
create policy "contrato_creditos_aso_update_authenticated"
  on public.contrato_creditos_aso for update to authenticated
  using (true) with check (true);

drop policy if exists "contrato_creditos_aso_delete_authenticated"
  on public.contrato_creditos_aso;
create policy "contrato_creditos_aso_delete_authenticated"
  on public.contrato_creditos_aso for delete to authenticated using (true);
