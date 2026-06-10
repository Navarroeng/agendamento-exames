-- Controle de pagamento das faturas emitidas
alter table public.faturas
add column if not exists pago boolean not null default false,
add column if not exists data_pagamento date null,
add column if not exists observacao_pagamento text null;
