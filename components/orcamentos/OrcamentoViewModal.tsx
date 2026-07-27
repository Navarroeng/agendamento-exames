"use client";

import { Modal } from "@/components/ui/Modal";
import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import { resolveItemValorServico } from "@/lib/orcamento-calculo";
import { formatCurrency } from "@/lib/money";
import {
  ORCAMENTO_STATUS_BADGE,
  ORCAMENTO_STATUS_LABELS,
  type OrcamentoComItens,
  type ServicoSstRecord,
} from "@/lib/orcamento-types";
import { OrcamentoPacoteInclusosCard } from "./OrcamentoPacoteInclusosCard";
import { resolveItensInclusosServico } from "@/lib/servico-sst-pacote";

interface OrcamentoViewModalProps {
  orcamento: OrcamentoComItens | null;
  servicos: ServicoSstRecord[];
  onClose: () => void;
  onEditar?: (id: string) => void;
  onGerarPdf?: (id: string) => void;
}

export function OrcamentoViewModal({
  orcamento,
  servicos,
  onClose,
  onEditar,
  onGerarPdf,
}: OrcamentoViewModalProps) {
  if (!orcamento) return null;

  const itens = [...(orcamento.orcamento_itens ?? [])].sort(
    (a, b) => a.ordem - b.ordem
  );
  const badge = ORCAMENTO_STATUS_BADGE[orcamento.status];

  return (
    <Modal
      open={Boolean(orcamento)}
      onClose={onClose}
      title={`Orçamento ${orcamento.numero}`}
      wide
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span
          className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${badge.className}`}
        >
          {ORCAMENTO_STATUS_LABELS[orcamento.status]}
        </span>
        <span className="text-[11px] text-[#64748b]">
          Data: {formatDateIsoToBR(orcamento.data_proposta)}
        </span>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        {[
          ["Cliente", orcamento.cliente_nome],
          ["Contato", orcamento.contato ?? "—"],
          ["E-mail", orcamento.email ?? "—"],
          ["Telefone", orcamento.telefone ?? "—"],
          ["Responsável", orcamento.responsavel],
          [
            "Validade",
            formatDateIsoToBR(orcamento.validade_proposta) || "—",
          ],
          ["Forma de pagamento", orcamento.forma_pagamento ?? "—"],
          [
            "Desconto",
            `${Number(orcamento.desconto_percentual).toFixed(2).replace(".", ",")}%`,
          ],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-[#e8edf5] bg-[#f8fafc] px-4 py-3"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
              {label}
            </p>
            <p className="text-sm font-bold text-navy">{value}</p>
          </div>
        ))}
      </div>

      {orcamento.observacoes?.trim() ? (
        <div className="mb-4 rounded-xl border border-[#e8edf5] bg-white px-4 py-3">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
            Observações
          </p>
          <p className="text-sm text-[#475569]">{orcamento.observacoes}</p>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-[#e8edf5]">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="bg-[#f8fafc] text-left text-[10px] font-semibold uppercase tracking-wide text-[#64748b]">
              <th className="px-3 py-2">Serviço</th>
              <th className="px-3 py-2">Quantidade de colaboradores</th>
              <th className="px-3 py-2">Valor</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => {
              const servicoCatalogo = servicos.find(
                (servico) => servico.id === item.servico_id
              );
              const itensInclusos = resolveItensInclusosServico(
                servicoCatalogo,
                item.servico_nome
              );

              return (
                <tr key={item.id} className="border-t border-[#eef2f7]">
                  <td className="px-3 py-2 font-medium text-navy">
                    {item.servico_nome}
                    {itensInclusos.length > 0 && (
                      <OrcamentoPacoteInclusosCard
                        servico={servicoCatalogo}
                        servicoNome={item.servico_nome}
                        compact
                      />
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">{item.quantidade}</td>
                  <td className="px-3 py-2 align-top font-semibold">
                    {formatCurrency(resolveItemValorServico(item))}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-[#eef2f7] bg-[#f8fafc]">
              <td colSpan={2} className="px-3 py-2 text-right text-xs font-semibold">
                Subtotal
              </td>
              <td className="px-3 py-2 font-bold">
                {formatCurrency(Number(orcamento.subtotal))}
              </td>
            </tr>
            <tr className="border-t border-[#eef2f7] bg-brand-blue-soft/30">
              <td colSpan={2} className="px-3 py-2 text-right text-xs font-extrabold uppercase">
                Valor total
              </td>
              <td className="px-3 py-2 text-base font-extrabold text-navy">
                {formatCurrency(Number(orcamento.valor_total))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {(onEditar || onGerarPdf) && (
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          {onGerarPdf && (
            <button
              type="button"
              className="btn"
              onClick={() => onGerarPdf(orcamento.id)}
            >
              Gerar PDF
            </button>
          )}
          {onEditar && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                onClose();
                onEditar(orcamento.id);
              }}
            >
              Editar
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}
