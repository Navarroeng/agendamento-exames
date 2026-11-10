import {
  labelMotivoExameFuturo,
  labelOrigemPeriodico,
} from "@/lib/contrato-programacao-futura";
import { isValidCPF, normalizeCpfDigits } from "@/lib/cpf";
import {
  chaveCicloPeriodico,
  formatarExamesGrupo,
  normalizeIdentidadeColaborador,
} from "@/lib/periodico-agrupamento";
import { isPeriodicoCanceladoManualmente } from "@/lib/periodico-cancelamento";
import { TIPOS_ASO_PODEM_ORIGINAR_PERIODICO } from "@/lib/periodico-geracao";
import { dataCicloPeriodico } from "@/lib/periodicos-futuro";
import type { PeriodicoFuturoRecord } from "@/lib/types";

export const PERIODICO_PROGRAMADO_SITUACAO = "Programado" as const;

export const PERIODICO_PROGRAMADO_INDISPONIVEL_MSG =
  "Não foi possível abrir o periódico programado desta vaga. O registro vinculado não está disponível.";

export const PERIODICO_PROGRAMADO_CONSULTA_MSG =
  "Não foi possível consultar o periódico programado desta vaga.";

const TIPOS_ASO = new Set<string>(TIPOS_ASO_PODEM_ORIGINAR_PERIODICO);

export type RegistroVisualizacaoPeriodico = Pick<
  PeriodicoFuturoRecord,
  | "id"
  | "colaborador"
  | "colaborador_cpf"
  | "cliente_nome"
  | "cargo_id"
  | "cargo_nome"
  | "tipo_aso"
  | "tipo_exame"
  | "exame_nome"
  | "exame_id"
  | "proxima_data"
  | "data_prevista_original"
  | "status"
  | "motivo"
  | "motivo_detalhe"
  | "observacoes"
  | "origem"
  | "cancelado_em"
  | "motivo_cancelamento"
>;

export type VisualizacaoPeriodicoProgramado = {
  colaborador: string;
  cpf: string | null;
  empresa: string | null;
  tipoAso: string | null;
  dataPrevistaIso: string | null;
  situacao: typeof PERIODICO_PROGRAMADO_SITUACAO;
  examesPrevistos: string[];
  cargo: string | null;
  observacoes: string | null;
  motivo: string | null;
  origem: string | null;
  clinica: string | null;
  horario: string | null;
};

function textoOuNull(value: string | null | undefined): string | null {
  const texto = (value ?? "").trim();
  return texto || null;
}

function tipoAsoSalvo(
  registro: Pick<
    RegistroVisualizacaoPeriodico,
    "tipo_aso" | "tipo_exame" | "exame_nome"
  >
): string | null {
  const candidatos = [registro.tipo_aso, registro.tipo_exame, registro.exame_nome];
  for (const candidato of candidatos) {
    const texto = (candidato ?? "").trim();
    if (TIPOS_ASO.has(texto)) return texto;
  }
  return textoOuNull(registro.tipo_aso);
}

function primeiroTexto(
  registros: RegistroVisualizacaoPeriodico[],
  ler: (registro: RegistroVisualizacaoPeriodico) => string | null | undefined
): string | null {
  for (const registro of registros) {
    const texto = textoOuNull(ler(registro));
    if (texto) return texto;
  }
  return null;
}

function registroAtivo(registro: RegistroVisualizacaoPeriodico): boolean {
  if (registro.status === "cancelado") return false;
  return !isPeriodicoCanceladoManualmente(registro);
}

/**
 * Monta a consulta somente leitura do periódico vinculado à vaga.
 * Clínica e horário só entram quando já vierem preenchidos.
 */
export function montarVisualizacaoPeriodicoProgramado(params: {
  registroId: string;
  registros: RegistroVisualizacaoPeriodico[];
  clinica?: string | null;
  horario?: string | null;
}): VisualizacaoPeriodicoProgramado | null {
  const registroId = params.registroId.trim();
  const base = params.registros.find((registro) => registro.id === registroId);
  if (!base) return null;

  const chave = chaveCicloPeriodico(base);
  const ciclo = params.registros.filter(
    (registro) => chaveCicloPeriodico(registro) === chave
  );
  const ativos = ciclo.filter(registroAtivo);
  const fonte = ativos.length > 0 ? ativos : [base];
  const tipoAso =
    tipoAsoSalvo(base) ??
    fonte.map(tipoAsoSalvo).find((tipo) => Boolean(tipo)) ??
    null;
  const tipoNorm = normalizeIdentidadeColaborador(tipoAso);
  const exames = formatarExamesGrupo(
    fonte.map((registro) => registro.exame_nome || registro.tipo_exame || "")
  ).nomes.filter((nome) => {
    const norm = normalizeIdentidadeColaborador(nome);
    return Boolean(norm) && norm !== tipoNorm;
  });

  const observacoes = Array.from(
    new Set(
      [base, ...fonte]
        .map((registro) => textoOuNull(registro.observacoes))
        .filter((texto): texto is string => Boolean(texto))
    )
  );
  const motivoBase =
    [base, ...fonte].find((registro) => textoOuNull(registro.motivo)) ?? null;
  const motivo = motivoBase
    ? textoOuNull(
        labelMotivoExameFuturo(motivoBase.motivo, motivoBase.motivo_detalhe)
      )
    : null;
  const origemBruta =
    [base, ...fonte].find((registro) => textoOuNull(registro.origem)) ?? null;
  const cpf = normalizeCpfDigits(base.colaborador_cpf);
  const data = dataCicloPeriodico(base).slice(0, 10);

  return {
    colaborador: textoOuNull(base.colaborador) ?? "—",
    cpf: isValidCPF(cpf) ? cpf : null,
    empresa: primeiroTexto([base, ...fonte], (registro) => registro.cliente_nome),
    tipoAso,
    dataPrevistaIso: /^\d{4}-\d{2}-\d{2}$/.test(data) ? data : null,
    situacao: PERIODICO_PROGRAMADO_SITUACAO,
    examesPrevistos: exames,
    cargo: primeiroTexto([base, ...fonte], (registro) => registro.cargo_nome),
    observacoes: observacoes.length > 0 ? observacoes.join("\n\n") : null,
    motivo: motivo === "—" ? null : motivo,
    origem: origemBruta ? labelOrigemPeriodico(origemBruta.origem) : null,
    clinica: textoOuNull(params.clinica),
    horario: textoOuNull(params.horario),
  };
}
