"use client";

import { useMemo, useState } from "react";
import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import { formatCNPJ } from "@/lib/cnpj";
import { formatCurrency } from "@/lib/money";
import { formatOrcamentoOrigemCliente } from "@/lib/orcamento-origem";
import type { GestaoComercialFechamentoRow } from "@/lib/gestao-comercial";

type SortKey =
  | "aprovadoEm"
  | "clienteNome"
  | "valorFechado"
  | "responsavelNoFechamento"
  | "origem";

export function GestaoComercialTabela({
  rows,
}: {
  rows: GestaoComercialFechamentoRow[];
}) {
  const [sortKey, setSortKey] = useState<SortKey>("aprovadoEm");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "valorFechado") {
        cmp = a.valorFechado - b.valorFechado;
      } else if (sortKey === "origem") {
        cmp = String(a.origem ?? "").localeCompare(String(b.origem ?? ""), "pt-BR");
      } else {
        cmp = String(a[sortKey] ?? "").localeCompare(
          String(b[sortKey] ?? ""),
          "pt-BR"
        );
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "aprovadoEm" ? "desc" : "asc");
    }
  };

  const th = (key: SortKey, label: string) => (
    <th className="whitespace-nowrap px-2 py-2">
      <button
        type="button"
        className="font-bold uppercase tracking-wide text-[#8b95a8] hover:text-navy"
        onClick={() => toggleSort(key)}
      >
        {label}
        {sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
      </button>
    </th>
  );

  return (
    <div className="rounded-2xl border border-[#e8edf5] bg-white p-5 shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
      <h4 className="mb-1 text-sm font-extrabold text-navy">
        Detalhamento dos fechamentos
      </h4>
      <p className="mb-4 text-xs text-app-muted">
        Soma desta tabela = valor dos cards e do gráfico do período filtrado.
      </p>
      {sorted.length === 0 ? (
        <p className="py-8 text-center text-sm text-app-muted">
          Nenhum contrato fechado no período.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="border-b border-[#eef2f7] text-[10px]">
              <tr>
                {th("aprovadoEm", "Aprovação")}
                <th className="px-2 py-2 font-bold uppercase text-[#8b95a8]">
                  Orçamento
                </th>
                <th className="px-2 py-2 font-bold uppercase text-[#8b95a8]">
                  Contrato
                </th>
                {th("clienteNome", "Cliente")}
                <th className="px-2 py-2 font-bold uppercase text-[#8b95a8]">
                  CNPJ
                </th>
                {th("origem", "Origem")}
                {th("responsavelNoFechamento", "Responsável")}
                <th className="px-2 py-2 font-bold uppercase text-[#8b95a8]">
                  Colab.
                </th>
                <th className="px-2 py-2 font-bold uppercase text-[#8b95a8]">
                  Valor original
                </th>
                {th("valorFechado", "Valor final")}
                <th className="px-2 py-2 font-bold uppercase text-[#8b95a8]">
                  Pagamento
                </th>
                <th className="px-2 py-2 font-bold uppercase text-[#8b95a8]">
                  Status
                </th>
                <th className="px-2 py-2 font-bold uppercase text-[#8b95a8]">
                  Ver
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr key={row.aprovacaoId} className="border-b border-[#f5f7fb]">
                  <td className="px-2 py-2 whitespace-nowrap">
                    {formatDateIsoToBR(row.aprovadoEm.slice(0, 10))}
                  </td>
                  <td className="px-2 py-2 font-semibold">{row.numeroOrcamento}</td>
                  <td className="px-2 py-2">{row.numeroContrato ?? "—"}</td>
                  <td className="px-2 py-2 font-semibold">{row.clienteNome}</td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    {formatCNPJ(row.clienteCnpj)}
                  </td>
                  <td className="px-2 py-2">
                    {formatOrcamentoOrigemCliente(row.origem)}
                  </td>
                  <td className="px-2 py-2">
                    {row.responsavelNoFechamento}
                    {row.responsavelAproximado ? (
                      <span
                        className="ml-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-800"
                        title="Aproximação: backfill do responsável atual do orçamento (antes do snapshot)."
                      >
                        approx.
                      </span>
                    ) : null}
                  </td>
                  <td className="px-2 py-2">{row.quantidadeColaboradores}</td>
                  <td className="px-2 py-2">
                    {formatCurrency(row.valorOriginalOrcamento)}
                  </td>
                  <td className="px-2 py-2 font-semibold">
                    {formatCurrency(row.valorFechado)}
                    {row.usouValorOriginalFallback ? (
                      <span
                        className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600"
                        title="Sem valor final aprovado válido; usado o valor original do orçamento."
                      >
                        original
                      </span>
                    ) : null}
                  </td>
                  <td className="px-2 py-2">
                    {row.formaPagamento === "avista" ? "À vista" : "Parcelado"}
                  </td>
                  <td className="px-2 py-2">{row.statusContrato ?? "—"}</td>
                  <td className="px-2 py-2">
                    <a
                      className="text-xs font-bold text-[#4354e8] hover:underline"
                      href={`/orcamentos?numero=${encodeURIComponent(row.numeroOrcamento)}`}
                    >
                      Abrir
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
