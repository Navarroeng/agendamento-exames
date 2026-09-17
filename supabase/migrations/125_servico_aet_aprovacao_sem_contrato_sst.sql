-- 125: Aprovação de AET exclusivo sem cliente_contratos SST.
-- A migration 124 já faz a RPC retornar contrato_id = null e não criar
-- cliente_contratos. O trigger trg_orcamento_aprovado_exige_contrato (050)
-- ainda exigia uma linha em cliente_contratos para QUALQUER orçamento
-- ir para status = aprovado, gerando APROVACAO_INCOMPLETA após a RPC 124.
--
-- Regra:
--   AET exclusivo → cliente_id obrigatório; cliente_contratos NÃO obrigatório
--   Demais serviços → preserva a exigência de cliente_contratos
--
-- Não reescreve a RPC. Não transforma cliente_contratos em tabela genérica.

create or replace function public.normalize_servico_nome(p_nome text)
returns text
language sql
immutable
as $$
  select lower(trim(both from regexp_replace(
    translate(
      coalesce(p_nome, ''),
      'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ–—−',
      'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn---'
    ),
    '\s+', ' ', 'g'
  )));
$$;

create or replace function public.is_servico_aet_nome(p_nome text)
returns boolean
language sql
immutable
as $$
  select public.normalize_servico_nome(p_nome)
    = 'laudo aet - analise ergonomica do trabalho';
$$;

create or replace function public.orcamento_eh_exclusivo_aet(p_orcamento_id uuid)
returns boolean
language plpgsql
stable
as $$
declare
  v_total integer := 0;
  v_aet integer := 0;
begin
  if p_orcamento_id is null then
    return false;
  end if;

  select
    count(*)::integer,
    count(*) filter (where public.is_servico_aet_nome(i.servico_nome))::integer
  into v_total, v_aet
  from public.orcamento_aprovacao_itens i
  inner join public.orcamento_aprovacoes a on a.id = i.aprovacao_id
  where a.orcamento_id = p_orcamento_id;

  if v_total > 0 then
    return v_aet = v_total;
  end if;

  select
    count(*)::integer,
    count(*) filter (where public.is_servico_aet_nome(i.servico_nome))::integer
  into v_total, v_aet
  from public.orcamento_itens i
  where i.orcamento_id = p_orcamento_id;

  return v_total > 0 and v_aet = v_total;
end;
$$;

comment on function public.orcamento_eh_exclusivo_aet(uuid) is
  'True somente quando todos os itens (snapshot da aprovação, senão orcamento_itens) são o Laudo AET canônico.';

create or replace function public.trg_orcamento_aprovado_exige_contrato()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'aprovado'
     and (tg_op = 'INSERT' or old.status is distinct from 'aprovado') then
    if public.orcamento_eh_exclusivo_aet(new.id) then
      if new.cliente_id is null then
        raise exception
          'APROVACAO_INCOMPLETA: o orçamento AET só pode ficar Aprovado após vincular o cliente. Use a RPC aprovar_orcamento_integrar_cliente.'
          using errcode = 'P0001';
      end if;
      return new;
    end if;

    if not exists (
      select 1
      from public.cliente_contratos c
      where c.orcamento_id = new.id
    ) then
      raise exception
        'APROVACAO_INCOMPLETA: o orçamento só pode ficar Aprovado após criar/vincular cliente e contrato. Use a RPC aprovar_orcamento_integrar_cliente.'
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;
