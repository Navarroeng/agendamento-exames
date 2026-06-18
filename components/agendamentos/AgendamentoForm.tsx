import { ContratoVigenciaAlert } from "@/components/agendamentos/ContratoVigenciaAlert";
import {
  ClinicaRegrasAlert,
  getHorarioFieldHint,
} from "@/components/agendamentos/ClinicaRegrasAlert";
import { Field, RequiredMark } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import { IconFileText } from "@/components/ui/icons/OutlineIcons";
import { RESPONSAVEIS, TIPOS_ASO } from "@/lib/constants";
import type { ContratoVigenciaCheckState } from "@/hooks/useContratoVigenciaCheck";
import { maskDateBR, maskTime24 } from "@/lib/agendamento-datetime";
import { formatClienteSelectLabel } from "@/lib/cliente-display";
import type { FormField } from "@/hooks/useAgendamentoForm";
import type { ClienteRecord, ClinicaRecord, ExameFormItem } from "@/lib/types";

interface AgendamentoFormProps {
  form: Record<FormField, string>;
  clinicas: ClinicaRecord[];
  clinicasLoading?: boolean;
  clientes: ClienteRecord[];
  clientesLoading?: boolean;
  clienteId: string;
  onClienteChange: (clienteId: string) => void;
  cargos: { id: string; nome: string }[];
  cargosLoading?: boolean;
  cargoId: string;
  onCargoChange: (cargoId: string) => void;
  onChange: (field: FormField, value: string) => void;
  onClose: () => void;
  isEditing?: boolean;
  contratoVigencia: ContratoVigenciaCheckState;
  exams: ExameFormItem[];
}

const SELECT_PLACEHOLDER = "Selecione...";

export function AgendamentoForm({
  form,
  clinicas,
  clinicasLoading = false,
  clientes,
  clientesLoading = false,
  clienteId,
  onClienteChange,
  cargos,
  cargosLoading = false,
  cargoId,
  onCargoChange,
  onChange,
  onClose,
  isEditing = false,
  contratoVigencia,
  exams,
}: AgendamentoFormProps) {
  const selectedClinica =
    clinicas.find((item) => item.nome_fantasia === form.clinica_nome) ?? null;
  const horarioHint = getHorarioFieldHint(selectedClinica, exams);

  return (
    <Panel
      id="novo-agendamento"
      title={isEditing ? "Editar Agendamento" : "Novo Agendamento"}
      icon={<IconFileText />}
      action={
        <button type="button" className="btn" onClick={onClose}>
          ← Voltar para lista
        </button>
      }
    >
      <div className="form-grid grid grid-cols-1 gap-x-4 gap-y-3.5 grid:grid-cols-2 xl:grid-cols-4">
        <Field label={<>Data <RequiredMark /></>}>
          <input
            className="field-input"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="DD/MM/AAAA"
            maxLength={10}
            value={form.data_agendamento}
            onChange={(e) =>
              onChange("data_agendamento", maskDateBR(e.target.value))
            }
          />
        </Field>
        <Field label={<>Horário <RequiredMark /></>}>
          <input
            className="field-input"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="HH:mm"
            maxLength={5}
            value={form.horario}
            onChange={(e) => onChange("horario", maskTime24(e.target.value))}
          />
          {horarioHint ? (
            <p className="mt-1.5 text-[11px] font-medium text-[#64748b]">{horarioHint}</p>
          ) : null}
        </Field>
        <Field label={<>Cliente <RequiredMark /></>}>
          <select
            className="field-input"
            value={clienteId}
            disabled={clientesLoading}
            onChange={(e) => onClienteChange(e.target.value)}
          >
            <option value="">
              {clientesLoading
                ? "Carregando clientes..."
                : SELECT_PLACEHOLDER}
            </option>
            {clientes.map((cliente) => (
              <option key={cliente.id} value={cliente.id}>
                {formatClienteSelectLabel(cliente)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={<>Colaborador <RequiredMark /></>}>
          <input
            className="field-input"
            placeholder="Nome do colaborador"
            value={form.colaborador}
            onChange={(e) => onChange("colaborador", e.target.value)}
          />
        </Field>
        <Field label={<>CPF do colaborador <RequiredMark /></>}>
          <input
            className="field-input"
            placeholder="000.000.000-00"
            inputMode="numeric"
            autoComplete="off"
            value={form.colaborador_cpf}
            onChange={(e) => onChange("colaborador_cpf", e.target.value)}
          />
        </Field>
        <Field label={<>ASO <RequiredMark /></>}>
          <select
            className="field-input"
            value={form.aso}
            onChange={(e) => onChange("aso", e.target.value)}
          >
            <option value="">{SELECT_PLACEHOLDER}</option>
            {TIPOS_ASO.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Cargo">
          <select
            className="field-input"
            value={cargoId}
            disabled={cargosLoading}
            onChange={(e) => onCargoChange(e.target.value)}
          >
            <option value="">
              {cargosLoading ? "Carregando cargos..." : "Selecione um cargo (opcional)"}
            </option>
            {cargos.map((cargo) => (
              <option key={cargo.id} value={cargo.id}>
                {cargo.nome}
              </option>
            ))}
          </select>
        </Field>
        <Field label={<>Clínica <RequiredMark /></>}>
          <select
            className="field-input"
            value={form.clinica_nome}
            disabled={clinicasLoading}
            onChange={(e) => onChange("clinica_nome", e.target.value)}
          >
            <option value="">
              {clinicasLoading ? "Carregando clínicas..." : SELECT_PLACEHOLDER}
            </option>
            {clinicas.map((c) => (
              <option key={c.id} value={c.nome_fantasia}>
                {c.nome_fantasia}
              </option>
            ))}
          </select>
        </Field>
        <Field label={<>Responsável <RequiredMark /></>}>
          <select
            className="field-input"
            value={form.responsavel}
            onChange={(e) => onChange("responsavel", e.target.value)}
          >
            <option value="">{SELECT_PLACEHOLDER}</option>
            {RESPONSAVEIS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <ClinicaRegrasAlert clinica={selectedClinica} exams={exams} />
      <ContratoVigenciaAlert state={contratoVigencia} />
    </Panel>
  );
}
