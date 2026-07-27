-- Campos de endereço/setor no cadastro de clientes e snapshot no orçamento.

alter table public.clientes
  add column if not exists endereco text null,
  add column if not exists setor text null;

alter table public.orcamentos
  add column if not exists cliente_cnpj text null,
  add column if not exists cliente_endereco text null,
  add column if not exists cliente_setor text null;
