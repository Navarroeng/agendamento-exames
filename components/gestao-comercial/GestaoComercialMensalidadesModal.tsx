"use client";

import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import type {
  LinhaMensalidadePrevista,
  ResumoMensalidadesPrevistas,
} from "@/lib/gestao-comercial-mensalidades";
import { formatCurrency } from "@/lib/money";
import { Modal } from "@/components/ui/Modal";

const SITUACAO_COR: Record<LinhaMensalidadePrevista["situacao"], string> = {
  em_aberto: "text-[#64748b]",
  vence_hoje: "text-[#a16207]",
  vencida: "text-[#b91c1c]",
  paga: "text-[#047857]",
  pendencia: "text-[#92400e]",
};

export function GestaoComercialMensalidadesModal({
  open,
  onClose,
  resumo,
}: {
  open: boolean;
  onClose: () => void;
  resumo: ResumoMensalidadesPrevistas;
}) {
  const previstas = resumo.linhas.filter((linha) => linha.compoeTotal);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="extraWide"
      title={`Mensalidades previstas — ${resumo.periodoLabel}`}
      subtitle="Gestão SST com cobrança mensal, pelo vencimento da parcela. O total inclui pagas e em aberto e não depende da data de fechamento nem do filtro de contratos ativos."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-medium text-app-muted">
            {resumo.disponivel
              ? `${previstas.length} ${
                  previstas.length === 1 ? "parcela" : "parcelas"
                } no total previsto${
                  resumo.pendencias > 0
                    ? ` · ${resumo.pendencias} ${
                        resumo.pendencias === 1 ? "pendência" : "pendências"
                      } fora da soma`
                    : ""
                }`
              : resumo.mensagemIndisponivel}
          </p>
          <p className="text-sm font-extrabold text-navy">
            Total previsto{" "}
            {resumo.disponivel ? formatCurrency(resumo.valor) : "—"}
          </p>
        </div>
      }
    >
      {!resumo.disponivel ? (
        <p className="text-sm text-[#92400e]">{resumo.mensagemIndisponivel}</p>
      ) : resumo.linhas.length === 0 ? (
        <p className="text-sm text-app-muted">
          Nenhuma mensalidade com vencimento neste período.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-[13px] text-[#334155]">
            <thead>
              <tr className="border-b border-[#e4ebf4] text-[10px] font-extrabold uppercase tracking-wide text-[#64748b]">
                <th className="py-2 pr-3 font-extrabold">Cliente</th>
                <th className="py-2 pr-3 font-extrabold">Contrato</th>
                <th className="py-2 pr-3 font-extrabold">Parcela</th>
                <th className="py-2 pr-3 font-extrabold">Vencimento</th>
                <th className="py-2 pr-3 font-extrabold">Valor</th>
                <th className="py-2 font-extrabold">Situação</th>
              </tr>
            </thead>
            <tbody>
              {resumo.linhas.map((linha) => (
                <tr key={linha.chave} className="border-b border-[#f1f5f9]">
                  <td className="py-2 pr-3 font-semibold text-navy">
                    {linha.clienteNome}
                  </td>
                  <td className="py-2 pr-3">{linha.contrato}</td>
                  <td className="py-2 pr-3">{linha.parcela}</td>
                  <td className="py-2 pr-3">
                    {linha.vencimentoIso
                      ? formatDateIsoToBR(linha.vencimentoIso)
                      : "—"}
                  </td>
                  <td className="py-2 pr-3">
                    {linha.valor == null ? "—" : formatCurrency(linha.valor)}
                  </td>
                  <td
                    className={`py-2 font-semibold ${SITUACAO_COR[linha.situacao]}`}
                  >
                    {linha.situacaoLabel}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
