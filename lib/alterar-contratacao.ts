import { valorMensalidadeRenovacaoGestaoSst } from "@/lib/contrato-navarro";
import type { EfeitoValorMensalidade } from "@/lib/mensalidade-parcelas";

export const ALTERACAO_CONTRATACAO_MINIMO_REAIS = 130;

export const ALTERACAO_PARCELAS_EXISTENTES_MSG =
  "As parcelas existentes serão atualizadas para o novo valor total. Não será criada cobrança complementar da diferença.";

export const MOTIVO_PRESERVAR_PARCELA = {
  anterior: "Anterior à alteração",
  paga: "Paga",
  parcial: "Parcialmente paga",
  recebimento: "Recebimento registrado",
  comprovante: "Comprovante registrado",
  cancelada: "Cancelada",
} as const;

export type MotivoPreservarParcela = keyof typeof MOTIVO_PRESERVAR_PARCELA;

export type ParcelaAlteracaoEntrada = {
  id: string;
  numero: number;
  vencimentoIso: string;
  vigenciaInicio: string;
  valor: number;
  pagoEmIso: string | null;
  valorRecebido: number | null;
  comprovantePath: string | null;
  semVigenciaEm: string | null;
};

export type VagaOcupacaoEntrada = {
  indice: number;
  status: string;
  colaborador: string | null;
  colaboradorCpf: string | null;
  agendamentoId: string | null;
  creditoAsoId: string | null;
  periodicoFuturoId: string | null;
};

export type ParcelaPlanoAlteracao = {
  id: string;
  numero: number;
  vencimentoIso: string;
  valorAnterior: number;
  valorNovo: number;
  acao: "atualizar" | "preservar";
  motivo: MotivoPreservarParcela | null;
  ajuste: string | null;
};

export type PlanoAlteracaoContratacao = {
  quantidadeAnterior: number;
  quantidadeNova: number;
  valorAnterior: number;
  valorNovo: number;
  valorSugerido: number;
  parcelas: ParcelaPlanoAlteracao[];
  vagasNovas: number;
  impedimentos: string[];
};

export function sugerirMensalidadeContratacao(colaboradores: number): number {
  return valorMensalidadeRenovacaoGestaoSst(colaboradores);
}

export function centavosReais(valor: number): number {
  return Math.round((Number(valor) || 0) * 100);
}

export function vagaContratacaoOcupada(vaga: VagaOcupacaoEntrada): boolean {
  if (String(vaga.status ?? "").trim() !== "aberta") return true;
  if (String(vaga.colaborador ?? "").trim()) return true;
  if (String(vaga.colaboradorCpf ?? "").trim()) return true;
  if (vaga.agendamentoId || vaga.creditoAsoId || vaga.periodicoFuturoId) {
    return true;
  }
  return false;
}

function iso(value: string | null | undefined): string | null {
  const texto = (value ?? "").trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) ? texto : null;
}

export function motivoPreservarParcela(params: {
  numero: number;
  inicioNumero: number;
  parcela: ParcelaAlteracaoEntrada;
}): MotivoPreservarParcela | null {
  if (params.parcela.semVigenciaEm) return "cancelada";
  if (params.numero < params.inicioNumero) return "anterior";
  if (iso(params.parcela.pagoEmIso)) return "paga";
  const recebido = params.parcela.valorRecebido;
  if (recebido != null && Number.isFinite(Number(recebido))) {
    if (centavosReais(Number(recebido)) < centavosReais(params.parcela.valor)) {
      return "parcial";
    }
    return "recebimento";
  }
  if (String(params.parcela.comprovantePath ?? "").trim()) return "comprovante";
  return null;
}

export function efeitoValorMensalidadeDaAprovacao(
  aprovacao: {
    contratacao_efeito_vigencia_inicio?: string | null;
    contratacao_efeito_numero?: number | null;
    contratacao_valor_anterior?: number | string | null;
  } | null | undefined,
  vigenciaInicio: string | null | undefined
): EfeitoValorMensalidade | null {
  const inicio = iso(vigenciaInicio);
  const efeitoInicio = iso(aprovacao?.contratacao_efeito_vigencia_inicio);
  const numero = Number(aprovacao?.contratacao_efeito_numero);
  const anterior = Number(aprovacao?.contratacao_valor_anterior);
  if (!inicio || !efeitoInicio || inicio !== efeitoInicio) return null;
  if (!Number.isInteger(numero) || numero < 2) return null;
  if (!Number.isFinite(anterior) || anterior <= 0) return null;
  return { vigenciaInicio: efeitoInicio, numero, valorAnterior: anterior };
}

/**
 * Plano da alteração sobre as parcelas já existentes da vigência.
 * Não cria parcela, não calcula diferença complementar e não apaga pagamento.
 */
