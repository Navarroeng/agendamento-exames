-- Vagas contratuais individuais (1 linha = 1 vaga prevista no contrato).
-- Identidade da vaga (quem ocupa) + vínculo com ASO em aberto / agendamento / futuro.
-- Não substitui contrato_creditos_aso nem contrato_agendamentos: apenas os referencia.

-- ---------------------------------------------------------------------------
-- Flag de conclusão da etapa Lista de funcionários sem depender de anexo
-- ---------------------------------------------------------------------------
alter table public.orcamento_aprovacoes
  add column if not exists funcionarios_vagas_salvas_em timestamptz null;

comment on column public.orcamento_aprovacoes.funcionarios_vagas_salvas_em is
  'Momento em que a lista de vagas/funcionários do contrato foi persistida (etapa Lista de funcionários).';

-- ---------------------------------------------------------------------------
-- Tabela principal
-- ---------------------------------------------------------------------------
create table if not exists public.contrato_vagas (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null
    references public.cliente_contratos (id) on delete cascade,
  orcamento_id uuid null
    references public.orcamentos (id) on delete set null,
  indice integer not null
    constraint contrato_vagas_indice_check check (indice > 0),
  colaborador text null,
  colaborador_cpf text null,
  cargo_id uuid null
    references public.cargos (id) on delete set null,
  cargo_nome text null,
  status text not null default 'aberta'
    constraint contrato_vagas_status_check
      check (
        status in (
          'aberta',
          'comprometida',
          'aso_aberto',
          'agendada',
          'programada'
        )
      ),
  credito_aso_id uuid null
    references public.contrato_creditos_aso (id) on delete set null,
  agendamento_id uuid null
    references public.agendamentos (id) on delete set null,
  periodico_futuro_id uuid null
    references public.periodicos_futuros (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contrato_vagas_contrato_indice_unique unique (contrato_id, indice)
);

comment on table public.contrato_vagas is
  'Vagas previstas no contrato: 1 registro = 1 colaborador contratado. Funcionário comprometido, ASO em aberto e agendamento usam esta linha.';

comment on column public.contrato_vagas.indice is
  'Posição 1..N correspondente à quantidade_colaboradores do contrato.';

comment on column public.contrato_vagas.colaborador_cpf is
  'CPF somente dígitos. Identificador principal do ocupante da vaga.';

comment on column public.contrato_vagas.status is
  'aberta | comprometida | aso_aberto | agendada | programada';

comment on column public.contrato_vagas.credito_aso_id is
  'Crédito em contrato_creditos_aso quando a vaga está como ASO em aberto (ou foi utilizada a partir dele).';

create index if not exists idx_contrato_vagas_contrato_status
  on public.contrato_vagas (contrato_id, status);

create index if not exists idx_contrato_vagas_cpf
  on public.contrato_vagas (colaborador_cpf)
  where colaborador_cpf is not null;

create unique index if not exists idx_contrato_vagas_agendamento
  on public.contrato_vagas (agendamento_id)
  where agendamento_id is not null;

create unique index if not exists idx_contrato_vagas_credito
  on public.contrato_vagas (credito_aso_id)
  where credito_aso_id is not null;

create or replace function public.set_contrato_vagas_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_contrato_vagas_updated_at on public.contrato_vagas;
create trigger trg_contrato_vagas_updated_at
  before update on public.contrato_vagas
  for each row
  execute function public.set_contrato_vagas_updated_at();

alter table public.contrato_vagas enable row level security;

drop policy if exists "contrato_vagas_select_authenticated" on public.contrato_vagas;
create policy "contrato_vagas_select_authenticated"
  on public.contrato_vagas for select to authenticated using (true);

drop policy if exists "contrato_vagas_insert_authenticated" on public.contrato_vagas;
create policy "contrato_vagas_insert_authenticated"
  on public.contrato_vagas for insert to authenticated with check (true);

drop policy if exists "contrato_vagas_update_authenticated" on public.contrato_vagas;
create policy "contrato_vagas_update_authenticated"
  on public.contrato_vagas for update to authenticated using (true) with check (true);

drop policy if exists "contrato_vagas_delete_authenticated" on public.contrato_vagas;
create policy "contrato_vagas_delete_authenticated"
  on public.contrato_vagas for delete to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Backfill idempotente: cria N vagas abertas e encaixa créditos/agendamentos/futuros
-- existentes sem apagar anexos nem créditos.
-- ---------------------------------------------------------------------------
insert into public.contrato_vagas (contrato_id, orcamento_id, indice, status)
select
  c.id,
  c.orcamento_id,
  g.indice,
  'aberta'
from public.cliente_contratos c
cross join lateral generate_series(1, greatest(coalesce(c.quantidade_colaboradores, 0), 0)) as g(indice)
where coalesce(c.quantidade_colaboradores, 0) > 0
  and not exists (
    select 1 from public.contrato_vagas v where v.contrato_id = c.id
  );

-- ASOs em aberto → primeiras vagas ainda abertas
with creditos as (
  select
    id,
    contrato_id,
    row_number() over (partition by contrato_id order by created_at, id) as rn
  from public.contrato_creditos_aso
  where status = 'disponivel'
),
vagas_abertas as (
  select
    id,
    contrato_id,
    row_number() over (partition by contrato_id order by indice, id) as rn
  from public.contrato_vagas
  where status = 'aberta'
)
update public.contrato_vagas v
set
  status = 'aso_aberto',
  credito_aso_id = c.id
from creditos c
join vagas_abertas va
  on va.contrato_id = c.contrato_id
 and va.rn = c.rn
where v.id = va.id
  and v.credito_aso_id is null;

-- Agendamentos que já contabilizam previsão → vagas abertas restantes
with ags as (
  select
    ca.contrato_id,
    a.id as agendamento_id,
    nullif(trim(a.colaborador), '') as colaborador,
    nullif(regexp_replace(coalesce(a.colaborador_cpf, ''), '[^0-9]', '', 'g'), '') as colaborador_cpf,
    a.cargo_id,
    nullif(trim(a.cargo_nome), '') as cargo_nome,
    row_number() over (
      partition by ca.contrato_id
      order by ca.vinculado_em, a.data_agendamento, a.id
    ) as rn
  from public.contrato_agendamentos ca
  join public.agendamentos a on a.id = ca.agendamento_id
  where ca.removido_em is null
    and ca.contabiliza_previsao = true
    and a.status is distinct from 'cancelado'
    and not exists (
      select 1 from public.contrato_vagas vx
      where vx.agendamento_id = a.id
    )
),
vagas_abertas as (
  select
    id,
    contrato_id,
    row_number() over (partition by contrato_id order by indice, id) as rn
  from public.contrato_vagas
  where status = 'aberta'
)
update public.contrato_vagas v
set
  status = 'agendada',
  agendamento_id = a.agendamento_id,
  colaborador = coalesce(a.colaborador, v.colaborador),
  colaborador_cpf = coalesce(a.colaborador_cpf, v.colaborador_cpf),
  cargo_id = coalesce(a.cargo_id, v.cargo_id),
  cargo_nome = coalesce(a.cargo_nome, v.cargo_nome)
from ags a
join vagas_abertas va
  on va.contrato_id = a.contrato_id
 and va.rn = a.rn
where v.id = va.id
  and v.agendamento_id is null;

-- Exames futuros que consomem previsão → vagas abertas restantes
with futuros as (
  select
    pf.contrato_id,
    pf.id as periodico_futuro_id,
    nullif(trim(pf.colaborador), '') as colaborador,
    nullif(regexp_replace(coalesce(pf.colaborador_cpf, ''), '[^0-9]', '', 'g'), '') as colaborador_cpf,
    pf.cargo_id,
    nullif(trim(pf.cargo_nome), '') as cargo_nome,
    row_number() over (
      partition by pf.contrato_id
      order by pf.created_at, pf.id
    ) as rn
  from public.periodicos_futuros pf
  where pf.consome_previsao_contrato = true
    and pf.status in ('ativo', 'reagendado')
    and pf.contrato_id is not null
    and not exists (
      select 1 from public.contrato_vagas vx
      where vx.periodico_futuro_id = pf.id
    )
),
vagas_abertas as (
  select
    id,
    contrato_id,
    row_number() over (partition by contrato_id order by indice, id) as rn
  from public.contrato_vagas
  where status = 'aberta'
)
update public.contrato_vagas v
set
  status = 'programada',
  periodico_futuro_id = f.periodico_futuro_id,
  colaborador = coalesce(f.colaborador, v.colaborador),
  colaborador_cpf = coalesce(f.colaborador_cpf, v.colaborador_cpf),
  cargo_id = coalesce(f.cargo_id, v.cargo_id),
  cargo_nome = coalesce(f.cargo_nome, v.cargo_nome)
from futuros f
join vagas_abertas va
  on va.contrato_id = f.contrato_id
 and va.rn = f.rn
where v.id = va.id
  and v.periodico_futuro_id is null;

-- Se o mesmo CPF ocupou duas vagas no backfill, mantém a de menor índice.
update public.contrato_vagas v
set colaborador_cpf = null
where v.colaborador_cpf is not null
  and v.status in ('comprometida', 'agendada', 'programada')
  and v.id not in (
    select distinct on (contrato_id, colaborador_cpf) id
    from public.contrato_vagas
    where colaborador_cpf is not null
      and status in ('comprometida', 'agendada', 'programada')
    order by contrato_id, colaborador_cpf, indice, id
  );

create unique index if not exists idx_contrato_vagas_cpf_unico_contrato
  on public.contrato_vagas (contrato_id, colaborador_cpf)
  where colaborador_cpf is not null
    and status in ('comprometida', 'agendada', 'programada');
