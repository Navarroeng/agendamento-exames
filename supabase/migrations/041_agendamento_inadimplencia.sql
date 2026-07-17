-- Validação server-side: bloqueia novos agendamentos para clientes inadimplentes

create or replace function public.assert_cliente_sem_inadimplencia(
  p_referencia_nome text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_mes_atual text;
begin
  if trim(coalesce(p_referencia_nome, '')) = '' then
    return;
  end if;

  v_mes_atual := to_char(timezone('America/Sao_Paulo', now()), 'YYYY-MM');

  select count(*) into v_count
  from public.faturas f
  where f.tipo = 'cliente'
    and f.pago = false
    and f.status in ('emitida', 'vencida')
    and f.referencia_nome = trim(p_referencia_nome)
    and (
      f.status = 'vencida'
      or to_char(f.data_vencimento, 'YYYY-MM') < v_mes_atual
    );

  if v_count > 0 then
    raise exception
      'CLIENTE_INADIMPLENTE: cliente possui fatura(s) vencida(s) pendente(s) de pagamento.'
      using errcode = 'P0001';
  end if;
end;
$$;

grant execute on function public.assert_cliente_sem_inadimplencia(text) to authenticated;

create or replace function public.trg_agendamentos_assert_sem_inadimplencia()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_cliente_sem_inadimplencia(new.cliente_nome);
  return new;
end;
$$;

drop trigger if exists agendamentos_assert_sem_inadimplencia on public.agendamentos;

create trigger agendamentos_assert_sem_inadimplencia
  before insert on public.agendamentos
  for each row
  execute function public.trg_agendamentos_assert_sem_inadimplencia();
