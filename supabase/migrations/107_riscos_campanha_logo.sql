-- Logo da campanha de Riscos Psicossociais (isolado do cadastro da empresa).

alter table public.riscos_campanhas
  add column if not exists logo_url text null,
  add column if not exists logo_storage_path text null,
  add column if not exists logo_origem text null,
  add column if not exists logo_nome text null,
  add column if not exists logo_tipo text null,
  add column if not exists logo_tamanho integer null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'riscos_campanhas_logo_origem_check'
  ) then
    alter table public.riscos_campanhas
      add constraint riscos_campanhas_logo_origem_check
      check (
        logo_origem is null
        or logo_origem in ('empresa', 'campanha', 'manual')
      );
  end if;
end $$;

comment on column public.riscos_campanhas.logo_url is
  'URL pública opcional do logo da campanha (em geral null; preferir signed URL a partir de logo_storage_path).';
comment on column public.riscos_campanhas.logo_storage_path is
  'Path do logo no Storage (bucket riscos-psicossociais). Isolado do logo oficial da empresa.';
comment on column public.riscos_campanhas.logo_origem is
  'empresa = pré-carregado do cadastro/onboarding; campanha = substituído na campanha; manual = anexado sem origem empresa.';
comment on column public.riscos_campanhas.logo_nome is
  'Nome original do arquivo do logo da campanha.';

-- Permitir SVG (e reforçar imagens) no bucket usado pelos anexos de Riscos.
update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/svg+xml',
  'image/webp'
]
where id = 'riscos-psicossociais';
