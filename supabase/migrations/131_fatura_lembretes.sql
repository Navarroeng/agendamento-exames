-- Lembretes manuais de fatura de cliente.
-- Cada linha é um envio aceito pelo Resend, não uma confirmação de entrega.
-- Não altera valor, vencimento, status financeiro nem o envio original da fatura.

create table if not exists public.fatura_lembretes (
  id uuid primary key default gen_random_uuid(),
  fatura_id uuid not null references public.faturas (id) on delete cascade,
  enviado_em timestamptz not null default now(),
  destinatario text not null,
  usuario_id uuid null,
  usuario_nome text not null,
  assunto text not null,
  mensagem text not null,
  resend_message_id text null,
  situacao text not null default 'aceito_resend',
  idempotency_key text not null,
  constraint fatura_lembretes_situacao_check
    check (situacao = 'aceito_resend'),
  constraint fatura_lembretes_idempotency_key_unique unique (idempotency_key)
);

comment on table public.fatura_lembretes is
  'Histórico de lembretes manuais aceitos pelo Resend. situacao aceito_resend não significa entrega confirmada ao destinatário.';

comment on column public.fatura_lembretes.situacao is
  'Aceite da API do Resend. Não registra entrega confirmada.';

comment on column public.fatura_lembretes.resend_message_id is
  'Identificador retornado pelo Resend quando a API aceita o envio.';

comment on column public.fatura_lembretes.idempotency_key is
  'Chave do envio aceito. Impede registro duplicado do mesmo pedido.';

create index if not exists idx_fatura_lembretes_fatura_enviado
  on public.fatura_lembretes (fatura_id, enviado_em desc);

alter table public.faturas
  add column if not exists fatura_lembrete_ultimo_em timestamptz,
  add column if not exists fatura_lembrete_ultimo_email text;

comment on column public.faturas.fatura_lembrete_ultimo_em is
  'Timestamp do último lembrete aceito pelo Resend. Não é confirmação de entrega.';

comment on column public.faturas.fatura_lembrete_ultimo_email is
  'Destinatário do último lembrete aceito pelo Resend.';

alter table public.fatura_lembretes enable row level security;

drop policy if exists "staff_select_fatura_lembretes" on public.fatura_lembretes;
create policy "staff_select_fatura_lembretes"
  on public.fatura_lembretes for select to authenticated
  using (public.is_staff_user());

grant select on table public.fatura_lembretes to authenticated;
grant select, insert on table public.fatura_lembretes to service_role;
