-- Comprovante de pagamento obrigatório para faturas marcadas como pagas (status emitida).

alter table public.faturas
  add column if not exists comprovante_pagamento_path text null,
  add column if not exists comprovante_pagamento_nome text null;

comment on column public.faturas.comprovante_pagamento_path is
  'Caminho do arquivo no bucket faturas-comprovantes (storage.objects.name).';
comment on column public.faturas.comprovante_pagamento_nome is
  'Nome original do arquivo de comprovante enviado pelo usuário.';

create or replace function public.validate_fatura_pagamento_comprovante()
returns trigger
language plpgsql
as $$
begin
  if new.pago = true
     and new.status = 'emitida'
     and (
       new.comprovante_pagamento_path is null
       or btrim(new.comprovante_pagamento_path) = ''
     ) then
    raise exception 'comprovante_pagamento_obrigatorio'
      using hint = 'Anexe o comprovante de pagamento para confirmar.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_faturas_pagamento_comprovante on public.faturas;

create trigger trg_faturas_pagamento_comprovante
  before insert or update on public.faturas
  for each row
  execute function public.validate_fatura_pagamento_comprovante();

-- Bucket privado para comprovantes (PDF/JPG/JPEG/PNG, até 5 MB).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'faturas-comprovantes',
  'faturas-comprovantes',
  false,
  5242880,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Políticas de storage: usuários autenticados; path deve iniciar com UUID da fatura.
drop policy if exists "authenticated_select_faturas_comprovantes" on storage.objects;
create policy "authenticated_select_faturas_comprovantes"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'faturas-comprovantes'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );

drop policy if exists "authenticated_insert_faturas_comprovantes" on storage.objects;
create policy "authenticated_insert_faturas_comprovantes"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'faturas-comprovantes'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );

drop policy if exists "authenticated_update_faturas_comprovantes" on storage.objects;
create policy "authenticated_update_faturas_comprovantes"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'faturas-comprovantes'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  )
  with check (
    bucket_id = 'faturas-comprovantes'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );

drop policy if exists "authenticated_delete_faturas_comprovantes" on storage.objects;
create policy "authenticated_delete_faturas_comprovantes"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'faturas-comprovantes'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );
