-- Criador vs responsável atual do processo comercial.
-- Implantação/listagens usam orcamentos.responsavel como fonte única.

alter table public.orcamentos
  add column if not exists criado_por text null;

alter table public.orcamentos
  add column if not exists criado_por_user_id uuid null;

alter table public.orcamentos
  add column if not exists responsavel_user_id uuid null;

comment on column public.orcamentos.criado_por is
  'Nome de quem criou o orçamento (imutável na transferência de responsável).';

comment on column public.orcamentos.criado_por_user_id is
  'user_id de quem criou o orçamento.';

comment on column public.orcamentos.responsavel is
  'Responsável atual pelo acompanhamento do processo (fonte única para Orçamentos e Implantação).';

comment on column public.orcamentos.responsavel_user_id is
  'user_id do responsável atual pelo processo.';

-- Backfill: criador = responsável histórico atual.
update public.orcamentos
set criado_por = nullif(trim(responsavel), '')
where criado_por is null
  and nullif(trim(responsavel), '') is not null;

-- Tenta vincular user_id pelo nome do perfil.
update public.orcamentos o
set
  responsavel_user_id = coalesce(o.responsavel_user_id, p.user_id),
  criado_por_user_id = coalesce(o.criado_por_user_id, p.user_id)
from public.perfis_usuarios p
where o.responsavel_user_id is null
  and lower(trim(o.responsavel)) = lower(trim(p.nome))
  and p.ativo = true;

update public.orcamentos o
set criado_por_user_id = coalesce(o.criado_por_user_id, p.user_id)
from public.perfis_usuarios p
where o.criado_por_user_id is null
  and o.criado_por is not null
  and lower(trim(o.criado_por)) = lower(trim(p.nome))
  and p.ativo = true;

create index if not exists idx_orcamentos_responsavel_user_id
  on public.orcamentos (responsavel_user_id);

create index if not exists idx_orcamentos_responsavel
  on public.orcamentos (responsavel);

-- RPC atômica: valida permissão e atualiza somente o responsável atual.
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
    if v_orcamento.responsavel_user_id is not null then
      if v_orcamento.responsavel_user_id is distinct from v_caller_id then
        raise exception
          'Você não possui permissão para alterar o responsável deste processo.';
      end if;
    else
      -- Fallback legado: compara pelo nome do perfil do caller.
      if not exists (
        select 1
        from public.perfis_usuarios p
        where p.user_id = v_caller_id
          and p.ativo = true
          and lower(trim(p.nome)) = lower(trim(coalesce(v_orcamento.responsavel, '')))
      ) then
        raise exception
          'Você não possui permissão para alterar o responsável deste processo.';
      end if;
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
grant execute on function public.alterar_responsavel_orcamento(uuid, uuid, text, text) to authenticated;
