-- Confirmação manual de envio do relatório de Riscos Psicossociais ao cliente.
-- A equipe Navarro envia externamente e registra no sistema (não dispara e-mail).

alter table public.riscos_relatorios
  add column if not exists relatorio_enviado_em timestamptz,
  add column if not exists relatorio_enviado_email text,
  add column if not exists relatorio_enviado_por text,
  add column if not exists relatorio_enviado_por_user_id uuid;

comment on column public.riscos_relatorios.relatorio_enviado_em is
  'Timestamp em que a equipe confirmou o envio externo do relatório ao cliente.';
comment on column public.riscos_relatorios.relatorio_enviado_email is
  'E-mail informado para o qual esta versão do relatório foi enviada.';
comment on column public.riscos_relatorios.relatorio_enviado_por is
  'Nome ou identificador exibido do usuário que confirmou o envio.';
comment on column public.riscos_relatorios.relatorio_enviado_por_user_id is
  'UUID do usuário autenticado que confirmou o envio.';
