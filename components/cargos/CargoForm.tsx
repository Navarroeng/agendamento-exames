import { Field, RequiredMark } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import { IconFileText } from "@/components/ui/icons/OutlineIcons";
import { formatValidadePeriodicoLabel } from "@/lib/cargo-periodico";
import type { CargoFormField } from "@/hooks/useCargoForm";
import type { CargoFormValues, ExameRecord } from "@/lib/types";

interface CargoFormProps {
  form: CargoFormValues;
  catalogExames: ExameRecord[];
  catalogLoading: boolean;
  isEditing: boolean;
  onChange: (field: CargoFormField, value: string) => void;
  onToggleExame: (exameId: string) => void;
}

export function CargoForm({
  form,
  catalogExames,
  catalogLoading,
  isEditing,
  onChange,
  onToggleExame,
}: CargoFormProps) {
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
        <Field
          label="Validade dos exames periódicos"
          className="md:col-span-2"
        >
          <select
            className="field-input"
            value={form.validadePeriodicoMeses}
            onChange={(e) => onChange("validadePeriodicoMeses", e.target.value)}
          >
            <option value="12">
              {formatValidadePeriodicoLabel(12)}
            </option>
            <option value="6">
              {formatValidadePeriodicoLabel(6)}
            </option>
          </select>
          <p className="mt-1.5 text-[11px] text-[#64748b]">
            Cargos com validade de 6 meses geram alertas em Periódicos Futuros
            para todos os exames vinculados. Cargos de 12 meses seguem o
            padrão contratual e não geram alerta.
          </p>
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
      </div>
    </Panel>
  );
}
