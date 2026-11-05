"use client";

import { Field, RequiredMark } from "@/components/ui/Field";
import type { OrcamentoAprovacaoFormValues } from "@/lib/orcamento-aprovacao";
import {
  DIAS_VENCIMENTO_MENSALIDADE,
  MENSALIDADE_VENCIMENTO_QUINTO_DIA_UTIL,
} from "@/lib/contrato-navarro";
import { formatCurrency, maskMoneyInput, parseMoney } from "@/lib/money";
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
  mensalidade_dia_vencimento: string;
  mensalidade_vencimento_regra: string;
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
    if (forma === "mensal" || !base || value.mensalidade_valor_avista.trim()) {
      onChange({ ...value, mensalidade_pagamento: forma });
      return;
    }
    const informado =
      value.mensalidade_desconto_tipo === "percentual"
        ? parseDecimalBr(value.mensalidade_desconto)
        : parseMoney(value.mensalidade_desconto);
    const calculo = calcularAvistaPorDesconto(
      base,
      value.mensalidade_desconto_tipo,
      Number.isFinite(informado) ? informado : 0
    );
    onChange({
      ...value,
      mensalidade_pagamento: "avista",
      mensalidade_valor_avista: textoMoedaCentavos(calculo.valorFinalCentavos),
      mensalidade_fonte: "desconto",
    });
  }

  function escolherDia(dia: 10 | 20) {
    onChange({
      ...value,
      mensalidade_dia_vencimento: String(dia),
      mensalidade_vencimento_regra: "",
    });
  }

  function escolherQuintoDiaUtil() {
    onChange({
      ...value,
      mensalidade_dia_vencimento: "",
      mensalidade_vencimento_regra: MENSALIDADE_VENCIMENTO_QUINTO_DIA_UTIL,
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
            À vista
          </label>
        </div>
      </div>

      {value.mensalidade_pagamento === "mensal" ? (
        <div className="space-y-3 rounded-[10px] border border-[#eef2f7] bg-white px-4 py-3">
          <Field label={<>Valor da mensalidade <RequiredMark /></>}>
            <input
              className="field-input"
              value={value.valor_final}
              disabled={disabled}
              onChange={(e) => alterarValorMensal(e.target.value)}
            />
          </Field>
          <div>
            <p className="mb-2 text-xs font-bold text-navy">
              Vencimento <RequiredMark />
            </p>
            <div className="flex flex-col gap-1.5 text-sm font-semibold text-[#334155]">
              {DIAS_VENCIMENTO_MENSALIDADE.map((dia) => (
                <label key={dia} className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="mensalidade-vencimento-plano"
                    className="h-4 w-4 accent-brand-blue"
                    checked={
                      value.mensalidade_dia_vencimento === String(dia) &&
                      value.mensalidade_vencimento_regra !==
                        MENSALIDADE_VENCIMENTO_QUINTO_DIA_UTIL
                    }
                    disabled={disabled}
                    onChange={() => escolherDia(dia)}
                  />
                  Dia {dia}
                </label>
              ))}
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="mensalidade-vencimento-plano"
                  className="h-4 w-4 accent-brand-blue"
                  checked={
                    value.mensalidade_vencimento_regra ===
                    MENSALIDADE_VENCIMENTO_QUINTO_DIA_UTIL
                  }
                  disabled={disabled}
                  onChange={escolherQuintoDiaUtil}
                />
                5º dia útil
              </label>
            </div>
            <p className="mt-2 text-[11px] text-[#64748b]">
              A primeira mensalidade vence no mês seguinte ao início da vigência.
              O 5º dia útil segue o calendário bancário e não é o dia 05.
            </p>
          </div>
          <div className="rounded-lg border border-[#e8eef6] bg-[#f8fbff] px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748b]">
              Resumo
            </p>
            <p className="mt-1 text-sm font-extrabold text-navy">
              {valorMensal > 0
                ? `${meses} mensalidades de ${formatCurrency(valorMensal)} — Total anual: ${formatCurrency(valorMensal * meses)}`
                : "—"}
            </p>
            <p className="mt-1 text-[12px] text-[#475569]">
              Vigência de {meses} meses.
            </p>
          </div>
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
          <p className="text-[11px] text-[#64748b]">
            Referência da mensalidade negociada. Não é o valor à vista.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Linha label="Vigência" value={`${meses} meses`} />
            <Linha
              label={`Total dos ${meses} meses`}
              value={
                base
                  ? formatCurrency(base.baseGestaoCentavos / 100)
                  : "—"
              }
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
            Base do desconto: a gestão do período
            {base ? ` (${formatCurrency(base.baseGestaoCentavos / 100)})` : ""},
            calculada pela mensalidade de referência × {meses}. O desconto
            incide uma única vez sobre essa base. Serviços pontuais entram uma
            vez no total e não recebem desconto automático.
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
            <Field label={<>Valor final a pagar <RequiredMark /></>}>
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
            O valor final é o total da vigência, não uma mensalidade. Selecionar
            à vista não registra o pagamento como recebido.
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
