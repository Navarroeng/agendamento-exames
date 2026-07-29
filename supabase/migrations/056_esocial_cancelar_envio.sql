-- Cancelamento do controle interno de envio ao e-Social.
-- Não reutiliza motivo_cancelamento do agendamento.
-- Preserva data_envio_esocial e esocial_recibo para auditoria.

alter table public.agendamentos
  add column if not exists esocial_envio_cancelado boolean not null default false;

alter table public.agendamentos
  add column if not exists esocial_cancelado_em timestamptz null;

alter table public.agendamentos
  add column if not exists esocial_cancelado_por text null;

alter table public.agendamentos
  add column if not exists esocial_motivo_cancelamento text null;

alter table public.agendamentos
  add column if not exists esocial_status_anterior text null;

comment on column public.agendamentos.esocial_envio_cancelado is
  'Controle interno: envio ao e-Social cancelado (não remove recibo/data).';

comment on column public.agendamentos.esocial_cancelado_em is
  'Data/hora do cancelamento do controle de envio ao e-Social.';

comment on column public.agendamentos.esocial_cancelado_por is
  'Usuário que cancelou o controle de envio ao e-Social.';

comment on column public.agendamentos.esocial_motivo_cancelamento is
  'Motivo do cancelamento do controle de envio ao e-Social.';

comment on column public.agendamentos.esocial_status_anterior is
  'Status visual anterior ao cancelamento (pendente|urgente|enviado).';

create index if not exists idx_agendamentos_esocial_envio_cancelado
  on public.agendamentos (esocial_envio_cancelado)
  where esocial_envio_cancelado = true;
