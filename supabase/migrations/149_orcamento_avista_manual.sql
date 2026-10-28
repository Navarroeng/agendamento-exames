-- 149: Alternativa à vista manual nos laudos e serviços pontuais.
-- A caixa, o tipo e o desconto digitado ficam na proposta.
-- Não recalcula orçamentos existentes e não mexe em parcelas, total ou financeiro.

alter table public.orcamentos
  add column if not exists desconto_avista_tipo text null,
  add column if not exists desconto_avista_valor numeric(12, 2) null;

comment on column public.orcamentos.oferecer_desconto_avista is
  'True quando o PDF da proposta deve exibir a alternativa de pagamento à vista. Vale para PGR, LTCAT, AET, Insalubridade, Periculosidade e Parecer Técnico.';

comment on column public.orcamentos.valor_avista is
  'Valor final da alternativa à vista, já com o desconto manual. Null quando a opção está desmarcada. Não substitui o valor total nem as parcelas.';

comment on column public.orcamentos.desconto_avista_tipo is
  'valor = desconto em reais; percentual = desconto sobre o total final. Null nos registros anteriores a esta opção.';

comment on column public.orcamentos.desconto_avista_valor is
  'Desconto digitado, em reais ou em percentual, conforme desconto_avista_tipo. Zero exibe a opção à vista sem desconto.';

alter table public.orcamentos
  drop constraint if exists orcamentos_oferecer_desconto_avista_valor_check;

alter table public.orcamentos
  add constraint orcamentos_oferecer_desconto_avista_valor_check
  check (
    (
      oferecer_desconto_avista = false
      and valor_avista is null
      and desconto_avista_tipo is null
      and desconto_avista_valor is null
    )
    or (
      oferecer_desconto_avista = true
      and desconto_avista_tipo is null
      and desconto_avista_valor is null
      and valor_avista > 0
    )
    or (
      oferecer_desconto_avista = true
      and desconto_avista_tipo in ('valor', 'percentual')
      and desconto_avista_valor >= 0
      and valor_avista >= 0
    )
  );

alter table public.orcamentos
  drop constraint if exists orcamentos_desconto_avista_tipo_check;

alter table public.orcamentos
  add constraint orcamentos_desconto_avista_tipo_check
  check (
    desconto_avista_tipo is null
    or desconto_avista_tipo in ('valor', 'percentual')
  );
