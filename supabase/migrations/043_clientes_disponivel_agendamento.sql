-- Controla se o cliente pode ser selecionado em novos agendamentos.

alter table public.clientes
  add column if not exists disponivel_agendamento boolean;

update public.clientes
set disponivel_agendamento = true
where disponivel_agendamento is null;

alter table public.clientes
  alter column disponivel_agendamento set default true;

alter table public.clientes
  alter column disponivel_agendamento set not null;

comment on column public.clientes.disponivel_agendamento is
  'Quando false, o cliente permanece cadastrado mas não pode ser usado em novos agendamentos.';
