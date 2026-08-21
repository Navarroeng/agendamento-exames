-- Cancelamento explícito do Periódico Futuro (obrigação), distinto do
-- cancelamento de ASO/agendamento. Não trata status cancelado legado como
-- cancelamento manual.

alter table public.periodicos_futuros
  add column if not exists motivo_cancelamento text null,
  add column if not exists cancelado_em timestamptz null,
  add column if not exists cancelado_por text null,
  add column if not exists cancelado_por_id uuid null;

comment on column public.periodicos_futuros.motivo_cancelamento is
  'Motivo obrigatório do cancelamento manual da obrigação periódica.';
comment on column public.periodicos_futuros.cancelado_em is
  'Momento do cancelamento manual do periódico futuro.';
comment on column public.periodicos_futuros.cancelado_por is
  'Nome do administrador que cancelou o periódico futuro.';
comment on column public.periodicos_futuros.cancelado_por_id is
  'user_id do administrador, quando disponível.';

create index if not exists idx_periodicos_futuros_cancelado_em
  on public.periodicos_futuros (cancelado_em)
  where cancelado_em is not null;

-- Recalcula históricos: cancelado sem rastreio manual volta a obrigação ativa.
-- Não classifica esses registros como cancelamento manual.
update public.periodicos_futuros
set status = 'ativo'
where status = 'cancelado'
  and cancelado_em is null
  and coalesce(trim(motivo_cancelamento), '') = '';
