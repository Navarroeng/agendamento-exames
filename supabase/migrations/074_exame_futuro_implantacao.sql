-- Programação de exames futuros na Implantação (consome vaga do contrato)
-- e enriquecimento de Periódicos Futuros (origem / motivo / observações).

-- ---------------------------------------------------------------------------
-- periodicos_futuros: permitir registros sem exame/agendamento de origem
-- ---------------------------------------------------------------------------
alter table public.periodicos_futuros
  alter column exame_id drop not null;

alter table public.periodicos_futuros
  alter column data_realizada drop not null;

alter table public.periodicos_futuros
  add column if not exists origem text null,
  add column if not exists motivo text null,
  add column if not exists motivo_detalhe text null,
  add column if not exists observacoes text null,
  add column if not exists contrato_id uuid null references public.cliente_contratos (id) on delete set null,
  add column if not exists colaborador_cpf text null,
  add column if not exists tipo_aso text null,
  add column if not exists consome_previsao_contrato boolean not null default false;

comment on column public.periodicos_futuros.origem is
  'Origem do registro: agendamento | implantacao_inicial';

comment on column public.periodicos_futuros.motivo is
  'Motivo da programação futura (ex.: ASO ainda vigente).';

comment on column public.periodicos_futuros.motivo_detalhe is
  'Texto livre quando o motivo for Outro.';

comment on column public.periodicos_futuros.observacoes is
  'Observações opcionais da programação.';

comment on column public.periodicos_futuros.contrato_id is
  'Contrato relacionado (quando criado na implantação).';

comment on column public.periodicos_futuros.colaborador_cpf is
  'CPF do colaborador (quando informado).';

comment on column public.periodicos_futuros.tipo_aso is
  'Tipo de ASO programado (Admissional, Periódico, etc.).';

comment on column public.periodicos_futuros.consome_previsao_contrato is
  'True quando o registro consome uma vaga prevista do contrato de implantação.';

-- Backfill origem padrão para registros existentes
update public.periodicos_futuros
set origem = 'agendamento'
where origem is null;

create index if not exists idx_periodicos_futuros_contrato
  on public.periodicos_futuros (contrato_id)
  where contrato_id is not null;

create index if not exists idx_periodicos_futuros_consome_previsao
  on public.periodicos_futuros (contrato_id)
  where consome_previsao_contrato = true
    and status in ('ativo', 'reagendado');

create index if not exists idx_periodicos_futuros_origem
  on public.periodicos_futuros (origem);

create index if not exists idx_periodicos_futuros_colaborador_cpf
  on public.periodicos_futuros (colaborador_cpf)
  where colaborador_cpf is not null;
