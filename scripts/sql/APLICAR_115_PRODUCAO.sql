-- Aplicar em produção: ASO Pontual isento da duplicidade temporal de 90 dias.
-- Arquivo espelho de supabase/migrations/115_agendamento_aso_pontual_duplicidade.sql

create or replace function public.check_agendamento_duplicidade_90_dias()
returns trigger
language plpgsql
as $$
declare
  conflito_id uuid;
begin
  if char_length(coalesce(NEW.colaborador_cpf_digits, '')) <> 11 then
    return NEW;
  end if;

  if lower(trim(coalesce(NEW.status, ''))) = 'cancelado' then
    return NEW;
  end if;

  if trim(coalesce(NEW.aso, '')) = '' then
    return NEW;
  end if;

  if lower(trim(coalesce(NEW.aso, ''))) = 'pontual' then
    return NEW;
  end if;

  select a.id
  into conflito_id
  from public.agendamentos a
  where a.id is distinct from NEW.id
    and lower(trim(a.cliente_nome)) = lower(trim(NEW.cliente_nome))
    and a.colaborador_cpf_digits = NEW.colaborador_cpf_digits
    and lower(trim(coalesce(a.status, ''))) <> 'cancelado'
    and lower(trim(coalesce(a.aso, ''))) = lower(trim(coalesce(NEW.aso, '')))
    and abs(NEW.data_agendamento::date - a.data_agendamento::date) < 90
  limit 1;

  if conflito_id is not null then
    raise exception 'AGENDAMENTO_DUPLICIDADE_90_DIAS'
      using hint = conflito_id::text;
  end if;

  return NEW;
end;
$$;
