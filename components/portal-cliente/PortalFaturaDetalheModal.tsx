"use client";

import { useCallback, useEffect, useState } from "react";
import { IconCreditCard } from "@/components/ui/icons/OutlineIcons";
import {
  PORTAL_FATURA_STATUS_LABELS,
  type PortalFaturaDetalhe,
  type PortalFaturaStatus,
} from "@/lib/portal-faturas";

type DetalheState =
  | { fase: "carregando" }
  | { fase: "erro"; mensagem: string }
  | { fase: "ok"; fatura: PortalFaturaDetalhe };

function statusBadgeClass(status: PortalFaturaStatus): string {
  switch (status) {
    case "emitida":
      return "border-[#fde68a]/80 bg-[#fffbeb] text-[#b45309]";
    case "vencida":
      return "border-[#fecaca]/80 bg-[#fef2f2] text-[#b91c1c]";
    case "paga":
      return "border-[#bbf7d0]/80 bg-[#f0fdf4] text-[#15803d]";
    case "cancelada":
      return "border-[#fecaca]/70 bg-[#fef2f2] text-[#b91c1c]";
    default:
      return "border-[#e2e8f0] bg-[#f8fafc] text-[#64748b]";
  }
}

export function PortalFaturaDetalheModal({
  faturaId,
  clienteId,
  clienteNome,
  onFechar,
}: {
  faturaId: string;
  clienteId: string;
  clienteNome: string;
  onFechar: () => void;
}) {
  const [estado, setEstado] = useState<DetalheState>({ fase: "carregando" });

  const carregar = useCallback(async () => {
    setEstado({ fase: "carregando" });
    try {
      const res = await fetch(
        `/api/portal/faturas/${encodeURIComponent(faturaId)}?cliente_id=${encodeURIComponent(clienteId)}&cliente_nome=${encodeURIComponent(clienteNome)}`,
        { cache: "no-store" }
      );
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        fatura?: PortalFaturaDetalhe;
        error?: string;
      };
      if (!res.ok || !json.fatura) {
        setEstado({
          fase: "erro",
          mensagem: json.error ?? "Fatura não encontrada.",
        });
        return;
      }
      setEstado({ fase: "ok", fatura: json.fatura });
    } catch {
      setEstado({ fase: "erro", mensagem: "Erro ao carregar a fatura." });
    }
  }, [faturaId, clienteId, clienteNome]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onFechar]);

  const tituloNumero =
    estado.fase === "ok" ? estado.fatura.numero : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b1f4d]/45 p-3 sm:p-5">
      <div className="flex max-h-[min(92vh,920px)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_64px_rgba(11,31,77,0.22)]">
        {/* Header */}
        <div className="relative shrink-0 border-b border-[#e8edf5]">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-[#0b1f4d]" />
          <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-5 sm:px-7">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#94a3b8]">
                Fatura
              </p>
              <h2 className="mt-1 truncate text-lg font-bold tracking-tight text-[#0b1f4d] sm:text-xl">
                {tituloNumero ?? "Detalhe da fatura"}
              </h2>
            </div>
            <button
              type="button"
              onClick={onFechar}
              className="shrink-0 rounded-lg p-1.5 text-[#94a3b8] transition hover:bg-[#f1f5f9] hover:text-[#0b1f4d]"
              aria-label="Fechar"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          {estado.fase === "carregando" && (
            <p className="py-16 text-center text-sm text-[#94a3b8]">
              Carregando fatura...
            </p>
          )}
          {estado.fase === "erro" && (
            <p className="py-16 text-center text-sm text-[#b91c1c]">
              {estado.mensagem}
            </p>
          )}
          {estado.fase === "ok" && (
            <DetalheConteudo fatura={estado.fatura} />
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end border-t border-[#eef2f7] bg-[#fafbfc] px-5 py-3 sm:px-7">
          <button
            type="button"
            onClick={onFechar}
            className="rounded-lg border border-[#e2e8f0] bg-white px-4 py-2 text-sm font-semibold text-[#475569] shadow-sm transition hover:border-[#cbd5e1] hover:bg-[#f8fafc] hover:text-[#0b1f4d]"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

function DetalheConteudo({ fatura }: { fatura: PortalFaturaDetalhe }) {
  const statusLabel = PORTAL_FATURA_STATUS_LABELS[fatura.status];
  const itensLabel =
    fatura.totalItens === 1
      ? "1 item faturado"
      : `${fatura.totalItens} itens faturados`;
  const mostrarPagamento =
    (fatura.status === "emitida" || fatura.status === "vencida") &&
    !fatura.pago;

  const resumoCards: {
    label: string;
    valor: string;
    destaque?: boolean;
  }[] = [
    { label: "Competência", valor: fatura.competencia ?? "—" },
    { label: "Emissão", valor: fatura.dataEmissao ?? "—" },
    { label: "Vencimento", valor: fatura.dataVencimento },
    {
      label: "Valor total",
      valor: fatura.valorFormatado,
      destaque: true,
    },
  ];

  return (
    <div className="flex flex-col gap-6 sm:gap-7">
      {/* Resumo */}
      <section>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
          {resumoCards.map((card) => (
            <div
              key={card.label}
              className={
                card.destaque
                  ? "rounded-xl border border-[#0b1f4d]/15 bg-[#0b1f4d] px-3.5 py-3 text-white shadow-[0_8px_20px_rgba(11,31,77,0.12)]"
                  : "rounded-xl border border-[#e8edf5] bg-[#f8fafc] px-3.5 py-3"
              }
            >
              <p
                className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${
                  card.destaque ? "text-white/70" : "text-[#94a3b8]"
                }`}
              >
                {card.label}
              </p>
              <p
                className={`mt-1.5 truncate text-sm font-bold tabular-nums sm:text-[15px] ${
                  card.destaque ? "text-white" : "text-[#0b1f4d]"
                }`}
                title={card.valor}
              >
                {card.valor}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusBadgeClass(fatura.status)}`}
          >
            {statusLabel}
          </span>
          {fatura.pago && fatura.dataPagamento ? (
            <span className="text-xs text-[#64748b]">
              Pago em{" "}
              <span className="font-semibold text-[#0b1f4d]">
                {fatura.dataPagamento}
              </span>
            </span>
          ) : null}
        </div>
      </section>

      {/* Itens */}
      <section className="overflow-hidden rounded-2xl border border-[#e8edf5] bg-white">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-[#eef2f7] bg-[#fafbfc] px-4 py-3.5 sm:px-5">
          <div>
            <h3 className="text-sm font-bold text-[#0b1f4d]">
              Itens da fatura
            </h3>
            <p className="mt-0.5 text-xs text-[#94a3b8]">{itensLabel}</p>
          </div>
        </div>

        {fatura.itens.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-[#94a3b8]">
            Sem itens registrados.
          </p>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead>
                  <tr className="bg-[#0b1f4d]">
                    {[
                      "Colaborador",
                      "Data",
                      "Tipo ASO",
                      "Exame",
                      "Qtd",
                      "V. Unit.",
                      "Total",
                    ].map((h) => (
                      <th
                        key={h}
                        className={`px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/85 ${
                          h === "Qtd" || h === "V. Unit." || h === "Total"
                            ? "text-right"
                            : ""
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fatura.itens.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-[#f1f5f9] transition-colors hover:bg-[#f8fafc]"
                    >
                      <td className="max-w-[180px] px-4 py-3.5 text-[13px] font-medium leading-snug text-[#0b1f4d]">
                        {item.colaborador}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-[13px] tabular-nums text-[#64748b]">
                        {item.dataAgendamento}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-[13px] text-[#64748b]">
                        {item.tipoAso}
                      </td>
                      <td className="max-w-[160px] px-4 py-3.5 text-[13px] leading-snug text-[#475569]">
                        {item.exameNome}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right text-[13px] tabular-nums text-[#64748b]">
                        {item.quantidade}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right text-[13px] tabular-nums text-[#64748b]">
                        {item.valorUnitarioFormatado}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right text-[13px] font-bold tabular-nums text-[#0b1f4d]">
                        {item.valorTotalFormatado}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-2.5 p-3 md:hidden">
              {fatura.itens.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-[#eef2f7] bg-[#fafbfc] px-3.5 py-3"
                >
                  <p className="text-sm font-semibold leading-snug text-[#0b1f4d]">
                    {item.colaborador}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[#64748b]">
                    {item.tipoAso} · {item.exameNome} · {item.dataAgendamento}
                  </p>
                  <p className="mt-2 text-xs text-[#64748b]">
                    {item.quantidade}× {item.valorUnitarioFormatado}
                    <span className="ml-2 font-bold tabular-nums text-[#0b1f4d]">
                      {item.valorTotalFormatado}
                    </span>
                  </p>
                </div>
              ))}
            </div>

            <div className="flex items-end justify-end border-t border-[#eef2f7] bg-[#fafbfc] px-4 py-4 sm:px-5">
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#94a3b8]">
                  Total da fatura
                </p>
                <p className="mt-1 text-xl font-bold tabular-nums tracking-tight text-[#0b1f4d]">
                  {fatura.valorFormatado}
                </p>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Dados para pagamento */}
      {mostrarPagamento ? (
        <section className="overflow-hidden rounded-2xl border border-[#e8edf5] bg-white">
          <div className="flex items-center gap-2.5 border-b border-[#eef2f7] bg-[#fafbfc] px-4 py-3.5 sm:px-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0b1f4d]/5 text-[#0b1f4d]">
              <IconCreditCard size={16} />
            </span>
            <h3 className="text-sm font-bold text-[#0b1f4d]">
              Dados para pagamento
            </h3>
          </div>

          <div className="px-4 py-4 sm:px-5 sm:py-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(
                [
                  ["Banco", fatura.dadosBancarios.banco],
                  ["Agência", fatura.dadosBancarios.agencia],
                  ["Conta", fatura.dadosBancarios.conta],
                  ["PIX CNPJ", fatura.dadosBancarios.pixCnpj],
                ] as const
              ).map(([label, valor]) => (
                <div
                  key={label}
                  className="rounded-xl border border-[#f1f5f9] bg-[#f8fafc] px-3.5 py-3"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#94a3b8]">
                    {label}
                  </p>
                  <p className="mt-1.5 text-sm font-semibold tabular-nums text-[#0b1f4d]">
                    {valor}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 border-t border-[#f1f5f9] pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#94a3b8]">
                Favorecido
              </p>
              <p className="mt-1.5 text-sm font-medium leading-relaxed text-[#334155]">
                {fatura.dadosBancarios.favorecido}
              </p>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
