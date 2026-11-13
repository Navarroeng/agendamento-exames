-- 164: Catálogo de cursos, certificados e documentos de RH da Gestão de Plataformas.
-- O checklist por obra permanece. Cursos inativados e anexos anteriores ficam no histórico.
-- Documentos de RH não entram na postagem das plataformas.

create table if not exists public.gestao_plataforma_cursos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id),
  nome text not null,
  valor_centavos integer not null,
  inativado_em timestamptz null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint gestao_plataforma_cursos_nome_check check (char_length(btrim(nome)) >= 2),
  constraint gestao_plataforma_cursos_valor_check check (valor_centavos >= 0)
);

create unique index if not exists idx_gestao_plataforma_cursos_nome_ativo
  on public.gestao_plataforma_cursos (cliente_id, lower(btrim(nome)))
  where inativado_em is null;

create table if not exists public.gestao_plataforma_certificados (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id),
  colaborador_id text not null,
  curso_id uuid not null references public.gestao_plataforma_cursos (id),
  realizado_em date not null,
  validade date null,
  arquivo_path text null,
  arquivo_nome text null,
  arquivo_tipo text null,
  arquivo_tamanho bigint null,
  criado_em timestamptz not null default now(),
  constraint gestao_plataforma_certificados_colaborador_check
    check (char_length(btrim(colaborador_id)) >= 1)
);

create index if not exists idx_gestao_plataforma_certificados_pessoa
  on public.gestao_plataforma_certificados (cliente_id, colaborador_id, realizado_em desc);

alter table public.gestao_plataforma_requisitos
  add column if not exists certificado_id uuid null
  references public.gestao_plataforma_certificados (id);

create table if not exists public.gestao_plataforma_documentos_rh (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id),
  colaborador_id text not null,
  identificacao text not null,
  arquivo_path text not null,
  arquivo_nome text not null,
  arquivo_tipo text null,
  arquivo_tamanho bigint null,
  incluido_em timestamptz not null default now(),
  constraint gestao_plataforma_documentos_rh_colaborador_check
    check (char_length(btrim(colaborador_id)) >= 1),
  constraint gestao_plataforma_documentos_rh_identificacao_check
    check (char_length(btrim(identificacao)) >= 2)
);

create index if not exists idx_gestao_plataforma_documentos_rh_pessoa
  on public.gestao_plataforma_documentos_rh (cliente_id, colaborador_id, incluido_em desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gestao-plataformas-anexos',
  'gestao-plataformas-anexos',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

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
    if NEW.certificado_id is not null and not exists (
      select 1 from public.gestao_plataforma_certificados c
      where c.id = NEW.certificado_id
        and c.cliente_id = NEW.cliente_id
        and (
          NEW.colaborador_id is null
          or c.colaborador_id = NEW.colaborador_id
        )
    ) then
      raise exception 'O certificado precisa ser o da ficha deste colaborador na AGROVIAS.';
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
  elsif TG_TABLE_NAME = 'gestao_plataforma_cursos' then
    null;
  elsif TG_TABLE_NAME = 'gestao_plataforma_certificados' then
    if not exists (
      select 1 from public.gestao_plataforma_cursos c
      where c.id = NEW.curso_id and c.cliente_id = NEW.cliente_id
    ) then
      raise exception 'O curso precisa pertencer ao catálogo da AGROVIAS.';
    end if;
    if NEW.arquivo_path is not null
      and position(NEW.cliente_id::text || '/certificados/' in NEW.arquivo_path) <> 1 then
      raise exception 'O certificado precisa ficar no armazenamento da AGROVIAS.';
    end if;
  elsif TG_TABLE_NAME = 'gestao_plataforma_documentos_rh' then
    if NEW.arquivo_path is null
      or position(NEW.cliente_id::text || '/rh/' in NEW.arquivo_path) <> 1 then
      raise exception 'O documento de RH precisa ficar no armazenamento da AGROVIAS.';
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_gestao_plataforma_cursos_validar on public.gestao_plataforma_cursos;
create trigger trg_gestao_plataforma_cursos_validar
  before insert or update on public.gestao_plataforma_cursos
  for each row execute function public.gestao_plataformas_validar_linha();

drop trigger if exists trg_gestao_plataforma_certificados_validar on public.gestao_plataforma_certificados;
create trigger trg_gestao_plataforma_certificados_validar
  before insert or update on public.gestao_plataforma_certificados
  for each row execute function public.gestao_plataformas_validar_linha();

drop trigger if exists trg_gestao_plataforma_documentos_rh_validar on public.gestao_plataforma_documentos_rh;
create trigger trg_gestao_plataforma_documentos_rh_validar
  before insert or update on public.gestao_plataforma_documentos_rh
  for each row execute function public.gestao_plataformas_validar_linha();

alter table public.gestao_plataforma_cursos enable row level security;
alter table public.gestao_plataforma_certificados enable row level security;
alter table public.gestao_plataforma_documentos_rh enable row level security;

do $$
declare
  tabela text;
begin
  foreach tabela in array array[
    'gestao_plataforma_cursos',
    'gestao_plataforma_certificados',
    'gestao_plataforma_documentos_rh'
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

drop policy if exists staff_select_gestao_plataformas_anexos on storage.objects;
create policy staff_select_gestao_plataformas_anexos
  on storage.objects for select to authenticated
  using (
    bucket_id = 'gestao-plataformas-anexos'
    and public.is_staff_user()
    and (storage.foldername(name))[1] = public.cliente_gestao_plataformas_id()::text
    and (storage.foldername(name))[2] in ('certificados', 'rh')
  );

drop policy if exists staff_insert_gestao_plataformas_anexos on storage.objects;
create policy staff_insert_gestao_plataformas_anexos
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'gestao-plataformas-anexos'
    and public.is_staff_user()
    and (storage.foldername(name))[1] = public.cliente_gestao_plataformas_id()::text
    and (storage.foldername(name))[2] in ('certificados', 'rh')
  );

comment on table public.gestao_plataforma_cursos is
  'Catálogo de treinamentos da AGROVIAS. Inativar preserva certificados já emitidos.';
comment on table public.gestao_plataforma_documentos_rh is
  'Anexos de RH enviados pela AGROVIAS. Consulta interna da ficha, fora da postagem nas plataformas.';
