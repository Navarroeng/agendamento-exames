-- 137: Serviço pontual "Laudo de Parecer Técnico".
-- Proposta comercial própria. Não entra no fluxo operacional do Laudo de Insalubridade.
-- Valor livre, parcelas inteiras >= 1 e desconto à vista opcional.

insert into public.servicos_sst (nome, ordem, ativo, itens_inclusos)
values (
  'Laudo de Parecer Técnico',
  12,
  true,
  jsonb_build_array(
    'Elaboração dos quesitos técnicos.',
    'Acompanhamento de perícia trabalhista.',
    'Elaboração de laudo de parecer técnico.'
  )
)
on conflict (nome) do update
set
  ativo = excluded.ativo,
  ordem = excluded.ordem,
  itens_inclusos = excluded.itens_inclusos;

alter table public.orcamentos
  add column if not exists oferecer_desconto_avista boolean not null default false,
  add column if not exists valor_avista numeric(12, 2) null;

comment on column public.orcamentos.oferecer_desconto_avista is
  'True somente quando a proposta do Laudo de Parecer Técnico oferece pagamento à vista com valor final informado. Demais serviços permanecem false.';

comment on column public.orcamentos.valor_avista is
  'Valor final à vista informado na proposta do Laudo de Parecer Técnico. Null quando a alternativa não é oferecida.';

alter table public.orcamentos
  drop constraint if exists orcamentos_oferecer_desconto_avista_valor_check;

alter table public.orcamentos
  add constraint orcamentos_oferecer_desconto_avista_valor_check
  check (
    (
      oferecer_desconto_avista = false
      and valor_avista is null
    )
    or (
      oferecer_desconto_avista = true
      and valor_avista > 0
    )
  );

-- O teto de 10 parcelas do Pacote SST continua na aplicação.
-- Este serviço aceita qualquer inteiro >= 1.
alter table public.orcamentos
  drop constraint if exists orcamentos_quantidade_parcelas_check;

alter table public.orcamentos
  add constraint orcamentos_quantidade_parcelas_check
  check (
    quantidade_parcelas is null
    or quantidade_parcelas >= 1
  );

comment on column public.orcamentos.quantidade_parcelas is
  'Quantidade de parcelas da proposta. Pacote SST: 1 a 10, com parcela mínima na aplicação. Laudo de Parecer Técnico: inteiro >= 1, sem esse teto.';
