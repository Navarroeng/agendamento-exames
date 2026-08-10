-- Persistência anônima das respostas COPSOQ II-Br.
-- Separação: identidade (participantes) ≠ vínculo técnico ≠ conteúdo (sessões/respostas).
-- A área administrativa NÃO deve juntar respostas com nome/CPF.

-- 1) Sessão anônima de respostas (sem PII)
create table if not exists public.riscos_avaliacao_sessoes (
  id uuid primary key default gen_random_uuid(),
  campanha_id uuid not null
    references public.riscos_campanhas (id) on delete cascade,
  identificador_anonimo text not null,
  status text not null default 'em_andamento'
    check (status in ('em_andamento', 'concluida')),
  iniciado_em timestamptz not null default now(),
  concluido_em timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint riscos_avaliacao_sessoes_anonimo_unico unique (identificador_anonimo)
);

comment on table public.riscos_avaliacao_sessoes is
  'Sessão anônima de respostas da pesquisa. Sem nome/CPF/participante_id.';
comment on column public.riscos_avaliacao_sessoes.identificador_anonimo is
  'Token técnico opaco da sessão (não identifica a pessoa).';

create index if not exists idx_riscos_avaliacao_sessoes_campanha_status
  on public.riscos_avaliacao_sessoes (campanha_id, status);

-- 2) Vínculo segregado (somente portal/API — nunca para resultados nominais)
create table if not exists public.riscos_avaliacao_vinculos (
  id uuid primary key default gen_random_uuid(),
  campanha_id uuid not null
    references public.riscos_campanhas (id) on delete cascade,
  participante_id uuid not null
    references public.riscos_campanha_participantes (id) on delete cascade,
  sessao_id uuid not null
    references public.riscos_avaliacao_sessoes (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint riscos_avaliacao_vinculos_participante_campanha_unico
    unique (campanha_id, participante_id),
  constraint riscos_avaliacao_vinculos_sessao_unica unique (sessao_id)
);

comment on table public.riscos_avaliacao_vinculos is
  'Vínculo técnico participante↔sessão para retomada e anti-duplicidade. Segregado; não usar em dashboards nominais.';

create index if not exists idx_riscos_avaliacao_vinculos_campanha
  on public.riscos_avaliacao_vinculos (campanha_id);

-- 3) Respostas (conteúdo) — sem PII
create table if not exists public.riscos_avaliacao_respostas (
  id uuid primary key default gen_random_uuid(),
  sessao_id uuid not null
    references public.riscos_avaliacao_sessoes (id) on delete cascade,
  campanha_id uuid not null
    references public.riscos_campanhas (id) on delete cascade,
  pergunta_id text not null,
  alternativa_id text not null,
  valor integer not null,
  fontes jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint riscos_avaliacao_respostas_sessao_pergunta_unica
    unique (sessao_id, pergunta_id)
);

comment on table public.riscos_avaliacao_respostas is
  'Respostas individuais do questionário. Sem nome/CPF/participante_id.';
comment on column public.riscos_avaliacao_respostas.valor is
  'Pontuação efetiva da alternativa (já considerando inversão quando aplicável).';
comment on column public.riscos_avaliacao_respostas.fontes is
  'IDs de fontes (follow-up de comportamentos ofensivos), quando aplicável.';

create index if not exists idx_riscos_avaliacao_respostas_campanha
  on public.riscos_avaliacao_respostas (campanha_id);

create index if not exists idx_riscos_avaliacao_respostas_sessao
  on public.riscos_avaliacao_respostas (sessao_id);

create or replace function public.set_riscos_avaliacao_sessoes_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_riscos_avaliacao_sessoes_updated_at
  on public.riscos_avaliacao_sessoes;
create trigger trg_riscos_avaliacao_sessoes_updated_at
  before update on public.riscos_avaliacao_sessoes
  for each row
  execute function public.set_riscos_avaliacao_sessoes_updated_at();

create or replace function public.set_riscos_avaliacao_respostas_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_riscos_avaliacao_respostas_updated_at
  on public.riscos_avaliacao_respostas;
create trigger trg_riscos_avaliacao_respostas_updated_at
  before update on public.riscos_avaliacao_respostas
  for each row
  execute function public.set_riscos_avaliacao_respostas_updated_at();

-- RLS: sem policies para authenticated/anon → somente service role (API).
alter table public.riscos_avaliacao_sessoes enable row level security;
alter table public.riscos_avaliacao_vinculos enable row level security;
alter table public.riscos_avaliacao_respostas enable row level security;
