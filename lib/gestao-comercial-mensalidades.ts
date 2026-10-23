/**
 * Mensalidades previstas da Gestão Comercial.
 * Soma parcelas de Gestão SST com cobrança mensal pelo vencimento.
 * Não altera valor fechado, ticket médio nem a data de aprovação.
 * Não grava parcelas: abrir o relatório só lê o que já existe e,
 * quando a vigência contratual tem dia e valor, mostra o plano já definido.
 */
import { formatDateIsoToBR, todayIsoSaoPaulo } from "@/lib/agendamento-datetime";
import type { GestaoComercialFilters } from "@/lib/gestao-comercial";
import { MESES_PT } from "@/lib/gestao-comercial";
import {
  MENSALIDADE_PARCELAS_QUANTIDADE,
  SITUACAO_PARCELA_MENSALIDADE_LABEL,
  resolverGradeMensalidades,
  situacaoParcelaMensalidade,
  usaControleParcelasMensalidade,
  valorMensalContratado,
  type ParcelaMensalidadeRegistrada,
  type SituacaoParcelaMensalidade,
} from "@/lib/mensalidade-parcelas";

export type PeriodoVencimentoMensalidades =
  | { tipo: "mes"; ano: number; mes: number }
  | { tipo: "intervalo"; inicio: string; fim: string };

export type VigenciaMensalidadePrevista = {
  inicio: string;
  fim?: string | null;
  contratoId?: string | null;
  numeroContrato?: string | null;
};

export type FonteMensalidadePrevista = {
  aprovacaoId: string;
  clienteNome: string;
  numeroOrcamento: string;
  modalidade?: string | null;
  mensalidadePagamento?: string | null;
  diaVencimento?: number | null;
  /** Valor da mensalidade gravado. Não é o total da vigência. */
  valorMensal?: number | null;
  /**
   * Na Gestão SST mensal o valor final aprovado também é o valor da parcela.
   * Não usar o total anual nem dividi-lo por 12.
   */
  valorFinal?: number | null;
  vigencias?: VigenciaMensalidadePrevista[];
  parcelasRegistradas?: ParcelaMensalidadeRegistrada[];
};

export type SituacaoMensalidadePrevista = SituacaoParcelaMensalidade | "pendencia";

export type LinhaMensalidadePrevista = {
  chave: string;
  aprovacaoId: string;
  clienteNome: string;
  contrato: string;
  parcela: string;
  parcelaNumero: number | null;
  vencimentoIso: string | null;
  valor: number | null;
  situacao: SituacaoMensalidadePrevista;
  situacaoLabel: string;
  /** Pendência e cobrança cancelada não compõem o total do card. */
  compoeTotal: boolean;
};

export type ResumoMensalidadesPrevistas = {
  disponivel: boolean;
  mensagemIndisponivel: string | null;
  periodoLabel: string;
  valor: number;
  contratosComParcela: number;
  contratosLabel: string;
  pendencias: number;
  linhas: LinhaMensalidadePrevista[];
};

const ISO_DATA = /^\d{4}-\d{2}-\d{2}$/;

function isoData(value: string | null | undefined): string | null {
  const texto = (value ?? "").trim().slice(0, 10);
  return ISO_DATA.test(texto) ? texto : null;
}

function centavos(valor: number): number {
  return Math.round(valor * 100);
}

function reais(totalCentavos: number): number {
  return totalCentavos / 100;
}

export function labelPeriodoMensalidades(
  periodo: PeriodoVencimentoMensalidades
): string {
  if (periodo.tipo === "intervalo") {
    return `${formatDateIsoToBR(periodo.inicio)} a ${formatDateIsoToBR(periodo.fim)}`;
  }
  const mes = MESES_PT[periodo.mes - 1] ?? "";
  return `${mes}/${periodo.ano}`;
}

export function labelContratosComParcela(
  quantidade: number,
  periodo: PeriodoVencimentoMensalidades
): string {
  const contrato = quantidade === 1 ? "contrato" : "contratos";
  const quando = periodo.tipo === "mes" ? "no mês" : "no período";
  return `${quantidade} ${contrato} com parcela ${quando}`;
}

