-- 119: Alterar responsável do orçamento — grupo operacional (não só o dono atual).
--
-- Não altera RLS. Não amplia perfil. Não promove ninguém a admin.
-- Espelha lib/constants.ts RESPONSAVEIS (Bruna, Rafaela, Karoline) + admin.
-- A permissão é do papel operacional autenticado, não de ser o responsável atual.

create or replace function public.alterar_responsavel_orcamento(
  p_orcamento_id uuid,
  p_novo_responsavel_user_id uuid,
  p_novo_responsavel_nome text,
  p_motivo text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orcamento public.orcamentos%rowtype;
  v_novo_nome text := nullif(trim(coalesce(p_novo_responsavel_nome, '')), '');
  v_motivo text := nullif(trim(coalesce(p_motivo, '')), '');
  v_caller_id uuid := auth.uid();
  v_is_admin boolean := public.is_admin_user();
  v_perfil_novo public.perfis_usuarios%rowtype;
begin
  if v_caller_id is not null and not public.is_staff_user() then
    raise exception
      'RPC_STAFF_ONLY: operação restrita a usuários internos da Navarro.'
      using errcode = '42501';
  end if;

  if v_caller_id is null then
    raise exception 'Não autenticado.';
  end if;

  if v_novo_nome is null then
    raise exception 'Informe o novo responsável.';
  end if;

  if v_motivo is null then
    raise exception 'Informe o motivo da alteração.';
  end if;

  if p_novo_responsavel_user_id is null then
    raise exception 'Informe o novo responsável.';
  end if;

  select * into v_orcamento
  from public.orcamentos
  where id = p_orcamento_id
  for update;

  if not found then
    raise exception 'Orçamento não encontrado.';
  end if;

  if v_orcamento.status in ('cancelado', 'contrato_encerrado') then
    raise exception
      'Não é possível alterar o responsável de um processo cancelado ou encerrado.';
  end if;

  if not v_is_admin then
    if not exists (
      select 1
      from public.perfis_usuarios p
      where p.user_id = v_caller_id
        and p.ativo = true
        and p.perfil = 'operacional'
        and (
          lower(trim(p.nome)) in ('bruna', 'rafaela', 'karoline')
          or split_part(lower(trim(p.nome)), ' ', 1) in (
            'bruna', 'rafaela', 'karoline'
          )
        )
    ) then
      raise exception
        'Você não possui permissão para alterar o responsável deste processo.';
    end if;
  end if;

  select * into v_perfil_novo
  from public.perfis_usuarios
  where user_id = p_novo_responsavel_user_id
    and ativo = true;

  if not found then
    raise exception 'Novo responsável inválido ou inativo.';
  end if;

  if p_novo_responsavel_user_id is not distinct from v_orcamento.responsavel_user_id
     or lower(trim(v_perfil_novo.nome)) = lower(trim(coalesce(v_orcamento.responsavel, '')))
  then
    raise exception 'Selecione um responsável diferente do atual.';
  end if;

  update public.orcamentos
  set
    responsavel = coalesce(nullif(trim(v_perfil_novo.nome), ''), v_novo_nome),
    responsavel_user_id = p_novo_responsavel_user_id,
    updated_at = now()
  where id = p_orcamento_id;

  return jsonb_build_object(
    'orcamento_id', p_orcamento_id,
    'numero', v_orcamento.numero,
    'responsavel_anterior', v_orcamento.responsavel,
    'responsavel_anterior_user_id', v_orcamento.responsavel_user_id,
    'responsavel_novo', coalesce(nullif(trim(v_perfil_novo.nome), ''), v_novo_nome),
    'responsavel_novo_user_id', p_novo_responsavel_user_id,
    'motivo', v_motivo
  );
end;
$$;

revoke all on function public.alterar_responsavel_orcamento(uuid, uuid, text, text) from public;
revoke all on function public.alterar_responsavel_orcamento(uuid, uuid, text, text) from anon;
revoke all on function public.alterar_responsavel_orcamento(uuid, uuid, text, text) from authenticated;
grant execute on function public.alterar_responsavel_orcamento(uuid, uuid, text, text) to authenticated;
grant execute on function public.alterar_responsavel_orcamento(uuid, uuid, text, text) to service_role;
