-- Procuração pendente no controle interno de envio ao e-Social.
-- A marcação é por ASO, prevalece sobre o status calculado pela data
-- e não altera data do exame, envio, data de envio nem recibo.
-- Registros atuais nascem com a marcação desligada.

alter table public.agendamentos
  add column if not exists esocial_procuracao_pendente boolean not null default false;

comment on column public.agendamentos.esocial_procuracao_pendente is
  'Controle interno: envio ao e-Social aguarda procuração. Enquanto ativo, prevalece sobre Pendente e Enviar urgente. Não cancela o envio.';

comment on column public.agendamentos.esocial_status_anterior is
  'Status visual anterior ao cancelamento (pendente|urgente|procuracao_pendente|enviado).';

create index if not exists idx_agendamentos_esocial_procuracao_pendente
  on public.agendamentos (esocial_procuracao_pendente)
  where esocial_procuracao_pendente = true;

notify pgrst, 'reload schema';
