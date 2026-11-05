-- Ciclo de fechamento dos custos de clínicas.
-- Null preserva o comportamento atual: mês completo e vencimento no mês da competência.
-- Não preenche regra nova em clínicas já cadastradas.

alter table public.clinicas
  add column if not exists fechamento_apuracao text,
  add column if not exists dia_fechamento smallint,
  add column if not exists vencimento_mes text;

alter table public.clinicas
  drop constraint if exists clinicas_fechamento_apuracao_check;

alter table public.clinicas
  add constraint clinicas_fechamento_apuracao_check
  check (
    fechamento_apuracao is null
    or fechamento_apuracao in ('mes_completo', 'dia_especifico')
  );

alter table public.clinicas
  drop constraint if exists clinicas_dia_fechamento_check;

alter table public.clinicas
  add constraint clinicas_dia_fechamento_check
  check (
    dia_fechamento is null
    or (dia_fechamento >= 1 and dia_fechamento <= 31)
  );

alter table public.clinicas
  drop constraint if exists clinicas_fechamento_dia_obrigatorio_check;

alter table public.clinicas
  add constraint clinicas_fechamento_dia_obrigatorio_check
  check (
    fechamento_apuracao is distinct from 'dia_especifico'
    or dia_fechamento is not null
  );

alter table public.clinicas
  drop constraint if exists clinicas_vencimento_mes_check;

alter table public.clinicas
  add constraint clinicas_vencimento_mes_check
  check (
    vencimento_mes is null
    or vencimento_mes in ('mesmo_mes', 'mes_seguinte')
  );

comment on column public.clinicas.fechamento_apuracao is
  'mes_completo ou dia_especifico. Null = mês completo, sem regra nova.';
comment on column public.clinicas.dia_fechamento is
  'Dia do fechamento (1–31) quando a apuração é em dia específico. O dia entra no período encerrado.';
comment on column public.clinicas.vencimento_mes is
  'mesmo_mes ou mes_seguinte em relação ao mês de fechamento. Null = mesmo mês (comportamento anterior).';

alter table public.faturas
  add column if not exists data_fechamento date,
  add column if not exists total_agendamentos integer,
  add column if not exists periodo_ajustado boolean not null default false;

comment on column public.faturas.data_fechamento is
  'Data de fechamento da competência. Null em registros antigos: usar periodo_fim.';
comment on column public.faturas.total_agendamentos is
  'Quantidade de agendamentos no retrato conferido. Null até a conferência ou o backfill pelos itens.';
comment on column public.faturas.periodo_ajustado is
  'Período excepcional desta fatura. Não altera a configuração da clínica.';

-- Contagem já existente nos itens gravados. Não inventa período nem valor.
update public.faturas f
set total_agendamentos = sub.qtd
from (
  select fatura_id, count(distinct agendamento_id)::integer as qtd
  from public.fatura_itens
  where agendamento_id is not null
  group by fatura_id
) sub
where f.id = sub.fatura_id
  and f.tipo = 'clinica'
  and f.total_agendamentos is null
  and f.status in ('emitida', 'vencida');

-- Uma competência ativa por clínica identificada, inclusive em gravações simultâneas.
create unique index if not exists idx_faturas_clinica_id_competencia
  on public.faturas (referencia_id, mes_referencia)
  where tipo = 'clinica'
    and status in ('rascunho', 'emitida', 'vencida')
    and referencia_id is not null
    and mes_referencia is not null;

-- Impede períodos sobrepostos da mesma clínica quando o id está preenchido.
-- Registros antigos sem referencia_id ficam de fora e não são reescritos.
create extension if not exists btree_gist;

alter table public.faturas
  drop constraint if exists faturas_clinica_periodo_sem_sobreposicao;

alter table public.faturas
  add constraint faturas_clinica_periodo_sem_sobreposicao
  exclude using gist (
    referencia_id with =,
    daterange(periodo_inicio, periodo_fim, '[]') with &&
  )
  where (
    tipo = 'clinica'
    and status in ('rascunho', 'emitida', 'vencida')
    and referencia_id is not null
    and periodo_inicio is not null
    and periodo_fim is not null
  );
