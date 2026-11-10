-- Desligamento de registro antigo sem CPF.
-- A identidade persistente é o exame ou a vaga já existente.
-- Não cria vaga e não associa pessoas pelo nome.

alter table public.colaborador_movimentacoes
  add column if not exists vinculo_agendamento_id uuid null,
  add column if not exists vinculo_vaga_id uuid null;

alter table public.colaborador_movimentacoes
  drop constraint if exists colaborador_movimentacoes_cpf_digits_check;

alter table public.colaborador_movimentacoes
  add constraint colaborador_movimentacoes_cpf_digits_check
  check (
    cpf_digits ~ '^[0-9]{11}$'
    or (
      cpf_digits = ''
      and (
        vinculo_agendamento_id is not null
        or vinculo_vaga_id is not null
      )
    )
  );

comment on column public.colaborador_movimentacoes.vinculo_agendamento_id is
  'Exame já gravado que identifica o colaborador quando ainda não há CPF.';

comment on column public.colaborador_movimentacoes.vinculo_vaga_id is
  'Vaga já gravada que identifica o colaborador quando ainda não há CPF.';

drop index if exists public.idx_colaborador_movimentacoes_admin_data_unica;

create unique index if not exists idx_colaborador_movimentacoes_admin_data_unica
  on public.colaborador_movimentacoes (cliente_id, cpf_digits, data_evento)
  where tipo = 'desligamento_admin'
    and cancelado_em is null
    and cpf_digits ~ '^[0-9]{11}$';

create unique index if not exists idx_colaborador_movimentacoes_admin_agendamento
  on public.colaborador_movimentacoes (cliente_id, vinculo_agendamento_id, data_evento)
  where tipo = 'desligamento_admin'
    and cancelado_em is null
    and vinculo_agendamento_id is not null
    and cpf_digits = '';

create unique index if not exists idx_colaborador_movimentacoes_admin_vaga
  on public.colaborador_movimentacoes (cliente_id, vinculo_vaga_id, data_evento)
  where tipo = 'desligamento_admin'
    and cancelado_em is null
    and vinculo_vaga_id is not null
    and cpf_digits = '';
