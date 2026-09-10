-- Dia recorrente de vencimento das faturas da clínica (1–31).
-- Nullable para clínicas legadas ainda sem cadastro.

alter table public.clinicas
  add column if not exists dia_vencimento_fatura smallint;

alter table public.clinicas
  drop constraint if exists clinicas_dia_vencimento_fatura_check;

alter table public.clinicas
  add constraint clinicas_dia_vencimento_fatura_check
  check (
    dia_vencimento_fatura is null
    or (dia_vencimento_fatura >= 1 and dia_vencimento_fatura <= 31)
  );

comment on column public.clinicas.dia_vencimento_fatura is
  'Dia do mês (1–31) em que as faturas/custos desta clínica vencem. Null = não configurado.';
