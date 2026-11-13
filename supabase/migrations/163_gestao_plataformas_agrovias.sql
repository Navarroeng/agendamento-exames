-- 163: Gestão de Plataformas da AGROVIAS (ORC-2026-0087).
-- Habilitação pelo cliente e pelo orçamento internos, não pelo nome do serviço.
-- Sem DELETE: arquivar plataforma e encerrar alocação preservam o histórico.
-- Escopo documental: cursos, exames e documentos de SST. Fora: RH, folha,
-- documentos administrativos e financeiros.

create or replace function public.orcamento_gestao_plataformas_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select o.id
  from public.orcamentos o
  where o.numero = 'ORC-2026-0087'
  order by o.created_at desc
  limit 1;
$$;

create or replace function public.cliente_gestao_plataformas_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select o.cliente_id
  from public.orcamentos o
  where o.id = public.orcamento_gestao_plataformas_id()
    and o.cliente_id is not null;
$$;

comment on function public.orcamento_gestao_plataformas_id() is
  'Orçamento interno que habilita a Gestão de Plataformas. Número fixo ORC-2026-0087.';

comment on function public.cliente_gestao_plataformas_id() is
  'Cliente vinculado ao ORC-2026-0087. Único cliente com dados neste módulo.';

revoke all on function public.orcamento_gestao_plataformas_id() from public;
revoke all on function public.cliente_gestao_plataformas_id() from public;
grant execute on function public.orcamento_gestao_plataformas_id() to authenticated, service_role;
grant execute on function public.cliente_gestao_plataformas_id() to authenticated, service_role;

create table if not exists public.gestao_plataformas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id),
  orcamento_id uuid not null references public.orcamentos (id),
  nome text not null,
  link_acesso text not null,
  arquivada_em timestamptz null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid null,
  constraint gestao_plataformas_nome_check check (char_length(btrim(nome)) >= 2),
  constraint gestao_plataformas_link_check check (link_acesso ~* '^https?://')
);

create table if not exists public.gestao_plataforma_obras (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id),
  plataforma_id uuid not null references public.gestao_plataformas (id),
  nome text not null,
  empresa_responsavel text not null,
  inicio_previsto date not null,
  responsavel_acompanhamento text not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint gestao_plataforma_obras_nome_check check (char_length(btrim(nome)) >= 2),
  constraint gestao_plataforma_obras_empresa_check check (char_length(btrim(empresa_responsavel)) >= 2),
  constraint gestao_plataforma_obras_responsavel_check check (char_length(btrim(responsavel_acompanhamento)) >= 2)
);

create table if not exists public.gestao_plataforma_alocacoes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id),
  obra_id uuid not null references public.gestao_plataforma_obras (id),
  colaborador_id text not null,
  encerrada_em timestamptz null,
  criado_em timestamptz not null default now(),
  constraint gestao_plataforma_alocacoes_colaborador_check
    check (char_length(btrim(colaborador_id)) >= 1)
);

create unique index if not exists idx_gestao_plataforma_alocacao_aberta
  on public.gestao_plataforma_alocacoes (obra_id, colaborador_id)
  where encerrada_em is null;

create table if not exists public.gestao_plataforma_requisitos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id),
  obra_id uuid not null references public.gestao_plataforma_obras (id),
  abrangencia text not null,
  cargo text null,
  colaborador_id text null,
  tipo text not null,
  titulo text not null,
  recorrente boolean not null default false,
  competencia text null,
  responsavel text null,
  prazo date null,
  validade date null,
  postado_em date null,
  situacao text not null default 'pendente',
  motivo_recusa text null,
  agendamento_id uuid null references public.agendamentos (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint gestao_plataforma_requisitos_abrangencia_check check (
    abrangencia in ('equipe', 'funcao', 'colaborador', 'empresa')
  ),
  constraint gestao_plataforma_requisitos_tipo_check check (
    tipo in ('curso', 'exame', 'documento_sst')
  ),
  constraint gestao_plataforma_requisitos_situacao_check check (
    situacao in ('pendente', 'pronto_para_postar', 'enviado', 'aprovado', 'recusado')
  ),
  constraint gestao_plataforma_requisitos_titulo_check check (char_length(btrim(titulo)) >= 2),
  constraint gestao_plataforma_requisitos_escopo_check check (
    (abrangencia = 'colaborador' and colaborador_id is not null)
    or (abrangencia = 'funcao' and cargo is not null and char_length(btrim(cargo)) >= 1)
    or abrangencia in ('equipe', 'empresa')
  ),
  constraint gestao_plataforma_requisitos_competencia_check check (
    competencia is null or competencia ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
  ),
  constraint gestao_plataforma_requisitos_recorrente_check check (
    recorrente = false or competencia is not null
  ),
  constraint gestao_plataforma_requisitos_recusa_check check (
    situacao <> 'recusado'
    or (motivo_recusa is not null and char_length(btrim(motivo_recusa)) >= 1)
  )
);

