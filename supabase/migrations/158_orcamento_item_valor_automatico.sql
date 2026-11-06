-- Marca explícita do valor mensal automático da Gestão SST.
-- Não preenche registros existentes: null não entra no modo automático
-- e o valor já salvo permanece.

alter table public.orcamento_itens
  add column if not exists valor_automatico boolean null;

comment on column public.orcamento_itens.valor_automatico is
  'Gestão SST mensal: true segue a tabela ao mudar a quantidade; false foi negociado. Null é registro anterior: preserva o valor e não é tratado como automático.';
