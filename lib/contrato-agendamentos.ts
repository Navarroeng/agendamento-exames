import type { AgendamentoStatus, AgendamentoWithExames } from "@/lib/types";
import { isClassificacaoVagasContratoCompleta } from "@/lib/contrato-vagas";

export type ContratoAgendamentoContagem = {
  contratados: number;
  previstos: number;
  realizados: number;
  /** @deprecated Preferir `comprometidos` — mantido por compat. */
  utilizados: number;
  /** Agendamentos válidos vinculados ao contrato. */
  agendados: number;
  /** Exames futuros que consomem previsão. */
  programadosFuturos: number;
  /**
   * ASOs contratuais em aberto formalmente registrados
   * (`contrato_creditos_aso` status disponivel).
   */
  emAberto: number;
  /**
   * Vagas ainda sem classificação (agendamento / futuro / ASO em aberto).
   * Nunca negativo.
   */
  pendentesDefinicao: number;
  /** Total comprometido (agendados + futuros + ASOs em aberto + vagas nomeadas). */
  comprometidos: number;
  /**
   * Funcionários já identificados na lista, ainda sem agendamento/futuro/ASO.
   * Card "Comprometidos" da Implantação.
   */
  vagasComprometidas: number;
  /** @deprecated Alias de pendentesDefinicao. */
  pendentes: number;
  /** @deprecated Alias de pendentesDefinicao. */
  disponiveis: number;
  adicionais: number;
  percentual: number;
  mensagem: string;
  mensagemComplemento: string | null;
  concluido: boolean;
  dispensado: boolean;
  progressoLabel: string;
  situacaoLabel: string | null;
};

export type AgendamentoClassificacao = "contrato" | "adicional" | "cancelado";

export function isAgendamentoSelecionavel(
  status: AgendamentoStatus | string
): boolean {
  return status !== "cancelado";
}

export function buildContratoAgendamentoContagem(
  quantidadeContratada: number,
  utilizados: number,
  adicionais = 0,
  opts?: {
    dispensado?: boolean;
    agendados?: number;
    programadosFuturos?: number;
    emAberto?: number;
    vagasComprometidas?: number;
  }
): ContratoAgendamentoContagem {
  const previstos = Math.max(0, quantidadeContratada || 0);
  const dispensado = Boolean(opts?.dispensado);
  const agendados = Math.max(0, opts?.agendados ?? 0);
  const programadosFuturos = Math.max(0, opts?.programadosFuturos ?? 0);
  const emAberto = Math.max(0, opts?.emAberto ?? 0);
  const vagasComprometidas = Math.max(0, opts?.vagasComprometidas ?? 0);

  // Comprometidos (classificados) = formalização da vaga, sem dupla contagem.
  // Progresso (`utilizados`) continua sendo agendados+futuros+emAberto.
  const hasBreakdown =
    opts?.agendados != null ||
    opts?.programadosFuturos != null ||
    opts?.emAberto != null ||
    opts?.vagasComprometidas != null;
  const comprometidos = Math.max(
    0,
    hasBreakdown
      ? agendados + programadosFuturos + emAberto + vagasComprometidas
      : Math.max(0, utilizados) + vagasComprometidas
  );
  const usadosProgresso = Math.max(0, utilizados);

  if (dispensado) {
    const extras = Math.max(0, adicionais);
    return {
      contratados: previstos,
      previstos,
      realizados: 0,
      utilizados: 0,
      agendados: 0,
      programadosFuturos: 0,
      emAberto: 0,
      pendentesDefinicao: 0,
      comprometidos: 0,
      vagasComprometidas: 0,
      pendentes: 0,
      disponiveis: 0,
      adicionais: extras,
      percentual: 100,
      mensagem: "Cliente optou por não realizar os agendamentos iniciais.",
      mensagemComplemento: null,
      concluido: true,
      dispensado: true,
      progressoLabel: "Concluído por dispensa",
      situacaoLabel: "Dispensados pelo cliente",
    };
  }

  const pendentesDefinicao = Math.max(0, previstos - comprometidos);
  const extras = Math.max(0, adicionais);
  const percentual =
    previstos > 0
      ? Math.min(100, Math.round((usadosProgresso / previstos) * 100))
      : usadosProgresso > 0
        ? 100
        : 0;
  const concluido = isClassificacaoVagasContratoCompleta({
    previstos,
    pendentesDefinicao,
    vagasComprometidas,
  });

  let mensagem = "";
  let mensagemComplemento: string | null = null;

  if (previstos <= 0) {
    mensagem =
      "Quantidade de colaboradores não informada nas condições aprovadas.";
  } else if (pendentesDefinicao === 1) {
    mensagem =
      "Falta definir 1 vaga para atingir a quantidade prevista no contrato.";
    mensagemComplemento =
      "Você pode vincular novos agendamentos, informar exames futuros ou manter essa vaga como ASO em aberto.";
  } else if (pendentesDefinicao > 1) {
    mensagem = `Faltam definir ${pendentesDefinicao} vagas para atingir a quantidade prevista no contrato.`;
    mensagemComplemento =
      "Você pode vincular novos agendamentos, informar exames futuros ou manter essas vagas como ASOs em aberto.";
  } else {
    mensagem = "A quantidade prevista do contrato foi totalmente classificada.";
    if (emAberto === 1) {
      mensagemComplemento =
        "Existe 1 ASO disponível para utilização futura durante a vigência do contrato.";
    } else if (emAberto > 1) {
      mensagemComplemento = `Existem ${emAberto} ASOs disponíveis para utilização futura durante a vigência do contrato.`;
    } else if (extras > 0) {
      mensagemComplemento =
        extras === 1
          ? "Existe 1 agendamento adicional além da previsão."
          : `Existem ${extras} agendamentos adicionais além da previsão.`;
    }
  }

  return {
    contratados: previstos,
    previstos,
    realizados: usadosProgresso,
    utilizados: usadosProgresso,
    agendados: hasBreakdown ? agendados : Math.max(0, usadosProgresso),
    programadosFuturos: hasBreakdown ? programadosFuturos : 0,
    emAberto: hasBreakdown ? emAberto : 0,
    pendentesDefinicao,
    comprometidos,
    vagasComprometidas,
    pendentes: pendentesDefinicao,
    disponiveis: pendentesDefinicao,
    adicionais: extras,
    percentual,
    mensagem,
    mensagemComplemento,
    concluido,
    dispensado: false,
    progressoLabel: `${percentual}%`,
    situacaoLabel: null,
  };
}

