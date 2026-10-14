-- O aviso de contrato desatualizado passa a comparar a revisão das
-- condições comerciais vigente com a revisão usada para gerar o PDF.
-- desatualizado_em permanece como sinal legado. Contratos assinados e o
-- histórico de versões não são reescritos.

alter table public.orcamento_aprovacoes
  add column if not exists condicoes_revisao bigint not null default 1;

alter table public.orcamento_aprovacoes
  drop constraint if exists orcamento_aprovacoes_condicoes_revisao_positiva;

alter table public.orcamento_aprovacoes
  add constraint orcamento_aprovacoes_condicoes_revisao_positiva
  check (condicoes_revisao >= 1);

comment on column public.orcamento_aprovacoes.condicoes_revisao is
  'Versão monotonicamente crescente das condições comerciais vigentes. Sobe somente quando essas condições mudam.';

alter table public.orcamento_contrato_documentos
  add column if not exists condicoes_revisao bigint null;

alter table public.orcamento_contrato_documentos
  drop constraint if exists orcamento_contrato_documentos_condicoes_revisao_nao_negativa;

alter table public.orcamento_contrato_documentos
  add constraint orcamento_contrato_documentos_condicoes_revisao_nao_negativa
  check (condicoes_revisao is null or condicoes_revisao >= 0);

comment on column public.orcamento_contrato_documentos.condicoes_revisao is
  'Versão das condições comerciais usada para gerar este PDF. Nula apenas em arquivos anteriores a este controle.';

-- A aprovação original é a revisão 1. Cada linha do histórico é uma alteração.
update public.orcamento_aprovacoes a
set condicoes_revisao = 1 + coalesce((
  select count(*)::bigint
  from public.orcamento_aprovacao_condicoes_historico h
  where h.aprovacao_id = a.id
), 0);

-- Só preenche revisão ainda nula, para não rebaixar um PDF já registrado.
update public.orcamento_contrato_documentos d
set condicoes_revisao = a.condicoes_revisao
from public.orcamento_aprovacoes a
where d.aprovacao_id = a.id
  and d.condicoes_revisao is null
  and d.desatualizado_em is null
  and coalesce(a.contrato_assinado, false) = false;

update public.orcamento_contrato_documentos d
set condicoes_revisao = greatest(a.condicoes_revisao - 1, 0)
from public.orcamento_aprovacoes a
where d.aprovacao_id = a.id
  and d.condicoes_revisao is null
  and d.desatualizado_em is not null
  and coalesce(a.contrato_assinado, false) = false;

update public.orcamento_contrato_documentos d
set condicoes_revisao = a.condicoes_revisao
from public.orcamento_aprovacoes a
where d.aprovacao_id = a.id
  and d.condicoes_revisao is null
  and coalesce(a.contrato_assinado, false) = true;

create or replace function public.trg_aprovacao_condicoes_revisao()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (
    new.quantidade_colaboradores is distinct from old.quantidade_colaboradores
    or new.valor_final is distinct from old.valor_final
    or new.condicao_pagamento is distinct from old.condicao_pagamento
    or new.quantidade_parcelas is distinct from old.quantidade_parcelas
    or new.valor_parcela is distinct from old.valor_parcela
    or new.desconto_percentual is distinct from old.desconto_percentual
    or new.valor_avista is distinct from old.valor_avista
    or new.observacoes is distinct from old.observacoes
    or new.mensalidade_pagamento is distinct from old.mensalidade_pagamento
    or new.mensalidade_valor_mensal is distinct from old.mensalidade_valor_mensal
    or new.mensalidade_meses is distinct from old.mensalidade_meses
    or new.mensalidade_valor_bruto is distinct from old.mensalidade_valor_bruto
    or new.mensalidade_valor_pontual is distinct from old.mensalidade_valor_pontual
    or new.mensalidade_desconto_valor is distinct from old.mensalidade_desconto_valor
    or new.mensalidade_desconto_tipo is distinct from old.mensalidade_desconto_tipo
    or new.mensalidade_vencimento is distinct from old.mensalidade_vencimento
  ) then
    new.condicoes_revisao := coalesce(old.condicoes_revisao, 1) + 1;
  else
    new.condicoes_revisao := coalesce(old.condicoes_revisao, 1);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_aprovacao_condicoes_revisao
  on public.orcamento_aprovacoes;

create trigger trg_aprovacao_condicoes_revisao
  before update on public.orcamento_aprovacoes
  for each row
  execute function public.trg_aprovacao_condicoes_revisao();

