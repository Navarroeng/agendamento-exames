-- Fluxo de reemissão: status Necessita reemissão / Substituída e vínculo entre faturas

alter table public.faturas
  drop constraint if exists faturas_status_check;

alter table public.faturas
  add constraint faturas_status_check
  check (
    status in (
      'rascunho',
      'emitida',
      'cancelada',
      'necessita_reemissao',
      'substituida'
    )
  );

alter table public.faturas
  add column if not exists fatura_origem_id uuid null references public.faturas (id),
  add column if not exists fatura_substituta_id uuid null references public.faturas (id);

create index if not exists idx_faturas_fatura_origem_id
  on public.faturas (fatura_origem_id);

create index if not exists idx_faturas_fatura_substituta_id
  on public.faturas (fatura_substituta_id);

drop index if exists idx_faturas_unique_mes_ativa;

create unique index idx_faturas_unique_mes_ativa
  on public.faturas (tipo, referencia_nome, mes_referencia)
  where status in ('rascunho', 'emitida')
    and mes_referencia is not null;

-- Faturas emitidas com agendamento cancelado passam a necessitar reemissão
update public.faturas f
set status = 'necessita_reemissao'
where f.status = 'emitida'
  and f.tipo = 'cliente'
  and exists (
    select 1
    from public.fatura_itens fi
    join public.agendamentos a on a.id = fi.agendamento_id
    where fi.fatura_id = f.id
      and a.status = 'cancelado'
  );
