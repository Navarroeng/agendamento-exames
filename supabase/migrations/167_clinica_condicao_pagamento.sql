-- Condição de pagamento da clínica e o retrato dessa condição no agendamento.
-- Clínicas já cadastradas entram em fechamento mensal, sem classificação por nome.
-- Agendamentos antigos ficam nulos e o sistema os trata como fechamento mensal.

alter table public.clinicas
  add column if not exists condicao_pagamento text;

update public.clinicas
set condicao_pagamento = 'fechamento_mensal'
where condicao_pagamento is null;

alter table public.clinicas
  alter column condicao_pagamento set default 'fechamento_mensal';

alter table public.clinicas
  alter column condicao_pagamento set not null;

alter table public.clinicas
  drop constraint if exists clinicas_condicao_pagamento_check;

alter table public.clinicas
  add constraint clinicas_condicao_pagamento_check
  check (condicao_pagamento in ('fechamento_mensal', 'a_vista'));

comment on column public.clinicas.condicao_pagamento is
  'fechamento_mensal ou a_vista. A alteração vale só para agendamentos novos.';

alter table public.agendamentos
  add column if not exists condicao_pagamento_clinica text;

alter table public.agendamentos
  drop constraint if exists agendamentos_condicao_pagamento_clinica_check;

alter table public.agendamentos
  add constraint agendamentos_condicao_pagamento_clinica_check
  check (
    condicao_pagamento_clinica is null
    or condicao_pagamento_clinica in ('fechamento_mensal', 'a_vista')
  );

comment on column public.agendamentos.condicao_pagamento_clinica is
  'Condição da clínica gravada na criação do agendamento. Null = fechamento mensal (legado).';
