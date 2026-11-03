import type { ClienteContratoConsulta } from "@/lib/cliente-contrato-atual";
import { formatDateBR } from "@/lib/format";

export const INICIO_CONTRATO_AGUARDANDO_ASSINATURA = "Aguardando assinatura";

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
 * Início do contrato SST no modal do cliente.
 * Com orçamento, só a data da aba Contrato. Vazio e consulta pendente não usam a cópia.
 */
export function labelInicioContratoSst(
  contrato: Pick<
    ClienteContratoConsulta,
    | "orcamento_id"
    | "contrato_assinado_em"
    | "assinaturaAbaContratoEstado"
    | "assinaturaAbaContratoEm"
  >
): string {
  if (contrato.orcamento_id?.trim()) {
    if (contrato.assinaturaAbaContratoEstado === "informada") {
      const iso = dataCivilRegistrada(contrato.assinaturaAbaContratoEm);
      return iso ? formatDateBR(iso) : INICIO_CONTRATO_AGUARDANDO_ASSINATURA;
    }
    return INICIO_CONTRATO_AGUARDANDO_ASSINATURA;
  }
  const iso = dataCivilRegistrada(contrato.contrato_assinado_em);
  return iso ? formatDateBR(iso) : INICIO_CONTRATO_AGUARDANDO_ASSINATURA;
}
