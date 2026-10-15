import { todayIsoSaoPaulo } from "@/lib/agendamento-datetime";
import { montarDatasMensalidadesPlano } from "@/lib/contrato-pagamento";
import { diaVencimentoMensalidadeValido } from "@/lib/contrato-navarro";
import { isOrcamentoMensalidade } from "@/lib/orcamento-modalidade";

export const MENSALIDADE_PARCELAS_QUANTIDADE = 12;

export const MENSALIDADE_PARCELAS_MIGRATION_MSG =
  "O controle das mensalidades ainda não está disponível no banco. Execute o script 142_mensalidade_parcelas.sql.";

export type SituacaoParcelaMensalidade =
  | "em_aberto"
  | "vence_hoje"
  | "vencida"
  | "paga";

export const SITUACAO_PARCELA_MENSALIDADE_LABEL: Record<
  SituacaoParcelaMensalidade,
  string
> = {
  em_aberto: "Em aberto",
  vence_hoje: "Vence hoje",
  vencida: "Vencida",
  paga: "Paga",
};

export type ParcelaMensalidadeRegistrada = {
  vigenciaInicio: string;
  vigenciaFim?: string | null;
  numero: number;
  vencimentoIso: string;
  valor: number;
  pagoEmIso: string | null;
};

export type ParcelaMensalidadeGrade = {
  numero: number;
  vencimentoIso: string;
  valor: number;
  pagoEmIso: string | null;
  registrada: boolean;
  situacao: SituacaoParcelaMensalidade;
};

export type GradeMensalidades =
  | {
      ok: true;
      vigenciaInicio: string;
      vigenciaFim: string | null;
      parcelas: ParcelaMensalidadeGrade[];
    }
  | {
      ok: false;
      pendencias: string[];
    };

/** Gestão SST mensal cobrada mês a mês. À vista e as demais modalidades ficam de fora. */
export function usaControleParcelasMensalidade(
  modalidade: string | null | undefined,
  mensalidadePagamento: string | null | undefined
): boolean {
  return (
    isOrcamentoMensalidade(modalidade) && mensalidadePagamento !== "avista"
  );
}

export function valorMensalContratado(params: {
  mensalidadeValorMensal?: number | null;
  valorFinal?: number | null;
}): number | null {
  const mensal = Number(params.mensalidadeValorMensal);
  if (Number.isFinite(mensal) && mensal > 0) return mensal;
  const final = Number(params.valorFinal);
  if (Number.isFinite(final) && final > 0) return final;
  return null;
}

export function situacaoParcelaMensalidade(params: {
  vencimentoIso: string;
  pagoEmIso: string | null;
  hojeIso: string;
}): SituacaoParcelaMensalidade {
  if (params.pagoEmIso) return "paga";
  if (params.vencimentoIso === params.hojeIso) return "vence_hoje";
  if (params.vencimentoIso < params.hojeIso) return "vencida";
  return "em_aberto";
}

function isoData(value: string | null | undefined): string | null {
  const texto = (value ?? "").trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) ? texto : null;
}

/**
 * Monta a grade da vigência atual.
 * Parcelas já gravadas dessa vigência são reexibidas como foram salvas.
 * Não usa a data do PDF, não aplica a fórmula de renovação e não copia boleto antigo.
 */