/**
 * Mês/ano selecionado, ou o intervalo do período personalizado.
 * Status, responsável, origem e tipo de fechamento não entram aqui.
 */
export function periodoVencimentoGestaoComercial(
  filters: GestaoComercialFilters,
  now = new Date()
): PeriodoVencimentoMensalidades {
  const inicio = isoData(filters.periodoInicio);
  const fim = isoData(filters.periodoFim);
  if (
    filters.usarPeriodoPersonalizado &&
    inicio &&
    fim &&
    inicio <= fim
  ) {
    return { tipo: "intervalo", inicio, fim };
  }
  const mesInformado = Number(filters.mes);
  const mes =
    Number.isInteger(mesInformado) && mesInformado >= 1 && mesInformado <= 12
      ? mesInformado
      : now.getMonth() + 1;
  return { tipo: "mes", ano: filters.ano, mes };
}

export function resumoMensalidadesIndisponivel(
  periodo: PeriodoVencimentoMensalidades,
  mensagem: string
): ResumoMensalidadesPrevistas {
  return {
    disponivel: false,
    mensagemIndisponivel: mensagem,
    periodoLabel: labelPeriodoMensalidades(periodo),
    valor: 0,
    contratosComParcela: 0,
    contratosLabel: labelContratosComParcela(0, periodo),
    pendencias: 0,
    linhas: [],
  };
}

function vencimentoNoPeriodo(
  vencimentoIso: string,
  periodo: PeriodoVencimentoMensalidades
): boolean {
  const iso = isoData(vencimentoIso);
  if (!iso) return false;
  if (periodo.tipo === "intervalo") {
    return iso >= periodo.inicio && iso <= periodo.fim;
  }
  return (
    Number(iso.slice(0, 4)) === periodo.ano &&
    Number(iso.slice(5, 7)) === periodo.mes
  );
}

function contratoExibicao(
  numeroContrato: string | null | undefined,
  numeroOrcamento: string
): string {
  const numero = (numeroContrato ?? "").trim();
  if (numero) return numero;
  const orcamento = numeroOrcamento.trim();
  return orcamento || "—";
}

function mesclarFontes(
  fontes: FonteMensalidadePrevista[]
): FonteMensalidadePrevista[] {
  const porAprovacao = new Map<string, FonteMensalidadePrevista>();
  for (const fonte of fontes) {
    const aprovacaoId = fonte.aprovacaoId.trim();
    if (!aprovacaoId) continue;
    const atual = porAprovacao.get(aprovacaoId);
    if (!atual) {
      porAprovacao.set(aprovacaoId, {
        ...fonte,
        aprovacaoId,
        vigencias: [...(fonte.vigencias ?? [])],
        parcelasRegistradas: [...(fonte.parcelasRegistradas ?? [])],
      });
      continue;
    }
    atual.vigencias = [
      ...(atual.vigencias ?? []),
      ...(fonte.vigencias ?? []),
    ];
    atual.parcelasRegistradas = [
      ...(atual.parcelasRegistradas ?? []),
      ...(fonte.parcelasRegistradas ?? []),
    ];
    if (!(atual.clienteNome ?? "").trim() && fonte.clienteNome.trim()) {
      atual.clienteNome = fonte.clienteNome;
    }
    if (atual.diaVencimento == null && fonte.diaVencimento != null) {
      atual.diaVencimento = fonte.diaVencimento;
    }
    if (atual.valorMensal == null && fonte.valorMensal != null) {
      atual.valorMensal = fonte.valorMensal;
    }
    if (atual.valorFinal == null && fonte.valorFinal != null) {
      atual.valorFinal = fonte.valorFinal;
    }
  }
  return Array.from(porAprovacao.values());
}

function dedupeParcelas(
  parcelas: ParcelaMensalidadeRegistrada[]
): ParcelaMensalidadeRegistrada[] {
  const map = new Map<string, ParcelaMensalidadeRegistrada>();
  for (const parcela of parcelas) {
    const inicio = isoData(parcela.vigenciaInicio);
    if (!inicio || !Number.isInteger(parcela.numero)) continue;
    map.set(`${inicio}:${parcela.numero}`, {
      ...parcela,
      vigenciaInicio: inicio,
      vencimentoIso: isoData(parcela.vencimentoIso) ?? "",
    });
  }
  return Array.from(map.values());
}

