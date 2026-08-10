-- Data de nascimento do participante (validação de acesso ao portal).
-- Não compõe resultados da pesquisa; uso exclusivo para autorização.

alter table public.riscos_campanha_participantes
  add column if not exists data_nascimento date null;

comment on column public.riscos_campanha_participantes.data_nascimento is
  'Data de nascimento (DATE). Usada apenas para validar acesso ao portal (CPF + nascimento + campanha). Não entra em relatórios nem resultados.';

create index if not exists idx_riscos_campanha_participantes_campanha_cpf_nasc
  on public.riscos_campanha_participantes (campanha_id, cpf, data_nascimento);
