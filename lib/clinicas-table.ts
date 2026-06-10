import { formatDateBR } from "@/lib/format";
import type { ClinicaListItem, ClinicaTableRow } from "@/lib/types";

export function mapClinicasToTableRows(
  clinicas: ClinicaListItem[]
): ClinicaTableRow[] {
  return clinicas.map((clinica) => ({
    key: clinica.id,
    clinicaId: clinica.id,
    nome: clinica.nome_fantasia || clinica.razao_social,
    cidade: clinica.cidade,
    responsavel: clinica.responsavel,
    telefone: clinica.telefone,
    email: clinica.email,
    status: clinica.status,
    qtdExames: clinica.qtdExames,
    ultimoAgendamento: clinica.ultimoAgendamento
      ? formatDateBR(clinica.ultimoAgendamento)
      : "—",
  }));
}
