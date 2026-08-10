-- Auditoria do Portal do Colaborador (pesquisa psicossocial).
-- Isolada da auditoria operacional e NÃO exibida para gestores da empresa.

create table if not exists public.riscos_portal_auditoria (
  id uuid primary key default gen_random_uuid(),
  campanha_id uuid null
    references public.riscos_campanhas (id) on delete set null,
  participante_id uuid null
    references public.riscos_campanha_participantes (id) on delete set null,
  codigo_publico text null,
  evento text not null
    check (
      evento in (
        'primeiro_acesso',
        'inicio_pesquisa',
        'conclusao',
        'tentativa_apos_conclusao',
        'tentativa_apos_encerramento'
      )
    ),
  detalhes jsonb null,
  ip text null,
  created_at timestamptz not null default now()
);

comment on table public.riscos_portal_auditoria is
  'Trilha de auditoria do Portal do Colaborador. Uso interno do sistema; não aparece para gestores da empresa.';

create index if not exists idx_riscos_portal_auditoria_campanha_created
  on public.riscos_portal_auditoria (campanha_id, created_at desc);

create index if not exists idx_riscos_portal_auditoria_evento_created
  on public.riscos_portal_auditoria (evento, created_at desc);

alter table public.riscos_portal_auditoria enable row level security;

-- Sem policies para authenticated/anon: apenas service role (API) acessa.