create or replace function public.registrar_contrato_documento_gerado(
  p_aprovacao_id uuid,
  p_condicoes_revisao bigint,
  p_orcamento_id uuid,
  p_cliente_id uuid,
  p_modalidade text,
  p_data_contrato date,
  p_storage_path text,
  p_arquivo_nome text,
  p_arquivo_tipo text,
  p_arquivo_tamanho integer,
  p_gerado_por text,
  p_gerado_por_user_id uuid
)
returns public.orcamento_contrato_documentos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orcamento_id uuid;
  v_rev bigint;
  v_assinado boolean;
  v_status text;
  v_versao integer;
  v_row public.orcamento_contrato_documentos;
begin
  if not public.is_staff_user() then
    raise exception 'Você não tem permissão para gerar o contrato.';
  end if;

  if p_condicoes_revisao is null or p_condicoes_revisao < 1 then
    raise exception 'Não foi possível identificar a versão das condições aprovadas. Recarregue a tela e gere o contrato novamente.';
  end if;

  if p_modalidade not in ('pontual', 'mensalidade') then
    raise exception 'Modalidade do contrato inválida.';
  end if;

  if nullif(trim(coalesce(p_storage_path, '')), '') is null
    or nullif(trim(coalesce(p_arquivo_nome, '')), '') is null
    or p_data_contrato is null then
    raise exception 'O arquivo do contrato está incompleto.';
  end if;

  select a.orcamento_id
    into v_orcamento_id
  from public.orcamento_aprovacoes a
  where a.id = p_aprovacao_id;

  if v_orcamento_id is null then
    raise exception 'Aprovação não encontrada.';
  end if;

  if v_orcamento_id is distinct from p_orcamento_id then
    raise exception 'O contrato não corresponde ao orçamento aprovado.';
  end if;

  perform 1
  from public.orcamentos
  where id = v_orcamento_id
  for update;

  select
    a.condicoes_revisao,
    coalesce(a.contrato_assinado, false),
    o.status
  into v_rev, v_assinado, v_status
  from public.orcamento_aprovacoes a
  join public.orcamentos o on o.id = a.orcamento_id
  where a.id = p_aprovacao_id
  for update of a;

  if not found then
    raise exception 'Aprovação não encontrada.';
  end if;

  if v_assinado then
    raise exception 'Contrato assinado. O PDF não pode ser substituído.';
  end if;

  if v_status is distinct from 'aprovado' then
    raise exception 'Só é possível gerar o contrato de um orçamento aprovado.';
  end if;

  if v_rev is distinct from p_condicoes_revisao then
    raise exception 'As condições aprovadas mudaram durante a geração. O PDF não foi armazenado e o contrato anterior permanece desatualizado. Gere novamente a partir das condições vigentes.';
  end if;

  select coalesce(max(d.versao), 0) + 1
    into v_versao
  from public.orcamento_contrato_documentos d
  where d.aprovacao_id = p_aprovacao_id;

  insert into public.orcamento_contrato_documentos (
    orcamento_id,
    aprovacao_id,
    cliente_id,
    modalidade,
    data_contrato,
    versao,
    storage_path,
    arquivo_nome,
    arquivo_tipo,
    arquivo_tamanho,
    gerado_por,
    gerado_por_user_id,
    condicoes_revisao,
    desatualizado_em
  ) values (
    p_orcamento_id,
    p_aprovacao_id,
    p_cliente_id,
    p_modalidade,
    p_data_contrato,
    v_versao,
    trim(p_storage_path),
    trim(p_arquivo_nome),
    nullif(trim(coalesce(p_arquivo_tipo, '')), ''),
    p_arquivo_tamanho,
    nullif(trim(coalesce(p_gerado_por, '')), ''),
    p_gerado_por_user_id,
    p_condicoes_revisao,
    null
  )
  returning * into v_row;

  return v_row;
end;
$$;

comment on function public.registrar_contrato_documento_gerado(
  uuid, bigint, uuid, uuid, text, date, text, text, text, integer, text, uuid
) is
  'Grava uma nova versão do PDF somente se a revisão das condições travada na aprovação ainda for a usada para montar o documento.';

revoke all on function public.trg_aprovacao_condicoes_revisao() from public;
revoke all on function public.trg_aprovacao_condicoes_revisao() from anon;
grant execute on function public.trg_aprovacao_condicoes_revisao() to authenticated;
grant execute on function public.trg_aprovacao_condicoes_revisao() to service_role;

revoke all on function public.registrar_contrato_documento_gerado(
  uuid, bigint, uuid, uuid, text, date, text, text, text, integer, text, uuid
) from public;
revoke all on function public.registrar_contrato_documento_gerado(
  uuid, bigint, uuid, uuid, text, date, text, text, text, integer, text, uuid
) from anon;
grant execute on function public.registrar_contrato_documento_gerado(
  uuid, bigint, uuid, uuid, text, date, text, text, text, integer, text, uuid
) to authenticated;
grant execute on function public.registrar_contrato_documento_gerado(
  uuid, bigint, uuid, uuid, text, date, text, text, text, integer, text, uuid
) to service_role;
