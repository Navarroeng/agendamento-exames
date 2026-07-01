-- Motivo obrigatório quando exame Clínico tem valor cliente zero no ASO Demissional.

alter table public.agendamento_exames
  add column if not exists motivo_valor_zero text null;

comment on column public.agendamento_exames.motivo_valor_zero is
  'Justificativa quando o valor cliente do exame é R$ 0,00 (ex.: Clínico em ASO Demissional).';
