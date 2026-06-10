import { formatCurrency } from "@/lib/money";
import type { ExameRecord } from "@/lib/types";

interface ClinicaExamesAddFormProps {
  examesDisponiveis: ExameRecord[];
  addExameId: string;
  addCusto: string;
  addPrazo: string;
  saving: boolean;
  onExameChange: (value: string) => void;
  onCustoChange: (value: string) => void;
  onPrazoChange: (value: string) => void;
  onSave: () => void;
}

export function ClinicaExamesAddForm({
  examesDisponiveis,
  addExameId,
  addCusto,
  addPrazo,
  saving,
  onExameChange,
  onCustoChange,
  onPrazoChange,
  onSave,
}: ClinicaExamesAddFormProps) {
  return (
    <div className="rounded-[20px] border border-[#e8edf5] bg-gradient-to-b from-white to-[#fbfdff] p-5 shadow-[0_8px_28px_rgba(15,23,42,0.05)]">
      <h4 className="mb-4 text-sm font-extrabold text-navy">
        Vincular exame à clínica
      </h4>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase text-app-muted">
            Exame
          </label>
          <select
            className="field-input"
            value={addExameId}
            onChange={(e) => onExameChange(e.target.value)}
          >
            <option value="">Selecione...</option>
            {examesDisponiveis.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome} — Navarro {formatCurrency(Number(e.valor_navarro))}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase text-app-muted">
            Custo clínica (R$)
          </label>
          <input
            className="field-input"
            value={addCusto}
            onChange={(e) => onCustoChange(e.target.value)}
            placeholder="0,00"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase text-app-muted">
            Prazo resultado
          </label>
          <input
            className="field-input"
            value={addPrazo}
            onChange={(e) => onPrazoChange(e.target.value)}
            placeholder="Ex.: 3 dias úteis"
          />
        </div>
        <div className="flex items-end">
          <button
            type="button"
            className="btn btn-primary w-full justify-center"
            disabled={saving}
            onClick={onSave}
          >
            {saving ? "Salvando..." : "Salvar vínculo"}
          </button>
        </div>
      </div>
    </div>
  );
}
