import { todayIsoSaoPaulo } from "@/lib/agendamento-datetime";
import { vigenciaContratualConfiavel } from "@/lib/contrato-navarro";
import {
  resolverGradeMensalidades,
  type ParcelaMensalidadeRegistrada,
} from "@/lib/mensalidade-parcelas";
import { isOrcamentoMensalidade } from "@/lib/orcamento-modalidade";
import type { ClienteContratoRecord, ClienteContratoStatus } from "@/lib/types";

/** Contexto da cobrança mensal, quando o contrato veio de orçamento. */
export type ContextoCobrancaContrato = {
  modalidadeOrcamento?: string | null;
  mensalidadePagamento?: string | null;
  mensalidadeDiaVencimento?: number | null;
  parcelasMensalidade?: ParcelaMensalidadeRegistrada[];
};

export type ClienteContratoConsulta = ClienteContratoRecord &
  ContextoCobrancaContrato;

const STATUS_OPERACIONAL: ClienteContratoStatus[] = [
  "ativo",
  "em_renovacao",
  "pago",
];

const STATUS_PIPELINE: ClienteContratoStatus[] = [
  "ativo",
  "em_renovacao",
  "pago",
  "aguardando_pagamento",
  "assinado",
  "enviado",
  "aguardando_envio",
];

const STATUS_ASSINADO: ClienteContratoStatus[] = [
  "assinado",
  "aguardando_pagamento",
  "ativo",
  "em_renovacao",
  "pago",
];

function isoData(value: string | null | undefined): string {
  const texto = (value ?? "").trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) ? texto : "";
}

export function contratoEncerrado(
  contrato: Pick<ClienteContratoRecord, "status" | "encerrado_em">
): boolean {
  return (
    contrato.status === "encerrado" ||
    contrato.status === "cancelado" ||
    Boolean(contrato.encerrado_em)
  );
}

/**
 * Gestão SST cobrada mês a mês.
 * À vista e as demais modalidades continuam exigindo o pagamento para ativar.
 * A condição gravada cobre o registro antigo, em que o tipo ficou "anual".
 */
export function contratoCobrancaMensal(
  contrato: Pick<ClienteContratoRecord, "tipo_contrato" | "condicao_pagamento"> &
    ContextoCobrancaContrato
): boolean {
  if (contrato.mensalidadePagamento === "avista") return false;
  if (
    contrato.modalidadeOrcamento &&
    isOrcamentoMensalidade(contrato.modalidadeOrcamento)
  ) {
    return true;
  }
  if (contrato.modalidadeOrcamento) return false;
  if (contrato.tipo_contrato === "mensal") return true;
  const condicao = contrato.condicao_pagamento ?? "";
  if (/à\s*vista|\bavista\b/i.test(condicao)) return false;
  return /mensalidade/i.test(condicao);
}

export function contratoAssinado(
  contrato: Pick<
    ClienteContratoRecord,
    "status" | "contrato_assinado_em"
  >
): boolean {
  if (isoData(contrato.contrato_assinado_em)) return true;
  return STATUS_ASSINADO.includes(contrato.status);
}

function vigenciaDoContrato(
  contrato: Pick<ClienteContratoRecord, "data_inicio" | "data_fim">
): { inicio: string; fim: string } | null {
  return vigenciaContratualConfiavel(contrato.data_inicio, contrato.data_fim);
}

/** Vigência real já começou e ainda não terminou. Data de aprovação não substitui as duas datas. */
export function contratoVigenciaCobreData(
  contrato: Pick<ClienteContratoRecord, "data_inicio" | "data_fim">,
  hojeIso: string
): boolean {
  const vigencia = vigenciaDoContrato(contrato);
  if (!vigencia) return false;
  const hoje = isoData(hojeIso);
  return vigencia.inicio <= hoje && hoje <= vigencia.fim;
}

export function contratoInicioFuturo(
  contrato: Pick<ClienteContratoRecord, "data_inicio" | "data_fim">,
  hojeIso: string
): boolean {
  const vigencia = vigenciaDoContrato(contrato);
  if (!vigencia) return false;
  return vigencia.inicio > isoData(hojeIso);
}

/**
 * Pode ser o contrato atual: assinado, vigência confiável e período contendo a data.
 * Mensalidade não exige a primeira parcela. As demais modalidades exigem status operacional.
 */
export function contratoElegivelComoAtual(
  contrato: ClienteContratoConsulta,
  hojeIso: string
): boolean {
  if (contratoEncerrado(contrato)) return false;
  if (!contratoVigenciaCobreData(contrato, hojeIso)) return false;
  if (contratoCobrancaMensal(contrato)) return contratoAssinado(contrato);
  return STATUS_OPERACIONAL.includes(contrato.status);
}

