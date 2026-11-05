import { todayIsoSaoPaulo } from "@/lib/agendamento-datetime";
import {
  contratoElegivelComoAtual,
  contratoEncerrado,
  contratoInicioFuturo,
  type ClienteContratoConsulta,
} from "@/lib/cliente-contrato-atual";
import {
  formatProcuracaoStatusLabel,
  normalizeProcuracaoStatus,
  type ProcuracaoStatus,
} from "@/lib/cliente-procuracao";
import { vigenciaContratualConfiavel } from "@/lib/contrato-navarro";

/** Status mostrado nos Dados do cliente. `expirada` não é gravada. */
export type ProcuracaoEfetiva = ProcuracaoStatus | "expirada";

export function formatProcuracaoEfetivaLabel(
  status: ProcuracaoEfetiva | null | undefined
): string {
  if (status === "expirada") return "Expirada";
  return formatProcuracaoStatusLabel(status);
}

/** Alerta de agendamento: pendente e expirada não contam como procuração válida. */
export function procuracaoEfetivaRequerAtencao(
  status: ProcuracaoEfetiva | null | undefined
): boolean {
  return status === "pendente" || status === "expirada";
}

function statusDaContratacao(
  contrato: ClienteContratoConsulta
): ProcuracaoStatus | null {
  if (contrato.procuracaoStatus === undefined) return null;
  return normalizeProcuracaoStatus(contrato.procuracaoStatus);
}

function vigenciaTerminou(
  contrato: ClienteContratoConsulta,
  hojeIso: string
): boolean {
  const vigencia = vigenciaContratualConfiavel(
    contrato.data_inicio,
    contrato.data_fim
  );
  if (!vigencia) return false;
  return vigencia.fim < hojeIso;
}

function maisRecente<T extends ClienteContratoConsulta>(lista: T[]): T | null {
  if (lista.length === 0) return null;
  return [...lista].sort((a, b) =>
    (b.data_inicio ?? "").localeCompare(a.data_inicio ?? "")
  )[0];
}

/**
 * Status efetivo da procuração do cliente.
 * Usa a procuração gravada em cada contratação e a vigência já usada no contrato atual.
 * Não escolhe o orçamento mais recente e não transfere a procuração de um contrato para outro.
 * Sem status por contratação, devolve null para o chamador usar o cadastro legado.
 */
export function resolverProcuracaoEfetiva(
  contratos: ClienteContratoConsulta[],
  hojeIso?: string
): ProcuracaoEfetiva | null {
  const hoje = (hojeIso ?? todayIsoSaoPaulo()).slice(0, 10);
  const informados = contratos.filter(
    (contrato) => statusDaContratacao(contrato) != null
  );
  if (informados.length === 0) return null;

  const vigentes = informados.filter((contrato) =>
    contratoElegivelComoAtual(contrato, hoje)
  );
  if (vigentes.length > 0) {
    if (
      vigentes.some((contrato) => statusDaContratacao(contrato) === "ativa")
    ) {
      return "ativa";
    }
    const referencia = maisRecente(vigentes);
    const status = referencia ? statusDaContratacao(referencia) : "pendente";
    return status === "nao_necessaria" ? "nao_necessaria" : "pendente";
  }

  const semVigencia = informados.filter(
    (contrato) =>
      !contratoInicioFuturo(contrato, hoje) &&
      (contratoEncerrado(contrato) || vigenciaTerminou(contrato, hoje))
  );
  if (
    semVigencia.some((contrato) => statusDaContratacao(contrato) === "ativa")
  ) {
    return "expirada";
  }

  const emAndamento = informados.filter(
    (contrato) =>
      !contratoEncerrado(contrato) && !vigenciaTerminou(contrato, hoje)
  );
  const referencia = maisRecente(emAndamento) ?? maisRecente(semVigencia);
  const status = referencia ? statusDaContratacao(referencia) : "pendente";
  if (status === "ativa") return "pendente";
  return status === "nao_necessaria" ? "nao_necessaria" : "pendente";
}
