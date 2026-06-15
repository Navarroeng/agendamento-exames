-- Seed do catálogo de serviços SST (Orçamentos)
-- Idempotente: pode ser executado mais de uma vez.

insert into public.servicos_sst (nome, ordem, ativo)
values
  ('PGR', 1, true),
  ('PCMSO', 2, true),
  ('LTCAT', 3, true),
  ('LIP', 4, true),
  ('NR01 Psicossocial', 5, true),
  ('Treinamentos', 6, true),
  ('Gestão SST Mensal', 7, true),
  ('Exames Ocupacionais', 8, true),
  ('Outros', 9, true)
on conflict (nome) do update
set
  ordem = excluded.ordem,
  ativo = excluded.ativo;