export function resolveClassificacaoAgendamento(params: {
  status: AgendamentoStatus | string;
  selecionado: boolean;
  dispensado?: boolean;
}): AgendamentoClassificacao {
  if (params.status === "cancelado") return "cancelado";
  if (params.dispensado) return "adicional";
  if (params.selecionado) return "contrato";
  return "adicional";
}

export function isDataNaVigencia(
  dataExame: string,
  dataInicio: string | null | undefined,
  dataFim: string | null | undefined
): boolean {
  const dia = dataExame.slice(0, 10);
  const inicio = (dataInicio ?? "").slice(0, 10);
  const fim = (dataFim ?? "").slice(0, 10);
  if (!dia || !inicio || !fim) return false;
  return dia >= inicio && dia <= fim;
}

/**
 * Isolamento da Implantação: o agendamento só entra se for do mesmo cliente.
 *
 * 1. Outro `cliente_id` → nunca entra.
 * 2. `cliente_nome` de outro cliente cadastrado → nunca entra, mesmo que o
 *    UUID esteja apontando para esta implantação (inconsistência de dados).
 * 3. Se este cliente tem nome conhecido e o agendamento também, os nomes
 *    precisam coincidir.
 * 4. Sem UUID (legado): só o nome exato deste cliente.
 */
export function agendamentoPertenceAoClienteContrato(
  agendamento: {
    cliente_id?: string | null;
    cliente_nome?: string | null;
  },
  cliente: {
    id: string | null | undefined;
    nome?: string | null;
    nomes?: Array<string | null | undefined>;
  },
  catalog?: Array<{ id: string; nome: string }>
): boolean {
  const clienteId = (cliente.id ?? "").trim();
  if (!clienteId) return false;

  const agClienteId = (agendamento.cliente_id ?? "").trim();
  if (agClienteId && agClienteId !== clienteId) return false;

  const nomeAg = normalizeNomeClienteContrato(agendamento.cliente_nome);
  const nomesDeste = new Set(
    [cliente.nome, ...(cliente.nomes ?? [])]
      .map(normalizeNomeClienteContrato)
      .filter(Boolean)
  );

  if (nomeAg && catalog?.length) {
    const nomeDeOutroCliente = catalog.some(
      (c) =>
        normalizeNomeClienteContrato(c.nome) === nomeAg &&
        (c.id ?? "").trim() !== "" &&
        (c.id ?? "").trim() !== clienteId
    );
    if (nomeDeOutroCliente) return false;
  }

  if (nomeAg && nomesDeste.size > 0 && !nomesDeste.has(nomeAg)) {
    return false;
  }

  if (agClienteId) return true;
  return Boolean(nomeAg) && nomesDeste.has(nomeAg);
}

function normalizeNomeClienteContrato(
  nome: string | null | undefined
): string {
  return (nome ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
}

/** Compat: legado consome_saldo em agendamentos. */
export function agendamentoConsomeSaldoContrato(
  agendamento: Pick<
    AgendamentoWithExames,
    "status" | "contrato_id" | "consome_saldo_contrato"
  >
): boolean {
  if (!agendamento.contrato_id) return false;
  if (agendamento.status === "cancelado") return false;
  if (agendamento.consome_saldo_contrato === false) return false;
  return true;
}

export function contratoTemAgendamentosIniciaisDispensados(
  contrato:
    | { agendamentos_iniciais_dispensados?: boolean | null }
    | null
    | undefined
): boolean {
  return Boolean(contrato?.agendamentos_iniciais_dispensados);
}