export function resolverGradeMensalidades(params: {
  vigenciaInicio?: string | null;
  vigenciaFim?: string | null;
  dia?: number | null;
  valorMensal?: number | null;
  registradas?: ParcelaMensalidadeRegistrada[];
  hojeIso?: string;
}): GradeMensalidades {
  const inicio = isoData(params.vigenciaInicio);
  const fim = isoData(params.vigenciaFim);
  const dia = diaVencimentoMensalidadeValido(params.dia);
  const valor = Number(params.valorMensal);
  const valorOk = Number.isFinite(valor) && valor > 0;
  const hoje = isoData(params.hojeIso) ?? todayIsoSaoPaulo();
  const daVigencia = (params.registradas ?? [])
    .filter((item) => isoData(item.vigenciaInicio) === inicio)
    .sort((a, b) => a.numero - b.numero);

  if (daVigencia.length > 0 && inicio) {
    const porNumero = new Map(daVigencia.map((item) => [item.numero, item]));
    const datas =
      dia && valorOk && porNumero.size < MENSALIDADE_PARCELAS_QUANTIDADE
        ? montarDatasMensalidadesPlano({
            inicioVigenciaIso: inicio,
            dia,
            quantidade: MENSALIDADE_PARCELAS_QUANTIDADE,
          })
        : null;
    const salvos: number[] = [];
    porNumero.forEach((_, numero) => salvos.push(numero));
    salvos.sort((a, b) => a - b);
    const numeros = datas
      ? datas.map((_, index) => index + 1)
      : salvos;
    return {
      ok: true,
      vigenciaInicio: inicio,
      vigenciaFim: fim,
      parcelas: numeros.map((numero, index) => {
        const salva = porNumero.get(numero);
        const pagoEmIso = isoData(salva?.pagoEmIso);
        const vencimentoIso = salva
          ? (isoData(salva.vencimentoIso) ?? "")
          : (datas?.[index] ?? "");
        return {
          numero,
          vencimentoIso,
          valor: salva ? salva.valor : valor,
          pagoEmIso: salva ? pagoEmIso : null,
          registrada: Boolean(salva),
          situacao: situacaoParcelaMensalidade({
            vencimentoIso,
            pagoEmIso: salva ? pagoEmIso : null,
            hojeIso: hoje,
          }),
        };
      }),
    };
  }

  const pendencias: string[] = [];
  if (!inicio) pendencias.push("início da vigência");
  if (!dia) pendencias.push("dia de vencimento 10 ou 20");
  if (!valorOk) pendencias.push("valor mensal contratado");
  if (pendencias.length > 0 || !inicio || !dia || !valorOk) {
    return { ok: false, pendencias };
  }

  const datas = montarDatasMensalidadesPlano({
    inicioVigenciaIso: inicio,
    dia,
    quantidade: MENSALIDADE_PARCELAS_QUANTIDADE,
  });
  return {
    ok: true,
    vigenciaInicio: inicio,
    vigenciaFim: fim,
    parcelas: datas.map((vencimentoIso, index) => ({
      numero: index + 1,
      vencimentoIso,
      valor,
      pagoEmIso: null,
      registrada: false,
      situacao: situacaoParcelaMensalidade({
        vencimentoIso,
        pagoEmIso: null,
        hojeIso: hoje,
      }),
    })),
  };
}

export function aplicarPagamentosEditados(
  parcelas: ParcelaMensalidadeGrade[],
  edicoes: Record<number, string | null>,
  hojeIso?: string
): ParcelaMensalidadeGrade[] {
  const hoje = isoData(hojeIso) ?? todayIsoSaoPaulo();
  return parcelas.map((parcela) => {
    if (!Object.prototype.hasOwnProperty.call(edicoes, parcela.numero)) {
      return parcela;
    }
    const pagoEmIso = isoData(edicoes[parcela.numero]);
    return {
      ...parcela,
      pagoEmIso,
      situacao: situacaoParcelaMensalidade({
        vencimentoIso: parcela.vencimentoIso,
        pagoEmIso,
        hojeIso: hoje,
      }),
    };
  });
}

export function planejarPersistenciaParcelas(params: {
  existentes: ParcelaMensalidadeRegistrada[];
  desejadas: Array<{
    numero: number;
    vencimentoIso: string;
    valor: number;
    pagoEmIso: string | null;
  }>;
}): {
  inserir: Array<{
    numero: number;
    vencimentoIso: string;
    valor: number;
    pagoEmIso: string | null;
  }>;
  atualizarPagoEm: Array<{ numero: number; pagoEmIso: string | null }>;
} {
  const porNumero = new Map(
    params.existentes.map((item) => [item.numero, item])
  );
  const inserir: Array<{
    numero: number;
    vencimentoIso: string;
    valor: number;
    pagoEmIso: string | null;
  }> = [];
  const atualizarPagoEm: Array<{ numero: number; pagoEmIso: string | null }> =
    [];
  for (const desejada of params.desejadas) {
    const existente = porNumero.get(desejada.numero);
    if (!existente) {
      inserir.push(desejada);
      continue;
    }
    const pagoAtual = isoData(existente.pagoEmIso);
    const pagoNovo = isoData(desejada.pagoEmIso);
    if (pagoAtual !== pagoNovo) {
      atualizarPagoEm.push({ numero: desejada.numero, pagoEmIso: pagoNovo });
    }
  }
  return { inserir, atualizarPagoEm };
}
