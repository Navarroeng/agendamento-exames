import { selecionarContratoVigenteParaAgendamento } from "@/lib/agendamento-cliente-lookup";
import { exameTemMotivoCreditoContrato } from "@/lib/contrato-creditos-aso";
import {
  CONTRATO_ADICIONAL_MENSALIDADE,
  valorExameClinicoAvulsoMensalidade,
} from "@/lib/contrato-navarro";
import { CLINICO_VALOR_ASO_ADMISSIONAL, isExameClinicoManual } from "@/lib/exame-pricing";
import { isOrcamentoMensalidade } from "@/lib/orcamento-modalidade";
import {
  complementarContratosComCobranca,
  listarContratosPorCliente,
} from "@/services/cliente-contrato.service";
import { verificarContratoVigenteDoAgendamento } from "@/lib/cliente-contrato-vigencia";

/**
 * Gestão SST mensal pela modalidade gravada na contratação.
 * À vista, quantidade de parcelas e o nome do cliente não definem o preço.
 * Sem modalidade, só o tipo "mensal" antigo entra nesta regra.
 */
export function contratoEhGestaoSstMensal(contrato: {
  modalidadeOrcamento?: string | null;
  tipo_contrato?: string | null;
}): boolean {
  const modalidade = (contrato.modalidadeOrcamento ?? "").trim();
  if (modalidade) return isOrcamentoMensalidade(modalidade);
  return contrato.tipo_contrato === "mensal";
}

/**
 * Admissional avulso do contrato vinculado ao atendimento.
 * Pontual e ausência de contrato permanecem R$ 100.
 * Mensal usa o valor acordado na contratação; sem esse parâmetro, o catálogo atual (R$ 50).
 */
export function valorAdmissionalAvulsoDoContrato(
  contrato: {
    modalidadeOrcamento?: string | null;
    tipo_contrato?: string | null;
    exameAdmissionalReais?: number | null;
  } | null | undefined
): number {
  if (!contrato || !contratoEhGestaoSstMensal(contrato)) {
    return CLINICO_VALOR_ASO_ADMISSIONAL;
  }
  const acordado = Number(contrato.exameAdmissionalReais);
  if (Number.isFinite(acordado) && acordado > 0) return acordado;
  return (
    valorExameClinicoAvulsoMensalidade()?.admissional ??
    CONTRATO_ADICIONAL_MENSALIDADE.admissionalCentavos / 100
  );
}

/** Mesma escolha de contrato vigente já usada no agendamento. */
export function valorAdmissionalDoContratoSelecionado<
  T extends {
    id: string;
    modalidadeOrcamento?: string | null;
    tipo_contrato?: string | null;
    exameAdmissionalReais?: number | null;
  },
>(
  contratos: T[],
  isVigente: (contrato: T) => boolean,
  contratoIdPreferido?: string | null
): number {
  const selecionado = selecionarContratoVigenteParaAgendamento(
    contratos,
    isVigente,
    contratoIdPreferido
  );
  return valorAdmissionalAvulsoDoContrato(selecionado ?? null);
}

type ExameAdmissionalPayload = {
  tipo_exame: string;
  valor_cliente: number;
  motivo_valor_zero?: string | null;
  incluso_credito_contrato?: boolean | null;
};

/**
 * Grava o admissional avulso no Clínico.
 * Não altera complementares, nem exame coberto por crédito contratual, nem outros ASOs.
 */
export function aplicarValorAdmissionalNoPayload<T extends ExameAdmissionalPayload>(
  exames: T[],
  aso: string,
  valor: number
): T[] {
  if (aso.trim() !== "Admissional") return exames;
  const preco = Number(valor);
  if (!Number.isFinite(preco) || preco <= 0) return exames;

  return exames.map((exam) => {
    if (!isExameClinicoManual(exam.tipo_exame)) return exam;
    if (exam.incluso_credito_contrato) return exam;
    if (exameTemMotivoCreditoContrato(exam.motivo_valor_zero)) return exam;
    return { ...exam, valor_cliente: preco };
  });
}

export async function resolverValorAdmissionalDoAtendimento(input: {
  clienteId?: string | null;
  clienteNome?: string | null;
  clienteCnpj?: string | null;
  dataAgendamento: string;
  contratoId?: string | null;
}): Promise<number> {
  const data = (input.dataAgendamento ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return CLINICO_VALOR_ASO_ADMISSIONAL;

  const vigencia = await verificarContratoVigenteDoAgendamento({
    clienteId: input.clienteId,
    clienteNome: input.clienteNome,
    clienteCnpj: input.clienteCnpj,
    dataAgendamento: data,
    contratoId: input.contratoId,
  });
  if (!vigencia.vigente || !vigencia.contratoId || !vigencia.clienteId) {
    return CLINICO_VALOR_ASO_ADMISSIONAL;
  }

  const contratos = await complementarContratosComCobranca(
    await listarContratosPorCliente(vigencia.clienteId)
  );
  const contrato = contratos.find((item) => item.id === vigencia.contratoId) ?? null;
  return valorAdmissionalAvulsoDoContrato(contrato);
}
