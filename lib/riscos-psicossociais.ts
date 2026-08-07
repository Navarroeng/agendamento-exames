import type { ImplantacaoProcesso } from "@/lib/implantacao-clientes";
import {
  isLaudosSstConcluido,
  type LaudosSstProcesso,
  type OrcamentoLaudosSstRecord,
} from "@/lib/laudos-sst";
import { normalizeSearchText } from "@/lib/text-normalize";

/** Etapas exclusivas de Riscos Psicossociais (ordem fixa). */
export const RISCOS_PSICOSSOCIAIS_ETAPAS = [
  { id: "lista_presenca", label: "Lista de presença" },
  { id: "cadastro_empresa", label: "Cadastro da empresa" },
  { id: "envio_qr_code", label: "Envio do QR Code" },
  { id: "preenchimento_finalizado", label: "Preenchimento finalizado" },
  { id: "laudo_elaborado", label: "Laudo elaborado" },
  { id: "enviado_cliente", label: "Enviado para o cliente" },
] as const;

export type RiscosPsicossociaisEtapaId =
  (typeof RISCOS_PSICOSSOCIAIS_ETAPAS)[number]["id"];

export type RiscosPsicossociaisStatus = "em_andamento" | "concluido";

export const RISCOS_PSICOSSOCIAIS_TOTAL_ETAPAS =
  RISCOS_PSICOSSOCIAIS_ETAPAS.length;

export const RISCOS_PSICOSSOCIAIS_ETAPA_LABELS: Record<
  RiscosPsicossociaisEtapaId,
  string
> = Object.fromEntries(
  RISCOS_PSICOSSOCIAIS_ETAPAS.map((e) => [e.id, e.label])
) as Record<RiscosPsicossociaisEtapaId, string>;

export interface OrcamentoRiscosPsicossociaisRecord {
  orcamento_id: string;
  etapa_atual: RiscosPsicossociaisEtapaId;
  etapas_concluidas: number;
  status?: RiscosPsicossociaisStatus | null;
  entrada_em?: string | null;
  concluido_em?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface RiscosPsicossociaisProcesso {
  implantacao: ImplantacaoProcesso;
  laudos: LaudosSstProcesso;
  etapaAtual: RiscosPsicossociaisEtapaId;
  etapasConcluidas: number;
  totalEtapas: number;
  progressoLabel: string;
  status: RiscosPsicossociaisStatus;
  /** Data de entrada na etapa (conclusão do Laudos SST / criação do tracking). */
  dataEntrada: string | null;
}

export interface RiscosPsicossociaisFilters {
  busca: string;
  responsavel: string;
}

export const EMPTY_RISCOS_PSICOSSOCIAIS_FILTERS: RiscosPsicossociaisFilters = {
  busca: "",
  responsavel: "",
};

export function isRiscosPsicossociaisEtapaId(
  value: string
): value is RiscosPsicossociaisEtapaId {
  return RISCOS_PSICOSSOCIAIS_ETAPAS.some((e) => e.id === value);
}

/** Elegível a Riscos quando o Laudos SST do mesmo orçamento está concluído. */
export function isProcessoElegivelRiscosPsicossociais(
  laudos: LaudosSstProcesso,
  trackingLaudos: OrcamentoLaudosSstRecord | null
): boolean {
  if (laudos.status === "concluido") return true;
  return isLaudosSstConcluido(trackingLaudos);
}

export function buildRiscosPsicossociaisProcesso(
  laudos: LaudosSstProcesso,
  tracking: OrcamentoRiscosPsicossociaisRecord | null
): RiscosPsicossociaisProcesso {
  const etapaAtual =
    tracking && isRiscosPsicossociaisEtapaId(tracking.etapa_atual)
      ? tracking.etapa_atual
      : "lista_presenca";
  const etapasConcluidas = Math.min(
    RISCOS_PSICOSSOCIAIS_TOTAL_ETAPAS,
    Math.max(0, Number(tracking?.etapas_concluidas) || 0)
  );
  const concluido =
    tracking?.status === "concluido" ||
    etapasConcluidas >= RISCOS_PSICOSSOCIAIS_TOTAL_ETAPAS;

  return {
    implantacao: laudos.implantacao,
    laudos,
    etapaAtual: concluido ? "enviado_cliente" : etapaAtual,
    etapasConcluidas: concluido
      ? RISCOS_PSICOSSOCIAIS_TOTAL_ETAPAS
      : etapasConcluidas,
    totalEtapas: RISCOS_PSICOSSOCIAIS_TOTAL_ETAPAS,
    progressoLabel: `${
      concluido ? RISCOS_PSICOSSOCIAIS_TOTAL_ETAPAS : etapasConcluidas
    } de ${RISCOS_PSICOSSOCIAIS_TOTAL_ETAPAS}`,
    status: concluido ? "concluido" : "em_andamento",
    dataEntrada:
      tracking?.entrada_em ?? laudos.concluidoEm ?? null,
  };
}

export function filterRiscosPsicossociaisProcessos(
  processos: RiscosPsicossociaisProcesso[],
  filters: RiscosPsicossociaisFilters
): RiscosPsicossociaisProcesso[] {
  const busca = normalizeSearchText(filters.busca);
  const buscaDigits = filters.busca.replace(/\D/g, "");

  return processos.filter((p) => {
    const { orcamento } = p.implantacao;

    if (
      filters.responsavel &&
      orcamento.responsavel !== filters.responsavel
    ) {
      return false;
    }

    if (!busca && !buscaDigits) return true;

    const haystack = [
      orcamento.numero,
      p.implantacao.numeroContrato ?? "",
      orcamento.cliente_nome,
      orcamento.cliente_cnpj ?? "",
      orcamento.responsavel,
      p.status === "concluido"
        ? "Concluído"
        : RISCOS_PSICOSSOCIAIS_ETAPA_LABELS[p.etapaAtual],
    ].join(" ");

    if (busca && normalizeSearchText(haystack).includes(busca)) return true;
    if (
      buscaDigits &&
      (orcamento.cliente_cnpj ?? "").replace(/\D/g, "").includes(buscaDigits)
    ) {
      return true;
    }
    return false;
  });
}

export function sortRiscosPsicossociaisProcessos(
  processos: RiscosPsicossociaisProcesso[]
): RiscosPsicossociaisProcesso[] {
  return [...processos].sort((a, b) => {
    const da = a.dataEntrada ?? "";
    const db = b.dataEntrada ?? "";
    if (da !== db) return db.localeCompare(da);
    return a.implantacao.orcamento.numero.localeCompare(
      b.implantacao.orcamento.numero,
      "pt-BR"
    );
  });
}
