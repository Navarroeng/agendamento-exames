-- PREVINE: unidades SANTANA e SANTO ANDRÉ com mesma tabela de exames da PREVINE original.
-- Não altera a clínica PREVINE existente.

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
  'PREVINE SANTANA',
  'PREVINE SANTANA',
  p.cnpj,
  p.responsavel,
  p.telefone,
  p.whatsapp,
  p.email,
  p.site,
  p.cep,
  p.rua,
  p.numero,
  p.bairro,
  p.cidade,
  p.estado,
  p.forma_pagamento,
  p.prazo_pagamento,
  p.observacoes_financeiras,
  p.horario_atendimento,
  p.possui_coleta,
  p.possui_sistema_online,
  p.exames_atendidos,
  p.observacoes,
  'ativa'
from public.clinicas p
where p.nome_fantasia = 'PREVINE'
  and not exists (
    select 1 from public.clinicas where nome_fantasia = 'PREVINE SANTANA'
  );

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
  'PREVINE SANTO ANDRÉ',
  'PREVINE SANTO ANDRÉ',
  p.cnpj,
  p.responsavel,
  p.telefone,
  p.whatsapp,
  p.email,
  p.site,
  p.cep,
  p.rua,
  p.numero,
  p.bairro,
  p.cidade,
  p.estado,
  p.forma_pagamento,
  p.prazo_pagamento,
  p.observacoes_financeiras,
  p.horario_atendimento,
  p.possui_coleta,
  p.possui_sistema_online,
  p.exames_atendidos,
  p.observacoes,
  'ativa'
from public.clinicas p
where p.nome_fantasia = 'PREVINE'
  and not exists (
    select 1 from public.clinicas where nome_fantasia = 'PREVINE SANTO ANDRÉ'
  );

-- Copiar vínculos de exames da PREVINE original para as unidades
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
  u.id,
  ce.exame_id,
  ce.custo_clinica,
  ce.valor_navarro,
  ce.prazo_resultado,
  ce.observacoes,
  ce.ativo
from public.clinicas origem
inner join public.clinica_exames ce on ce.clinica_id = origem.id
cross join public.clinicas u
where origem.nome_fantasia = 'PREVINE'
  and u.nome_fantasia in ('PREVINE SANTANA', 'PREVINE SANTO ANDRÉ')
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  prazo_resultado = excluded.prazo_resultado,
  observacoes = excluded.observacoes,
  ativo = excluded.ativo,
  updated_at = now();