export function planejarAlteracaoContratacao(params: {
  quantidadeAnterior: number;
  quantidadeNova: number;
  valorAnterior: number;
  valorNovo: number;
  inicioNumero: number;
  vigenciaInicio: string;
  parcelas: ParcelaAlteracaoEntrada[];
  vagas: VagaOcupacaoEntrada[];
}): PlanoAlteracaoContratacao {
  const quantidadeAnterior = Math.floor(Number(params.quantidadeAnterior) || 0);
  const quantidadeNova = Math.floor(Number(params.quantidadeNova) || 0);
  const valorAnterior = Number(params.valorAnterior) || 0;
  const valorNovo = Number(params.valorNovo) || 0;
  const inicioNumero = Math.floor(Number(params.inicioNumero) || 0);
  const vigencia = iso(params.vigenciaInicio) ?? "";
  const valorSugerido = sugerirMensalidadeContratacao(quantidadeNova);
  const impedimentos: string[] = [];

  if (quantidadeNova < 1) {
    impedimentos.push("Informe a nova quantidade de colaboradores.");
  }
  if (centavosReais(valorNovo) < centavosReais(ALTERACAO_CONTRATACAO_MINIMO_REAIS)) {
    impedimentos.push("A nova mensalidade não pode ser menor que R$ 130,00.");
  }
  if (inicioNumero < 1 || inicioNumero > 12) {
    impedimentos.push("Escolha a parcela a partir da qual a alteração vale.");
  }

  const daVigencia = params.parcelas
    .filter((item) => iso(item.vigenciaInicio) === vigencia && !item.semVigenciaEm)
    .sort((a, b) => a.numero - b.numero);

  if (daVigencia.length === 0) {
    impedimentos.push(
      "Não há mensalidades geradas nesta vigência. Esta ação não cria a série inicial de parcelas."
    );
  }

  const numeros = new Set(daVigencia.map((item) => item.numero));
  if (inicioNumero >= 1 && !numeros.has(inicioNumero)) {
    impedimentos.push(
      "A parcela de início não existe nesta vigência. Esta ação não cria parcela nova."
    );
  }
  for (let numero = 1; numero < inicioNumero; numero += 1) {
    if (!numeros.has(numero)) {
      impedimentos.push(
        `A mensalidade ${numero} ainda não foi gerada. Esta ação não cria parcelas e não pode começar depois de um número ausente.`
      );
      break;
    }
  }

  const ocupadas = params.vagas.filter(vagaContratacaoOcupada);
  if (quantidadeNova >= 1 && ocupadas.length > quantidadeNova) {
    impedimentos.push(
      "A nova quantidade é menor que as vagas já utilizadas. Funcionários, agendamentos e periódicos não são apagados."
    );
  }
  const indiceOcupado = ocupadas.reduce(
    (max, vaga) => Math.max(max, vaga.indice),
    0
  );
  if (quantidadeNova >= 1 && indiceOcupado > quantidadeNova) {
    impedimentos.push(
      "Há vaga utilizada acima da nova quantidade. Esta ação não remove utilização."
    );
  }

  const indices = new Set(params.vagas.map((vaga) => vaga.indice));
  let vagasNovas = 0;
  if (quantidadeNova >= 1) {
    for (let indice = 1; indice <= quantidadeNova; indice += 1) {
      if (!indices.has(indice)) vagasNovas += 1;
    }
  }

  const parcelas: ParcelaPlanoAlteracao[] = daVigencia.map((parcela) => {
    const motivo = motivoPreservarParcela({
      numero: parcela.numero,
      inicioNumero,
      parcela,
    });
    const ajuste =
      motivo == null &&
      centavosReais(parcela.valor) !== centavosReais(valorAnterior)
        ? "O total desta parcela difere da mensalidade contratada. A confirmação substitui esse total. Não há coluna separada de desconto ou encargo."
        : null;
    return {
      id: parcela.id,
      numero: parcela.numero,
      vencimentoIso: iso(parcela.vencimentoIso) ?? "",
      valorAnterior: parcela.valor,
      valorNovo: motivo == null ? valorNovo : parcela.valor,
      acao: motivo == null ? "atualizar" : "preservar",
      motivo,
      ajuste,
    };
  });

  const atualizar = parcelas.filter((item) => item.acao === "atualizar");
  const quantidadeMudou = quantidadeNova !== quantidadeAnterior;
  const valorMudou = centavosReais(valorNovo) !== centavosReais(valorAnterior);
  const parcelaMudou = atualizar.some(
    (item) => centavosReais(item.valorAnterior) !== centavosReais(valorNovo)
  );
  if (
    impedimentos.length === 0 &&
    !quantidadeMudou &&
    !valorMudou &&
    !parcelaMudou &&
    vagasNovas === 0
  ) {
    impedimentos.push(
      "A contratação já está com essa quantidade e essa mensalidade. Nenhuma parcela elegível precisa ser atualizada."
    );
  }

  return {
    quantidadeAnterior,
    quantidadeNova,
    valorAnterior,
    valorNovo,
    valorSugerido,
    parcelas,
    vagasNovas,
    impedimentos,
  };
}
