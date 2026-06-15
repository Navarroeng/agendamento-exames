import { Field, RequiredMark } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import {
  IconBuilding,
  IconMapPin,
  IconPhone,
} from "@/components/ui/icons/OutlineIcons";
import type { ClinicaFormField } from "@/hooks/useClinicaForm";
import type { ClinicaFormValues } from "@/lib/types";
import { ClinicaFormCard } from "./ClinicaFormCard";
import { ClinicaRegrasAtendimentoSection } from "./ClinicaRegrasAtendimentoSection";

const ESTADOS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO",
] as const;

interface ClinicaFormProps {
  form: ClinicaFormValues;
  isEditing: boolean;
  onChange: (field: ClinicaFormField, value: string) => void;
}

const gridClass =
  "grid grid-cols-1 gap-x-5 gap-y-[18px] sm:grid-cols-2 xl:grid-cols-3";

export function ClinicaForm({ form, isEditing, onChange }: ClinicaFormProps) {
  return (
    <Panel
      id="cadastrar-clinica"
      title={isEditing ? "Editar Clínica" : "Nova Clínica"}
      icon={<IconBuilding />}
      iconTone="purple"
    >
      <div className="space-y-5">
        <ClinicaFormCard title="Dados da clínica" icon={<IconBuilding />}>
          <div className={gridClass}>
            <Field label={<>Razão Social <RequiredMark /></>}>
              <input
                className="field-input"
                value={form.razao_social}
                onChange={(e) => onChange("razao_social", e.target.value)}
                placeholder="Razão social"
              />
            </Field>
            <Field label={<>Nome Fantasia <RequiredMark /></>}>
              <input
                className="field-input"
                value={form.nome_fantasia}
                onChange={(e) => onChange("nome_fantasia", e.target.value)}
                placeholder="Nome fantasia"
              />
            </Field>
            <Field label={<>CNPJ <RequiredMark /></>}>
              <input
                className="field-input"
                value={form.cnpj}
                onChange={(e) => onChange("cnpj", e.target.value)}
                placeholder="00.000.000/0000-00"
              />
            </Field>
            <Field label={<>Responsável <RequiredMark /></>}>
              <input
                className="field-input"
                value={form.responsavel}
                onChange={(e) => onChange("responsavel", e.target.value)}
                placeholder="Nome do responsável"
              />
            </Field>
            <Field label="Status">
              <select
                className="field-input"
                value={form.status}
                onChange={(e) => onChange("status", e.target.value)}
              >
                <option value="Ativa">Ativa</option>
                <option value="Inativa">Inativa</option>
              </select>
            </Field>
          </div>
        </ClinicaFormCard>

        <ClinicaFormCard
          title="Contato"
          icon={<IconPhone />}
          iconTone="green"
        >
          <div className={gridClass}>
            <Field label={<>Telefone <RequiredMark /></>}>
              <input
                className="field-input"
                value={form.telefone}
                onChange={(e) => onChange("telefone", e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </Field>
            <Field label="WhatsApp">
              <input
                className="field-input"
                value={form.whatsapp}
                onChange={(e) => onChange("whatsapp", e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </Field>
            <Field label={<>E-mail <RequiredMark /></>}>
              <input
                className="field-input"
                type="email"
                value={form.email}
                onChange={(e) => onChange("email", e.target.value)}
                placeholder="contato@clinica.com"
              />
            </Field>
            <Field label="Site" className="sm:col-span-2">
              <input
                className="field-input"
                value={form.site}
                onChange={(e) => onChange("site", e.target.value)}
                placeholder="https://"
              />
            </Field>
          </div>
        </ClinicaFormCard>

        <ClinicaFormCard
          title="Endereço"
          icon={<IconMapPin />}
          iconTone="orange"
        >
          <div className={gridClass}>
            <Field label="CEP">
              <input
                className="field-input"
                value={form.cep}
                onChange={(e) => onChange("cep", e.target.value)}
                placeholder="00000-000"
              />
            </Field>
            <Field label="Rua" className="sm:col-span-2">
              <input
                className="field-input"
                value={form.rua}
                onChange={(e) => onChange("rua", e.target.value)}
                placeholder="Rua / Avenida"
              />
            </Field>
            <Field label="Número">
              <input
                className="field-input"
                value={form.numero}
                onChange={(e) => onChange("numero", e.target.value)}
                placeholder="Nº"
              />
            </Field>
            <Field label="Bairro">
              <input
                className="field-input"
                value={form.bairro}
                onChange={(e) => onChange("bairro", e.target.value)}
                placeholder="Bairro"
              />
            </Field>
            <Field label={<>Cidade <RequiredMark /></>}>
              <input
                className="field-input"
                value={form.cidade}
                onChange={(e) => onChange("cidade", e.target.value)}
                placeholder="Cidade"
              />
            </Field>
            <Field label={<>Estado <RequiredMark /></>}>
              <select
                className="field-input"
                value={form.estado}
                onChange={(e) => onChange("estado", e.target.value)}
              >
                <option value="">UF</option>
                {ESTADOS.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </ClinicaFormCard>

        <ClinicaRegrasAtendimentoSection form={form} onChange={onChange} />
      </div>
    </Panel>
  );
}
