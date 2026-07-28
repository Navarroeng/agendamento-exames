"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  IconReceipt,
  IconTag,
  IconUser,
  IconWallet,
} from "@/components/ui/icons/OutlineIcons";
import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import { resolveItemValorServico } from "@/lib/orcamento-calculo";
import { calcCondicoesPagamentoProposta } from "@/lib/orcamento-pagamento";
import { resolveValidadePropostaIso } from "@/lib/orcamento-validade";
import { formatCurrency } from "@/lib/money";
import {
  ORCAMENTO_STATUS_BADGE,
  ORCAMENTO_STATUS_LABELS,
  formatOrcamentoOrigemCliente,
  type OrcamentoComItens,
  type ServicoSstRecord,
} from "@/lib/orcamento-types";
import { resolveItensInclusosServico } from "@/lib/servico-sst-pacote";

interface OrcamentoViewModalProps {
  orcamento: OrcamentoComItens | null;
  servicos: ServicoSstRecord[];
  onClose: () => void;
  onEditar?: (id: string) => void;
  onGerarPdf?: (id: string) => void;
}

function displayValue(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

function ClientField({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#94a3b8]">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-bold leading-snug text-navy">
        {value}
      </p>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span className="h-4 w-1 rounded-full bg-[#c9972b]" aria-hidden />
      <h4 className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-navy">
        {children}
      </h4>
    </div>
  );
}

export function OrcamentoViewModal({
  orcamento,
  servicos,
  onClose,
  onEditar,
  onGerarPdf,
}: OrcamentoViewModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!orcamento) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [orcamento, onClose]);

  if (!orcamento || !mounted) return null;

  const itens = [...(orcamento.orcamento_itens ?? [])].sort(
    (a, b) => a.ordem - b.ordem
  );
  const badge = ORCAMENTO_STATUS_BADGE[orcamento.status];
  const condicoesPagamento = calcCondicoesPagamentoProposta(
    Number(orcamento.valor_total)
  );
  const validadeIso = resolveValidadePropostaIso(orcamento.data_proposta);
  const validadeLabel = validadeIso
    ? formatDateIsoToBR(validadeIso)
    : null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
        onClick={onClose}
        aria-label="Fechar"
      />

      <div
        className="relative z-10 flex max-h-[88vh] w-full max-w-[1120px] flex-col overflow-hidden rounded-2xl border border-[#dbe3ef] bg-white shadow-[0_28px_70px_rgba(8,43,99,0.22)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="orcamento-view-title"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho navy */}
        <div className="shrink-0 bg-gradient-to-r from-[#082b63] via-[#0a3578] to-[#0c3f8c] px-5 py-4 text-white sm:px-6 sm:py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h3
                  id="orcamento-view-title"
                  className="text-lg font-extrabold tracking-[-0.3px] sm:text-xl"
                >
                  Orçamento {orcamento.numero}
                </h3>
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${badge.className}`}
                >
                  {ORCAMENTO_STATUS_LABELS[orcamento.status]}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-white/80">
                <span>
                  Emissão:{" "}
                  <strong className="font-semibold text-white">
                    {formatDateIsoToBR(orcamento.data_proposta)}
                  </strong>
                </span>
                <span>
                  Responsável:{" "}
                  <strong className="font-semibold text-white">
                    {displayValue(orcamento.responsavel)}
                  </strong>
                </span>
                <span>
                  Origem:{" "}
                  <strong className="font-semibold text-white">
                    {formatOrcamentoOrigemCliente(orcamento.origem_cliente)}
                  </strong>
                </span>
                {validadeLabel ? (
                  <span className="text-white/70">
                    Válida até {validadeLabel}
                  </span>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/20 bg-white/10 text-lg text-white transition-colors hover:bg-white/20"
              aria-label="Fechar"
            >
              ×
            </button>
          </div>
        </div>

        {/* Conteúdo rolável */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden bg-[#f7f9fc] p-4 sm:space-y-5 sm:p-6">
          {/* Dados do cliente */}
          <section className="rounded-2xl border border-[#e4ebf4] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-5">
            <SectionTitle>Dados do cliente</SectionTitle>
            <div className="grid grid-cols-1 gap-x-8 gap-y-3.5 md:grid-cols-2">
              <ClientField
                label="Cliente"
                value={displayValue(orcamento.cliente_nome)}
              />
              <ClientField
                label="CNPJ"
                value={displayValue(orcamento.cliente_cnpj)}
              />
              <ClientField
                label="Setor"
                value={displayValue(orcamento.cliente_setor)}
              />
              <ClientField
                label="Contato"
                value={displayValue(orcamento.contato)}
              />
              <ClientField
                label="Endereço"
                value={displayValue(orcamento.cliente_endereco)}
                className="md:col-span-2 border-t border-[#eef2f7] pt-3.5"
              />
              <ClientField
                label="E-mail"
                value={displayValue(orcamento.email)}
              />
              <ClientField
                label="Telefone"
                value={displayValue(orcamento.telefone)}
              />
            </div>
          </section>

          {/* Serviços */}
          <section className="overflow-hidden rounded-2xl border border-[#e4ebf4] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="border-b border-[#e4ebf4] px-4 py-3 sm:px-5">
              <SectionTitle>Serviços do orçamento</SectionTitle>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-sm">
                <thead>
                  <tr className="bg-[#082b63] text-left text-[10px] font-semibold uppercase tracking-wide text-white">
                    <th className="px-4 py-3 font-semibold sm:px-5">Serviço</th>
                    <th className="px-3 py-3 text-center font-semibold">
                      Quantidade de colaboradores
                    </th>
                    <th className="px-4 py-3 text-right font-semibold sm:px-5">
                      Valor
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item, index) => {
                    const servicoCatalogo = servicos.find(
                      (servico) => servico.id === item.servico_id
                    );
                    const itensInclusos = resolveItensInclusosServico(
                      servicoCatalogo,
                      item.servico_nome
                    );

                    return (
                      <tr
                        key={item.id}
                        className={`border-t border-[#eef2f7] ${
                          index % 2 === 1 ? "bg-[#f8fafc]" : "bg-white"
                        }`}
                      >
                        <td className="px-4 py-3.5 align-top sm:px-5">
                          <p className="font-bold text-navy">
                            {item.servico_nome}
                          </p>
                          {itensInclusos.length > 0 ? (
                            <ul className="mt-1.5 space-y-0.5 text-[11px] leading-snug text-[#64748b]">
                              {itensInclusos.map((incluso) => (
                                <li key={incluso} className="flex gap-1.5">
                                  <span className="text-[#c9972b]">•</span>
                                  <span>{incluso}</span>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </td>
                        <td className="px-3 py-3.5 text-center align-top font-semibold text-[#334155]">
                          {item.quantidade}
                        </td>
                        <td className="px-4 py-3.5 text-right align-top font-extrabold text-navy sm:px-5">
                          {formatCurrency(resolveItemValorServico(item))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Observações */}
          {orcamento.observacoes?.trim() ? (
            <section className="rounded-2xl border border-[#e4ebf4] bg-white px-4 py-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:px-5">
              <SectionTitle>Observações</SectionTitle>
              <p className="text-sm leading-relaxed text-[#475569]">
                {orcamento.observacoes}
              </p>
            </section>
          ) : null}

          {/* Resumo financeiro */}
          <section className="overflow-hidden rounded-2xl border border-[#e8d7a8] bg-gradient-to-br from-[#fffbeb] via-[#fff8e8] to-white shadow-[0_10px_28px_rgba(201,151,43,0.12)]">
            <div className="bg-[#082b63] px-4 py-3 sm:px-5">
              <h4 className="text-center text-[11px] font-extrabold uppercase tracking-[0.1em] text-white">
                Resumo financeiro
              </h4>
            </div>

            <div className="divide-y divide-[#f1e4c0] px-4 py-1 sm:px-5">
              <div className="flex items-start justify-between gap-4 py-4">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#082b63]/10 text-[#082b63]">
                    <IconWallet size={16} />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">
                      Valor total
                    </p>
                    <p className="mt-0.5 text-2xl font-extrabold tracking-[-0.4px] text-[#082b63]">
                      {formatCurrency(Number(orcamento.valor_total))}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-start justify-between gap-4 py-4">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#082b63]/10 text-[#082b63]">
                    <IconReceipt size={16} />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">
                      Pagamento parcelado
                    </p>
                    <p className="mt-0.5 text-base font-extrabold text-[#0a3578]">
                      {condicoesPagamento.textoParcelado}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#64748b]">
                      Via boleto bancário
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-start justify-between gap-4 py-4">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#c9972b]/15 text-[#a07820]">
                    <IconTag size={16} />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">
                        Valor à vista
                      </p>
                      <span className="rounded-full bg-[#ecfdf5] px-2 py-0.5 text-[10px] font-bold text-[#047857]">
                        5% de desconto
                      </span>
                    </div>
                    <p className="mt-0.5 text-xl font-extrabold tracking-[-0.3px] text-[#a07820]">
                      {condicoesPagamento.textoAVista}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {validadeLabel ? (
              <div className="border-t border-[#f1e4c0] bg-[#fff8e8]/80 px-4 py-2.5 sm:px-5">
                <p className="text-center text-[11px] text-[#78716c]">
                  Proposta válida até{" "}
                  <span className="font-semibold text-[#57534e]">
                    {validadeLabel}
                  </span>
                  .
                </p>
              </div>
            ) : null}
          </section>
        </div>

        {/* Rodapé fixo */}
        <div className="flex shrink-0 flex-col gap-2 border-t border-[#e4ebf4] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
          <div className="hidden items-center gap-2 text-[11px] text-[#94a3b8] sm:flex">
            <IconUser size={14} />
            <span>{displayValue(orcamento.responsavel)}</span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn justify-center sm:w-auto"
              onClick={onClose}
            >
              Fechar
            </button>
            {onEditar ? (
              <button
                type="button"
                className="btn justify-center sm:w-auto"
                onClick={() => {
                  onClose();
                  onEditar(orcamento.id);
                }}
              >
                Editar
              </button>
            ) : null}
            {onGerarPdf ? (
              <button
                type="button"
                className="btn btn-primary justify-center sm:w-auto"
                onClick={() => onGerarPdf(orcamento.id)}
              >
                Gerar PDF
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
