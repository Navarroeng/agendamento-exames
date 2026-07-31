-- Horário da visita técnica (etapa Implantação / Orçamento).

alter table public.orcamento_aprovacoes
  add column if not exists visita_tecnica_horario text null;

comment on column public.orcamento_aprovacoes.visita_tecnica_horario is
  'Horário da visita técnica no formato HH:mm (America/Sao_Paulo operacional).';
