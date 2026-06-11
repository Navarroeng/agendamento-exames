-- SPIX: unidade PINHEIROS com mesma tabela de exames da SPIX original.
-- Não altera a clínica SPIX existente.

insert into public.clinicas (
  razao_social,
  nome_fantasia,
  cnpj,
  responsavel,
  telefone,
  whatsapp,
  email,
  site,
  cep,
  rua,
  numero,
  bairro,
  cidade,
  estado,
  forma_pagamento,
  prazo_pagamento,
  observacoes_financeiras,
  horario_atendimento,
  possui_coleta,
  possui_sistema_online,
  exames_atendidos,
  observacoes,
  status
)
select
  'SPIX PINHEIROS',
  'SPIX PINHEIROS',
  s.cnpj,
  s.responsavel,
  s.telefone,
  s.whatsapp,
  s.email,
  s.site,
  s.cep,
  s.rua,
  s.numero,
  s.bairro,
  s.cidade,
  s.estado,
  s.forma_pagamento,
  s.prazo_pagamento,
  s.observacoes_financeiras,
  s.horario_atendimento,
  s.possui_coleta,
  s.possui_sistema_online,
  s.exames_atendidos,
  s.observacoes,
  'ativa'
from public.clinicas s
where s.nome_fantasia = 'SPIX'
  and not exists (
    select 1 from public.clinicas where nome_fantasia = 'SPIX PINHEIROS'
  );

-- Copiar vínculos de exames da SPIX original para SPIX PINHEIROS
insert into public.clinica_exames (
  clinica_id,
  exame_id,
  custo_clinica,
  valor_navarro,
  prazo_resultado,
  observacoes,
  ativo
)
select
  destino.id,
  ce.exame_id,
  ce.custo_clinica,
  ce.valor_navarro,
  ce.prazo_resultado,
  ce.observacoes,
  ce.ativo
from public.clinicas origem
inner join public.clinica_exames ce on ce.clinica_id = origem.id
inner join public.clinicas destino on destino.nome_fantasia = 'SPIX PINHEIROS'
where origem.nome_fantasia = 'SPIX'
on conflict (clinica_id, exame_id) do nothing;
