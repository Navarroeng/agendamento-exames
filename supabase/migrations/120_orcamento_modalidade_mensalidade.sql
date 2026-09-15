-- 120: Modalidade comercial do orçamento (pontual | mensalidade)
-- e serviço catálogo "Gestão Completa SST".
--
-- Registros existentes ficam pontual (DEFAULT).
-- valor_total/subtotal da mensalidade armazenam o valor MENSAL, não o anual.

alter table public.orcamentos
  add column if not exists modalidade text not null default 'pontual';

alter table public.orcamentos
  drop constraint if exists orcamentos_modalidade_check;

alter table public.orcamentos
  add constraint orcamentos_modalidade_check
  check (modalidade in ('pontual', 'mensalidade'));

comment on column public.orcamentos.modalidade is
  'Modalidade comercial: pontual (proposta avulsa) ou mensalidade (contrato recorrente). valor_total da mensalidade é o valor mensal.';

create index if not exists idx_orcamentos_modalidade
  on public.orcamentos (modalidade);

insert into public.servicos_sst (nome, ordem, ativo, itens_inclusos)
values (
  'Gestão Completa SST',
  1,
  true,
  jsonb_build_array(
    'PGR - Programa de gerenciamento de riscos.',
    'LTCAT - Laudo técnico das condições do ambiente de trabalho.',
    'PCMSO - NR07 - Programa de controle médico de saúde ocupacional.',
    'ASO - Atestado de saúde ocupacional.',
    'Laudo de Riscos Psicossociais - Nova NR - 01'
  )
)
on conflict (nome) do update
set
  ativo = excluded.ativo,
  itens_inclusos = excluded.itens_inclusos;
