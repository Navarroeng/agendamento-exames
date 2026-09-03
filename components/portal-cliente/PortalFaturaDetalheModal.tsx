"use client";

import { useCallback, useEffect, useState } from "react";
import { PORTAL_FATURA_STATUS_LABELS } from "@/lib/portal-faturas";
import type { PortalFaturaDetalhe } from "@/lib/portal-faturas";

type DetalheState =
  | { fase: "carregando" }
  | { fase: "erro"; mensagem: string }
  | { fase: "ok"; fatura: PortalFaturaDetalhe };

function CampoValor({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94a3b8]">
        {label}
      </span>
      <span className="mt-0.5 text-sm text-[#0b1f4d]">{valor}</span>
    </div>
  );
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

  // Fechar com Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onFechar]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e8edf5] px-6 py-4">
          <h2 className="text-base font-semibold text-[#0b1f4d]">
            {estado.fase === "ok"
              ? `Fatura Nº ${estado.fatura.numero}`
              : "Detalhe da Fatura"}
          </h2>
          <button
            type="button"
            onClick={onFechar}
            className="rounded-lg p-1.5 text-[#94a3b8] transition hover:bg-[#f1f5f9] hover:text-[#0b1f4d]"
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {estado.fase === "carregando" && (
            <p className="py-12 text-center text-sm text-[#94a3b8]">
              Carregando fatura...
            </p>
          )}
          {estado.fase === "erro" && (
            <p className="py-12 text-center text-sm text-[#dc2626]">
              {estado.mensagem}
            </p>
          )}
          {estado.fase === "ok" && (
            <DetalheConteudo fatura={estado.fatura} />
          )}
        </div>
      </div>
    </div>
  );
}

function DetalheConteudo({ fatura }: { fatura: PortalFaturaDetalhe }) {
  const statusLabel = PORTAL_FATURA_STATUS_LABELS[fatura.status];
  const vencida = fatura.status === "vencida";

  return (
    <div className="flex flex-col gap-6">
      {/* Dados da fatura */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <CampoValor
          label="Competência"
          valor={fatura.competencia ?? "—"}
        />
        <CampoValor
          label="Emissão"
          valor={fatura.dataEmissao ?? "—"}
        />
        <CampoValor label="Vencimento" valor={fatura.dataVencimento} />
        <CampoValor label="Valor total" valor={fatura.valorFormatado} />
        <div className="flex flex-col">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94a3b8]">
            Status
          </span>
          <span
            className={`mt-0.5 text-sm font-semibold ${vencida ? "text-[#dc2626]" : "text-[#0b1f4d]"}`}
          >
            {vencida ? "🔴 " : ""}
            {statusLabel}
          </span>
        </div>
        {fatura.pago && fatura.dataPagamento && (
          <CampoValor
            label="Pago em"
            valor={fatura.dataPagamento}
          />
        )}
      </div>

      {/* Itens */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-[#0b1f4d]">
          Itens da fatura ({fatura.totalItens})
        </h3>

        {fatura.itens.length === 0 ? (
          <p className="text-sm text-[#94a3b8]">Sem itens registrados.</p>
        ) : (
          <>
            {/* Tabela desktop */}
            <div className="hidden overflow-x-auto rounded-xl border border-[#e8edf5] md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#e8edf5] bg-[#f8fafc]">
                  <tr>
                    {["Colaborador", "Data", "Tipo ASO", "Exame", "Qtd", "V. Unit.", "Total"].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#94a3b8]"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {fatura.itens.map((item) => (
                    <tr key={item.id} className="bg-white">
                      <td className="px-3 py-2.5 text-xs text-[#475569]">
                        {item.colaborador}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-[#475569]">
                        {item.dataAgendamento}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-[#475569]">
                        {item.tipoAso}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-[#475569]">
                        {item.exameNome}
                      </td>
                      <td className="px-3 py-2.5 text-xs tabular-nums text-[#475569]">
                        {item.quantidade}
                      </td>
                      <td className="px-3 py-2.5 text-xs tabular-nums text-[#475569]">
                        {item.valorUnitarioFormatado}
                      </td>
                      <td className="px-3 py-2.5 text-xs tabular-nums font-semibold text-[#0b1f4d]">
                        {item.valorTotalFormatado}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-[#e8edf5] bg-[#f8fafc]">
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-[#475569]"
                    >
                      Total
                    </td>
                    <td className="px-3 py-2.5 text-sm font-bold tabular-nums text-[#0b1f4d]">
                      {fatura.valorFormatado}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Cards mobile */}
            <div className="flex flex-col gap-2 md:hidden">
              {fatura.itens.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-[#e8edf5] bg-white p-3"
                >
                  <p className="text-sm font-semibold text-[#0b1f4d]">
                    {item.colaborador}
                  </p>
                  <p className="text-xs text-[#64748b]">
                    {item.tipoAso} · {item.exameNome} · {item.dataAgendamento}
                  </p>
                  <p className="mt-1 text-xs text-[#475569]">
                    {item.quantidade}× {item.valorUnitarioFormatado} ={" "}
                    <span className="font-semibold text-[#0b1f4d]">
                      {item.valorTotalFormatado}
                    </span>
                  </p>
                </div>
              ))}
              <div className="mt-1 text-right text-sm font-bold text-[#0b1f4d]">
                Total: {fatura.valorFormatado}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Dados bancários para pagamento */}
      {(fatura.status === "emitida" || fatura.status === "vencida") &&
        !fatura.pago && (
          <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#94a3b8]">
              Dados para pagamento
            </p>
            <div className="grid grid-cols-1 gap-y-1 text-xs text-[#475569] sm:grid-cols-2">
              <span>
                <b>Banco:</b> {fatura.dadosBancarios.banco}
              </span>
              <span>
                <b>Agência:</b> {fatura.dadosBancarios.agencia}
              </span>
              <span>
                <b>Conta:</b> {fatura.dadosBancarios.conta}
              </span>
              <span>
                <b>PIX CNPJ:</b> {fatura.dadosBancarios.pixCnpj}
              </span>
              <span className="col-span-2">
                <b>Favorecido:</b> {fatura.dadosBancarios.favorecido}
              </span>
            </div>
          </div>
        )}
    </div>
  );
}
