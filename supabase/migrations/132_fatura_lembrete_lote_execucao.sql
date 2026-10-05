-- Trava do envio em lote dos lembretes que vencem hoje.
-- Não é histórico de aceite. A linha existe só enquanto o envio daquela fatura
-- está em andamento e é removida ao terminar. Um envio travado há mais de
-- 3 minutos pode ser assumido por uma nova tentativa.

create table if not exists public.fatura_lembrete_lote_execucao (
  fatura_id uuid not null references public.faturas (id) on delete cascade,
  dia_civil date not null,
  iniciado_em timestamptz not null default now(),
  primary key (fatura_id, dia_civil)
);

comment on table public.fatura_lembrete_lote_execucao is
  'Trava de execução simultânea do lote de lembretes do dia. Não registra aceite do Resend nem entrega.';

comment on column public.fatura_lembrete_lote_execucao.dia_civil is
  'Dia civil America/Sao_Paulo do lote. Não desloca a data de vencimento da fatura.';

alter table public.fatura_lembrete_lote_execucao enable row level security;

grant select, insert, update, delete on table public.fatura_lembrete_lote_execucao
  to service_role;
