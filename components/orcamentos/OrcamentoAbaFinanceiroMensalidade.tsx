"use client";

import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import { formatCurrency } from "@/lib/money";
import {
  MENSALIDADE_PARCELAS_QUANTIDADE,
  SITUACAO_PARCELA_MENSALIDADE_LABEL,
  type ParcelaMensalidadeGrade,
  type SituacaoParcelaMensalidade,
} from "@/lib/mensalidade-parcelas";

const SITUACAO_COR: Record<SituacaoParcelaMensalidade, string> = {
  em_aberto: "text-[#64748b]",
  vence_hoje: "text-[#a16207]",
  vencida: "text-[#b91c1c]",
  paga: "text-[#047857]",
};

export function OrcamentoAbaFinanceiroMensalidade({
  loading,
  pendencias,
  parcelas,
  observacao,
  disabled,
  onChangePagoEm,
  onChangeObservacao,
  onVerComprovante,
}: {
  loading: boolean;
  pendencias: string[];
  parcelas: ParcelaMensalidadeGrade[];
  observacao: string;
  disabled: boolean;
  onChangePagoEm: (numero: number, pagoEm: string) => void;
  onChangeObservacao: (value: string) => void;
  onVerComprovante?: (path: string) => void;
}) {
  const resumo = parcelas.reduce(
    (acc, parcela) => {
      acc[parcela.situacao] += 1;
      return acc;
    },
    { em_aberto: 0, vence_hoje: 0, vencida: 0, paga: 0 }
  );

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-navy">
          Mensalidades da vigência
        </p>
        <p className="mt-1 text-[12px] text-[#64748b]">
          A primeira vence no mês seguinte ao início da vigência. O
          recebimento é registrado manualmente e não libera nem bloqueia as
          demais etapas.
        </p>
      </div>

      {loading ? (
        <p className="text-[12px] text-[#64748b]">Carregando parcelas…</p>
      ) : pendencias.length > 0 ? (
        <p className="text-[12px] text-[#92400e]">
          Para montar as 12 parcelas, faltam: {pendencias.join(", ")}. Essa
          pendência não bloqueia a implantação.
        </p>
      ) : (
        <>
          <p className="text-[12px] text-[#475569]">
            {resumo.em_aberto} em aberto
            {" · "}
            {resumo.vence_hoje} vence hoje
            {" · "}
            {resumo.vencida} vencida{resumo.vencida === 1 ? "" : "s"}
            {" · "}
            {resumo.paga} paga{resumo.paga === 1 ? "" : "s"}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-[12px] text-[#334155]">
              <thead>
                <tr className="border-b border-[#e4ebf4] text-[10px] font-extrabold uppercase tracking-wide text-[#64748b]">
                  <th className="py-1.5 pr-2 font-extrabold">Parcela</th>
                  <th className="py-1.5 pr-2 font-extrabold">Vencimento</th>
                  <th className="py-1.5 pr-2 font-extrabold">Valor</th>
                  <th className="py-1.5 pr-2 font-extrabold">Data de pagamento</th>
                  <th className="py-1.5 font-extrabold">Situação</th>
                </tr>
              </thead>
              <tbody>
                {parcelas.map((parcela) => (
                  <tr
                    key={parcela.numero}
                    className="border-b border-[#f1f5f9]"
                  >
                    <td className="py-1.5 pr-2">
                      {parcela.numero}/{MENSALIDADE_PARCELAS_QUANTIDADE}
                    </td>
                    <td className="py-1.5 pr-2">
                      {formatDateIsoToBR(parcela.vencimentoIso)}
                    </td>
                    <td className="py-1.5 pr-2">{formatCurrency(parcela.valor)}</td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="date"
                        className="field-input h-8 max-w-[150px] py-1 text-[12px]"
                        value={parcela.pagoEmIso ?? ""}
                        disabled={disabled}
                        onChange={(event) =>
                          onChangePagoEm(parcela.numero, event.target.value)
                        }
                      />
                      {parcela.pagoEmIso && parcela.valorRecebido != null ? (
                        <p className="mt-1 text-[11px] text-[#047857]">
                          Recebido {formatCurrency(parcela.valorRecebido)}
                        </p>
                      ) : null}
                      {parcela.comprovantePath && onVerComprovante ? (
                        <button
                          type="button"
                          className="mt-1 block text-[11px] font-semibold text-brand-blue hover:underline"
                          onClick={() =>
                            onVerComprovante(parcela.comprovantePath!)
                          }
                        >
                          Ver comprovante
                          {parcela.comprovanteNome
                            ? ` (${parcela.comprovanteNome})`
                            : ""}
                        </button>
                      ) : null}
                    </td>
                    <td
                      className={`py-1.5 font-semibold ${SITUACAO_COR[parcela.situacao]}`}
                    >
                      {SITUACAO_PARCELA_MENSALIDADE_LABEL[parcela.situacao]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <label className="block">
        <span className="mb-1.5 block text-xs font-bold text-navy">
          Observações
        </span>
        <textarea
          className="field-input min-h-[72px] resize-y"
          value={observacao}
          disabled={disabled}
          onChange={(event) => onChangeObservacao(event.target.value)}
        />
      </label>
    </div>
  );
}
