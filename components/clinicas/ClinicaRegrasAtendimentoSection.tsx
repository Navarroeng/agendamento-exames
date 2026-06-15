import { Field } from "@/components/ui/Field";
import { IconClock } from "@/components/ui/icons/OutlineIcons";
import { maskTime24 } from "@/lib/agendamento-datetime";
import {
  CLINICA_DIAS_SEMANA,
  parseDiasAtendimentoForm,
} from "@/lib/clinica-regras-atendimento";
import type { ClinicaFormField } from "@/hooks/useClinicaForm";
import type { ClinicaFormValues } from "@/lib/types";
import { ClinicaFormCard } from "./ClinicaFormCard";

interface ClinicaRegrasAtendimentoSectionProps {
  form: ClinicaFormValues;
  onChange: (field: ClinicaFormField, value: string) => void;
}

const gridClass =
  "grid grid-cols-1 gap-x-5 gap-y-[18px] sm:grid-cols-2 xl:grid-cols-3";

function toggleDia(current: string, day: number): string {
  const selected = new Set(parseDiasAtendimentoForm(current));
  if (selected.has(day)) selected.delete(day);
  else selected.add(day);
  return Array.from(selected)
    .sort((a, b) => a - b)
    .join(",");
}

export function ClinicaRegrasAtendimentoSection({
  form,
  onChange,
}: ClinicaRegrasAtendimentoSectionProps) {
  const diasSelecionados = parseDiasAtendimentoForm(form.dias_atendimento);

  return (
    <ClinicaFormCard title="Regras de atendimento" icon={<IconClock />} iconTone="orange">
      <div className="space-y-5">
        <div className={gridClass}>
          <Field label="Tipo de atendimento">
            <select
              className="field-input"
              value={form.tipo_atendimento}
              onChange={(e) => onChange("tipo_atendimento", e.target.value)}
            >
              <option value="Horário agendado">Horário agendado</option>
              <option value="Ordem de chegada">Ordem de chegada</option>
            </select>
          </Field>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">
            Dias permitidos de atendimento
          </p>
          <div className="flex flex-wrap gap-2">
            {CLINICA_DIAS_SEMANA.map((dia) => {
              const active = diasSelecionados.includes(dia.value);
              return (
                <button
                  key={dia.value}
                  type="button"
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    active
                      ? "border-brand-blue bg-brand-blue-soft text-brand-blue"
                      : "border-[#e6eaf2] bg-white text-[#64748b] hover:border-brand-blue/40"
                  }`}
                  onClick={() =>
                    onChange(
                      "dias_atendimento",
                      toggleDia(form.dias_atendimento, dia.value)
                    )
                  }
                >
                  {dia.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className={gridClass}>
          <Field label="Horário padrão — início">
            <input
              className="field-input"
              placeholder="HH:mm"
              value={form.horario_padrao_inicio}
              onChange={(e) =>
                onChange("horario_padrao_inicio", maskTime24(e.target.value))
              }
            />
          </Field>
          <Field label="Horário padrão — fim">
            <input
              className="field-input"
              placeholder="HH:mm"
              value={form.horario_padrao_fim}
              onChange={(e) =>
                onChange("horario_padrao_fim", maskTime24(e.target.value))
              }
            />
          </Field>
          <Field label="Horário para exame Clínico — início">
            <input
              className="field-input"
              placeholder="HH:mm"
              value={form.horario_clinico_inicio}
              onChange={(e) =>
                onChange("horario_clinico_inicio", maskTime24(e.target.value))
              }
            />
          </Field>
          <Field label="Horário para exame Clínico — fim">
            <input
              className="field-input"
              placeholder="HH:mm"
              value={form.horario_clinico_fim}
              onChange={(e) =>
                onChange("horario_clinico_fim", maskTime24(e.target.value))
              }
            />
          </Field>
          <Field label="Horário Clínico + complementares — início">
            <input
              className="field-input"
              placeholder="HH:mm"
              value={form.horario_complementar_inicio}
              onChange={(e) =>
                onChange(
                  "horario_complementar_inicio",
                  maskTime24(e.target.value)
                )
              }
            />
          </Field>
          <Field label="Horário Clínico + complementares — fim">
            <input
              className="field-input"
              placeholder="HH:mm"
              value={form.horario_complementar_fim}
              onChange={(e) =>
                onChange("horario_complementar_fim", maskTime24(e.target.value))
              }
            />
          </Field>
          <Field label="Janela adicional — início">
            <input
              className="field-input"
              placeholder="HH:mm"
              value={form.janela_adicional_inicio}
              onChange={(e) =>
                onChange("janela_adicional_inicio", maskTime24(e.target.value))
              }
            />
          </Field>
          <Field label="Janela adicional — fim">
            <input
              className="field-input"
              placeholder="HH:mm"
              value={form.janela_adicional_fim}
              onChange={(e) =>
                onChange("janela_adicional_fim", maskTime24(e.target.value))
              }
            />
          </Field>
        </div>

        <Field label="Observação operacional para mensagem">
          <textarea
            className="field-input min-h-[88px] resize-y py-3"
            value={form.observacao_operacional}
            onChange={(e) => onChange("observacao_operacional", e.target.value)}
            placeholder="Texto opcional incluído nas orientações operacionais"
          />
        </Field>
      </div>
    </ClinicaFormCard>
  );
}
