-- LABORMESP: unidades com preços distintos (Jabaquara e Ipiranga)
-- Não remove LABORMESP genérica — preserva histórico de agendamentos antigos.

-- Unidades (criar se não existirem)
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

-- Copiar vínculos da LABORMESP genérica para as duas unidades
insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select u.id, ce.exame_id, ce.custo_clinica, ce.valor_navarro, ce.ativo
from public.clinicas g
inner join public.clinica_exames ce on ce.clinica_id = g.id
cross join public.clinicas u
where g.nome_fantasia = 'LABORMESP'
  and u.nome_fantasia in ('LABORMESP JABAQUARA', 'LABORMESP IPIRANGA')
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = excluded.ativo,
  updated_at = now();

-- RX com preços por unidade
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

-- Inativar LABORMESP genérica para não aparecer no agendamento
update public.clinicas
set status = 'inativa', updated_at = now()
where nome_fantasia = 'LABORMESP'
  and status = 'ativa';
