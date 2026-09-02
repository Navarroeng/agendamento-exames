-- Envio automático de faturas de clientes por e-mail (Resend).
-- Estado operacional separado do status financeiro da fatura.

alter table public.faturas
  add column if not exists fatura_enviada_em timestamptz,
  add column if not exists fatura_enviada_email text,
  add column if not exists fatura_enviada_por text,
  add column if not exists fatura_enviada_por_user_id uuid,
  add column if not exists fatura_envio_resend_id text,
  add column if not exists fatura_envio_reenvio_count integer not null default 0;

comment on column public.faturas.fatura_enviada_em is
  'Timestamp do último envio confirmado da fatura por e-mail (Resend).';
comment on column public.faturas.fatura_enviada_email is
  'E-mail do destinatário do último envio confirmado.';
comment on column public.faturas.fatura_enviada_por is
  'Nome exibido do usuário que confirmou o último envio.';
comment on column public.faturas.fatura_enviada_por_user_id is
  'UUID do usuário autenticado que confirmou o último envio.';
comment on column public.faturas.fatura_envio_resend_id is
  'ID da mensagem retornado pelo Resend no último envio confirmado.';
comment on column public.faturas.fatura_envio_reenvio_count is
  'Quantidade de reenvios explícitos após o primeiro envio confirmado.';
