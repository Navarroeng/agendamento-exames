import type { AgendamentoFormValues, ClienteRecord, ClinicaRecord, ExameFormItem, ExameRecord } from "@/lib/types";
import { formatDataDDM } from "@/lib/agendamento-datetime";
import {
  collectExamesComPreparo,
  formatPreparoMensagemClinica,
} from "@/lib/exame-preparo";
import { formatHorarioMensagemWhatsApp } from "@/lib/clinica-regras-atendimento";

export function formatEnderecoClinica(
  clinica: Pick<
    ClinicaRecord,
    "rua" | "numero" | "bairro" | "cidade" | "estado" | "cep"
  >
): string {
  return [
    clinica.rua,
    clinica.numero ? `nº ${clinica.numero}` : null,
    clinica.bairro,
    clinica.cidade && clinica.estado
      ? `${clinica.cidade}/${clinica.estado}`
      : clinica.cidade || clinica.estado,
    clinica.cep ? `CEP ${clinica.cep}` : null,
  ]
    .filter(Boolean)
    .join(", ");
}

function resolveEmpresaCliente(
  clienteNome: string,
  clientes: ClienteRecord[]
): string {
  const nome = clienteNome.trim();
  if (!nome) return "";

  const found = clientes.find((c) => c.nome === nome);

  if (found) return found.nome.trim();
  return nome;
}

function resolveClinica(
  clinicaNome: string,
  clinicas: ClinicaRecord[]
): ClinicaRecord | undefined {
  const nome = clinicaNome.trim();
  if (!nome) return undefined;

  return clinicas.find(
    (c) => c.nome_fantasia === nome || c.razao_social === nome
  );
}

export interface MensagemClinicaInput {
  form: AgendamentoFormValues;
  clientes: ClienteRecord[];
  clinicas: ClinicaRecord[];
  exams: ExameFormItem[];
  catalogExames: ExameRecord[];
}

export function buildMensagemClinicaWhatsApp({
  form,
  clientes,
  clinicas,
  exams,
  catalogExames,
}: MensagemClinicaInput): string {
  const clinica = resolveClinica(form.clinica_nome, clinicas);
  const endereco = clinica ? formatEnderecoClinica(clinica).trim() : "";
  const unidade = clinica?.nome_fantasia.trim() || form.clinica_nome.trim();
  const preparoSection = formatPreparoMensagemClinica(
    collectExamesComPreparo(exams, catalogExames)
  );
  const horarioLines = formatHorarioMensagemWhatsApp({
    clinica,
    horario: form.horario.trim(),
    exams,
  });

  const parts = [
    "AGENDADO:",
    "",
    `🏢 Empresa: ${resolveEmpresaCliente(form.cliente_nome, clientes)}`,
    "",
    `👤 Nome: ${form.colaborador.trim()}`,
    `📋 Tipo de exame: ${form.aso.trim()}`,
    `📅 Data: ${formatDataDDM(form.data_agendamento)}`,
    ...horarioLines,
    `🏥 Unidade: ${unidade}`,
    "",
    `📍 Endereço: ${endereco || "Endereço não informado"}`,
    "",
    "⚠️ *Ao chegar na Clínica o funcionário deve informar que é da empresa NAVARRO* ⚠️",
  ];

  if (preparoSection) {
    parts.push(preparoSection);
  }

  return parts.join("\n");
}
