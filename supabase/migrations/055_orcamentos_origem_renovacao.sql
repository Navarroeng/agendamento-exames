-- Amplia origem_cliente do orçamento com a opção renovacao (uso interno).
-- Renovação: orçamento de cliente que já possui/possuiu contrato.
-- Não altera contratos existentes; na aprovação, localiza cliente pelo CNPJ
-- e cria um novo contrato vinculado ao orçamento (comportamento já da RPC).

alter table public.orcamentos
  drop constraint if exists orcamentos_origem_cliente_check;

alter table public.orcamentos
  add constraint orcamentos_origem_cliente_check
  check (
    origem_cliente is null
    or origem_cliente in ('indicacao', 'google', 'renovacao')
  );

comment on column public.orcamentos.origem_cliente is
  'Origem comercial do cliente: indicacao | google | renovacao. Uso interno; não aparece no PDF.';
