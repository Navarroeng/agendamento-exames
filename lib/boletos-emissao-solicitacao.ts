import type { OrcamentoAprovacaoRecord } from "@/lib/orcamento-aprovacao";
import {
  isTreinamentoCancelado,
  isTreinamentoEtapaConcluida,
  type ImplantacaoTreinamentoRecord,
} from "@/lib/implantacao-treinamento";

export const BOLETOS_EMISSAO_ORIENTACAO =
  "Registre a solicitação de emissão dos boletos para continuar.";

export const BOLETOS_EMISSAO_DATA_OBRIGATORIA_MSG =
  "Informe a data da solicitação.";

export type GravacaoSolicitacaoEmissaoBoletos = {
  boletos_emissao_solicitada: boolean;
  boletos_emissao_solicitada_em: string | null;
};

export type EstadoFormularioSolicitacaoEmissaoBoletos = {
  solicitar: boolean;
  data: string;
};

type AprovacaoSolicitacao = Pick<
  OrcamentoAprovacaoRecord,
  | "boletos_emissao_solicitada"
  | "boletos_emissao_solicitada_em"
  | "procuracao_salva_em"
  | "funcionarios_lista_path"
  | "funcionarios_vagas_salvas_em"
  | "funcionarios_lista_salva_em"
  | "logo_salva_em"
  | "visita_tecnica_salva_em"
> | null;

export type HistoricoImplantacaoAlemDoFinanceiro = {
  treinamento?: Pick<ImplantacaoTreinamentoRecord, "status"> | null;
  agendamentosRealizados?: number;
  agendamentosDispensados?: boolean;
};

export function dataSolicitacaoEmissaoBoletosValida(
  value: string | null | undefined
): string | null {
  const raw = (value ?? "").trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const [ano, mes, dia] = raw.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  if (
    data.getUTCFullYear() !== ano ||
    data.getUTCMonth() !== mes - 1 ||
    data.getUTCDate() !== dia
  ) {
    return null;
  }
  return raw;
}

/** Sim salvo junto com uma data válida. Pagamento e emissão não entram aqui. */
export function solicitacaoEmissaoBoletosConfirmada(
  aprovacao: AprovacaoSolicitacao
): boolean {
  if (aprovacao?.boletos_emissao_solicitada !== true) return false;
  return Boolean(
    dataSolicitacaoEmissaoBoletosValida(aprovacao.boletos_emissao_solicitada_em)
  );
}

/**
 * Contratação que já saiu do Financeiro antes deste registro.
 * Não usa financeiro_salvo_em e não inventa a data da solicitação.
 */
export function implantacaoJaAvancouAlemDoFinanceiro(
  aprovacao: AprovacaoSolicitacao,
  historico?: HistoricoImplantacaoAlemDoFinanceiro
): boolean {
  if (
    aprovacao?.procuracao_salva_em ||
    aprovacao?.funcionarios_lista_path ||
    aprovacao?.funcionarios_vagas_salvas_em ||
    aprovacao?.funcionarios_lista_salva_em ||
    aprovacao?.logo_salva_em ||
    aprovacao?.visita_tecnica_salva_em
  ) {
    return true;
  }
  if ((historico?.agendamentosRealizados ?? 0) > 0) return true;
  if (historico?.agendamentosDispensados) return true;
  const treinamento = historico?.treinamento;
  if (!treinamento) return false;
  return (
    isTreinamentoEtapaConcluida(treinamento) ||
    isTreinamentoCancelado(treinamento)
  );
}

/** Libera as abas seguintes da mensalidade por boleto. */
export function registroSolicitacaoOuHistoricoLiberado(
  aprovacao: AprovacaoSolicitacao,
  historico?: HistoricoImplantacaoAlemDoFinanceiro
): boolean {
  return (
    solicitacaoEmissaoBoletosConfirmada(aprovacao) ||
    implantacaoJaAvancouAlemDoFinanceiro(aprovacao, historico)
  );
}

/** Recupera o Sim e a data já gravados. Null continua desmarcado, sem data inventada. */
export function estadoFormularioSolicitacaoEmissaoBoletos(
  aprovacao: AprovacaoSolicitacao
): EstadoFormularioSolicitacaoEmissaoBoletos {
  return {
    solicitar: aprovacao?.boletos_emissao_solicitada === true,
    data:
      dataSolicitacaoEmissaoBoletosValida(
        aprovacao?.boletos_emissao_solicitada_em
      ) ?? "",
  };
}

export function gravacaoSolicitacaoEmissaoBoletos(
  solicitar: boolean,
  data: string | null | undefined
): GravacaoSolicitacaoEmissaoBoletos {
  if (!solicitar) {
    return {
      boletos_emissao_solicitada: false,
      boletos_emissao_solicitada_em: null,
    };
  }
  const valida = dataSolicitacaoEmissaoBoletosValida(data);
  if (!valida) {
    throw new Error(BOLETOS_EMISSAO_DATA_OBRIGATORIA_MSG);
  }
  return {
    boletos_emissao_solicitada: true,
    boletos_emissao_solicitada_em: valida,
  };
}
