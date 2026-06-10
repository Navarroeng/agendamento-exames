import { Field, RequiredMark } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import { IconFileText } from "@/components/ui/icons/OutlineIcons";
import type { CargoFormField } from "@/hooks/useCargoForm";
import type { CargoFormValues, ExameRecord } from "@/lib/types";

interface CargoFormProps {
  form: CargoFormValues;
  catalogExames: ExameRecord[];
  catalogLoading: boolean;
  isEditing: boolean;
  onChange: (field: CargoFormField, value: string) => void;
  onToggleExame: (exameId: string) => void;
  onSetExameAlerta: (exameId: string, gerarAlerta: boolean) => void;
}

export function CargoForm({
  form,
  catalogExames,
  catalogLoading,
  isEditing,
  onChange,
  onToggleExame,
  onSetExameAlerta,
}: CargoFormProps) {
  const selectedExames = catalogExames.filter((exame) =>
    form.exameIds.includes(exame.id)
  );

  return (
    <Panel
      id="cadastrar-cargo"
      title={isEditing ? "Editar cargo" : "Novo cargo"}
      icon={<IconFileText />}
    >
      <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 md:grid-cols-2">
        <Field label={<>Nome do cargo <RequiredMark /></>}>
          <input
            className="field-input"
            placeholder="Ex.: Eletricista, Operador de empilhadeira..."
            value={form.nome}
            onChange={(e) => onChange("nome", e.target.value)}
          />
        </Field>
        <Field label="Status">
          <select
            className="field-input"
            value={form.ativo}
            onChange={(e) => onChange("ativo", e.target.value)}
          >
            <option value="Ativo">Ativo</option>
            <option value="Inativo">Inativo</option>
          </select>
        </Field>
        <Field label="Descrição" className="md:col-span-2">
          <textarea
            className="field-input min-h-[72px] resize-y py-2.5"
            placeholder="Descrição opcional do cargo..."
            value={form.descricao}
            onChange={(e) => onChange("descricao", e.target.value)}
          />
        </Field>
      </div>

      <div className="mt-5 border-t border-[#eef2f7] pt-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-navy">
              Exames obrigatórios <RequiredMark />
            </p>
            <p className="mt-0.5 text-[11px] text-[#64748b]">
              Selecione os exames exigidos para este cargo no agendamento.
            </p>
          </div>
          <span className="rounded-full bg-brand-blue-soft px-2.5 py-1 text-[10px] font-bold text-brand-blue">
            {form.exameIds.length} selecionado
            {form.exameIds.length !== 1 ? "s" : ""}
          </span>
        </div>

        {catalogLoading && (
          <p className="py-6 text-center text-sm text-app-muted">
            Carregando catálogo de exames...
          </p>
        )}

        {!catalogLoading && catalogExames.length === 0 && (
          <p className="py-6 text-center text-sm text-app-muted">
            Nenhum exame ativo no catálogo.
          </p>
        )}

        {!catalogLoading && catalogExames.length > 0 && (
          <div className="max-h-[280px] overflow-y-auto rounded-xl border border-[#e8edf5] bg-[#f8fafc] p-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {catalogExames.map((exame) => {
                const checked = form.exameIds.includes(exame.id);
                return (
                  <label
                    key={exame.id}
                    className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors ${
                      checked
                        ? "border-brand-blue/30 bg-white shadow-[0_2px_8px_rgba(79,99,255,0.08)]"
                        : "border-transparent bg-white/70 hover:border-[#e2e8f0]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-[#cbd5e1] text-brand-blue focus:ring-brand-blue/20"
                      checked={checked}
                      onChange={() => onToggleExame(exame.id)}
                    />
                    <span className="min-w-0">
                      <span className="block text-xs font-bold text-navy">
                        {exame.nome}
                      </span>
                      {exame.categoria ? (
                        <span className="mt-0.5 block text-[10px] text-[#64748b]">
                          {exame.categoria}
                        </span>
                      ) : null}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {selectedExames.length > 0 && (
          <div className="mt-4 rounded-xl border border-[#e8edf5] bg-white p-3">
            <p className="mb-3 text-xs font-bold text-navy">
              Alertas de periódico (repetição em 6 meses)
            </p>
            <div className="space-y-2">
              {selectedExames.map((exame) => {
                const gerarAlerta = Boolean(form.exameAlertas[exame.id]);
                return (
                  <div
                    key={exame.id}
                    className="flex flex-col gap-2 rounded-lg border border-[#eef2f7] bg-[#f8fafc] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="text-xs font-bold text-navy">
                      {exame.nome}
                    </span>
                    <div className="flex flex-wrap gap-3">
                      <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-[#475569]">
                        <input
                          type="radio"
                          name={`alerta-${exame.id}`}
                          checked={!gerarAlerta}
                          onChange={() => onSetExameAlerta(exame.id, false)}
                        />
                        Não gerar alerta
                      </label>
                      <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-[#475569]">
                        <input
                          type="radio"
                          name={`alerta-${exame.id}`}
                          checked={gerarAlerta}
                          onChange={() => onSetExameAlerta(exame.id, true)}
                        />
                        Gerar alerta em 6 meses
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}