type VigenciaTrabalho = {
  inicio: string;
  fim: string | null;
  numeroContrato: string | null;
  origem: "contrato" | "parcela";
};

function vigenciasDaFonte(
  fonte: FonteMensalidadePrevista,
  registradas: ParcelaMensalidadeRegistrada[]
): VigenciaTrabalho[] {
  const map = new Map<string, VigenciaTrabalho>();
  for (const vigencia of fonte.vigencias ?? []) {
    const inicio = isoData(vigencia.inicio);
    if (!inicio || map.has(inicio)) continue;
    map.set(inicio, {
      inicio,
      fim: isoData(vigencia.fim),
      numeroContrato: (vigencia.numeroContrato ?? "").trim() || null,
      origem: "contrato",
    });
  }
  for (const parcela of registradas) {
    const inicio = isoData(parcela.vigenciaInicio);
    if (!inicio || map.has(inicio)) continue;
    map.set(inicio, {
      inicio,
      fim: isoData(parcela.vigenciaFim),
      numeroContrato: null,
      origem: "parcela",
    });
  }
  return Array.from(map.values());
}

function linhaParcela(params: {
  fonte: FonteMensalidadePrevista;
  numeroContrato: string | null;
  vigenciaInicio: string;
  numero: number;
  vencimentoIso: string;
  valor: number;
  pagoEmIso: string | null;
  hojeIso: string;
}): LinhaMensalidadePrevista {
  const situacao = situacaoParcelaMensalidade({
    vencimentoIso: params.vencimentoIso,
    pagoEmIso: params.pagoEmIso,
    hojeIso: params.hojeIso,
  });
  return {
    chave: `${params.fonte.aprovacaoId}:${params.vigenciaInicio}:${params.numero}`,
    aprovacaoId: params.fonte.aprovacaoId,
    clienteNome: params.fonte.clienteNome.trim() || "—",
    contrato: contratoExibicao(params.numeroContrato, params.fonte.numeroOrcamento),
    parcela: `${params.numero}/${MENSALIDADE_PARCELAS_QUANTIDADE}`,
    parcelaNumero: params.numero,
    vencimentoIso: params.vencimentoIso,
    valor: reais(centavos(params.valor)),
    situacao,
    situacaoLabel: SITUACAO_PARCELA_MENSALIDADE_LABEL[situacao],
    compoeTotal: true,
  };
}

