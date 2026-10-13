"use client";

import { Field, RequiredMark } from "@/components/ui/Field";
import type { OrcamentoAprovacaoFormValues } from "@/lib/orcamento-aprovacao";
import { formatCurrency, maskMoneyInput, parseMoney } from "@/lib/money";
import { formatValorMensalidade } from "@/lib/orcamento-modalidade";
import {
  calcularAvistaPorDesconto,
  calcularAvistaPorValorFinal,
  montarBaseMensalidadeAvista,
  parseDecimalBr,
  textoDescontoNaUnidade,
  textoMoedaCentavos,
  type ItemValorMensalidade,
  type MensalidadeDescontoTipo,
  type MensalidadeFonteCalculo,
  type MensalidadeFormaPagamento,
} from "@/lib/orcamento-mensalidade-pagamento";

export type MensalidadePagamentoEditorValue = {
  mensalidade_pagamento: MensalidadeFormaPagamento;
  valor_final: string;
  mensalidade_desconto_tipo: MensalidadeDescontoTipo;
  mensalidade_desconto: string;
  mensalidade_valor_avista: string;
  mensalidade_vencimento: string;
  mensalidade_fonte: MensalidadeFonteCalculo;
  mensalidade_meses: string;
};

export function OrcamentoMensalidadePagamentoEditor({
  value,
  itens,
  disabled,
  onChange,
}: {
  value: OrcamentoAprovacaoFormValues;
  itens: ItemValorMensalidade[];
  disabled?: boolean;
  onChange: (next: MensalidadePagamentoEditorValue) => void;
}) {
  const meses = Math.max(1, Math.floor(Number(value.mensalidade_meses)) || 1);
  const valorMensal = parseMoney(value.valor_final);
  const base =
    valorMensal > 0
      ? montarBaseMensalidadeAvista({ valorMensal, meses, itens })
      : null;

  function selecionarForma(forma: MensalidadeFormaPagamento) {
    if (forma === value.mensalidade_pagamento) return;
    if (forma === "mensal" || !base) {
      onChange({ ...value, mensalidade_pagamento: "mensal" });
      return;
    }
    const calculo = calcularAvistaPorDesconto(base, "valor", 0);
    onChange({
      ...value,
      mensalidade_pagamento: "avista",
      mensalidade_desconto_tipo: "valor",
      mensalidade_desconto: "",
      mensalidade_valor_avista: textoMoedaCentavos(calculo.valorFinalCentavos),
      mensalidade_fonte: "desconto",
    });
  }

  function alterarValorMensal(texto: string) {
    const mascarado = maskMoneyInput(texto);
    if (value.mensalidade_pagamento !== "avista") {
      onChange({ ...value, valor_final: mascarado });
      return;
    }
    const proximaBase = montarBaseMensalidadeAvista({
      valorMensal: parseMoney(mascarado),
      meses,
      itens,
    });
    if (value.mensalidade_fonte === "final") {
      const calculo = calcularAvistaPorValorFinal(
        proximaBase,
        parseMoney(value.mensalidade_valor_avista)
      );
      onChange({
        ...value,
        valor_final: mascarado,
        mensalidade_desconto: textoDescontoNaUnidade(
          calculo,
          value.mensalidade_desconto_tipo
        ),
      });
      return;
    }
    const calculo = calcularAvistaPorDesconto(
      proximaBase,
      value.mensalidade_desconto_tipo,
      value.mensalidade_desconto_tipo === "percentual"
        ? parseDecimalBr(value.mensalidade_desconto)
        : parseMoney(value.mensalidade_desconto)
    );
    onChange({
      ...value,
      valor_final: mascarado,
      mensalidade_valor_avista: textoMoedaCentavos(calculo.valorFinalCentavos),
    });
  }

  function alterarDesconto(texto: string) {
    if (!base) {
      onChange({
        ...value,
        mensalidade_desconto: texto,
        mensalidade_fonte: "desconto",
      });
      return;
    }
    const informado =
      value.mensalidade_desconto_tipo === "percentual" ? texto : maskMoneyInput(texto);
    const calculo = calcularAvistaPorDesconto(
      base,
      value.mensalidade_desconto_tipo,
      value.mensalidade_desconto_tipo === "percentual"
        ? parseDecimalBr(informado)
        : parseMoney(informado)
    );
    onChange({
      ...value,
      mensalidade_desconto: informado,
      mensalidade_valor_avista: textoMoedaCentavos(calculo.valorFinalCentavos),
      mensalidade_fonte: "desconto",
    });
  }

  function alterarValorFinal(texto: string) {
    const mascarado = maskMoneyInput(texto);
    if (!base) {
      onChange({
        ...value,
        mensalidade_valor_avista: mascarado,
        mensalidade_fonte: "final",
      });
      return;
    }
    const calculo = calcularAvistaPorValorFinal(base, parseMoney(mascarado));
    onChange({
      ...value,
      mensalidade_valor_avista: mascarado,
      mensalidade_desconto: textoDescontoNaUnidade(
        calculo,
        value.mensalidade_desconto_tipo
      ),
      mensalidade_fonte: "final",
    });
  }

  function alterarTipo(tipo: MensalidadeDescontoTipo) {
    if (!base || tipo === value.mensalidade_desconto_tipo) {
      onChange({ ...value, mensalidade_desconto_tipo: tipo });
      return;
    }
    const atual =
      value.mensalidade_fonte === "final"
        ? calcularAvistaPorValorFinal(base, parseMoney(value.mensalidade_valor_avista))
        : calcularAvistaPorDesconto(
            base,
            value.mensalidade_desconto_tipo,
            value.mensalidade_desconto_tipo === "percentual"
              ? parseDecimalBr(value.mensalidade_desconto)
              : parseMoney(value.mensalidade_desconto)
          );
    onChange({
      ...value,
      mensalidade_desconto_tipo: tipo,
      mensalidade_desconto: textoDescontoNaUnidade(atual, tipo),
      mensalidade_valor_avista: textoMoedaCentavos(atual.valorFinalCentavos),
      mensalidade_fonte: "desconto",
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-2 text-xs font-bold text-navy">
          Forma de pagamento <RequiredMark />
        </p>
        <div className="flex flex-wrap gap-4">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#334155]">
            <input
              type="radio"
              name="mensalidade-forma"
              className="h-4 w-4 accent-brand-blue"
              checked={value.mensalidade_pagamento === "mensal"}
              disabled={disabled}
              onChange={() => selecionarForma("mensal")}
            />
            Mensal
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#334155]">
            <input
              type="radio"
              name="mensalidade-forma"
              className="h-4 w-4 accent-brand-blue"
              checked={value.mensalidade_pagamento === "avista"}
              disabled={disabled}
              onChange={() => selecionarForma("avista")}
            />
            À vista — pagamento único de toda a vigência
          </label>
        </div>
      </div>

      {value.mensalidade_pagamento === "mensal" ? (
        <div className="rounded-[10px] border border-[#eef2f7] bg-white px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748b]">
            Condição de pagamento
          </p>
          <p className="mt-1 text-sm font-extrabold text-navy">
            {meses} mensalidades
          </p>
          <p className="mt-1 text-sm font-bold text-navy">
            {valorMensal > 0 ? formatValorMensalidade(valorMensal) : "—"}
          </p>
          <p className="mt-2 text-[12px] text-[#475569]">
            Vigência contratual: {meses} {meses === 1 ? "mês" : "meses"}
          </p>
        </div>
      ) : (
        <div className="space-y-3 rounded-[10px] border border-[#eef2f7] bg-white px-4 py-3">
          <Field label={<>Valor mensal de referência <RequiredMark /></>}>
            <input
              className="field-input"
              value={value.valor_final}
              disabled={disabled}
              onChange={(e) => alterarValorMensal(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Linha
              label="Meses contratados"
              value={String(meses)}
            />
            <Linha
              label="Total bruto do período"
              value={base ? formatCurrency(base.valorBrutoCentavos / 100) : "—"}
            />
            <Linha
              label="Serviços pontuais"
              value={
                base && base.valorPontualCentavos > 0
                  ? formatCurrency(base.valorPontualCentavos / 100)
                  : "Nenhum"
              }
            />
          </div>
          <p className="text-[11px] text-[#64748b]">
            O desconto incide só sobre a gestão do período. Serviços pontuais
            entram uma vez e não recebem desconto automático.
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Desconto">
              <div className="flex gap-2">
                <select
                  className="field-input max-w-[88px]"
                  value={value.mensalidade_desconto_tipo}
                  disabled={disabled}
                  onChange={(e) =>
                    alterarTipo(e.target.value === "percentual" ? "percentual" : "valor")
                  }
                >
                  <option value="valor">R$</option>
                  <option value="percentual">%</option>
                </select>
                <input
                  className="field-input"
                  value={value.mensalidade_desconto}
                  disabled={disabled}
                  inputMode="decimal"
                  onChange={(e) => alterarDesconto(e.target.value)}
                />
              </div>
            </Field>
            <Field label={<>Valor final à vista <RequiredMark /></>}>
              <input
                className="field-input"
                value={value.mensalidade_valor_avista}
                disabled={disabled}
                onChange={(e) => alterarValorFinal(e.target.value)}
              />
            </Field>
          </div>
          <Field label={<>Vencimento do pagamento único <RequiredMark /></>}>
            <input
              type="date"
              className="field-input max-w-[200px]"
              value={value.mensalidade_vencimento}
              disabled={disabled}
              onChange={(e) =>
                onChange({ ...value, mensalidade_vencimento: e.target.value })
              }
            />
          </Field>
          <p className="text-[11px] text-[#64748b]">
            À vista não marca o pagamento como quitado.
          </p>
        </div>
      )}
    </div>
  );
}

function Linha({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748b]">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-bold text-navy">{value}</p>
    </div>
  );
}