function recencia(contrato: ClienteContratoRecord): string {
  const vigencia = vigenciaDoContrato(contrato);
  if (vigencia) return vigencia.inicio;
  return (
    isoData(contrato.aprovado_em) ||
    isoData(contrato.created_at) ||
    isoData(contrato.data_inicio)
  );
}

function maisRecente<T extends ClienteContratoConsulta>(lista: T[]): T | null {
  if (lista.length === 0) return null;
  return [...lista].sort((a, b) => recencia(b).localeCompare(recencia(a)))[0];
}

function preferirMesmaContratacao<T extends ClienteContratoConsulta>(
  atual: T,
  candidato: T
): T {
  const atualTemVigencia = Boolean(vigenciaDoContrato(atual));
  const candidatoTemVigencia = Boolean(vigenciaDoContrato(candidato));
  if (candidatoTemVigencia && !atualTemVigencia) return candidato;
  if (atualTemVigencia && !candidatoTemVigencia) return atual;
  return recencia(candidato) >= recencia(atual) ? candidato : atual;
}

/** Uma linha por contratação. Não descarta o vínculo antigo de outro orçamento. */
export function deduplicarContratos<T extends ClienteContratoConsulta>(
  contratos: T[]
): T[] {
  const porId = new Map<string, T>();
  for (const contrato of contratos) porId.set(contrato.id, contrato);
  const semOrcamento: T[] = [];
  const porOrcamento = new Map<string, T>();
  for (const contrato of Array.from(porId.values())) {
    const orcamentoId = contrato.orcamento_id?.trim();
    if (!orcamentoId) {
      semOrcamento.push(contrato);
      continue;
    }
    const anterior = porOrcamento.get(orcamentoId);
    porOrcamento.set(
      orcamentoId,
      anterior ? preferirMesmaContratacao(anterior, contrato) : contrato
    );
  }
  return semOrcamento.concat(Array.from(porOrcamento.values()));
}

/**
 * Contrato vigente da contratação atual.
 * Não escolhe o registro mais recente nem um início futuro.
 * Sem vigente, mantém o expirado operacional para a tela não esconder o vínculo.
 */
export function selecionarContratoAtual<T extends ClienteContratoConsulta>(
  contratos: T[],
  hojeIso: string = todayIsoSaoPaulo()
): T | null {
  const lista = deduplicarContratos(contratos);
  const hoje = isoData(hojeIso) || todayIsoSaoPaulo();
  const abertos = lista.filter((contrato) => !contratoEncerrado(contrato));
  const vigente = maisRecente(
    abertos.filter((contrato) => contratoElegivelComoAtual(contrato, hoje))
  );
  if (vigente) return vigente;

  const semInicioFuturo = abertos.filter(
    (contrato) => !contratoInicioFuturo(contrato, hoje)
  );
  if (semInicioFuturo.length === 0) return null;

  const expirado = maisRecente(
    semInicioFuturo.filter((contrato) => {
      const vigencia = vigenciaDoContrato(contrato);
      return (
        STATUS_OPERACIONAL.includes(contrato.status) &&
        Boolean(vigencia) &&
        vigencia!.fim < hoje
      );
    })
  );
  if (expirado) return expirado;

  const ordenados = [...semInicioFuturo].sort((a, b) =>
    recencia(b).localeCompare(recencia(a))
  );
  for (const status of STATUS_PIPELINE) {
    const encontrado = ordenados.find((contrato) => contrato.status === status);
    if (encontrado) return encontrado;
  }
  return null;
}

export function ordenarContratosRecentes<T extends ClienteContratoConsulta>(
  contratos: T[]
): T[] {
  return [...deduplicarContratos(contratos)].sort((a, b) => {
    const porRecencia = recencia(b).localeCompare(recencia(a));
    if (porRecencia !== 0) return porRecencia;
    return (b.numero ?? "").localeCompare(a.numero ?? "");
  });
}

export function labelFinanceiroMensalidade(
  contrato: Pick<
    ClienteContratoConsulta,
    | "data_inicio"
    | "data_fim"
    | "valor_contrato"
    | "mensalidadeDiaVencimento"
    | "parcelasMensalidade"
  >,
  hojeIso: string = todayIsoSaoPaulo()
): string {
  const grade = resolverGradeMensalidades({
    vigenciaInicio: contrato.data_inicio,
    vigenciaFim: contrato.data_fim,
    dia: contrato.mensalidadeDiaVencimento,
    valorMensal: contrato.valor_contrato,
    registradas: contrato.parcelasMensalidade,
    hojeIso,
  });
  if (!grade.ok || grade.parcelas.length === 0) return "—";
  if (grade.parcelas.some((parcela) => parcela.situacao === "vencida")) {
    return "Parcelas vencidas";
  }
  if (grade.parcelas.some((parcela) => parcela.situacao === "vence_hoje")) {
    return "Parcela vence hoje";
  }
  if (grade.parcelas.every((parcela) => parcela.situacao === "paga")) {
    return "Pago";
  }
  return "Parcelas a vencer";
}
