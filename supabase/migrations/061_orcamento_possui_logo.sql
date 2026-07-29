-- Logo opcional na implantação: escolha possui_logo (sim/não).

alter table public.orcamento_aprovacoes
  add column if not exists possui_logo boolean null;

comment on column public.orcamento_aprovacoes.possui_logo is
  'true = empresa deseja incluir logomarca; false = sem logomarca; null = ainda não decidiu.';

-- Registros já com logo cadastrada passam a contar como "Sim".
update public.orcamento_aprovacoes
set possui_logo = true
where logo_path is not null
  and possui_logo is null;
