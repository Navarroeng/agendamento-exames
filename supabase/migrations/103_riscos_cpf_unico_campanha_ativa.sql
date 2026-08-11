-- Garante CPF único entre campanhas ATIVAS (em_preparacao | aberta).
-- Não usa UNIQUE global (quebraria histórico encerrada/cancelada).
-- Trigger: bloqueia INSERT/UPDATE quando o CPF já ocupa outra campanha ativa
-- e o participante não está removido/invalidado.

create or replace function public.riscos_impedir_cpf_em_campanha_ativa()
returns trigger
language plpgsql
as $$
declare
  v_conflito record;
  v_campanha_status text;
begin
  -- Participante inativo não ocupa o CPF.
  if new.removido_em is not null
     or new.status in ('removido', 'invalidado') then
    return new;
  end if;

  select c.status into v_campanha_status
  from public.riscos_campanhas c
  where c.id = new.campanha_id;

  -- Se a própria campanha não é ativa, não há bloqueio global.
  if v_campanha_status is null
     or v_campanha_status not in ('em_preparacao', 'aberta') then
    return new;
  end if;

  select
    p.id as participante_id,
    c.id as campanha_id,
    c.empresa_nome,
    c.codigo_publico,
    c.status
  into v_conflito
  from public.riscos_campanha_participantes p
  join public.riscos_campanhas c on c.id = p.campanha_id
  where p.cpf = new.cpf
    and p.id is distinct from new.id
    and c.status in ('em_preparacao', 'aberta')
    and p.removido_em is null
    and p.status not in ('removido', 'invalidado')
  limit 1;

  if found then
    raise exception
      using errcode = '23505',
            message = format(
              'CPF já participa da campanha ativa %s (%s).',
              v_conflito.codigo_publico,
              v_conflito.empresa_nome
            ),
            detail = format(
              'campanha_id=%s participante_id=%s status=%s',
              v_conflito.campanha_id,
              v_conflito.participante_id,
              v_conflito.status
            );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_riscos_impedir_cpf_em_campanha_ativa
  on public.riscos_campanha_participantes;

create trigger trg_riscos_impedir_cpf_em_campanha_ativa
  before insert or update of cpf, status, removido_em, campanha_id
  on public.riscos_campanha_participantes
  for each row
  execute function public.riscos_impedir_cpf_em_campanha_ativa();

comment on function public.riscos_impedir_cpf_em_campanha_ativa() is
  'Bloqueia CPF em mais de uma campanha ativa (em_preparacao|aberta). Removidos/invalidado e campanhas encerrada/cancelada não bloqueiam.';
