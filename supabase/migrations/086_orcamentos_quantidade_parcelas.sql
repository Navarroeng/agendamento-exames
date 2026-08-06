-- Quantidade de parcelas escolhida na proposta (criação/edição do orçamento).
-- Limites de negócio (máx. 10; parcela mínima R$ 500) são aplicados na aplicação.

alter table public.orcamentos
  add column if not exists quantidade_parcelas integer null
    check (
      quantidade_parcelas is null
      or (quantidade_parcelas >= 1 and quantidade_parcelas <= 10)
    );

comment on column public.orcamentos.quantidade_parcelas is
  'Quantidade de parcelas escolhida na proposta comercial (1 a 10). Null = comportamento legado (máximo permitido pelo valor).';
