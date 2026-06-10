-- Protocolo de envio ao e-Social (número informado ao marcar como enviado)
alter table public.agendamentos
add column if not exists esocial_protocolo text;