create table if not exists public.gestao_plataforma_requisito_eventos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id),
  requisito_id uuid not null references public.gestao_plataforma_requisitos (id),
  situacao text not null,
  motivo_recusa text null,
  postado_em date null,
  responsavel text null,
  observacao text null,
  registrado_em timestamptz not null default now(),
  constraint gestao_plataforma_eventos_situacao_check check (
    situacao in ('pendente', 'pronto_para_postar', 'enviado', 'aprovado', 'recusado')
  )
);

create table if not exists public.gestao_plataforma_liberacoes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id),
  obra_id uuid not null references public.gestao_plataforma_obras (id),
  colaborador_id text not null,
  liberado_em date not null,
  responsavel text not null,
  criado_em timestamptz not null default now(),
  constraint gestao_plataforma_liberacoes_colaborador_check
    check (char_length(btrim(colaborador_id)) >= 1),
  constraint gestao_plataforma_liberacoes_responsavel_check
    check (char_length(btrim(responsavel)) >= 2)
);

create index if not exists idx_gestao_plataformas_cliente
  on public.gestao_plataformas (cliente_id, arquivada_em);
create index if not exists idx_gestao_plataforma_obras_plataforma
  on public.gestao_plataforma_obras (plataforma_id, inicio_previsto);
create index if not exists idx_gestao_plataforma_alocacoes_obra
  on public.gestao_plataforma_alocacoes (obra_id, colaborador_id);
create index if not exists idx_gestao_plataforma_requisitos_obra
  on public.gestao_plataforma_requisitos (obra_id, situacao);
create index if not exists idx_gestao_plataforma_eventos_requisito
  on public.gestao_plataforma_requisito_eventos (requisito_id, registrado_em desc);
create index if not exists idx_gestao_plataforma_liberacoes_obra
  on public.gestao_plataforma_liberacoes (obra_id, colaborador_id, liberado_em desc);

create or replace function public.gestao_plataformas_validar_linha()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cliente uuid;
  v_orcamento uuid;
  v_ativas integer;
