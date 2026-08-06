-- Preview (somente leitura): clientes candidatos à restauração do bloqueio manual.
-- Critério: último evento = bloqueio, sem liberação manual posterior,
-- e ainda não marcado como agendamento_bloqueio_manual = true
-- (ou ainda aparece como disponível para agendamento).

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
    coalesce(c.nome, b.registro_nome) as cliente_nome,
    c.cnpj,
    b.created_at as ultimo_bloqueio_em,
    b.usuario_nome as ultimo_bloqueio_por,
    c.disponivel_agendamento,
    c.agendamento_bloqueio_manual
  from bloqueios b
  left join public.clientes c on c.id = b.registro_id
  where not exists (
    select 1
    from public.auditoria_sistema l
    where l.acao = 'agendamento_cliente_liberado'
      and l.registro_id = b.registro_id
      and l.created_at > b.created_at
  )
)
select *
from candidatos
where
  coalesce(agendamento_bloqueio_manual, false) is distinct from true
  or coalesce(disponivel_agendamento, true) is distinct from false
order by ultimo_bloqueio_em desc;
