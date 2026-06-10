import { Panel } from "@/components/ui/Panel";
import { IconFlask } from "@/components/ui/icons/OutlineIcons";
import { ExamTableRow } from "./ExamTableRow";
import { ExamTotals } from "./ExamTotals";
import type { ExameFormItem, ExameRecord } from "@/lib/types";

interface ExamSectionProps {
  exams: ExameFormItem[];
  totals: {
    totalCliente: number;
    totalCusto: number;
    totalLucro: number;
  };
  clinicaNome: string;
  catalogExames: ExameRecord[];
  catalogLoading: boolean;
  pricingLoading: boolean;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, field: keyof ExameFormItem, value: string) => void;
}

const TH =
  "border-b border-[#eef2f7] bg-[#f8fafc] px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-[#64748b] whitespace-nowrap";

export function ExamSection({
  exams,
  totals,
  clinicaNome,
  catalogExames,
  catalogLoading,
  pricingLoading,
  onAdd,
  onRemove,
  onUpdate,
}: ExamSectionProps) {
  return (
    <Panel
      title="Exames"
      icon={<IconFlask />}
      iconTone="green"
      action={
        <button type="button" className="btn btn-primary text-xs" onClick={onAdd}>
          + Acrescentar exame
        </button>
      }
    >
      <p className="mb-3 text-[11px] font-medium text-[#94a3b8]">
        Os valores são preenchidos automaticamente com base na clínica e no
        catálogo de exames.
      </p>

      {!clinicaNome.trim() && (
        <div className="mb-3 rounded-[10px] border border-[#e8edf5] bg-[#f8fafc] px-3 py-1.5 text-[11px] font-medium text-[#64748b]">
          Selecione a clínica no formulário acima para carregar os preços.
        </div>
      )}

      <div className="overflow-x-auto rounded-[10px] border border-[#eef2f7]">
        <table className="w-full min-w-[680px] border-collapse">
          <thead>
            <tr>
              <th className={TH}>Tipo do exame</th>
              <th className={TH}>Valor Cliente (R$)</th>
              <th className={TH}>Custo Clínica (R$)</th>
              <th className={TH}>Lucro (R$)</th>
              <th className={TH}>Tipo de preço</th>
              <th className={`${TH} w-10 text-center`}>Ação</th>
            </tr>
          </thead>
          <tbody>
            {exams.map((exam) => (
              <ExamTableRow
                key={exam.id}
                exam={exam}
                catalogExames={catalogExames}
                catalogLoading={catalogLoading}
                pricingLoading={pricingLoading}
                canRemove={exams.length > 1}
                onRemove={() => onRemove(exam.id)}
                onUpdate={(field, value) => onUpdate(exam.id, field, value)}
              />
            ))}
          </tbody>
          <ExamTotals
            totalCliente={totals.totalCliente}
            totalCusto={totals.totalCusto}
            totalLucro={totals.totalLucro}
          />
        </table>
      </div>
    </Panel>
  );
}
