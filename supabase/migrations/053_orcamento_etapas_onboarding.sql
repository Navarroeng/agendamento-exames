-- Etapas pós-aprovação: procuração, lista funcionários, logo, visita técnica

alter table public.orcamento_aprovacoes
  add column if not exists procuracao_status text not null default 'inativa',
  add column if not exists observacao_procuracao text null,
  add column if not exists procuracao_salva_em timestamptz null,
  add column if not exists funcionarios_lista_path text null,
  add column if not exists funcionarios_lista_nome text null,
  add column if not exists funcionarios_lista_tipo text null,
  add column if not exists funcionarios_lista_tamanho integer null
    check (
      funcionarios_lista_tamanho is null or funcionarios_lista_tamanho > 0
    ),
  add column if not exists funcionarios_lista_salva_em timestamptz null,
  add column if not exists logo_path text null,
  add column if not exists logo_nome text null,
  add column if not exists logo_tipo text null,
  add column if not exists logo_tamanho integer null
    check (logo_tamanho is null or logo_tamanho > 0),
  add column if not exists logo_salva_em timestamptz null,
  add column if not exists visita_tecnica_necessaria boolean null,
  add column if not exists visita_tecnica_data date null,
  add column if not exists visita_tecnica_endereco text null,
  add column if not exists visita_tecnica_observacoes text null,
  add column if not exists visita_tecnica_salva_em timestamptz null,
  add column if not exists contrato_salvo_em timestamptz null,
  add column if not exists financeiro_salvo_em timestamptz null;

alter table public.orcamento_aprovacoes
  drop constraint if exists orcamento_aprovacoes_procuracao_status_check;

alter table public.orcamento_aprovacoes
  add constraint orcamento_aprovacoes_procuracao_status_check
  check (procuracao_status in ('ativa', 'inativa'));

comment on column public.orcamento_aprovacoes.procuracao_status is
  'Status da procuração na etapa comercial (ativa|inativa)';
comment on column public.orcamento_aprovacoes.contrato_salvo_em is
  'Marca conclusão da etapa Contrato após salvar';
comment on column public.orcamento_aprovacoes.financeiro_salvo_em is
  'Marca conclusão da etapa Financeiro após salvar';

-- Backfill: contrato/financeiro já avançados
update public.orcamento_aprovacoes
set contrato_salvo_em = coalesce(contrato_salvo_em, contrato_assinado_em::timestamptz, aprovado_em, updated_at)
where contrato_assinado = true
  and contrato_salvo_em is null;

update public.orcamento_aprovacoes
set financeiro_salvo_em = coalesce(
  financeiro_salvo_em,
  pagamento_confirmado_em,
  case when boleto_pago then coalesce(updated_at, aprovado_em) else null end
)
where boleto_pago = true
  and financeiro_salvo_em is null;

-- Storage onboarding
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'orcamentos-onboarding',
  'orcamentos-onboarding',
  false,
  10485760,
  array[
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'image/jpeg',
    'image/png',
    'image/svg+xml'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "orcamentos_onboarding_auth_select" on storage.objects;
drop policy if exists "orcamentos_onboarding_auth_insert" on storage.objects;
drop policy if exists "orcamentos_onboarding_auth_update" on storage.objects;
drop policy if exists "orcamentos_onboarding_auth_delete" on storage.objects;

create policy "orcamentos_onboarding_auth_select"
  on storage.objects for select to authenticated
  using (bucket_id = 'orcamentos-onboarding');

create policy "orcamentos_onboarding_auth_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'orcamentos-onboarding');

create policy "orcamentos_onboarding_auth_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'orcamentos-onboarding')
  with check (bucket_id = 'orcamentos-onboarding');

create policy "orcamentos_onboarding_auth_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'orcamentos-onboarding');
