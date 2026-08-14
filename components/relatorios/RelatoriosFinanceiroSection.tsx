import { formatCurrency } from "@/lib/money";
import type {
  ChartPoint,
  LucratividadeClinicaRow,
  LucratividadeEmpresaRow,
  RelatoriosKpis,
} from "@/lib/relatorios/types";
import { RelatoriosChartCard } from "./RelatoriosChartCard";
import { RelatoriosDataTable } from "./RelatoriosDataTable";
import { RelatoriosExportButtons } from "./RelatoriosExportButtons";
import { RelatoriosSection } from "./RelatoriosSection";

interface RelatoriosFinanceiroSectionProps {
  kpis: RelatoriosKpis | null;
  lucratividadeEmpresa: LucratividadeEmpresaRow[];
  lucratividadeClinica: LucratividadeClinicaRow[];
  chartFaturamento: ChartPoint[];
  chartExames: ChartPoint[];
}

export function RelatoriosFinanceiroSection({
  kpis,
  lucratividadeEmpresa,
  lucratividadeClinica,
  chartFaturamento,
  chartExames,
}: RelatoriosFinanceiroSectionProps) {
  const ticketMedio =
    kpis && kpis.totalAsosMes > 0
      ? kpis.totalFaturado / kpis.totalAsosMes
      : 0;

  const empresaRows = lucratividadeEmpresa.map((r) => [
    r.empresa,
    formatCurrency(r.totalFaturado),
    formatCurrency(r.custoClinica),
    formatCurrency(r.lucro),
    `${r.margemPercentual}%`,
  ]);

  const clinicaRows = lucratividadeClinica.map((r) => [
    r.clinica,
    String(r.totalExames),
    formatCurrency(r.custoTotal),
    formatCurrency(r.ticketMedio),
  ]);

  return (
    <RelatoriosSection
      title="Financeiro"
      subtitle="Faturamento, custos, lucro e lucratividade por empresa e clínica."
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Previsto no mês", value: formatCurrency(kpis?.totalFaturado ?? 0) },
          { label: "Custos clínicas", value: formatCurrency(kpis?.custosClinicas ?? 0) },
          { label: "Lucro bruto", value: formatCurrency(kpis?.lucroBruto ?? 0) },
          { label: "Ticket médio", value: formatCurrency(ticketMedio) },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-[#e8edf5] bg-white px-4 py-3"
          >
            <p className="text-[10px] font-bold uppercase text-[#8b95a8]">
              {card.label}
            </p>
            <p className="mt-1 text-lg font-extrabold text-navy">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <RelatoriosChartCard
          title="Evolução mensal — faturamento, custos e lucro"
          data={chartFaturamento}
          type="multi"
          valueFormat="currency"
        />
        <RelatoriosChartCard
          title="Exames mais realizados"
          data={chartExames}
        />
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-bold text-navy">Lucratividade por empresa</h4>
          <RelatoriosExportButtons
            title="Lucratividade por empresa"
            filenameBase="lucratividade-empresa"
            headers={["Empresa", "Faturado", "Custo", "Lucro", "Margem %"]}
            rows={empresaRows.map((r) => r.map(String))}
          />
        </div>
        <RelatoriosDataTable
          headers={["Empresa", "Faturado", "Custo", "Lucro", "Margem %"]}
          rows={empresaRows}
        />
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-bold text-navy">Lucratividade por clínica</h4>
          <RelatoriosExportButtons
            title="Lucratividade por clínica"
            filenameBase="lucratividade-clinica"
            headers={["Clínica", "Exames", "Custo total", "Ticket médio"]}
            rows={clinicaRows.map((r) => r.map(String))}
          />
        </div>
        <RelatoriosDataTable
          headers={["Clínica", "Exames", "Custo total", "Ticket médio"]}
          rows={clinicaRows}
        />
      </div>
    </RelatoriosSection>
  );
}
