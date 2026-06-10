-- Seed gerado automaticamente de: c:/Users/AGATHA/agendamento-exames/tabela-exames.csv
-- Matriz EXAMES | CUSTOS | NAVARRO (tabela-exames.csv)
-- exames.valor_navarro = menor NAVARRO (referência do catálogo)
-- clinica_exames.custo_clinica = CUSTOS | clinica_exames.valor_navarro = NAVARRO (preço no agendamento)
-- AL ASSESSORIA: somente Clínico (valores 0; preço manual no agendamento)
-- LABORMESP: unidades LABORMESP JABAQUARA e LABORMESP IPIRANGA (RX com preços distintos)

-- Remove vínculos antigos das clínicas alvo (reimportação idempotente)
delete from public.clinica_exames
where clinica_id in (
  select id from public.clinicas
  where nome_fantasia in ('AL ASSESSORIA', 'BC WORK', 'ENGSEGTRA', 'LABORMESP JABAQUARA', 'LABORMESP IPIRANGA', 'PREZERVARE', 'PREVINE', 'PRIME', 'SPIX')
);

-- Clínicas (criar se não existirem)
insert into public.clinicas (
  razao_social, nome_fantasia, cnpj, responsavel, telefone, email,
  cidade, estado, status
)
select 'AL ASSESSORIA', 'AL ASSESSORIA', '00.000.000/0001-00', 'Importação', '0000-0000',
  'importacao@navarro.com.br', 'São Paulo', 'SP', 'ativa'
where not exists (
  select 1 from public.clinicas where nome_fantasia = 'AL ASSESSORIA'
);

insert into public.clinicas (
  razao_social, nome_fantasia, cnpj, responsavel, telefone, email,
  cidade, estado, status
)
select 'BC WORK', 'BC WORK', '00.000.000/0001-00', 'Importação', '0000-0000',
  'importacao@navarro.com.br', 'São Paulo', 'SP', 'ativa'
where not exists (
  select 1 from public.clinicas where nome_fantasia = 'BC WORK'
);

insert into public.clinicas (
  razao_social, nome_fantasia, cnpj, responsavel, telefone, email,
  cidade, estado, status
)
select 'ENGSEGTRA', 'ENGSEGTRA', '00.000.000/0001-00', 'Importação', '0000-0000',
  'importacao@navarro.com.br', 'São Paulo', 'SP', 'ativa'
where not exists (
  select 1 from public.clinicas where nome_fantasia = 'ENGSEGTRA'
);

insert into public.clinicas (
  razao_social, nome_fantasia, cnpj, responsavel, telefone, email,
  cidade, estado, status
)
select 'LABORMESP JABAQUARA', 'LABORMESP JABAQUARA', '00.000.000/0001-00', 'Importação', '0000-0000',
  'importacao@navarro.com.br', 'São Paulo', 'SP', 'ativa'
where not exists (
  select 1 from public.clinicas where nome_fantasia = 'LABORMESP JABAQUARA'
);

insert into public.clinicas (
  razao_social, nome_fantasia, cnpj, responsavel, telefone, email,
  cidade, estado, status
)
select 'LABORMESP IPIRANGA', 'LABORMESP IPIRANGA', '00.000.000/0001-00', 'Importação', '0000-0000',
  'importacao@navarro.com.br', 'São Paulo', 'SP', 'ativa'
where not exists (
  select 1 from public.clinicas where nome_fantasia = 'LABORMESP IPIRANGA'
);

insert into public.clinicas (
  razao_social, nome_fantasia, cnpj, responsavel, telefone, email,
  cidade, estado, status
)
select 'PREZERVARE', 'PREZERVARE', '00.000.000/0001-00', 'Importação', '0000-0000',
  'importacao@navarro.com.br', 'São Paulo', 'SP', 'ativa'
where not exists (
  select 1 from public.clinicas where nome_fantasia = 'PREZERVARE'
);

