-- Remoção lógica de participantes (soft delete) + elegibilidade para consolidação.
-- Preserva histórico técnico; libera re-cadastro do mesmo CPF na mesma campanha.

-- 1) Campos de remoção lógica
alter table public.riscos_campanha_participantes
  add column if not exists removido_em timestamptz null;

alter table public.riscos_campanha_participantes
  add column if not exists removido_por text null;

alter table public.riscos_campanha_participantes
  add column if not exists motivo_remocao text null;

comment on column public.riscos_campanha_participantes.removido_em is
  'Soft delete: quando preenchido, participante não é apto e não aparece na lista ativa.';
comment on column public.riscos_campanha_participantes.removido_por is
  'Usuário administrativo que removeu (id ou nome).';
comment on column public.riscos_campanha_participantes.motivo_remocao is
  'Motivo textual da remoção (sem conteúdo das respostas).';

-- 2) Status incluiidos / removido
alter table public.riscos_campanha_participantes
  drop constraint if exists riscos_campanha_participantes_status_check;

alter table public.riscos_campanha_participantes
  add constraint riscos_campanha_participantes_status_check
  check (status in ('pendente', 'respondido', 'invalidado', 'removido'));

comment on column public.riscos_campanha_participantes.status is
  'pendente | respondido | invalidado (legado) | removido';

-- 3) Unicidade CPF por campanha apenas entre ativos
alter table public.riscos_campanha_participantes
  drop constraint if exists riscos_campanha_participantes_cpf_campanha_unico;

create unique index if not exists idx_riscos_participantes_campanha_cpf_ativo
  on public.riscos_campanha_participantes (campanha_id, cpf)
  where removido_em is null;

create index if not exists idx_riscos_participantes_campanha_ativos
  on public.riscos_campanha_participantes (campanha_id, created_at desc)
  where removido_em is null;

-- 4) Garantir colunas de validade na sessão (idempotente com 098)
alter table public.riscos_avaliacao_sessoes
  add column if not exists valida boolean not null default true;

alter table public.riscos_avaliacao_sessoes
  add column if not exists invalidada_em timestamptz null;

alter table public.riscos_avaliacao_sessoes
  add column if not exists invalidada_por text null;

alter table public.riscos_avaliacao_sessoes
  add column if not exists motivo_invalidacao text null;

-- 5) Backfill: invalidado → removido (caso Wanderlei e similares)
update public.riscos_campanha_participantes p
set
  status = 'removido',
  removido_em = coalesce(p.removido_em, now()),
  removido_por = coalesce(p.removido_por, 'sistema'),
  motivo_remocao = coalesce(
    p.motivo_remocao,
    'Migração: participação invalidada convertida em remoção lógica.'
  )
where p.status = 'invalidado'
  and p.removido_em is null;

-- 6) Sessões dos removidos/invalidados saem dos resultados
update public.riscos_avaliacao_sessoes s
set
  valida = false,
  invalidada_em = coalesce(s.invalidada_em, now()),
  invalidada_por = coalesce(s.invalidada_por, 'sistema'),
  motivo_invalidacao = coalesce(
    s.motivo_invalidacao,
    'Participação removida administrativamente; respostas preservadas fora da consolidação.'
  )
where s.valida = true
  and exists (
    select 1
    from public.riscos_avaliacao_vinculos v
    join public.riscos_campanha_participantes p on p.id = v.participante_id
    where v.sessao_id = s.id
      and (
        p.removido_em is not null
        or p.status in ('removido', 'invalidado')
      )
  );

-- 7) Órfãs concluídas sem vínculo
update public.riscos_avaliacao_sessoes s
set
  valida = false,
  invalidada_em = coalesce(s.invalidada_em, now()),
  invalidada_por = coalesce(s.invalidada_por, 'sistema'),
  motivo_invalidacao = coalesce(
    s.motivo_invalidacao,
    'Sessão órfã: participante removido; fora da consolidação.'
  )
where s.status = 'concluida'
  and s.valida = true
  and not exists (
    select 1 from public.riscos_avaliacao_vinculos v where v.sessao_id = s.id
  );
