-- Documentos de contrato gerados na Implantação (versionados).
-- Reutiliza o bucket privado orcamentos-onboarding (signed URL).
-- Additive: não altera orcamento_aprovacoes nem o fluxo de enviado/assinado.

create table if not exists public.orcamento_contrato_documentos (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null
    references public.orcamentos (id) on delete cascade,
  aprovacao_id uuid not null
    references public.orcamento_aprovacoes (id) on delete cascade,
  cliente_id uuid null
    references public.clientes (id) on delete set null,
  modalidade text not null
    check (modalidade in ('pontual', 'mensalidade')),
  data_contrato date not null,
  versao integer not null check (versao >= 1),
  storage_path text not null,
  arquivo_nome text not null,
  arquivo_tipo text null,
  arquivo_tamanho integer null check (arquivo_tamanho is null or arquivo_tamanho > 0),
  gerado_por text null,
  gerado_por_user_id uuid null,
  gerado_em timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint orcamento_contrato_documentos_versao_unica
    unique (aprovacao_id, versao)
);

comment on table public.orcamento_contrato_documentos is
  'PDFs de contrato Navarro gerados a partir do orçamento aprovado. Regeneração cria nova versão; não sobrescreve.';

create index if not exists idx_orcamento_contrato_documentos_aprovacao
  on public.orcamento_contrato_documentos (aprovacao_id, versao desc);

create index if not exists idx_orcamento_contrato_documentos_orcamento
  on public.orcamento_contrato_documentos (orcamento_id, gerado_em desc);

alter table public.orcamento_contrato_documentos enable row level security;

drop policy if exists "staff_select_orcamento_contrato_documentos"
  on public.orcamento_contrato_documentos;
drop policy if exists "staff_insert_orcamento_contrato_documentos"
  on public.orcamento_contrato_documentos;

create policy "staff_select_orcamento_contrato_documentos"
  on public.orcamento_contrato_documentos
  for select to authenticated
  using (public.is_staff_user());

create policy "staff_insert_orcamento_contrato_documentos"
  on public.orcamento_contrato_documentos
  for insert to authenticated
  with check (public.is_staff_user());

grant select, insert on table public.orcamento_contrato_documentos to authenticated;
grant select, insert on table public.orcamento_contrato_documentos to service_role;
