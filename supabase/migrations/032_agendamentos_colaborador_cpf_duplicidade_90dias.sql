-- CPF do colaborador + bloqueio de duplicidade (mesma empresa + CPF + < 90 dias).

alter table public.agendamentos
  add column if not exists colaborador_cpf text null;

alter table public.agendamentos
  drop column if exists colaborador_cpf_digits;

alter table public.agendamentos
  add column colaborador_cpf_digits text generated always as (
    regexp_replace(colaborador_cpf, '[^0-9]', '', 'g')
  ) stored;

create index if not exists idx_agendamentos_colaborador_cpf_digits
  on public.agendamentos (colaborador_cpf_digits)
  where char_length(colaborador_cpf_digits) = 11;

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

  if NEW.status = 'cancelado' then
    return NEW;
  end if;

  select a.id
  into conflito_id
  from public.agendamentos a
  where a.id is distinct from NEW.id
    and lower(trim(a.cliente_nome)) = lower(trim(NEW.cliente_nome))
    and a.colaborador_cpf_digits = NEW.colaborador_cpf_digits
    and a.status <> 'cancelado'
    and abs(NEW.data_agendamento::date - a.data_agendamento::date) < 90
  limit 1;

  if conflito_id is not null then
    raise exception 'AGENDAMENTO_DUPLICIDADE_90_DIAS'
      using hint = conflito_id::text;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_agendamentos_duplicidade_90_dias on public.agendamentos;

create trigger trg_agendamentos_duplicidade_90_dias
  before insert or update on public.agendamentos
  for each row
  execute function public.check_agendamento_duplicidade_90_dias();
