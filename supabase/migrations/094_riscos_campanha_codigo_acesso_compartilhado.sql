-- Código de acesso compartilhado por campanha + rastreio de participação.

-- 1) Código compartilhado da campanha (não eterno por CNPJ; um por pesquisa).
alter table public.riscos_campanhas
  add column if not exists codigo_acesso_hash text null,
  add column if not exists codigo_acesso_salt text null,
  add column if not exists codigo_acesso_exibicao text null;

comment on column public.riscos_campanhas.codigo_acesso_hash is
  'Hash scrypt do código de acesso compartilhado da campanha (verificação no servidor).';
comment on column public.riscos_campanhas.codigo_acesso_salt is
  'Salt do hash do código de acesso compartilhado.';
comment on column public.riscos_campanhas.codigo_acesso_exibicao is
  'Código em texto para distribuição interna (admin autenticado). Nunca expor em rotas públicas.';

-- 2) Rastreio de participação (separado do conteúdo confidencial das respostas).
alter table public.riscos_campanha_participantes
  add column if not exists acessou_em timestamptz null,
  add column if not exists iniciou_em timestamptz null,
  add column if not exists concluiu_em timestamptz null;

comment on column public.riscos_campanha_participantes.codigo_acesso is
  'Identificador único do participante (futuro QR/controle). NÃO é o código de login da campanha.';
comment on column public.riscos_campanha_participantes.acessou_em is
  'Quando o participante validou CPF + código da campanha.';
comment on column public.riscos_campanha_participantes.iniciou_em is
  'Quando o participante iniciou o questionário.';
comment on column public.riscos_campanha_participantes.concluiu_em is
  'Quando o participante concluiu o questionário.';

create index if not exists idx_riscos_campanha_participantes_campanha_cpf
  on public.riscos_campanha_participantes (campanha_id, cpf);
