-- Campos da baixa de Cobranças na mesma parcela do Financeiro.
-- Não cria tabela, não gera parcela e não altera vencimento, valor ou pago_em já gravados.
-- A quitação continua sendo pago_em. valor_recebido e o comprovante acompanham essa mesma linha.
-- Permissões seguem as policies staff já existentes nesta tabela.

alter table public.orcamento_mensalidade_parcelas
  add column if not exists valor_recebido numeric(12, 2) null,
  add column if not exists comprovante_path text null,
  add column if not exists comprovante_nome text null,
  add column if not exists comprovante_tipo text null,
  add column if not exists comprovante_tamanho integer null;

alter table public.orcamento_mensalidade_parcelas
  drop constraint if exists orcamento_mensalidade_parcelas_valor_recebido_positivo;

alter table public.orcamento_mensalidade_parcelas
  add constraint orcamento_mensalidade_parcelas_valor_recebido_positivo
  check (valor_recebido is null or valor_recebido > 0);

comment on column public.orcamento_mensalidade_parcelas.valor_recebido is
  'Valor recebido na baixa. Null quando a quitação foi só pela data no Financeiro. Não substitui valor.';

comment on column public.orcamento_mensalidade_parcelas.comprovante_path is
  'Comprovante opcional da parcela, no bucket orcamentos-comprovantes. Não é o comprovante do boleto da aprovação.';

create index if not exists idx_orcamento_mensalidade_parcelas_vencimento
  on public.orcamento_mensalidade_parcelas (vencimento)
  where sem_vigencia_em is null;
