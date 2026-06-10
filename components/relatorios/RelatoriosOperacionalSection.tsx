import { formatCurrency } from "@/lib/money";
import type {
  ExameRealizadoRow,
  PendenciaOperacionalRow,
} from "@/lib/relatorios/types";
import { RelatoriosDataTable } from "./RelatoriosDataTable";
import { RelatoriosExportButtons } from "./RelatoriosExportButtons";
import { RelatoriosSection } from "./RelatoriosSection";

interface RelatoriosOperacionalSectionProps {
  pendencias: PendenciaOperacionalRow[];
  examesRealizados: ExameRealizadoRow[];
}

export function RelatoriosOperacionalSection({
  pendencias,
  examesRealizados,
}: RelatoriosOperacionalSectionProps) {
  const pendRows = pendencias.map((r) => [
    r.empresa,
    r.colaborador,
    r.statusPendente,
    r.data,
    r.responsavel,
  ]);

  const exameRows = examesRealizados.map((r) => [
    r.data,
    r.empresa,
    r.colaborador,
    r.exame,
    r.clinica,
    formatCurrency(r.valorCliente),
    formatCurrency(r.custoClinica),
    formatCurrency(r.lucro),
  ]);

  return (
    <RelatoriosSection
      title="Operacional"
      subtitle="Pendências e exames realizados no período filtrado."
    >
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-bold text-navy">Pendências operacionais</h4>
          <RelatoriosExportButtons
            title="Pendências operacionais"
            filenameBase="pendencias-operacionais"
            headers={["Empresa", "Colaborador", "Status", "Data", "Responsável"]}
            rows={pendRows.map((r) => r.map(String))}
          />
        </div>
        <RelatoriosDataTable
          headers={["Empresa", "Colaborador", "Status pendente", "Data", "Responsável"]}
          rows={pendRows}
        />
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-bold text-navy">Exames realizados</h4>
          <RelatoriosExportButtons
            title="Exames realizados"
            filenameBase="exames-realizados"
            headers={[
              "Data",
              "Empresa",
              "Colaborador",
              "Exame",
              "Clínica",
              "Valor cliente",
              "Custo clínica",
              "Lucro",
            ]}
            rows={exameRows.map((r) => r.map(String))}
          />
        </div>
        <RelatoriosDataTable
          headers={[
            "Data",
            "Empresa",
            "Colaborador",
            "Exame",
            "Clínica",
            "Valor",
            "Custo",
            "Lucro",
          ]}
          rows={exameRows}
          maxHeight="360px"
        />
      </div>
    </RelatoriosSection>
  );
}
