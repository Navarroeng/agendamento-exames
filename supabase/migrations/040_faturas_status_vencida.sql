-- Status Vencida: fatura emitida não paga após o mês do vencimento

alter table public.faturas
  drop constraint if exists faturas_status_check;

alter table public.faturas
  add constraint faturas_status_check
  check (
    status in (
      'rascunho',
      'emitida',
      'vencida',
      'cancelada',
      'necessita_reemissao',
      'substituida',
      'reemitida'
    )
  );

drop index if exists idx_faturas_unique_mes_ativa;

create unique index idx_faturas_unique_mes_ativa
  on public.faturas (tipo, referencia_nome, mes_referencia)
  where status in ('rascunho', 'emitida', 'vencida')
    and mes_referencia is not null;