insert into public.clinicas (
  razao_social, nome_fantasia, cnpj, responsavel, telefone, email,
  cidade, estado, status
)
select 'PREVINE', 'PREVINE', '00.000.000/0001-00', 'Importação', '0000-0000',
  'importacao@navarro.com.br', 'São Paulo', 'SP', 'ativa'
where not exists (
  select 1 from public.clinicas where nome_fantasia = 'PREVINE'
);

insert into public.clinicas (
  razao_social, nome_fantasia, cnpj, responsavel, telefone, email,
  cidade, estado, status
)
select 'PRIME', 'PRIME', '00.000.000/0001-00', 'Importação', '0000-0000',
  'importacao@navarro.com.br', 'São Paulo', 'SP', 'ativa'
where not exists (
  select 1 from public.clinicas where nome_fantasia = 'PRIME'
);

insert into public.clinicas (
  razao_social, nome_fantasia, cnpj, responsavel, telefone, email,
  cidade, estado, status
)
select 'SPIX', 'SPIX', '00.000.000/0001-00', 'Importação', '0000-0000',
  'importacao@navarro.com.br', 'São Paulo', 'SP', 'ativa'
where not exists (
  select 1 from public.clinicas where nome_fantasia = 'SPIX'
);

-- Catálogo de exames (upsert por nome; valor_navarro = menor NAVARRO da matriz)
insert into public.exames (nome, categoria, valor_navarro, ativo)
values ('Acuidade Visual', 'Outros', 29.00, true)
on conflict (nome) do update set
  valor_navarro = excluded.valor_navarro,
  categoria = excluded.categoria,
  ativo = true,
  updated_at = now();

insert into public.exames (nome, categoria, valor_navarro, ativo)
values ('Audiometria', 'Ocupacional', 33.00, true)
on conflict (nome) do update set
  valor_navarro = excluded.valor_navarro,
  categoria = excluded.categoria,
  ativo = true,
  updated_at = now();

insert into public.exames (nome, categoria, valor_navarro, ativo)
values ('Avaliação Oftalmológica', 'Complementar', 150.00, true)
on conflict (nome) do update set
  valor_navarro = excluded.valor_navarro,
  categoria = excluded.categoria,
  ativo = true,
  updated_at = now();

insert into public.exames (nome, categoria, valor_navarro, ativo)
values ('Clínico', 'Ocupacional', 50.00, true)
on conflict (nome) do update set
  valor_navarro = excluded.valor_navarro,
  categoria = excluded.categoria,
  ativo = true,
  updated_at = now();

insert into public.exames (nome, categoria, valor_navarro, ativo)
values ('Coprocultura', 'Outros', 33.00, true)
on conflict (nome) do update set
  valor_navarro = excluded.valor_navarro,
  categoria = excluded.categoria,
  ativo = true,
  updated_at = now();

insert into public.exames (nome, categoria, valor_navarro, ativo)
values ('ECG', 'Complementar', 52.00, true)
on conflict (nome) do update set
  valor_navarro = excluded.valor_navarro,
  categoria = excluded.categoria,
  ativo = true,
  updated_at = now();

insert into public.exames (nome, categoria, valor_navarro, ativo)
values ('EEG', 'Complementar', 66.00, true)
on conflict (nome) do update set
  valor_navarro = excluded.valor_navarro,
  categoria = excluded.categoria,
  ativo = true,
  updated_at = now();

insert into public.exames (nome, categoria, valor_navarro, ativo)
values ('GAMA GT', 'Laboratorial', 22.00, true)
on conflict (nome) do update set
  valor_navarro = excluded.valor_navarro,
  categoria = excluded.categoria,
  ativo = true,
  updated_at = now();

insert into public.exames (nome, categoria, valor_navarro, ativo)
values ('Glicemia', 'Laboratorial', 18.00, true)
on conflict (nome) do update set
  valor_navarro = excluded.valor_navarro,
  categoria = excluded.categoria,
  ativo = true,
  updated_at = now();

insert into public.exames (nome, categoria, valor_navarro, ativo)
values ('Hemograma completo', 'Laboratorial', 22.00, true)
on conflict (nome) do update set
  valor_navarro = excluded.valor_navarro,
  categoria = excluded.categoria,
  ativo = true,
  updated_at = now();

