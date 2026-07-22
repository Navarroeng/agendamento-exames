import { Field, RequiredMark } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import { IconUser } from "@/components/ui/icons/OutlineIcons";
import type { ClienteFormField } from "@/hooks/useClienteForm";
import { CLIENTE_PROCURACAO_OPTIONS } from "@/lib/cliente-procuracao";
import { SIM_NAO } from "@/lib/constants";
import { maskCNPJInput } from "@/lib/cnpj";
import type { ClienteFormValues } from "@/lib/types";

interface ClienteFormProps {
  form: ClienteFormValues;
  onChange: (field: ClienteFormField, value: string) => void;
}

export function ClienteForm({ form, onChange }: ClienteFormProps) {
  return (
    <Panel id="cadastrar-cliente" title="Cadastrar Cliente" icon={<IconUser />}>
      <div className="form-grid grid grid-cols-1 gap-x-5 gap-y-[18px] md:grid-cols-2">
        <Field label={<>Nome da empresa <RequiredMark /></>}>
          <input
            className="field-input"
            placeholder="Nome da empresa"
            value={form.nome}
            onChange={(e) => onChange("nome", e.target.value)}
          />
        </Field>
        <Field label={<>CNPJ <RequiredMark /></>}>
          <input
            className="field-input"
            placeholder="00.000.000/0000-00"
            value={form.cnpj}
            onChange={(e) => onChange("cnpj", maskCNPJInput(e.target.value))}
          />
        </Field>
        <Field label="Procuração">
          <select
            className="field-input"
            value={form.procuracao}
            onChange={(e) => onChange("procuracao", e.target.value)}
          >
            {CLIENTE_PROCURACAO_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Disponível para agendamento">
          <select
            className="field-input"
            value={form.disponivel_agendamento}
            onChange={(e) =>
              onChange("disponivel_agendamento", e.target.value)
            }
          >
            {SIM_NAO.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </Panel>
  );
}
