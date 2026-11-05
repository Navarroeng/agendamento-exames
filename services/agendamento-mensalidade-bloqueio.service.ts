import { todayIsoSaoPaulo } from "@/lib/agendamento-datetime";
import {
  avaliarBloqueioMensalidadesContrato,
  escolherContratoIdAtendimento,
  MENSALIDADE_ATRASO_CONSULTA_MSG,
  mensagemBloqueioMensalidadeCompleta,
  type AvaliacaoBloqueioMensalidade,
  type ParcelaMensalidadeBloqueante,
} from "@/lib/agendamento-mensalidade-bloqueio";
import { verificarContratoVigenteDoAgendamento } from "@/lib/cliente-contrato-vigencia";
import { createClient } from "@/lib/supabase/client";
import { listarCobrancasMensalidadesDoOrcamento } from "@/services/cobrancas.service";

export class MensalidadeAgendamentoBloqueioError extends Error {
  readonly parcelas: ParcelaMensalidadeBloqueante[];
  readonly linhas: string[];

  constructor(avaliacao: Extract<AvaliacaoBloqueioMensalidade, { bloqueado: true }>) {
    super(mensagemBloqueioMensalidadeCompleta(avaliacao));
    this.name = "MensalidadeAgendamentoBloqueioError";
    this.parcelas = avaliacao.parcelas;
    this.linhas = avaliacao.linhas;
  }
}

export class MensalidadeAgendamentoConsultaError extends Error {
  constructor(message = MENSALIDADE_ATRASO_CONSULTA_MSG) {
    super(message);
    this.name = "MensalidadeAgendamentoConsultaError";
  }
}

export function isMensalidadeAgendamentoBloqueioError(
  err: unknown
): err is MensalidadeAgendamentoBloqueioError {
  return err instanceof MensalidadeAgendamentoBloqueioError;
}

export function isMensalidadeAgendamentoConsultaError(
  err: unknown
): err is MensalidadeAgendamentoConsultaError {
  return err instanceof MensalidadeAgendamentoConsultaError;
}

export type ResultadoMensalidadeNovoAgendamento =
  | { status: "livre" }
  | {
      status: "bloqueado";
      mensagem: string;
      linhas: string[];
      parcelas: ParcelaMensalidadeBloqueante[];
    }
  | { status: "consulta_falhou"; mensagem: string };

export async function avaliarMensalidadeNovoAgendamento(params: {
  clienteId?: string | null;
  clienteNome?: string | null;
  clienteCnpj?: string | null;
  dataAgendamento: string;
  vagaContratoId?: string | null;
  periodicoContratoId?: string | null;
  creditoContratoId?: string | null;
  contratoVigenteId?: string | null;
}): Promise<ResultadoMensalidadeNovoAgendamento> {
  try {
    let contratoVigenteId = (params.contratoVigenteId ?? "").trim();
    if (
      !escolherContratoIdAtendimento({
        vagaContratoId: params.vagaContratoId,
        periodicoContratoId: params.periodicoContratoId,
        creditoContratoId: params.creditoContratoId,
        contratoVigenteId,
      })
    ) {
      const vigente = await verificarContratoVigenteDoAgendamento({
        clienteId: params.clienteId,
        clienteNome: params.clienteNome,
        clienteCnpj: params.clienteCnpj,
        dataAgendamento: params.dataAgendamento,
      });
      contratoVigenteId = (vigente.contratoId ?? "").trim();
    }
    const contratoId = escolherContratoIdAtendimento({
      vagaContratoId: params.vagaContratoId,
      periodicoContratoId: params.periodicoContratoId,
      creditoContratoId: params.creditoContratoId,
      contratoVigenteId,
    });
    if (!contratoId) return { status: "livre" };
    return await avaliarMensalidadeDoContrato(contratoId);
  } catch (err) {
    if (
      isMensalidadeAgendamentoBloqueioError(err) ||
      isMensalidadeAgendamentoConsultaError(err)
    ) {
      throw err;
    }
    console.error("Erro ao verificar mensalidades do contrato:", err);
    return {
      status: "consulta_falhou",
      mensagem: MENSALIDADE_ATRASO_CONSULTA_MSG,
    };
  }
}

async function avaliarMensalidadeDoContrato(
  contratoId: string
): Promise<ResultadoMensalidadeNovoAgendamento> {
  const orcamentoId = await orcamentoIdDoContrato(contratoId);
  if (!orcamentoId) return { status: "livre" };
  const parcelas = await listarCobrancasMensalidadesDoOrcamento(orcamentoId);
  const avaliacao = avaliarBloqueioMensalidadesContrato({
    parcelas,
    orcamentoId,
    hojeIso: todayIsoSaoPaulo(),
  });
  if (!avaliacao.bloqueado) return { status: "livre" };
  return {
    status: "bloqueado",
    mensagem: avaliacao.mensagem,
    linhas: avaliacao.linhas,
    parcelas: avaliacao.parcelas,
  };
}

export async function assertMensalidadePermiteNovoAgendamento(
  params: Parameters<typeof avaliarMensalidadeNovoAgendamento>[0]
): Promise<void> {
  const resultado = await avaliarMensalidadeNovoAgendamento(params);
  if (resultado.status === "livre") return;
  if (resultado.status === "consulta_falhou") {
    throw new MensalidadeAgendamentoConsultaError(resultado.mensagem);
  }
  throw new MensalidadeAgendamentoBloqueioError({
    bloqueado: true,
    mensagem: resultado.mensagem,
    linhas: resultado.linhas,
    parcelas: resultado.parcelas,
  });
}

async function orcamentoIdDoContrato(contratoId: string): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("cliente_contratos")
    .select("orcamento_id")
    .eq("id", contratoId)
    .maybeSingle();
  if (error) throw error;
  const orcamentoId = String(data?.orcamento_id ?? "").trim();
  return orcamentoId || null;
}
