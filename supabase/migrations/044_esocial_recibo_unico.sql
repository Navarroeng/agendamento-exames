-- Unicidade do Nº Recibo e-Social (normalizado: trim + remove espaços).

alter table public.agendamentos
  drop column if exists esocial_recibo_normalizado;

alter table public.agendamentos
  add column esocial_recibo_normalizado text generated always as (
    nullif(regexp_replace(trim(coalesce(esocial_recibo, '')), '\s', '', 'g'), '')
  ) stored;

-- Bloqueia a migration se já existirem recibos duplicados no banco.
do $$
declare
  dup_grupos int;
begin
  select count(*) into dup_grupos
  from (
    select esocial_recibo_normalizado
    from public.agendamentos
    where esocial_recibo_normalizado is not null
    group by esocial_recibo_normalizado
    having count(*) > 1
  ) d;

  if dup_grupos > 0 then
    raise exception 'ESOCIAL_RECIBO_DUPLICADOS_EXISTENTES'
      using hint = format(
        '%s grupos duplicados. Execute scripts/check-esocial-recibo-duplicados.ts e corrija manualmente antes de aplicar o índice único.',
        dup_grupos
      );
  end if;
end $$;

create unique index if not exists idx_agendamentos_esocial_recibo_normalizado_unique
  on public.agendamentos (esocial_recibo_normalizado)
  where esocial_recibo_normalizado is not null;
