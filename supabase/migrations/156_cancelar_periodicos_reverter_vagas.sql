-- Gravação única de cancelamento quando a lista de periódicos não cabe
-- na URL de um PATCH. As duas tabelas mudam na mesma transação.
-- Listas que cabem na URL continuam pelo PATCH e não dependem desta função.

create or replace function public.cancelar_periodicos_e_reverter_vagas(
  p_ids uuid[],
  p_motivo text,
  p_cancelado_em timestamptz,
  p_cancelado_por text,
  p_cancelado_por_id uuid
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  atualizados integer;
begin
  if auth.uid() is not null and not public.is_staff_user() then
    raise exception
      'RPC_STAFF_ONLY: operação restrita a usuários internos da Navarro.'
      using errcode = '42501';
  end if;

  if p_ids is null or cardinality(p_ids) = 0 then
    return 0;
  end if;

  update public.periodicos_futuros
  set status = 'cancelado',
      motivo_cancelamento = p_motivo,
      cancelado_em = p_cancelado_em,
      cancelado_por = p_cancelado_por,
      cancelado_por_id = p_cancelado_por_id
  where id = any (p_ids);

  get diagnostics atualizados = row_count;

  update public.contrato_vagas
  set status = 'comprometida',
      periodico_futuro_id = null,
      agendamento_id = null
  where periodico_futuro_id = any (p_ids)
    and status = 'programada';

  return atualizados;
end;
$$;

create or replace function public.reverter_vagas_de_periodicos(p_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  atualizados integer;
begin
  if auth.uid() is not null and not public.is_staff_user() then
    raise exception
      'RPC_STAFF_ONLY: operação restrita a usuários internos da Navarro.'
      using errcode = '42501';
  end if;

  if p_ids is null or cardinality(p_ids) = 0 then
    return 0;
  end if;

  update public.contrato_vagas
  set status = 'comprometida',
      periodico_futuro_id = null,
      agendamento_id = null
  where periodico_futuro_id = any (p_ids)
    and status = 'programada';

  get diagnostics atualizados = row_count;
  return atualizados;
end;
$$;

revoke all on function public.cancelar_periodicos_e_reverter_vagas(uuid[], text, timestamptz, text, uuid) from public;
revoke all on function public.cancelar_periodicos_e_reverter_vagas(uuid[], text, timestamptz, text, uuid) from anon;
revoke all on function public.cancelar_periodicos_e_reverter_vagas(uuid[], text, timestamptz, text, uuid) from authenticated;
grant execute on function public.cancelar_periodicos_e_reverter_vagas(uuid[], text, timestamptz, text, uuid) to service_role;

revoke all on function public.reverter_vagas_de_periodicos(uuid[]) from public;
revoke all on function public.reverter_vagas_de_periodicos(uuid[]) from anon;
revoke all on function public.reverter_vagas_de_periodicos(uuid[]) from authenticated;
grant execute on function public.reverter_vagas_de_periodicos(uuid[]) to service_role;
