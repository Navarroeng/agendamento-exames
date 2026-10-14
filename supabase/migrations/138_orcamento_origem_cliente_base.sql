-- Amplia origem_cliente com "Cliente da base".
-- Empresa que já é cliente da Navarro e solicita um novo orçamento.
-- Não altera origens já gravadas.

alter table public.orcamentos
  drop constraint if exists orcamentos_origem_cliente_check;

alter table public.orcamentos
  add constraint orcamentos_origem_cliente_check
  check (
    origem_cliente is null
    or origem_cliente in ('indicacao', 'google', 'renovacao', 'cliente_base')
  );

comment on column public.orcamentos.origem_cliente is
  'Origem comercial do cliente: indicacao | google | renovacao | cliente_base. Uso interno; não aparece no PDF.';