insert into public.exames (nome, categoria, valor_navarro, ativo)
values ('Hepatite A IGM', 'Laboratorial', 65.00, true)
on conflict (nome) do update set
  valor_navarro = excluded.valor_navarro,
  categoria = excluded.categoria,
  ativo = true,
  updated_at = now();

insert into public.exames (nome, categoria, valor_navarro, ativo)
values ('Hepatite B ANTI HBS', 'Laboratorial', 65.00, true)
on conflict (nome) do update set
  valor_navarro = excluded.valor_navarro,
  categoria = excluded.categoria,
  ativo = true,
  updated_at = now();

insert into public.exames (nome, categoria, valor_navarro, ativo)
values ('Hepatite B ANTI HBSAG', 'Laboratorial', 65.00, true)
on conflict (nome) do update set
  valor_navarro = excluded.valor_navarro,
  categoria = excluded.categoria,
  ativo = true,
  updated_at = now();

insert into public.exames (nome, categoria, valor_navarro, ativo)
values ('Hepatite C', 'Laboratorial', 65.00, true)
on conflict (nome) do update set
  valor_navarro = excluded.valor_navarro,
  categoria = excluded.categoria,
  ativo = true,
  updated_at = now();

insert into public.exames (nome, categoria, valor_navarro, ativo)
values ('PPF', 'Ocupacional', 24.00, true)
on conflict (nome) do update set
  valor_navarro = excluded.valor_navarro,
  categoria = excluded.categoria,
  ativo = true,
  updated_at = now();

insert into public.exames (nome, categoria, valor_navarro, ativo)
values ('Retorno ao trabalho', 'Outros', 100.00, true)
on conflict (nome) do update set
  valor_navarro = excluded.valor_navarro,
  categoria = excluded.categoria,
  ativo = true,
  updated_at = now();

insert into public.exames (nome, categoria, valor_navarro, ativo)
values ('RX Tórax - PA', 'Complementar', 77.00, true)
on conflict (nome) do update set
  valor_navarro = excluded.valor_navarro,
  categoria = excluded.categoria,
  ativo = true,
  updated_at = now();

insert into public.exames (nome, categoria, valor_navarro, ativo)
values ('RX Tórax - PA + PERFIL', 'Complementar', 77.00, true)
on conflict (nome) do update set
  valor_navarro = excluded.valor_navarro,
  categoria = excluded.categoria,
  ativo = true,
  updated_at = now();

insert into public.exames (nome, categoria, valor_navarro, ativo)
values ('Toxicológico', 'Laboratorial', 260.00, true)
on conflict (nome) do update set
  valor_navarro = excluded.valor_navarro,
  categoria = excluded.categoria,
  ativo = true,
  updated_at = now();

