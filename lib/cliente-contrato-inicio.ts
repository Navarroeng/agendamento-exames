import type { ClienteContratoConsulta } from "@/lib/cliente-contrato-atual";
import { formatDateBR } from "@/lib/format";

export const INICIO_CONTRATO_AGUARDANDO_ASSINATURA = "Aguardando assinatura";
export const INICIO_CONTRATO_NAO_INFORMADO = "Não informado";

export type AssinaturaAbaContratoEstado =
  | "nao_carregada"
  | "vazia"
  | "informada";

type AprovacaoAssinatura = {
  contrato_assinado_em?: string | null;
  revertida_em?: string | null;
  created_at?: string | null;
};

/**
 * Dia civil gravado, sem converter o instante para outro fuso.
 * `2026-10-28` e `2026-10-28T00:00:00.000Z` permanecem 2026-10-28.
 */
export function dataCivilRegistrada(value: string | null | undefined): string {
  const texto = (value ?? "").trim();
  const match = texto.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? "";
}

/** Aprovação vigente da aba Contrato. Linha revertida não devolve a data antiga. */
export function escolherAprovacaoVigente<T extends AprovacaoAssinatura>(
  rows: T[]
): T | null {
  const vivas = rows.filter((row) => !row.revertida_em);
  if (vivas.length === 0) return null;
  let vigente = vivas[0];
  for (const candidata of vivas.slice(1)) {
    if (String(candidata.created_at ?? "") >= String(vigente.created_at ?? "")) {
      vigente = candidata;
    }
  }
  return vigente;
}

/**
 * Grava o resultado da aba Contrato sem ler a vigência nem a cópia do vínculo.
 * Consulta concluída sem data fica `vazia`. Consulta que não concluiu fica `nao_carregada`.
 */
export function aplicarAssinaturaAbaContrato<
  T extends { orcamento_id?: string | null },
>(
  contrato: T,
  params: {
    consultaConcluida: boolean;
    aprovacao: AprovacaoAssinatura | null;
  }
): T & {
  assinaturaAbaContratoEstado?: AssinaturaAbaContratoEstado;
  assinaturaAbaContratoEm?: string | null;
} {
  if (!contrato.orcamento_id?.trim()) return contrato;
  if (!params.consultaConcluida) {
    return {
      ...contrato,
      assinaturaAbaContratoEstado: "nao_carregada",
      assinaturaAbaContratoEm: null,
    };
  }
  const iso = dataCivilRegistrada(params.aprovacao?.contrato_assinado_em);
  if (!iso) {
    return {
      ...contrato,
      assinaturaAbaContratoEstado: "vazia",
      assinaturaAbaContratoEm: null,
    };
  }
  return {
    ...contrato,
    assinaturaAbaContratoEstado: "informada",
    assinaturaAbaContratoEm: iso,
  };
}

export function classificarAssinaturaAba(
  contrato: Pick<ClienteContratoConsulta, "orcamento_id" | "assinaturaAbaContratoEstado">
): AssinaturaAbaContratoEstado | "sem_orcamento" {
  if (!contrato.orcamento_id?.trim()) return "sem_orcamento";
  if (contrato.assinaturaAbaContratoEstado === "informada") return "informada";
  if (contrato.assinaturaAbaContratoEstado === "vazia") return "vazia";
  return "nao_carregada";
}

/**
 * Data da coluna Aprovação no histórico de contratos SST.
 * Aprovação informada no cadastro quando existe; senão, a data de início.
 */
export function isoAprovacaoCadastroContrato(contrato: {
  aprovado_em?: string | null;
  data_inicio?: string | null;
}): string {
  const aprovacao = dataCivilRegistrada(contrato.aprovado_em);
  if (aprovacao) return aprovacao;
  return dataCivilRegistrada(contrato.data_inicio);
}

/**
 * Início do contrato SST no modal do cliente.
 * Manual, sem vínculo de orçamento: a mesma data da coluna Aprovação.
 * Sem aprovação e sem início, "Não informado". Ausência de assinatura não
 * classifica o contrato.
 * Com orçamento: só a data da aba Contrato. "Aguardando assinatura" apenas
 * quando a consulta concluiu e essa data está vazia. Consulta que não
 * concluiu não vira contrato manual nem pendência de assinatura.
 */
export function labelInicioContratoSst(
  contrato: Pick<
    ClienteContratoConsulta,
    "orcamento_id" | "assinaturaAbaContratoEstado" | "assinaturaAbaContratoEm"
  > & {
    data_inicio?: string | null;
    aprovado_em?: string | null;
  }
): string {
  const origem = classificarAssinaturaAba(contrato);
  if (origem === "sem_orcamento") {
    const iso = isoAprovacaoCadastroContrato(contrato);
    return iso ? formatDateBR(iso) : INICIO_CONTRATO_NAO_INFORMADO;
  }
  if (origem === "informada") {
    const iso = dataCivilRegistrada(contrato.assinaturaAbaContratoEm);
    return iso ? formatDateBR(iso) : INICIO_CONTRATO_AGUARDANDO_ASSINATURA;
  }
  if (origem === "vazia") return INICIO_CONTRATO_AGUARDANDO_ASSINATURA;
  return INICIO_CONTRATO_NAO_INFORMADO;
}
