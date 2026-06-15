-- Pacote completo SST: itens inclusos no catálogo de serviços

alter table public.servicos_sst
  add column if not exists itens_inclusos jsonb null;

comment on column public.servicos_sst.itens_inclusos is
  'Lista de serviços inclusos em pacotes (ex.: Pacote completo - SST).';

insert into public.servicos_sst (nome, ordem, ativo, itens_inclusos)
values (
  'Pacote completo - SST',
  0,
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
  ordem = excluded.ordem,
  ativo = excluded.ativo,
  itens_inclusos = excluded.itens_inclusos;
