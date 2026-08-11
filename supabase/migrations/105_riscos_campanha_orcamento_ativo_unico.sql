-- Permite histórico de campanhas canceladas/encerradas no mesmo orçamento.
-- Apenas uma campanha "ativa" (em_preparacao | aberta) por orçamento.

drop index if exists public.idx_riscos_campanhas_orcamento_unico;

create unique index if not exists idx_riscos_campanhas_orcamento_ativo_unico
  on public.riscos_campanhas (orcamento_id)
  where orcamento_id is not null
    and status in ('em_preparacao', 'aberta');

comment on index public.idx_riscos_campanhas_orcamento_ativo_unico is
  'No máximo uma campanha ativa (em_preparacao|aberta) por orçamento; cancelada/encerrada ficam no histórico.';
