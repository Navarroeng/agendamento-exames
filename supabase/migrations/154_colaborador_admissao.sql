-- Admissão administrativa do vínculo (empresa + CPF).
-- Usa a tabela oficial de movimentações. Não altera agendamentos, vagas,
-- desligamentos nem programações já gravadas.

alter table public.colaborador_movimentacoes
  drop constraint if exists colaborador_movimentacoes_tipo_check;

alter table public.colaborador_movimentacoes
  add constraint colaborador_movimentacoes_tipo_check
  check (tipo in ('desligamento_admin', 'admissao'));

comment on column public.colaborador_movimentacoes.tipo is
  'Tipo do evento: desligamento_admin ou admissao.';

comment on column public.colaborador_movimentacoes.data_evento is
  'Data de calendário do evento (admissão ou desligamento informado).';

create unique index if not exists idx_colaborador_movimentacoes_admissao_unica
  on public.colaborador_movimentacoes (cliente_id, cpf_digits)
  where tipo = 'admissao' and cancelado_em is null;

comment on index public.idx_colaborador_movimentacoes_admissao_unica is
  'Uma admissão vigente por vínculo (empresa + CPF). A correção atualiza este registro.';
