import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import { isAgendamentoCancelado } from "@/lib/contrato-agendamentos";
import { isValidCPF, normalizeCpfDigits } from "@/lib/cpf";
import { formatHorarioDisplay } from "@/lib/format-datetime";
import {
  caminhoAnexoGestaoPermitido,
  type CursoCatalogo,
  type SituacaoDocumentoRh,
} from "@/lib/gestao-plataformas";

export const PERFIL_PORTAL_AGROVIAS = "portal_agrovias";
export const PORTAL_AGROVIAS_PATH = "/portal-agrovias";

export type AgendamentoExterno = {
  id: string;
  dataLabel: string;
  horarioLabel: string;
  localLabel: string;
  tipoExame: string;
  situacao: string;
};

export type CursoExterno = {
  id: string;
  nome: string;
  realizadoEm: string;
  validade: string | null;
};

const SITUACAO_EXAME: Record<string, string> = {
  agendado: "Agendado",
  aso_retido: "ASO retido",
};

export function acessoExternoVigente(params: {
  perfil: string | null | undefined;
  ativo: boolean;
  clienteId: string | null | undefined;
  clienteEscopo: string | null | undefined;
  revogadoEm: string | null | undefined;
}): boolean {
  return (
    String(params.perfil ?? "") === PERFIL_PORTAL_AGROVIAS &&
    params.ativo === true &&
    !params.revogadoEm &&
    Boolean(params.clienteId) &&
    params.clienteId === params.clienteEscopo
  );
}

export function colaboradorNoCadastro(
  ids: readonly string[],
  colaboradorId: string
): boolean {
  const id = colaboradorId.trim();
  return Boolean(id) && ids.includes(id);
}

export function podeEnviarDocumentoRh(situacao: SituacaoDocumentoRh): boolean {
  return situacao === "aguardando_envio" || situacao === "reenvio_solicitado";
}

export function erroConferenciaDocumento(params: {
  situacao: SituacaoDocumentoRh;
  acao: "conferir" | "reenvio";
  observacao?: string | null;
}): string | null {
  if (params.acao === "conferir") {
    return params.situacao === "recebido"
      ? null
      : "Só um documento recebido pode ser conferido.";
  }
  if (params.situacao !== "recebido") {
    return "O reenvio só pode ser pedido para um documento recebido.";
  }
  if (String(params.observacao ?? "").trim().length < 2) {
    return "Informe a observação do reenvio.";
  }
  return null;
}

export function arquivoRhLiberado(params: {
  path: string;
  clienteId: string;
}): boolean {
  const caminho = params.path.replace(/\\/g, "/").trim();
  if (!caminhoAnexoGestaoPermitido({ path: caminho, clienteId: params.clienteId })) {
    return false;
  }
  return caminho.startsWith(`${params.clienteId.trim()}/rh/`);
}

type AgendamentoFonte = {
  id?: string | null;
  colaborador?: string | null;
  colaborador_cpf?: string | null;
  aso?: string | null;
  status?: string | null;
  data_agendamento?: string | null;
  horario?: string | null;
  clinica_nome?: string | null;
};

function cpfValido(valor: string | null | undefined): string {
  const digits = normalizeCpfDigits(valor);
  return isValidCPF(digits) ? digits : "";
}

function dataIso(valor: string | null | undefined): string | null {
  const iso = String(valor ?? "").trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
}

export function agendamentosVisiveisExternos(params: {
  agendamentos: readonly AgendamentoFonte[];
  cpf?: string | null;
  agendamentoId?: string | null;
  hoje: string;
}): { proximos: AgendamentoExterno[]; realizados: AgendamentoExterno[] } {
  const cpf = cpfValido(params.cpf);
  const agendamentoId = String(params.agendamentoId ?? "").trim();
  if (!cpf && !agendamentoId) return { proximos: [], realizados: [] };

  const linhas = params.agendamentos.flatMap((agendamento) => {
    if (isAgendamentoCancelado(agendamento.status)) return [];
    const status = String(agendamento.status ?? "").trim().toLowerCase();
    if (status !== "agendado" && status !== "aso_retido") return [];
    const mesmo =
      cpf
        ? cpfValido(agendamento.colaborador_cpf) === cpf
        : String(agendamento.id ?? "").trim() === agendamentoId;
    if (!mesmo) return [];
    const data = dataIso(agendamento.data_agendamento);
    if (!data) return [];
    const horarioBruto = String(agendamento.horario ?? "").trim();
    const horario = horarioBruto ? formatHorarioDisplay(horarioBruto).slice(0, 5) : "";
    const linha: AgendamentoExterno = {
      id: String(agendamento.id ?? "").trim() || data,
      dataLabel: formatDateIsoToBR(data),
      horarioLabel: horario || "Não informado",
      localLabel: String(agendamento.clinica_nome ?? "").trim() || "Não informado",
      tipoExame: String(agendamento.aso ?? "").trim() || "Não informado",
      situacao: SITUACAO_EXAME[status] ?? "Não informado",
    };
    return [{ data, linha }];
  });

  const proximos = linhas
    .filter((item) => item.data > params.hoje)
    .sort((a, b) => a.data.localeCompare(b.data))
    .map((item) => item.linha);
  const realizados = linhas
    .filter((item) => item.data <= params.hoje)
    .sort((a, b) => b.data.localeCompare(a.data))
    .map((item) => item.linha);
  return { proximos, realizados };
}

export function cursosVisiveisExternos(params: {
  cursos: readonly Pick<CursoCatalogo, "id" | "nome">[];
  certificados: readonly {
    id: string;
    cursoId: string;
    realizadoEm: string;
    validade: string | null;
  }[];
}): CursoExterno[] {
  return params.certificados.map((certificado) => ({
    id: certificado.id,
    nome:
      params.cursos.find((curso) => curso.id === certificado.cursoId)?.nome ??
      "Curso",
    realizadoEm: certificado.realizadoEm,
    validade: certificado.validade,
  }));
}
