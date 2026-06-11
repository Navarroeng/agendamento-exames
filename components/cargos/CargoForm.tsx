import { RequiredMark } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import { IconCalendar, IconFileText } from "@/components/ui/icons/OutlineIcons";
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
  const periodicidadeNaoSelecionada = form.validadePeriodicoMeses === "";

  return (
    <Panel
      id="cadastrar-cargo"
      title={isEditing ? "Editar cargo" : "Novo cargo"}
      icon={<IconFileText />}
    >
      <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 md:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-bold text-navy">
            Nome do cargo <RequiredMark />
          </label>
          <input
            className="field-input"
            placeholder="Ex.: Eletricista, Operador de empilhadeira..."
            value={form.nome}
            onChange={(e) => onChange("nome", e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold text-navy">
            Status
          </label>
          <select
            className="field-input"
            value={form.ativo}
            onChange={(e) => onChange("ativo", e.target.value)}
          >
            <option value="Ativo">Ativo</option>
            <option value="Inativo">Inativo</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <div
            className={`rounded-xl border-2 px-4 py-4 ${
              periodicidadeNaoSelecionada
                ? "border-[#fbbf24] bg-[#fffbeb] shadow-[0_4px_16px_rgba(251,191,36,0.12)]"
                : "border-brand-blue/30 bg-[#f0f4ff] shadow-[0_4px_16px_rgba(79,99,255,0.08)]"
            }`}
          >
            <div className="mb-3 flex items-start gap-2.5">
              <span
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  periodicidadeNaoSelecionada
                    ? "bg-[#fef3c7] text-[#b45309]"
                    : "bg-brand-blue-soft text-brand-blue"
                }`}
              >
                <IconCalendar size={18} />
              </span>
              <div>
                <p className="text-sm font-extrabold text-navy">
                  Validade dos exames periódicos <RequiredMark />
                </p>
                <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-[#b45309]">
                  (Obrigatório)
                </p>
              </div>
            </div>

            <select
              className={`field-input w-full font-semibold ${
                periodicidadeNaoSelecionada
                  ? "border-[#fbbf24] bg-white text-[#64748b]"
                  : "border-brand-blue/25 bg-white text-navy"
              }`}
              value={form.validadePeriodicoMeses}
              onChange={(e) =>
                onChange("validadePeriodicoMeses", e.target.value)
              }
            >
              <option value="" disabled>
                Selecione a periodicidade obrigatória
              </option>
              <option value="6">{formatValidadePeriodicoLabel(6)}</option>
              <option value="12">{formatValidadePeriodicoLabel(12)}</option>
            </select>

            <p className="mt-2 text-[11px] leading-relaxed text-[#64748b]">
              Cargos com validade de 6 meses geram alertas em Periódicos
              Futuros para todos os exames vinculados. Cargos de 12 meses não
              geram alerta automático.
            </p>
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="mb-1.5 block text-xs font-bold text-navy">
            Descrição
          </label>
          <textarea
            className="field-input min-h-[72px] resize-y py-2.5"
            placeholder="Descrição opcional do cargo..."
            value={form.descricao}
            onChange={(e) => onChange("descricao", e.target.value)}
          />
        </div>
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