-- Vínculos clínica × exame (custo + valor Navarro por clínica)
-- AL ASSESSORIA: apenas Clínico; agendamento usa preço manual
insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 0.00, 0.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'AL ASSESSORIA'
  and e.nome = 'Clínico'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 18.20, 29.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'BC WORK'
  and e.nome = 'Acuidade Visual'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 18.90, 33.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'BC WORK'
  and e.nome = 'Audiometria'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 26.00, 50.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'BC WORK'
  and e.nome = 'Clínico'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 10.90, 33.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'BC WORK'
  and e.nome = 'Coprocultura'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 28.90, 52.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'BC WORK'
  and e.nome = 'ECG'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 32.90, 66.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'BC WORK'
  and e.nome = 'EEG'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 7.90, 22.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'BC WORK'
  and e.nome = 'GAMA GT'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 7.90, 18.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'BC WORK'
  and e.nome = 'Glicemia'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 10.90, 22.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'BC WORK'
  and e.nome = 'Hemograma completo'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 7.90, 24.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'BC WORK'
  and e.nome = 'PPF'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 36.00, 77.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'BC WORK'
  and e.nome = 'RX Tórax - PA'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 260.00, 286.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'BC WORK'
  and e.nome = 'Toxicológico'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 18.00, 29.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'ENGSEGTRA'
  and e.nome = 'Acuidade Visual'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 21.00, 33.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'ENGSEGTRA'
  and e.nome = 'Audiometria'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 80.00, 150.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'ENGSEGTRA'
  and e.nome = 'Avaliação Oftalmológica'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 32.00, 50.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'ENGSEGTRA'
  and e.nome = 'Clínico'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 20.00, 33.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'ENGSEGTRA'
  and e.nome = 'Coprocultura'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 28.00, 52.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'ENGSEGTRA'
  and e.nome = 'ECG'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 29.00, 66.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'ENGSEGTRA'
  and e.nome = 'EEG'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 8.00, 22.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'ENGSEGTRA'
  and e.nome = 'GAMA GT'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 9.00, 18.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'ENGSEGTRA'
  and e.nome = 'Glicemia'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 10.00, 22.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'ENGSEGTRA'
  and e.nome = 'Hemograma completo'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 25.00, 65.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'ENGSEGTRA'
  and e.nome = 'Hepatite A IGM'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 35.00, 65.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'ENGSEGTRA'
  and e.nome = 'Hepatite B ANTI HBS'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 25.00, 65.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'ENGSEGTRA'
  and e.nome = 'Hepatite B ANTI HBSAG'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 62.00, 65.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'ENGSEGTRA'
  and e.nome = 'Hepatite C'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 20.00, 24.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'ENGSEGTRA'
  and e.nome = 'PPF'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 40.00, 77.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'ENGSEGTRA'
  and e.nome = 'RX Tórax - PA'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 40.00, 77.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'ENGSEGTRA'
  and e.nome = 'RX Tórax - PA + PERFIL'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 105.00, 260.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'ENGSEGTRA'
  and e.nome = 'Toxicológico'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 21.00, 29.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'LABORMESP IPIRANGA'
  and e.nome = 'Acuidade Visual'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 26.00, 33.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'LABORMESP IPIRANGA'
  and e.nome = 'Audiometria'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 40.00, 50.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'LABORMESP IPIRANGA'
  and e.nome = 'Clínico'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 16.90, 33.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'LABORMESP IPIRANGA'
  and e.nome = 'Coprocultura'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 47.58, 52.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'LABORMESP IPIRANGA'
  and e.nome = 'ECG'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 57.40, 66.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'LABORMESP IPIRANGA'
  and e.nome = 'EEG'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 8.00, 22.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'LABORMESP IPIRANGA'
  and e.nome = 'GAMA GT'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 11.40, 18.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'LABORMESP IPIRANGA'
  and e.nome = 'Glicemia'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 14.40, 22.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'LABORMESP IPIRANGA'
  and e.nome = 'Hemograma completo'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 36.00, 65.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'LABORMESP IPIRANGA'
  and e.nome = 'Hepatite A IGM'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 36.00, 65.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'LABORMESP IPIRANGA'
  and e.nome = 'Hepatite B ANTI HBS'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 36.00, 65.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'LABORMESP IPIRANGA'
  and e.nome = 'Hepatite B ANTI HBSAG'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 54.86, 65.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'LABORMESP IPIRANGA'
  and e.nome = 'Hepatite C'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 9.90, 24.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'LABORMESP IPIRANGA'
  and e.nome = 'PPF'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 48.90, 77.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'LABORMESP IPIRANGA'
  and e.nome = 'RX Tórax - PA'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 48.90, 77.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'LABORMESP IPIRANGA'
  and e.nome = 'RX Tórax - PA + PERFIL'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 150.00, 260.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'LABORMESP IPIRANGA'
  and e.nome = 'Toxicológico'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 21.00, 29.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'LABORMESP JABAQUARA'
  and e.nome = 'Acuidade Visual'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 26.00, 33.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'LABORMESP JABAQUARA'
  and e.nome = 'Audiometria'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 40.00, 50.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'LABORMESP JABAQUARA'
  and e.nome = 'Clínico'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 16.90, 33.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'LABORMESP JABAQUARA'
  and e.nome = 'Coprocultura'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 47.58, 52.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'LABORMESP JABAQUARA'
  and e.nome = 'ECG'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 57.40, 66.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'LABORMESP JABAQUARA'
  and e.nome = 'EEG'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 8.00, 22.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'LABORMESP JABAQUARA'
  and e.nome = 'GAMA GT'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 11.40, 18.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'LABORMESP JABAQUARA'
  and e.nome = 'Glicemia'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 14.40, 22.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'LABORMESP JABAQUARA'
  and e.nome = 'Hemograma completo'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 36.00, 65.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'LABORMESP JABAQUARA'
  and e.nome = 'Hepatite A IGM'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 36.00, 65.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'LABORMESP JABAQUARA'
  and e.nome = 'Hepatite B ANTI HBS'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 36.00, 65.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'LABORMESP JABAQUARA'
  and e.nome = 'Hepatite B ANTI HBSAG'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 54.86, 65.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'LABORMESP JABAQUARA'
  and e.nome = 'Hepatite C'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 9.90, 24.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'LABORMESP JABAQUARA'
  and e.nome = 'PPF'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 90.00, 105.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'LABORMESP JABAQUARA'
  and e.nome = 'RX Tórax - PA'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 50.00, 77.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'LABORMESP JABAQUARA'
  and e.nome = 'RX Tórax - PA + PERFIL'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 150.00, 260.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'LABORMESP JABAQUARA'
  and e.nome = 'Toxicológico'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 25.00, 29.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'PREVINE'
  and e.nome = 'Acuidade Visual'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 32.50, 38.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'PREVINE'
  and e.nome = 'Audiometria'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 40.00, 50.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'PREVINE'
  and e.nome = 'Clínico'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 26.00, 33.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'PREVINE'
  and e.nome = 'Coprocultura'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 40.00, 52.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'PREVINE'
  and e.nome = 'ECG'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 62.00, 66.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'PREVINE'
  and e.nome = 'EEG'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 15.00, 22.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'PREVINE'
  and e.nome = 'GAMA GT'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 12.00, 18.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'PREVINE'
  and e.nome = 'Glicemia'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 20.00, 22.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'PREVINE'
  and e.nome = 'Hemograma completo'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 62.50, 65.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'PREVINE'
  and e.nome = 'Hepatite A IGM'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 48.00, 65.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'PREVINE'
  and e.nome = 'Hepatite B ANTI HBS'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 37.00, 65.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'PREVINE'
  and e.nome = 'Hepatite B ANTI HBSAG'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 110.00, 150.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'PREVINE'
  and e.nome = 'Hepatite C'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 17.00, 24.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'PREVINE'
  and e.nome = 'PPF'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 46.00, 77.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'PREVINE'
  and e.nome = 'RX Tórax - PA'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 60.00, 77.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'PREVINE'
  and e.nome = 'RX Tórax - PA + PERFIL'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 125.00, 260.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'PREVINE'
  and e.nome = 'Toxicológico'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 16.50, 29.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'PREZERVARE'
  and e.nome = 'Acuidade Visual'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 27.50, 33.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'PREZERVARE'
  and e.nome = 'Audiometria'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 38.00, 50.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'PREZERVARE'
  and e.nome = 'Clínico'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 28.50, 33.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'PREZERVARE'
  and e.nome = 'Coprocultura'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 28.50, 52.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'PREZERVARE'
  and e.nome = 'ECG'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 40.00, 66.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'PREZERVARE'
  and e.nome = 'EEG'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 12.00, 22.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'PREZERVARE'
  and e.nome = 'GAMA GT'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 12.00, 18.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'PREZERVARE'
  and e.nome = 'Glicemia'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 17.00, 22.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'PREZERVARE'
  and e.nome = 'Hemograma completo'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 65.00, 77.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'PREZERVARE'
  and e.nome = 'Hepatite A IGM'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 36.00, 65.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'PREZERVARE'
  and e.nome = 'Hepatite B ANTI HBS'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 36.00, 65.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'PREZERVARE'
  and e.nome = 'Hepatite B ANTI HBSAG'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 36.00, 65.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'PREZERVARE'
  and e.nome = 'Hepatite C'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 11.00, 24.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'PREZERVARE'
  and e.nome = 'PPF'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 70.00, 77.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'PREZERVARE'
  and e.nome = 'RX Tórax - PA'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 70.00, 77.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'PREZERVARE'
  and e.nome = 'RX Tórax - PA + PERFIL'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 140.00, 260.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'PREZERVARE'
  and e.nome = 'Toxicológico'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 26.00, 29.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'PRIME'
  and e.nome = 'Acuidade Visual'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 32.00, 38.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'PRIME'
  and e.nome = 'Audiometria'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 40.00, 50.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'PRIME'
  and e.nome = 'Clínico'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 20.00, 33.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'PRIME'
  and e.nome = 'Coprocultura'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 42.00, 52.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'PRIME'
  and e.nome = 'ECG'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 55.00, 66.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'PRIME'
  and e.nome = 'EEG'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 15.00, 22.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'PRIME'
  and e.nome = 'GAMA GT'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 15.00, 18.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'PRIME'
  and e.nome = 'Glicemia'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 18.00, 22.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'PRIME'
  and e.nome = 'Hemograma completo'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 35.00, 65.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'PRIME'
  and e.nome = 'Hepatite A IGM'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 35.00, 65.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'PRIME'
  and e.nome = 'Hepatite B ANTI HBS'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 35.00, 65.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'PRIME'
  and e.nome = 'Hepatite B ANTI HBSAG'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 40.00, 65.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'PRIME'
  and e.nome = 'Hepatite C'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 14.00, 24.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'PRIME'
  and e.nome = 'PPF'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 60.00, 77.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'PRIME'
  and e.nome = 'RX Tórax - PA'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 60.00, 77.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'PRIME'
  and e.nome = 'RX Tórax - PA + PERFIL'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 167.00, 260.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'PRIME'
  and e.nome = 'Toxicológico'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 20.00, 29.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'SPIX'
  and e.nome = 'Acuidade Visual'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 25.00, 33.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'SPIX'
  and e.nome = 'Audiometria'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 100.00, 150.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'SPIX'
  and e.nome = 'Avaliação Oftalmológica'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 40.00, 50.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'SPIX'
  and e.nome = 'Clínico'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 32.00, 38.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'SPIX'
  and e.nome = 'Coprocultura'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 50.00, 60.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'SPIX'
  and e.nome = 'ECG'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 80.00, 86.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'SPIX'
  and e.nome = 'EEG'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 8.00, 22.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'SPIX'
  and e.nome = 'GAMA GT'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 12.00, 18.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'SPIX'
  and e.nome = 'Glicemia'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 14.00, 22.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'SPIX'
  and e.nome = 'Hemograma completo'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 30.00, 65.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'SPIX'
  and e.nome = 'Hepatite A IGM'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 30.00, 65.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'SPIX'
  and e.nome = 'Hepatite B ANTI HBS'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 30.00, 65.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'SPIX'
  and e.nome = 'Hepatite B ANTI HBSAG'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 35.00, 65.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'SPIX'
  and e.nome = 'Hepatite C'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 15.00, 24.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'SPIX'
  and e.nome = 'PPF'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 250.00, 300.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'SPIX'
  and e.nome = 'Retorno ao trabalho'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 76.50, 87.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'SPIX'
  and e.nome = 'RX Tórax - PA'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 153.00, 180.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'SPIX'
  and e.nome = 'RX Tórax - PA + PERFIL'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, 130.00, 260.00, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = 'SPIX'
  and e.nome = 'Toxicológico'
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

-- Inativar LABORMESP genérica (histórico preservado; agendamento usa unidades)
update public.clinicas
set status = 'inativa', updated_at = now()
where nome_fantasia = 'LABORMESP'
  and status = 'ativa';

