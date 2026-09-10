-- 118: Anexos individuais de PGR / PCMSO / LTCAT em Laudos SST.
-- Bucket privado + metadados por tipo de laudo em orcamento_laudos_sst.
-- Não altera regra de conclusão da etapa (continua Sim + data + enviado Pedro).

alter table public.orcamento_laudos_sst
  add column if not exists pgr_anexo_path text null,
  add column if not exists pgr_anexo_nome text null,
  add column if not exists pgr_anexo_tipo text null,
  add column if not exists pgr_anexo_tamanho bigint null,
  add column if not exists pcmso_anexo_path text null,
  add column if not exists pcmso_anexo_nome text null,
  add column if not exists pcmso_anexo_tipo text null,
  add column if not exists pcmso_anexo_tamanho bigint null,
  add column if not exists ltcat_anexo_path text null,
  add column if not exists ltcat_anexo_nome text null,
  add column if not exists ltcat_anexo_tipo text null,
  add column if not exists ltcat_anexo_tamanho bigint null;

comment on column public.orcamento_laudos_sst.pgr_anexo_path is
  'Caminho do anexo PGR no bucket laudos-sst-anexos.';
comment on column public.orcamento_laudos_sst.pcmso_anexo_path is
  'Caminho do anexo PCMSO no bucket laudos-sst-anexos.';
comment on column public.orcamento_laudos_sst.ltcat_anexo_path is
  'Caminho do anexo LTCAT no bucket laudos-sst-anexos.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'laudos-sst-anexos',
  'laudos-sst-anexos',
  false,
  10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Staff-only (mesmo padrão de 109_rls_staff_user.sql).
-- Pasta raiz = orcamento_id (uuid).

drop policy if exists "authenticated_select_laudos_sst_anexos" on storage.objects;
create policy "authenticated_select_laudos_sst_anexos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'laudos-sst-anexos'
    and public.is_staff_user()
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );

drop policy if exists "authenticated_insert_laudos_sst_anexos" on storage.objects;
create policy "authenticated_insert_laudos_sst_anexos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'laudos-sst-anexos'
    and public.is_staff_user()
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );

drop policy if exists "authenticated_update_laudos_sst_anexos" on storage.objects;
create policy "authenticated_update_laudos_sst_anexos"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'laudos-sst-anexos'
    and public.is_staff_user()
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  )
  with check (
    bucket_id = 'laudos-sst-anexos'
    and public.is_staff_user()
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );

drop policy if exists "authenticated_delete_laudos_sst_anexos" on storage.objects;
create policy "authenticated_delete_laudos_sst_anexos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'laudos-sst-anexos'
    and public.is_staff_user()
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );
