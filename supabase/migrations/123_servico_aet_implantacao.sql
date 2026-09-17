-- 123: Serviço pontual "Laudo AET – Análise Ergonômica do Trabalho"
-- + fluxo próprio de implantação. Sem terceira modalidade.
-- quantidade_colaboradores passa a aceitar 0 (AET não usa colaboradores).

insert into public.servicos_sst (nome, ordem, ativo, itens_inclusos)
values (
  'Laudo AET – Análise Ergonômica do Trabalho',
  10,
  true,
  jsonb_build_array(
    'Visita técnica para avaliação das atividades e postos de trabalho.',
    'Levantamento das condições de trabalho e organização das atividades.',
    'Análise dos fatores de risco ergonômico relacionados às funções avaliadas.',
    'Avaliação das exigências físicas, cognitivas e organizacionais das atividades, quando aplicáveis.',
    'Registro das condições observadas durante a avaliação.',
    'Elaboração do Laudo AET – Análise Ergonômica do Trabalho.',
    'Recomendações técnicas para prevenção, adequação e melhoria das condições ergonômicas, quando aplicáveis.',
    'Entrega do documento final em formato digital.'
  )
)
on conflict (nome) do update
set
  ativo = excluded.ativo,
  itens_inclusos = excluded.itens_inclusos;

alter table public.orcamento_aprovacoes
  drop constraint if exists orcamento_aprovacoes_quantidade_colaboradores_check;

alter table public.orcamento_aprovacoes
  add constraint orcamento_aprovacoes_quantidade_colaboradores_check
  check (quantidade_colaboradores >= 0);

comment on column public.orcamento_aprovacoes.quantidade_colaboradores is
  'Quantidade de colaboradores do SST. 0 = não aplicável (ex.: Laudo AET).';

create table if not exists public.implantacao_aet (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references public.orcamentos (id) on delete cascade,
  aprovacao_id uuid not null unique references public.orcamento_aprovacoes (id) on delete cascade,
  documentos_conferidos boolean not null default false,
  documentos_conferidos_em timestamptz null,
  documentos_conferidos_por text null,
  visita_status text not null default 'aguardando_agendamento'
    check (
      visita_status in ('aguardando_agendamento', 'agendada', 'realizada')
    ),
  visita_data date null,
  visita_horario text null,
  visita_responsavel text null,
  visita_observacao text null,
  visita_realizada_em timestamptz null,
  elaboracao_status text not null default 'aguardando'
    check (
      elaboracao_status in ('aguardando', 'em_elaboracao', 'concluido')
    ),
  elaboracao_observacao text null,
  elaboracao_concluida_em timestamptz null,
  laudo_path text null,
  laudo_nome text null,
  laudo_tipo text null,
  laudo_tamanho integer null
    check (laudo_tamanho is null or laudo_tamanho > 0),
  enviado_cliente boolean not null default false,
  enviado_em date null,
  envio_observacao text null,
  criado_em timestamptz not null default now(),
  criado_por text null,
  atualizado_em timestamptz not null default now(),
  atualizado_por text null
);

create index if not exists idx_implantacao_aet_orcamento
  on public.implantacao_aet (orcamento_id);

create table if not exists public.implantacao_aet_documentos (
  id uuid primary key default gen_random_uuid(),
  aet_id uuid not null references public.implantacao_aet (id) on delete cascade,
  storage_path text not null,
  arquivo_nome text not null,
  arquivo_tipo text null,
  arquivo_tamanho integer null
    check (arquivo_tamanho is null or arquivo_tamanho > 0),
  enviado_em timestamptz not null default now(),
  enviado_por text null,
  enviado_por_user_id uuid null
);

create index if not exists idx_implantacao_aet_documentos_aet
  on public.implantacao_aet_documentos (aet_id, enviado_em desc);

comment on table public.implantacao_aet is
  'Acompanhamento operacional do Laudo AET na implantação (visita, elaboração, envio).';
comment on table public.implantacao_aet_documentos is
  'Documentos da empresa anexados para elaboração do AET.';

alter table public.implantacao_aet enable row level security;
alter table public.implantacao_aet_documentos enable row level security;

drop policy if exists "staff_select_implantacao_aet" on public.implantacao_aet;
drop policy if exists "staff_insert_implantacao_aet" on public.implantacao_aet;
drop policy if exists "staff_update_implantacao_aet" on public.implantacao_aet;
drop policy if exists "staff_select_implantacao_aet_documentos"
  on public.implantacao_aet_documentos;
drop policy if exists "staff_insert_implantacao_aet_documentos"
  on public.implantacao_aet_documentos;
drop policy if exists "staff_delete_implantacao_aet_documentos"
  on public.implantacao_aet_documentos;

create policy "staff_select_implantacao_aet"
  on public.implantacao_aet for select to authenticated
  using (public.is_staff_user());
create policy "staff_insert_implantacao_aet"
  on public.implantacao_aet for insert to authenticated
  with check (public.is_staff_user());
create policy "staff_update_implantacao_aet"
  on public.implantacao_aet for update to authenticated
  using (public.is_staff_user())
  with check (public.is_staff_user());

create policy "staff_select_implantacao_aet_documentos"
  on public.implantacao_aet_documentos for select to authenticated
  using (public.is_staff_user());
create policy "staff_insert_implantacao_aet_documentos"
  on public.implantacao_aet_documentos for insert to authenticated
  with check (public.is_staff_user());
create policy "staff_delete_implantacao_aet_documentos"
  on public.implantacao_aet_documentos for delete to authenticated
  using (public.is_staff_user());

grant select, insert, update on table public.implantacao_aet to authenticated;
grant select, insert, delete on table public.implantacao_aet_documentos to authenticated;
grant select, insert, update on table public.implantacao_aet to service_role;
grant select, insert, delete on table public.implantacao_aet_documentos to service_role;
