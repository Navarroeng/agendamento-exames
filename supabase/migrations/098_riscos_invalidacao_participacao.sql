-- Invalidação administrativa de participação concluída (sem apagar respostas).
-- Sessões órfãs (participante removido antes desta regra) saem dos resultados.

-- 1) Campos de validade na sessão anônima
alter table public.riscos_avaliacao_sessoes
  add column if not exists valida boolean not null default true;

alter table public.riscos_avaliacao_sessoes
  add column if not exists invalidada_em timestamptz null;

alter table public.riscos_avaliacao_sessoes
  add column if not exists invalidada_por text null;

alter table public.riscos_avaliacao_sessoes
  add column if not exists motivo_invalidacao text null;

comment on column public.riscos_avaliacao_sessoes.valida is
  'false = participação invalidada administrativamente; preserva respostas, fora dos resultados.';
comment on column public.riscos_avaliacao_sessoes.invalidada_em is
  'Momento da invalidação administrativa.';
comment on column public.riscos_avaliacao_sessoes.invalidada_por is
  'Identificador do usuário administrativo que invalidou (sem PII das respostas).';
comment on column public.riscos_avaliacao_sessoes.motivo_invalidacao is
  'Motivo textual da invalidação (sem conteúdo das respostas).';

create index if not exists idx_riscos_avaliacao_sessoes_campanha_validas
  on public.riscos_avaliacao_sessoes (campanha_id, status, valida)
  where status = 'concluida' and valida = true;

-- 2) Status administrativo "invalidado" no participante (rastreabilidade)
alter table public.riscos_campanha_participantes
  drop constraint if exists riscos_campanha_participantes_status_check;

alter table public.riscos_campanha_participantes
  add constraint riscos_campanha_participantes_status_check
  check (status in ('pendente', 'respondido', 'invalidado'));

comment on column public.riscos_campanha_participantes.status is
  'pendente | respondido | invalidado';

-- 3) Backfill: sessões concluídas sem vínculo (participante já removido)
update public.riscos_avaliacao_sessoes s
set
  valida = false,
  invalidada_em = coalesce(s.invalidada_em, now()),
  invalidada_por = coalesce(s.invalidada_por, 'sistema'),
  motivo_invalidacao = coalesce(
    s.motivo_invalidacao,
    'Sessão órfã: participante removido antes da regra de invalidação administrativa.'
  )
where s.status = 'concluida'
  and s.valida = true
  and not exists (
    select 1
    from public.riscos_avaliacao_vinculos v
    where v.sessao_id = s.id
  );
