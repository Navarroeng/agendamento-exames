-- Preço de venda Navarro por clínica (pode diferir do catálogo exames)
alter table public.clinica_exames
  add column if not exists valor_navarro numeric(10, 2);

-- Garantir default para linhas existentes sem valor
update public.clinica_exames ce
set valor_navarro = coalesce(
  ce.valor_navarro,
  (select e.valor_navarro from public.exames e where e.id = ce.exame_id),
  0
)
where ce.valor_navarro is null;

alter table public.clinica_exames
  alter column valor_navarro set default 0;

alter table public.clinica_exames
  alter column valor_navarro set not null;
