-- Status ASO Retido: anexo, observação e metadados da retenção.

alter table public.agendamentos
  add column if not exists aso_retido_anexo_path text null,
  add column if not exists aso_retido_anexo_nome text null,
  add column if not exists aso_retido_observacao text null,
  add column if not exists aso_retido_em timestamptz null,
  add column if not exists aso_retido_por text null;

comment on column public.agendamentos.aso_retido_anexo_path is
  'Caminho do anexo no bucket agendamentos-aso-retido (storage.objects.name).';
comment on column public.agendamentos.aso_retido_anexo_nome is
  'Nome original do arquivo anexado na retenção do ASO.';
comment on column public.agendamentos.aso_retido_observacao is
  'Motivo opcional informado ao marcar o agendamento como ASO Retido.';
comment on column public.agendamentos.aso_retido_em is
  'Data/hora em que o agendamento foi marcado como ASO Retido.';
comment on column public.agendamentos.aso_retido_por is
  'Usuário que marcou o agendamento como ASO Retido.';

-- Bucket privado para anexos de ASO Retido (PDF, imagens e documentos, até 5 MB).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'agendamentos-aso-retido',
  'agendamentos-aso-retido',
  false,
  5242880,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "authenticated_select_agendamentos_aso_retido" on storage.objects;
create policy "authenticated_select_agendamentos_aso_retido"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'agendamentos-aso-retido'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );

drop policy if exists "authenticated_insert_agendamentos_aso_retido" on storage.objects;
create policy "authenticated_insert_agendamentos_aso_retido"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'agendamentos-aso-retido'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );

drop policy if exists "authenticated_update_agendamentos_aso_retido" on storage.objects;
create policy "authenticated_update_agendamentos_aso_retido"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'agendamentos-aso-retido'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  )
  with check (
    bucket_id = 'agendamentos-aso-retido'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );

drop policy if exists "authenticated_delete_agendamentos_aso_retido" on storage.objects;
create policy "authenticated_delete_agendamentos_aso_retido"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'agendamentos-aso-retido'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );
