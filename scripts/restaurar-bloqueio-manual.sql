-- Restauração do bloqueio manual (executar SOMENTE após revisar o preview).
-- Pré-requisito: migration 076 já aplicada (colunas + função).

with bloqueios as (
  select distinct on (registro_id)
    registro_id,
    registro_nome,
    created_at,
    usuario_nome
  from public.auditoria_sistema
  where acao = 'agendamento_cliente_bloqueado'
    and registro_id is not null
  order by registro_id, created_at desc
),
candidatos as (
  select
    b.registro_id as cliente_id,
    b.registro_nome,
    b.created_at as bloqueado_em,
    b.usuario_nome as bloqueado_por,
    c.disponivel_agendamento as disponivel_antes,
    c.agendamento_bloqueio_manual as manual_antes
  from bloqueios b
  inner join public.clientes c on c.id = b.registro_id
  where not exists (
    select 1
    from public.auditoria_sistema l
    where l.acao = 'agendamento_cliente_liberado'
      and l.registro_id = b.registro_id
      and l.created_at > b.created_at
  )
),
atualizados as (
  update public.clientes c
  set
    agendamento_bloqueio_manual = true,
    disponivel_agendamento = false,
    agendamento_bloqueado_em = coalesce(c.agendamento_bloqueado_em, cand.bloqueado_em),
    agendamento_bloqueado_por = coalesce(
      nullif(trim(c.agendamento_bloqueado_por), ''),
      nullif(trim(cand.bloqueado_por), ''),
      'Admin'
    ),
    agendamento_bloqueio_motivo = coalesce(
      nullif(trim(c.agendamento_bloqueio_motivo), ''),
      'Bloqueio manual restaurado após identificação de sobrescrita automática.'
    )
  from candidatos cand
  where c.id = cand.cliente_id
    and (
      c.agendamento_bloqueio_manual is distinct from true
      or c.disponivel_agendamento is distinct from false
    )
  returning
    c.id,
    c.nome,
    cand.disponivel_antes,
    cand.manual_antes,
    cand.bloqueado_em,
    cand.bloqueado_por
)
insert into public.auditoria_sistema (
  usuario_id,
  usuario_nome,
  usuario_email,
  modulo,
  acao,
  registro_id,
  registro_nome,
  descricao,
  dados_antes,
  dados_depois
)
select
  null,
  'Sistema',
  'sistema@correcao.local',
  'clientes',
  'agendamento_cliente_bloqueio_restaurado',
  a.id,
  a.nome,
  'Bloqueio manual restaurado após identificação de sobrescrita automática.',
  jsonb_build_object(
    'disponivel_agendamento', a.disponivel_antes,
    'agendamento_bloqueio_manual', a.manual_antes,
    'ultimo_bloqueio_em', a.bloqueado_em,
    'ultimo_bloqueio_por', a.bloqueado_por
  ),
  jsonb_build_object(
    'disponivel_agendamento', false,
    'agendamento_bloqueio_manual', true,
    'agendamento_bloqueio_motivo',
      'Bloqueio manual restaurado após identificação de sobrescrita automática.'
  )
from atualizados a
returning registro_id, registro_nome;