begin
  v_cliente := public.cliente_gestao_plataformas_id();
  v_orcamento := public.orcamento_gestao_plataformas_id();

  if v_cliente is null or NEW.cliente_id is distinct from v_cliente then
    raise exception
      'Gestão de Plataformas está habilitada apenas para o cliente do orçamento ORC-2026-0087.';
  end if;

  if TG_TABLE_NAME = 'gestao_plataformas' then
    if NEW.orcamento_id is distinct from v_orcamento then
      raise exception
        'A plataforma precisa permanecer vinculada ao orçamento ORC-2026-0087.';
    end if;
    if NEW.arquivada_em is null then
      select count(*) into v_ativas
      from public.gestao_plataformas
      where cliente_id = NEW.cliente_id
        and arquivada_em is null
        and id is distinct from NEW.id;
      if v_ativas >= 10 then
        raise exception 'O limite é de 10 plataformas ativas.';
      end if;
    end if;
  elsif TG_TABLE_NAME = 'gestao_plataforma_obras' then
    if not exists (
      select 1 from public.gestao_plataformas p
      where p.id = NEW.plataforma_id and p.cliente_id = NEW.cliente_id
    ) then
      raise exception 'A obra precisa pertencer a uma plataforma da AGROVIAS.';
    end if;
  elsif TG_TABLE_NAME = 'gestao_plataforma_alocacoes' then
    if not exists (
      select 1 from public.gestao_plataforma_obras o
      where o.id = NEW.obra_id and o.cliente_id = NEW.cliente_id
    ) then
      raise exception 'A alocação precisa pertencer a uma obra da AGROVIAS.';
    end if;
  elsif TG_TABLE_NAME = 'gestao_plataforma_requisitos' then
    if not exists (
      select 1 from public.gestao_plataforma_obras o
      where o.id = NEW.obra_id and o.cliente_id = NEW.cliente_id
    ) then
      raise exception 'O requisito precisa pertencer a uma obra da AGROVIAS.';
    end if;
    if NEW.agendamento_id is not null and not exists (
      select 1 from public.agendamentos a
      where a.id = NEW.agendamento_id and a.cliente_id = NEW.cliente_id
    ) then
      raise exception 'O exame vinculado precisa ser um agendamento da AGROVIAS.';
    end if;
  elsif TG_TABLE_NAME = 'gestao_plataforma_requisito_eventos' then
    if not exists (
      select 1 from public.gestao_plataforma_requisitos r
      where r.id = NEW.requisito_id and r.cliente_id = NEW.cliente_id
    ) then
      raise exception 'O histórico precisa pertencer a um requisito da AGROVIAS.';
    end if;
  elsif TG_TABLE_NAME = 'gestao_plataforma_liberacoes' then
    if not exists (
      select 1 from public.gestao_plataforma_obras o
      where o.id = NEW.obra_id and o.cliente_id = NEW.cliente_id
    ) then
      raise exception 'A liberação precisa pertencer a uma obra da AGROVIAS.';
    end if;
    if not exists (
      select 1 from public.gestao_plataforma_alocacoes a
      where a.obra_id = NEW.obra_id
        and a.colaborador_id = NEW.colaborador_id
        and a.cliente_id = NEW.cliente_id
        and a.encerrada_em is null
    ) then
      raise exception 'A liberação exige uma alocação em aberto nesta obra.';
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_gestao_plataformas_validar on public.gestao_plataformas;
create trigger trg_gestao_plataformas_validar
  before insert or update on public.gestao_plataformas
  for each row execute function public.gestao_plataformas_validar_linha();

drop trigger if exists trg_gestao_plataforma_obras_validar on public.gestao_plataforma_obras;
create trigger trg_gestao_plataforma_obras_validar
  before insert or update on public.gestao_plataforma_obras
  for each row execute function public.gestao_plataformas_validar_linha();

drop trigger if exists trg_gestao_plataforma_alocacoes_validar on public.gestao_plataforma_alocacoes;
create trigger trg_gestao_plataforma_alocacoes_validar
  before insert or update on public.gestao_plataforma_alocacoes
  for each row execute function public.gestao_plataformas_validar_linha();

drop trigger if exists trg_gestao_plataforma_requisitos_validar on public.gestao_plataforma_requisitos;
create trigger trg_gestao_plataforma_requisitos_validar
  before insert or update on public.gestao_plataforma_requisitos
  for each row execute function public.gestao_plataformas_validar_linha();

drop trigger if exists trg_gestao_plataforma_eventos_validar on public.gestao_plataforma_requisito_eventos;
create trigger trg_gestao_plataforma_eventos_validar
  before insert or update on public.gestao_plataforma_requisito_eventos
  for each row execute function public.gestao_plataformas_validar_linha();

drop trigger if exists trg_gestao_plataforma_liberacoes_validar on public.gestao_plataforma_liberacoes;
create trigger trg_gestao_plataforma_liberacoes_validar
  before insert or update on public.gestao_plataforma_liberacoes
  for each row execute function public.gestao_plataformas_validar_linha();

alter table public.gestao_plataformas enable row level security;
alter table public.gestao_plataforma_obras enable row level security;
alter table public.gestao_plataforma_alocacoes enable row level security;
alter table public.gestao_plataforma_requisitos enable row level security;
alter table public.gestao_plataforma_requisito_eventos enable row level security;
alter table public.gestao_plataforma_liberacoes enable row level security;

do $$
declare
  tabela text;
begin
  foreach tabela in array array[
    'gestao_plataformas',
    'gestao_plataforma_obras',
    'gestao_plataforma_alocacoes',
    'gestao_plataforma_requisitos',
    'gestao_plataforma_requisito_eventos',
    'gestao_plataforma_liberacoes'
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

comment on table public.gestao_plataformas is
  'Plataformas externas da AGROVIAS. Arquivar preenche arquivada_em e mantém o registro.';
comment on table public.gestao_plataforma_requisitos is
  'Requisitos de curso, exame e documento de SST por obra. Vencido não é situação gravada.';
