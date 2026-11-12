-- Cadastro manual do colaborador na empresa, sem vaga e sem exame.
-- A lista de Clientes continua consolidada. A vaga do contrato guarda
-- só o identificador de origem e não é reescrita quando a lista muda.

alter table public.colaborador_movimentacoes
  drop constraint if exists colaborador_movimentacoes_tipo_check;

alter table public.colaborador_movimentacoes
  add constraint colaborador_movimentacoes_tipo_check
    check (tipo in ('desligamento_admin', 'admissao', 'cadastro'));

comment on column public.colaborador_movimentacoes.tipo is
  'Tipo do evento: desligamento_admin, admissao ou cadastro.';

alter table public.colaborador_movimentacoes
  add column if not exists vinculo_cadastro_id uuid null
  references public.colaborador_movimentacoes (id) on delete set null;

comment on column public.colaborador_movimentacoes.vinculo_cadastro_id is
  'Cadastro manual que identifica o colaborador quando ainda não há CPF.';

alter table public.colaborador_movimentacoes
  drop constraint if exists colaborador_movimentacoes_cpf_digits_check;

alter table public.colaborador_movimentacoes
  add constraint colaborador_movimentacoes_cpf_digits_check
  check (
    cpf_digits ~ '^[0-9]{11}$'
    or (
      cpf_digits = ''
      and (
        tipo = 'cadastro'
        or vinculo_agendamento_id is not null
        or vinculo_vaga_id is not null
        or vinculo_cadastro_id is not null
      )
    )
  );

alter table public.colaborador_movimentacoes
  alter column data_evento drop not null;

alter table public.colaborador_movimentacoes
  drop constraint if exists colaborador_movimentacoes_data_evento_ck;

alter table public.colaborador_movimentacoes
  add constraint colaborador_movimentacoes_data_evento_ck
  check (tipo = 'cadastro' or data_evento is not null);

create unique index if not exists idx_colaborador_movimentacoes_cadastro_cpf
  on public.colaborador_movimentacoes (cliente_id, cpf_digits)
  where tipo = 'cadastro'
    and cancelado_em is null
    and cpf_digits ~ '^[0-9]{11}$';

comment on index public.idx_colaborador_movimentacoes_cadastro_cpf is
  'Um cadastro manual vigente por CPF na empresa. Sem CPF, cada registro é uma pessoa.';

create unique index if not exists idx_colaborador_movimentacoes_admin_cadastro
  on public.colaborador_movimentacoes (cliente_id, vinculo_cadastro_id, data_evento)
  where tipo = 'desligamento_admin'
    and cancelado_em is null
    and vinculo_cadastro_id is not null
    and cpf_digits = '';

alter table public.contrato_vagas
  add column if not exists colaborador_origem text null;

comment on column public.contrato_vagas.colaborador_origem is
  'Identificador do colaborador na lista de Clientes (CPF ou id do cadastro). Não substitui o ocupante quando a lista muda.';
