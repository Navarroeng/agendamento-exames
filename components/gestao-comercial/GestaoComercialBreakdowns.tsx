"use client";

import { formatCurrency } from "@/lib/money";
import type {
  GestaoComercialDashboard,
  GestaoComercialGrupoResumo,
} from "@/lib/gestao-comercial";

function GrupoTable({
  title,
  rows,
}: {
  title: string;
  rows: GestaoComercialGrupoResumo[];
}) {
  return (
    <div className="rounded-2xl border border-[#e8edf5] bg-white p-5 shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
      <h4 className="mb-3 text-sm font-extrabold text-navy">{title}</h4>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-app-muted">Sem dados</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#eef2f7] text-[10px] uppercase tracking-wide text-[#8b95a8]">
                <th className="pb-2 font-bold">Item</th>
                <th className="pb-2 font-bold">Qtd</th>
                <th className="pb-2 font-bold">Valor</th>
                <th className="pb-2 font-bold">Ticket</th>
                <th className="pb-2 font-bold">%</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.chave} className="border-b border-[#f5f7fb]">
                  <td className="py-2 font-semibold text-[#1f2937]">{row.label}</td>
                  <td className="py-2">{row.quantidade}</td>
                  <td className="py-2">{formatCurrency(row.valorFechado)}</td>
                  <td className="py-2">{formatCurrency(row.ticketMedio)}</td>
                  <td className="py-2">{row.percentualValor.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function GestaoComercialBreakdowns({
  dashboard,
}: {
  dashboard: GestaoComercialDashboard;
}) {
  if (!dashboard.indicadoresDetalhadosDisponiveis) {
    return (
      <div className="rounded-2xl border border-[#e8edf5] bg-white p-5 text-sm text-app-muted shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
        {dashboard.mensagemDetalhesIndisponiveis ??
          "Informação indisponível para o período anterior ao sistema."}
      </div>
    );
  }

  const { novos, renovacoes } = dashboard.novosVsRenovacao;
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <GrupoTable
        title="Novos clientes × Renovações"
        rows={[novos, renovacoes]}
      />
      <GrupoTable title="Origem dos clientes" rows={dashboard.porOrigem} />
      <GrupoTable
        title="Resultado por responsável (no fechamento)"
        rows={dashboard.porResponsavel}
      />
      <div className="rounded-2xl border border-[#e8edf5] bg-white p-5 shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
        <h4 className="mb-3 text-sm font-extrabold text-navy">
          Forma de pagamento (condição final)
        </h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-[#f7f9fc] p-3">
            <p className="text-[10px] font-bold uppercase text-[#8b95a8]">
              À vista
            </p>
            <p className="mt-1 font-extrabold text-navy">
              {dashboard.pagamento.avistaQtd} contratos
            </p>
            <p className="text-xs text-[#5b6577]">
              {formatCurrency(dashboard.pagamento.avistaValor)}
            </p>
          </div>
          <div className="rounded-xl bg-[#f7f9fc] p-3">
            <p className="text-[10px] font-bold uppercase text-[#8b95a8]">
              Parcelado
            </p>
            <p className="mt-1 font-extrabold text-navy">
              {dashboard.pagamento.parceladoQtd} contratos
            </p>
            <p className="text-xs text-[#5b6577]">
              {formatCurrency(dashboard.pagamento.parceladoValor)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
