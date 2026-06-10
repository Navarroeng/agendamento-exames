-- Auditoria RLS — executar no Supabase SQL Editor após migration 015_secure_rls.sql
-- Lista tabela, policy, role e comando (operação).

select
  schemaname as schema,
  tablename as tabela,
  policyname as policy,
  roles as role,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- =============================================================================
-- Verificação rápida: policies anon (deve retornar 0 linhas)
-- =============================================================================
select
  tablename as tabela,
  policyname as policy,
  roles as role,
  cmd as command
from pg_policies
where schemaname = 'public'
  and 'anon' = any(roles)
order by tablename, policyname;

-- =============================================================================
-- Agendamentos: conferir que só existem policies authenticated
-- =============================================================================
select
  tablename as tabela,
  policyname as policy,
  roles as role,
  cmd as command
from pg_policies
where schemaname = 'public'
  and tablename in ('agendamentos', 'agendamento_exames', 'agendamento_historico')
order by tablename, policyname;

-- =============================================================================
-- Tabelas prioritárias com RLS desabilitado (deve retornar 0 linhas)
-- =============================================================================
select
  c.relname as tabela,
  c.relrowsecurity as rls_habilitado,
  c.relforcerowsecurity as rls_forcado
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'clinicas',
    'clinica_exames',
    'exames',
    'cargos',
    'cargo_exames',
    'clientes',
    'cliente_contratos',
    'faturas',
    'fatura_itens',
    'agendamentos',
    'agendamento_exames'
  )
  and c.relrowsecurity = false
order by c.relname;

-- =============================================================================
-- Contagem de policies por tabela e role
-- =============================================================================
select
  tablename as tabela,
  roles as role,
  count(*) as total_policies
from pg_policies
where schemaname = 'public'
  and tablename in (
    'clinicas',
    'clinica_exames',
    'exames',
    'cargos',
    'cargo_exames',
    'clientes',
    'cliente_contratos',
    'faturas',
    'fatura_itens',
    'agendamentos',
    'agendamento_exames',
    'agendamento_historico',
    'clinicas_historico',
    'clinica_exames_historico',
    'exames_historico',
    'perfis_usuarios'
  )
group by tablename, roles
order by tablename, roles;
