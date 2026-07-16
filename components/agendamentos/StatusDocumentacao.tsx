import { Field } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import { IconShield } from "@/components/ui/icons/OutlineIcons";
import { SIM_NAO } from "@/lib/constants";
import { RECIBO_MASKED_LENGTH } from "@/lib/esocial-recibo";
import type { FormField } from "@/hooks/useAgendamentoForm";

interface StatusDocumentacaoProps {
  form: Record<FormField, string>;
  onChange: (field: FormField, value: string) => void;
  children?: React.ReactNode;
}

function DateField({
  label,
  value,
  show,
  onChange,
  className = "",
}: {
  label: string;
  value: string;
  show: boolean;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <Field
      label={label}
      className={`hidden-date placeholder-date min-w-0 ${show ? "show" : ""} ${className}`}
    >
      <input
        className="field-input w-full min-w-0"
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

export function StatusDocumentacao({
  form,
  onChange,
  children,
}: StatusDocumentacaoProps) {
  return (
    <Panel
      title="Status e Documentação"
      icon={<IconShield />}
      iconTone="orange"
    >
      <div className="status-doc-wrapper flex flex-col gap-3">
        <div className="status-doc-row status-main-row grid grid-cols-1 gap-x-4 gap-y-3 items-end grid:grid-cols-2 xl:grid-cols-3">
          <Field label="ASO enviado para clínica">
            <select
              className="field-input"
              value={form.aso_enviado_clinica}
              onChange={(e) =>
                onChange("aso_enviado_clinica", e.target.value)
              }
            >
              {SIM_NAO.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="ASO assinado">
            <select
              className="field-input"
              value={form.aso_assinado}
              onChange={(e) => onChange("aso_assinado", e.target.value)}
            >
              {SIM_NAO.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="ASO enviado p/ cliente">
            <select
              className="field-input"
              value={form.aso_enviado_cliente}
              onChange={(e) =>
                onChange("aso_enviado_cliente", e.target.value)
              }
            >
              {SIM_NAO.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="status-doc-row status-date-row grid grid-cols-1 gap-x-4 gap-y-3 items-end grid:grid-cols-2 xl:grid-cols-3">
          <DateField
            label="Data do envio do ASO para a clínica"
            value={form.data_aso_enviado_clinica}
            show={form.aso_enviado_clinica === "Sim"}
            onChange={(v) => onChange("data_aso_enviado_clinica", v)}
          />
          <DateField
            label="Data ASO assinado"
            value={form.data_aso_assinado}
            show={form.aso_assinado === "Sim"}
            onChange={(v) => onChange("data_aso_assinado", v)}
          />
          <DateField
            label="Data do envio do ASO para o cliente"
            value={form.data_aso_enviado_cliente}
            show={form.aso_enviado_cliente === "Sim"}
            onChange={(v) => onChange("data_aso_enviado_cliente", v)}
          />
        </div>

        <div
          className={`status-doc-row status-matricula-esocial-row grid grid-cols-1 items-end gap-x-3 gap-y-3 sm:grid-cols-2 ${
            form.envio_esocial === "Sim"
              ? "lg:grid-cols-[minmax(0,1fr)_220px_220px_320px]"
              : "lg:grid-cols-[minmax(0,1fr)_220px]"
          }`}
        >
          <Field label="Número matrícula" className="min-w-0">
            <input
              className="field-input w-full min-w-0"
              placeholder="Digite a matrícula"
              value={form.numero_matricula}
              onChange={(e) => onChange("numero_matricula", e.target.value)}
            />
          </Field>
          <Field label="Envio ao e-Social" className="min-w-0">
            <select
              className="field-input w-full min-w-0"
              value={form.envio_esocial}
              onChange={(e) => onChange("envio_esocial", e.target.value)}
            >
              {SIM_NAO.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          {form.envio_esocial === "Sim" && (
            <>
              <DateField
                label="Data envio ao e-Social"
                value={form.data_envio_esocial}
                show
                onChange={(v) => onChange("data_envio_esocial", v)}
              />
              <Field label="Nº Recibo" className="min-w-0">
                <input
                  className="field-input w-full min-w-0 font-mono text-sm tracking-tight"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="Ex.: 1.1.0000000040734596239"
                  maxLength={RECIBO_MASKED_LENGTH}
                  value={form.esocial_recibo}
                  onChange={(e) => onChange("esocial_recibo", e.target.value)}
                />
              </Field>
            </>
          )}
        </div>

        <Field label="Observação" className="min-w-0">
          <textarea
            className="field-input min-h-[88px] w-full resize-y"
            placeholder="Digite uma observação sobre este agendamento…"
            rows={3}
            value={form.observacoes}
            onChange={(e) => onChange("observacoes", e.target.value)}
          />
        </Field>
      </div>

      {children}
    </Panel>
  );
}