export function montarMensalidadesPrevistas(
  fontes: FonteMensalidadePrevista[],
  periodo: PeriodoVencimentoMensalidades,
  hojeIso?: string
): ResumoMensalidadesPrevistas {
  const hoje = isoData(hojeIso) ?? todayIsoSaoPaulo();
  const linhas: LinhaMensalidadePrevista[] = [];
  const chaves = new Set<string>();

  const adicionar = (linha: LinhaMensalidadePrevista) => {
    if (chaves.has(linha.chave)) return;
    chaves.add(linha.chave);
    linhas.push(linha);
  };

  for (const fonte of mesclarFontes(fontes)) {
    if (
      !usaControleParcelasMensalidade(
        fonte.modalidade,
        fonte.mensalidadePagamento
      )
    ) {
      continue;
    }

    const registradas = dedupeParcelas(fonte.parcelasRegistradas ?? []);
    const valorMensal = valorMensalContratado({
      mensalidadeValorMensal: fonte.valorMensal,
      valorFinal: fonte.valorFinal,
    });
    const vigencias = vigenciasDaFonte(fonte, registradas);
    const pendencias: string[] = [];
    const numeroContratoFonte =
      vigencias.find((item) => item.numeroContrato)?.numeroContrato ?? null;

    if (vigencias.length === 0) {
      pendencias.push("início da vigência");
    }

    for (const vigencia of vigencias) {
      if (vigencia.origem === "parcela") {
        const salvas = registradas.filter(
          (item) => isoData(item.vigenciaInicio) === vigencia.inicio
        );
        for (const salva of salvas) {
          const vencimento = isoData(salva.vencimentoIso);
          const valor = Number(salva.valor);
          if (!vencimento || !Number.isFinite(valor) || valor <= 0) {
            pendencias.push(
              `parcela ${salva.numero} da vigência ${formatDateIsoToBR(vigencia.inicio)} sem vencimento ou valor`
            );
            continue;
          }
          if (!vencimentoNoPeriodo(vencimento, periodo)) continue;
          adicionar(
            linhaParcela({
              fonte,
              numeroContrato: vigencia.numeroContrato ?? numeroContratoFonte,
              vigenciaInicio: vigencia.inicio,
              numero: salva.numero,
              vencimentoIso: vencimento,
              valor,
              pagoEmIso: isoData(salva.pagoEmIso),
              hojeIso: hoje,
            })
          );
        }
        continue;
      }

      const grade = resolverGradeMensalidades({
        vigenciaInicio: vigencia.inicio,
        vigenciaFim: vigencia.fim,
        dia: fonte.diaVencimento,
        valorMensal,
        registradas,
        hojeIso: hoje,
      });
      if (!grade.ok) {
        pendencias.push(...grade.pendencias);
        continue;
      }

      if (grade.parcelas.length < MENSALIDADE_PARCELAS_QUANTIDADE) {
        pendencias.push(
          `dados da vigência ${formatDateIsoToBR(vigencia.inicio)} para calcular as parcelas restantes`
        );
      }

      for (const parcela of grade.parcelas) {
        const vencimento = isoData(parcela.vencimentoIso);
        const valor = Number(parcela.valor);
        if (!vencimento || !Number.isFinite(valor) || valor <= 0) {
          pendencias.push(
            `parcela ${parcela.numero} da vigência ${formatDateIsoToBR(vigencia.inicio)} sem vencimento ou valor`
          );
          continue;
        }
        if (!vencimentoNoPeriodo(vencimento, periodo)) continue;
        adicionar(
          linhaParcela({
            fonte,
            numeroContrato: vigencia.numeroContrato,
            vigenciaInicio: vigencia.inicio,
            numero: parcela.numero,
            vencimentoIso: vencimento,
            valor,
            pagoEmIso: isoData(parcela.pagoEmIso),
            hojeIso: hoje,
          })
        );
      }
    }

    const motivos = Array.from(new Set(pendencias.map((item) => item.trim()).filter(Boolean)));
    if (motivos.length > 0) {
      adicionar({
        chave: `${fonte.aprovacaoId}:pendencia`,
        aprovacaoId: fonte.aprovacaoId,
        clienteNome: fonte.clienteNome.trim() || "—",
        contrato: contratoExibicao(numeroContratoFonte, fonte.numeroOrcamento),
        parcela: "—",
        parcelaNumero: null,
        vencimentoIso: null,
        valor: null,
        situacao: "pendencia",
        situacaoLabel: `Pendência — faltam ${motivos.join("; ")}`,
        compoeTotal: false,
      });
    }
  }

  linhas.sort((a, b) => {
    if (a.compoeTotal !== b.compoeTotal) return a.compoeTotal ? -1 : 1;
    const vencimento = (a.vencimentoIso ?? "9999-99-99").localeCompare(
      b.vencimentoIso ?? "9999-99-99"
    );
    if (vencimento !== 0) return vencimento;
    const cliente = a.clienteNome.localeCompare(b.clienteNome, "pt-BR");
    if (cliente !== 0) return cliente;
    return (a.parcelaNumero ?? 99) - (b.parcelaNumero ?? 99);
  });

  const previstas = linhas.filter((linha) => linha.compoeTotal);
  const totalCentavos = previstas.reduce(
    (acc, linha) => acc + centavos(linha.valor ?? 0),
    0
  );
  const contratosComParcela = new Set(previstas.map((linha) => linha.aprovacaoId))
    .size;

  return {
    disponivel: true,
    mensagemIndisponivel: null,
    periodoLabel: labelPeriodoMensalidades(periodo),
    valor: reais(totalCentavos),
    contratosComParcela,
    contratosLabel: labelContratosComParcela(contratosComParcela, periodo),
    pendencias: linhas.filter((linha) => linha.situacao === "pendencia").length,
    linhas,
  };
}
