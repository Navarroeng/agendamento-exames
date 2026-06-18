import { ExamPreparoAlert } from "./ExamPreparoAlert";
import { Panel } from "@/components/ui/Panel";
import { IconFlask } from "@/components/ui/icons/OutlineIcons";
import { CARGO_SEM_EXAMES_TOAST } from "@/lib/agendamento-exames-cargo";
import type { ExameFormItem, ExameRecord } from "@/lib/types";
import { ExamTableRow } from "./ExamTableRow";
import { ExamTotals } from "./ExamTotals";

interface ExamSectionProps {
  exams: ExameFormItem[];
  totals: {
    totalCliente: number;
    totalCusto: number;
    totalLucro: number;
  };
  clinicaNome: string;
  cargoId: string;
  cargoSemExames: boolean;
  catalogExames: ExameRecord[];
  pricingLoading: boolean;
  onRemove: (id: string) => void;
  onUpdate: (id: string, field: keyof ExameFormItem, value: string) => void;
}

const TH =
  "border-b border-[#eef2f7] bg-[#f8fafc] px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-[#64748b] whitespace-nowrap";

export function ExamSection({
  exams,
  totals,
  clinicaNome,
  cargoId,
  cargoSemExames,
  catalogExames,
  pricingLoading,
  onRemove,
  onUpdate,
}: ExamSectionProps) {
  const examesComTipo = exams.filter((exam) => exam.tipo_exame.trim());

  return (
    <Panel title="Exames" icon={<IconFlask />} iconTone="green">
      <p className="mb-3 text-[11px] font-medium text-[#94a3b8]">
        Os exames são carregados automaticamente conforme o cargo selecionado.
        Você pode remover itens da lista, se necessário.
      </p>

      {!cargoId.trim() && (
        <div className="mb-3 rounded-[10px] border border-[#e8edf5] bg-[#f8fafc] px-3 py-2 text-[11px] font-medium text-[#64748b]">
          Selecione um cargo para carregar os exames obrigatórios.
        </div>
      )}

      {cargoSemExames && (
        <div className="mb-3 rounded-[10px] border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[11px] font-medium text-[#b91c1c]">
          {CARGO_SEM_EXAMES_TOAST}
        </div>
      )}

      {!clinicaNome.trim() && cargoId.trim() && (
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
            {examesComTipo.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="border-b border-[#eef2f7] px-2.5 py-4 text-center text-xs text-[#94a3b8]"
                >
                  {pricingLoading
                    ? "Carregando exames do cargo..."
                    : "Nenhum exame na lista."}
                </td>
              </tr>
            ) : (
              examesComTipo.map((exam) => (
                <ExamTableRow
                  key={exam.id}
                  exam={exam}
                  pricingLoading={pricingLoading}
                  canRemove
                  onRemove={() => onRemove(exam.id)}
                  onUpdate={(field, value) => onUpdate(exam.id, field, value)}
                />
              ))
            )}
          </tbody>
          {examesComTipo.length > 0 ? (
            <ExamTotals
              totalCliente={totals.totalCliente}
              totalCusto={totals.totalCusto}
              totalLucro={totals.totalLucro}
            />
          ) : null}
        </table>
      </div>

      <ExamPreparoAlert exams={exams} catalogExames={catalogExames} />
    </Panel>
  );
}
