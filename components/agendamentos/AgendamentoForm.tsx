import { ContratoVigenciaAlert } from "@/components/agendamentos/ContratoVigenciaAlert";
import { ClienteProcuracaoAlert } from "@/components/agendamentos/ClienteProcuracaoAlert";
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
  readOnly?: boolean;
  contratoVigencia: ContratoVigenciaCheckState;
  showClienteProcuracaoAlert?: boolean;
  exams: ExameFormItem[];
  clienteValidacaoLoading?: boolean;
  formularioClienteLiberado?: boolean;
  dataFieldError?: string | null;
  onDataBlur?: () => void;
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
  readOnly = false,
  contratoVigencia,
  showClienteProcuracaoAlert = false,
  exams,
  clienteValidacaoLoading = false,
  formularioClienteLiberado = true,
  dataFieldError = null,
  onDataBlur,
}: AgendamentoFormProps) {
  const selectedClinica =
    clinicas.find((item) => item.nome_fantasia === form.clinica_nome) ?? null;
  const horarioHint = getHorarioFieldHint(selectedClinica, exams);
  const camposDependentesClienteDesabilitados =
    readOnly || !formularioClienteLiberado;

  return (
    <Panel
      id="novo-agendamento"
      title={
        readOnly
          ? "Editar documentação"
          : isEditing
            ? "Editar Agendamento"
            : "Novo Agendamento"
      }
      icon={<IconFileText />}
      action={
        <button type="button" className="btn" onClick={onClose}>
          ← Voltar para lista
        </button>
      }
      bodyClassName={readOnly ? "pointer-events-none opacity-60" : ""}
    >
      <div className="flex flex-col gap-y-3.5">
        <div className="agendamento-form-row1">
          <Field label={<>Data <RequiredMark /></>}>
            <input
              className={`field-input w-full ${
                dataFieldError
                  ? "border-brand-red ring-1 ring-brand-red/30"
                  : ""
              }`}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="DD/MM/AAAA"
              maxLength={10}
              value={form.data_agendamento}
              disabled={readOnly}
              aria-invalid={Boolean(dataFieldError)}
              aria-describedby={
                dataFieldError ? "agendamento-data-error" : undefined
              }
              onChange={(e) =>
                onChange("data_agendamento", maskDateBR(e.target.value))
              }
              onBlur={() => onDataBlur?.()}
            />
            {dataFieldError ? (
              <p
                id="agendamento-data-error"
                className="mt-1.5 text-[11px] font-medium text-brand-red"
              >
                {dataFieldError}
              </p>
            ) : null}
          </Field>
          <Field label={<>Horário <RequiredMark /></>}>
            <input
              className="field-input w-full"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="HH:mm"
              maxLength={5}
              value={form.horario}
              disabled={readOnly}
              onChange={(e) => onChange("horario", maskTime24(e.target.value))}
            />
            {horarioHint ? (
              <p className="mt-1.5 text-[11px] font-medium text-[#64748b]">
                {horarioHint}
              </p>
            ) : null}
          </Field>
          <Field label={<>Cliente <RequiredMark /></>}>
            <select
              className="field-input w-full min-w-0"
              value={clienteId}
              disabled={readOnly || clientesLoading || clienteValidacaoLoading}
              onChange={(e) => onClienteChange(e.target.value)}
            >
              <option value="">
                {clienteValidacaoLoading
                  ? "Validando situação financeira..."
                  : clientesLoading
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
              className="field-input w-full min-w-0"
              placeholder="Nome do colaborador"
              value={form.colaborador}
              disabled={camposDependentesClienteDesabilitados}
              onChange={(e) => onChange("colaborador", e.target.value)}
            />
          </Field>
          <Field label={<>CPF do colaborador <RequiredMark /></>}>
            <input
              className="field-input w-full"
              placeholder="000.000.000-00"
              inputMode="numeric"
              autoComplete="off"
              value={form.colaborador_cpf}
              disabled={camposDependentesClienteDesabilitados}
              onChange={(e) => onChange("colaborador_cpf", e.target.value)}
            />
          </Field>
        </div>

        <div className="agendamento-form-row2">
          <Field label={<>ASO <RequiredMark /></>}>
            <select
              className="field-input w-full min-w-0"
              value={form.aso}
              disabled={camposDependentesClienteDesabilitados}
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
          <Field label={<>Cargo <RequiredMark /></>}>
            <select
              className="field-input w-full min-w-0"
              value={cargoId}
              disabled={camposDependentesClienteDesabilitados || cargosLoading}
              onChange={(e) => onCargoChange(e.target.value)}
            >
              <option value="">
                {cargosLoading ? "Carregando cargos..." : "Selecione um cargo"}
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
              className="field-input w-full min-w-0"
              value={form.clinica_nome}
              disabled={
                camposDependentesClienteDesabilitados || clinicasLoading
              }
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
              className="field-input w-full min-w-0"
              value={form.responsavel}
              disabled={camposDependentesClienteDesabilitados}
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
      </div>
      {!readOnly ? (
        <>
          <ClinicaRegrasAlert clinica={selectedClinica} exams={exams} />
          <ClienteProcuracaoAlert visible={showClienteProcuracaoAlert} />
          <ContratoVigenciaAlert state={contratoVigencia} />
        </>
      ) : null}
    </Panel>
  );
}
