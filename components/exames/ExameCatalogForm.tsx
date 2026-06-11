import { Field, RequiredMark } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import { IconFlask } from "@/components/ui/icons/OutlineIcons";
import type { ExameCatalogFormField } from "@/hooks/useExameCatalogForm";
import type { ExameCatalogFormValues } from "@/lib/types";

interface ExameCatalogFormProps {
  form: ExameCatalogFormValues;
  isEditing: boolean;
  onChange: (field: ExameCatalogFormField, value: string) => void;
}

export function ExameCatalogForm({
  form,
  isEditing,
  onChange,
}: ExameCatalogFormProps) {
  return (
    <Panel
      id="cadastrar-exame"
      title={isEditing ? "Editar Exame" : "Novo Exame"}
      icon={<IconFlask />}
      iconTone="green"
    >
      <div className="grid grid-cols-1 gap-x-5 gap-y-[18px] sm:grid-cols-2 xl:grid-cols-3">
        <Field label={<>Nome do exame <RequiredMark /></>}>
          <input
            className="field-input"
            value={form.nome}
            onChange={(e) => onChange("nome", e.target.value)}
            placeholder="Ex.: Audiometria"
          />
        </Field>
        <Field label={<>Valor Navarro (R$) <RequiredMark /></>}>
          <input
            className="field-input"
            value={form.valor_navarro}
            onChange={(e) => onChange("valor_navarro", e.target.value)}
            placeholder="0,00"
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
      </div>
      <div className="mt-[18px]">
        <Field label="Preparo do exame">
          <textarea
            className="field-input min-h-[120px] resize-y"
            value={form.preparo}
            onChange={(e) => onChange("preparo", e.target.value)}
            placeholder="Instruções de preparo para o colaborador (opcional)"
          />
        </Field>
      </div>
    </Panel>
  );
}
