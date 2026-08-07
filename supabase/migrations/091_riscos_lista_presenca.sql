-- Lista de Presença (Riscos Psicossociais): solicitação, recebimento e anexo.

alter table public.orcamento_riscos_psicossociais
  add column if not exists lista_solicitada boolean not null default false,
  add column if not exists lista_solicitada_em date null,
  add column if not exists lista_solicitada_email text null,
  add column if not exists lista_solicitada_por text null,
  add column if not exists lista_solicitada_registrado_em timestamptz null,
  add column if not exists lista_recebida boolean not null default false,
  add column if not exists lista_anexo_path text null,
  add column if not exists lista_anexo_nome text null,
  add column if not exists lista_anexo_tipo text null,
  add column if not exists lista_anexo_tamanho integer null,
  add column if not exists lista_recebida_em timestamptz null,
  add column if not exists lista_recebida_por text null;

comment on column public.orcamento_riscos_psicossociais.lista_solicitada is
  'Se a lista de presença foi solicitada ao cliente.';
comment on column public.orcamento_riscos_psicossociais.lista_solicitada_em is
  'Data informada da solicitação da lista.';
comment on column public.orcamento_riscos_psicossociais.lista_solicitada_email is
  'E-mail do cliente usado na solicitação.';
comment on column public.orcamento_riscos_psicossociais.lista_recebida is
  'Se o cliente enviou a lista e o arquivo foi anexado.';
comment on column public.orcamento_riscos_psicossociais.lista_anexo_path is
  'Path do anexo atual no Storage (bucket riscos-psicossociais).';

-- Histórico de anexos (não apaga silenciosamente ao remover/substituir)
create table if not exists public.orcamento_riscos_lista_presenca_anexos_hist (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null
    references public.orcamentos (id) on delete cascade,
  acao text not null
    check (acao in ('anexado', 'substituido', 'removido')),
  anexo_path text null,
  anexo_nome text null,
  anexo_tipo text null,
  anexo_tamanho integer null,
  usuario_nome text not null,
  criado_em timestamptz not null default now()
);

create index if not exists idx_riscos_lista_anexos_hist_orcamento
  on public.orcamento_riscos_lista_presenca_anexos_hist (orcamento_id, criado_em desc);

comment on table public.orcamento_riscos_lista_presenca_anexos_hist is
  'Histórico de anexos da lista de presença (anexar/substituir/remover).';

alter table public.orcamento_riscos_lista_presenca_anexos_hist enable row level security;

drop policy if exists "authenticated_select_riscos_lista_anexos_hist"
  on public.orcamento_riscos_lista_presenca_anexos_hist;
drop policy if exists "authenticated_insert_riscos_lista_anexos_hist"
  on public.orcamento_riscos_lista_presenca_anexos_hist;

create policy "authenticated_select_riscos_lista_anexos_hist"
  on public.orcamento_riscos_lista_presenca_anexos_hist
  for select to authenticated
  using (true);

create policy "authenticated_insert_riscos_lista_anexos_hist"
  on public.orcamento_riscos_lista_presenca_anexos_hist
  for insert to authenticated
  with check (true);

-- Storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'riscos-psicossociais',
  'riscos-psicossociais',
  false,
  10485760,
  array[
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "riscos_psicossociais_auth_select" on storage.objects;
drop policy if exists "riscos_psicossociais_auth_insert" on storage.objects;
drop policy if exists "riscos_psicossociais_auth_update" on storage.objects;
drop policy if exists "riscos_psicossociais_auth_delete" on storage.objects;

create policy "riscos_psicossociais_auth_select"
  on storage.objects for select to authenticated
  using (bucket_id = 'riscos-psicossociais');

create policy "riscos_psicossociais_auth_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'riscos-psicossociais');

create policy "riscos_psicossociais_auth_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'riscos-psicossociais')
  with check (bucket_id = 'riscos-psicossociais');

create policy "riscos_psicossociais_auth_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'riscos-psicossociais');
