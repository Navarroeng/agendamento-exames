-- Dados da conferência de custos de clínicas (fatura recebida da clínica).

alter table public.faturas
  add column if not exists conferido_em date null,
  add column if not exists conferido_por text null,
  add column if not exists fatura_clinica_path text null,
  add column if not exists fatura_clinica_nome text null,
  add column if not exists fatura_clinica_tipo text null,
  add column if not exists fatura_clinica_tamanho bigint null,
  add column if not exists observacao_conferencia text null,
  add column if not exists conferencia_registrada_em timestamptz null;

comment on column public.faturas.conferido_em is
  'Data informada na conferência dos custos da clínica.';
comment on column public.faturas.conferido_por is
  'Usuário que confirmou a conferência dos custos da clínica.';
comment on column public.faturas.fatura_clinica_path is
  'Caminho da fatura da clínica no bucket faturas-comprovantes.';
comment on column public.faturas.fatura_clinica_nome is
  'Nome original do arquivo da fatura da clínica.';
comment on column public.faturas.fatura_clinica_tipo is
  'MIME type do arquivo da fatura da clínica.';
comment on column public.faturas.fatura_clinica_tamanho is
  'Tamanho em bytes do arquivo da fatura da clínica.';
comment on column public.faturas.observacao_conferencia is
  'Observação opcional registrada na conferência dos custos.';
comment on column public.faturas.conferencia_registrada_em is
  'Data/hora em que a conferência foi confirmada no sistema.';
