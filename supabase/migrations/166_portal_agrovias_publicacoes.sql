-- 166: PDFs que a Navarro publica manualmente para o portal externo da AGROVIAS.
-- Documentos de SST têm uma versão vigente por tipo e conservam o histórico.
-- ASOs finais só entram no portal quando publicados e vinculados a um agendamento
-- já existente. Prontuário e resultado clínico não são gravados aqui.

create table if not exists public.gestao_plataforma_documentos_sst (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id),
  tipo text not null check (tipo in ('pgr', 'ltcat', 'pcmso', 'riscos_psicossociais')),
  arquivo_path text not null,
  arquivo_nome text not null,
  publicado_em timestamptz not null default now(),
  publicado_por uuid null,
  vigente boolean not null default true
);

create unique index if not exists gestao_plataforma_documentos_sst_vigente
  on public.gestao_plataforma_documentos_sst (cliente_id, tipo)
  where vigente;

create table if not exists public.gestao_plataforma_asos_publicados (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id),
  agendamento_id uuid not null references public.agendamentos (id),
  arquivo_path text not null,
  arquivo_nome text not null,
  publicado_em timestamptz not null default now(),
  publicado_por uuid null
);

create index if not exists gestao_plataforma_asos_publicados_agendamento
  on public.gestao_plataforma_asos_publicados (agendamento_id);

alter table public.gestao_plataforma_documentos_sst enable row level security;
alter table public.gestao_plataforma_asos_publicados enable row level security;

do $$
declare
  tabela text;
begin
  foreach tabela in array array[
    'gestao_plataforma_documentos_sst',
    'gestao_plataforma_asos_publicados'
  ]
  loop
    execute format('drop policy if exists staff_select_%1$s on public.%1$s', tabela);
    execute format('drop policy if exists staff_insert_%1$s on public.%1$s', tabela);
    execute format('drop policy if exists staff_update_%1$s on public.%1$s', tabela);
    execute format(
      'create policy staff_select_%1$s on public.%1$s for select to authenticated using (public.is_staff_user() and cliente_id = public.cliente_gestao_plataformas_id())',
      tabela
    );
    execute format(
      'create policy staff_insert_%1$s on public.%1$s for insert to authenticated with check (public.is_staff_user() and cliente_id = public.cliente_gestao_plataformas_id())',
      tabela
    );
    execute format(
      'create policy staff_update_%1$s on public.%1$s for update to authenticated using (public.is_staff_user() and cliente_id = public.cliente_gestao_plataformas_id()) with check (public.is_staff_user() and cliente_id = public.cliente_gestao_plataformas_id())',
      tabela
    );
    execute format('grant select, insert, update on table public.%1$s to authenticated, service_role', tabela);
  end loop;
end $$;

comment on table public.gestao_plataforma_documentos_sst is
  'PDFs de PGR, LTCAT, PCMSO e relatório de riscos psicossociais publicados para o portal da AGROVIAS. A vigente é a última publicação do tipo.';
comment on table public.gestao_plataforma_asos_publicados is
  'ASO final autorizado para o cliente, sempre ligado a um agendamento já lançado.';
