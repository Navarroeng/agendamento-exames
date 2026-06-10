import type { EsocialEmpresaPendenteRow } from "@/lib/relatorios/types";
import type { ESocialSummaryStats } from "@/lib/esocial-filters";
import { RelatoriosDataTable } from "./RelatoriosDataTable";
import { RelatoriosSection } from "./RelatoriosSection";

interface RelatoriosEsocialSectionProps {
  summary: ESocialSummaryStats;
  empresas: EsocialEmpresaPendenteRow[];
}

export function RelatoriosEsocialSection({
  summary,
  empresas,
}: RelatoriosEsocialSectionProps) {
  const rows = empresas.map((r) => [
    r.empresa,
    String(r.quantidadePendente),
    String(r.colaboradoresPendentes),
  ]);

  return (
    <RelatoriosSection title="e-Social" subtitle="Controle de envios e pendências.">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Enviados", value: summary.enviados, tone: "text-brand-green" },
          { label: "Pendentes", value: summary.pendentes, tone: "text-[#b45309]" },
          { label: "% enviado", value: `${summary.percentualEnviado}%`, tone: "text-brand-blue" },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-[#e8edf5] bg-white px-4 py-3 text-center"
          >
            <p className="text-[10px] font-bold uppercase text-[#8b95a8]">
              {card.label}
            </p>
            <p className={`mt-1 text-2xl font-extrabold ${card.tone}`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div>
        <h4 className="mb-3 text-sm font-bold text-navy">
          Empresas com pendências
        </h4>
        <RelatoriosDataTable
          headers={["Empresa", "Qtd. pendente", "Colaboradores"]}
          rows={rows}
        />
      </div>
    </RelatoriosSection>
  );
}
