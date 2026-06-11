-- Validade periódica por cargo (não por exame vinculado)
alter table public.cargos
  add column if not exists validade_periodico_meses integer not null default 12
  check (validade_periodico_meses in (6, 12));

-- Cargos que tinham alerta por exame passam a validade de 6 meses no cargo
update public.cargos c
set validade_periodico_meses = 6
where exists (
  select 1
  from public.cargo_exames ce
  where ce.cargo_id = c.id
    and ce.gerar_alerta_6m = true
);

-- Periodicidade deixa de ser configurada por exame
update public.cargo_exames
set gerar_alerta_6m = false
where gerar_alerta_6m = true;
