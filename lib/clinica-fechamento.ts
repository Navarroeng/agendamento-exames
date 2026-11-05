/**
 * Ciclo de fechamento dos custos de clínicas.
 * Datas são calendário civil (YYYY-MM-DD), sem deslocar por fuso.
 */

export type ClinicaFechamentoApuracao = "mes_completo" | "dia_especifico";
export type ClinicaVencimentoMes = "mesmo_mes" | "mes_seguinte";

export type ClinicaCicloConfig = {
  id: string;
  nomes: string[];
  fechamentoApuracao: ClinicaFechamentoApuracao | null;
  diaFechamento: number | null;
  diaVencimento: number | null;
  vencimentoMes: ClinicaVencimentoMes | null;
};

export type PeriodoFechamento = {
  inicio: string;
  fim: string;
  dataFechamento: string;
};

export type PeriodoRegistradoClinica = {
  faturaId: string;
  numero: string | null;
  referenciaId: string | null;
  referenciaNome: string;
  /** Competência YYYY-MM do mês em que o período fecha. */
  mesReferencia: string | null;
  inicio: string;
  fim: string;
  status: string;
};

export type ExameVinculoFatura = {
  faturaId: string;
  agendamentoId: string | null;
  exameNome: string;
  data: string;
  numero: string | null;
};

const MESES_PT = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
] as const;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function isoDataCivil(ano: number, mes: number, dia: number): string {
  return `${ano}-${pad2(mes)}-${pad2(dia)}`;
}

export function parseIsoCivil(
  valor: string | null | undefined
): { ano: number; mes: number; dia: number } | null {
  const texto = valor?.trim().split("T")[0] ?? "";
  const match = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const ano = Number(match[1]);
  const mes = Number(match[2]);
  const dia = Number(match[3]);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  return { ano, mes, dia };
}

/** Último dia do mês, inclusive fevereiro em ano bissexto. UTC para não depender do fuso. */
export function diasNoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

export function diaEfetivoNoMes(ano: number, mes: number, dia: number): number {
  return Math.min(dia, diasNoMes(ano, mes));
}

export function mesAnterior(
  ano: number,
  mes: number
): { ano: number; mes: number } {
  if (mes === 1) return { ano: ano - 1, mes: 12 };
  return { ano, mes: mes - 1 };
}

export function mesSeguinte(
  ano: number,
  mes: number
): { ano: number; mes: number } {
  if (mes === 12) return { ano: ano + 1, mes: 1 };
  return { ano, mes: mes + 1 };
}

export function addDiasIso(iso: string, dias: number): string {
  const parsed = parseIsoCivil(iso);
  if (!parsed) throw new Error("Data inválida.");
  const data = new Date(Date.UTC(parsed.ano, parsed.mes - 1, parsed.dia));
  data.setUTCDate(data.getUTCDate() + dias);
  return isoDataCivil(
    data.getUTCFullYear(),
    data.getUTCMonth() + 1,
    data.getUTCDate()
  );
}

export function isoParaBR(iso: string | null | undefined): string {
  const parsed = parseIsoCivil(iso);
  if (!parsed) return "—";
  return `${pad2(parsed.dia)}/${pad2(parsed.mes)}/${parsed.ano}`;
}

export function parseMesReferenciaBR(
  mesReferencia: string
): { ano: number; mes: number; iso: string } | null {
  const texto = mesReferencia.trim();
  const br = texto.match(/^(\d{2})\/(\d{4})$/);
  if (br) {
    const mes = Number(br[1]);
    const ano = Number(br[2]);
    if (mes < 1 || mes > 12) return null;
    return { ano, mes, iso: `${ano}-${pad2(mes)}` };
  }
  const iso = texto.match(/^(\d{4})-(\d{2})/);
  if (!iso) return null;
  const ano = Number(iso[1]);
  const mes = Number(iso[2]);
  if (mes < 1 || mes > 12) return null;
  return { ano, mes, iso: `${ano}-${pad2(mes)}` };
}

export function rotuloMesFechamento(mesReferencia: string): string {
  const parsed = parseMesReferenciaBR(mesReferencia);
  if (!parsed) return mesReferencia.trim();
  const nome = MESES_PT[parsed.mes - 1];
  const titulo = nome.charAt(0).toUpperCase() + nome.slice(1);
  return `${titulo}/${parsed.ano}`;
}

export function normalizarNomeClinica(nome: string | null | undefined): string {
  return (nome ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function dataAgendamentoIso(valor: string | null | undefined): string {
  return (valor ?? "").split("T")[0];
}

export function exameChave(
  agendamentoId: string | null | undefined,
  exameNome: string | null | undefined
): string {
  return `${agendamentoId ?? ""}::${(exameNome ?? "").trim().toLowerCase()}`;
}

export function apuracaoEfetiva(
  valor: string | null | undefined
): ClinicaFechamentoApuracao {
  return valor === "dia_especifico" ? "dia_especifico" : "mes_completo";
}

export function vencimentoMesEfetivo(
  valor: string | null | undefined
): ClinicaVencimentoMes {
  return valor === "mes_seguinte" ? "mes_seguinte" : "mesmo_mes";
}

export function rotuloApuracao(valor: string | null | undefined): string {
  return apuracaoEfetiva(valor) === "dia_especifico"
    ? "Fechamento em dia específico"
    : "Mês completo";
}

export function rotuloVencimentoMes(valor: string | null | undefined): string {
  return vencimentoMesEfetivo(valor) === "mes_seguinte"
    ? "Mês seguinte ao fechamento"
    : "Mesmo mês do fechamento";
}

/**
 * Período que fecha no mês informado.
 * O dia de fechamento entra no período encerrado. O próximo começa no dia seguinte.
 * Dia inexistente (31 em fevereiro, por exemplo) usa o último dia daquele mês.
 */
export function periodoFechamentoClinica(params: {
  ano: number;
  mes: number;
  fechamentoApuracao: ClinicaFechamentoApuracao | null | undefined;
  diaFechamento: number | null | undefined;
}): PeriodoFechamento {
  const { ano, mes } = params;
  const especifico =
    params.fechamentoApuracao === "dia_especifico" &&
    params.diaFechamento != null &&
    params.diaFechamento >= 1 &&
    params.diaFechamento <= 31;

  if (!especifico) {
    const fim = isoDataCivil(ano, mes, diasNoMes(ano, mes));
    return {
      inicio: isoDataCivil(ano, mes, 1),
      fim,
      dataFechamento: fim,
    };
  }

  const dia = params.diaFechamento as number;
  const fim = isoDataCivil(ano, mes, diaEfetivoNoMes(ano, mes, dia));
  const anterior = mesAnterior(ano, mes);
  const fechamentoAnterior = isoDataCivil(
    anterior.ano,
    anterior.mes,
    diaEfetivoNoMes(anterior.ano, anterior.mes, dia)
  );
  return {
    inicio: addDiasIso(fechamentoAnterior, 1),
    fim,
    dataFechamento: fim,
  };
}

/** Mês de fechamento canônico que contém a data, segundo a configuração da clínica. */
export function mesFechamentoDaData(
  dataIso: string,
  config: Pick<ClinicaCicloConfig, "fechamentoApuracao" | "diaFechamento"> | null
): { ano: number; mes: number; iso: string } | null {
  const parsed = parseIsoCivil(dataIso);
  if (!parsed) return null;
  const especifico =
    config?.fechamentoApuracao === "dia_especifico" &&
    config.diaFechamento != null;
  if (!especifico) {
    return {
      ano: parsed.ano,
      mes: parsed.mes,
      iso: `${parsed.ano}-${pad2(parsed.mes)}`,
    };
  }
  const limite = diaEfetivoNoMes(
    parsed.ano,
    parsed.mes,
    config.diaFechamento as number
  );
  if (parsed.dia <= limite) {
    return {
      ano: parsed.ano,
      mes: parsed.mes,
      iso: `${parsed.ano}-${pad2(parsed.mes)}`,
    };
  }
  const proximo = mesSeguinte(parsed.ano, parsed.mes);
  return {
    ano: proximo.ano,
    mes: proximo.mes,
    iso: `${proximo.ano}-${pad2(proximo.mes)}`,
  };
}

/**
 * Vencimento independente do fechamento.
 * Sem mês configurado, permanece no mês do fechamento (comportamento atual).
 */
export function dataVencimentoFechamento(params: {
  diaVencimento: number | null | undefined;
  anoFechamento: number;
  mesFechamento: number;
  vencimentoMes: ClinicaVencimentoMes | null | undefined;
}): { iso: string; diaEfetivo: number } | null {
  const dia = params.diaVencimento;
  if (dia == null || dia < 1 || dia > 31) return null;
  const alvo =
    params.vencimentoMes === "mes_seguinte"
      ? mesSeguinte(params.anoFechamento, params.mesFechamento)
      : { ano: params.anoFechamento, mes: params.mesFechamento };
  const diaEfetivo = diaEfetivoNoMes(alvo.ano, alvo.mes, dia);
  return {
    iso: isoDataCivil(alvo.ano, alvo.mes, diaEfetivo),
    diaEfetivo,
  };
}

export function periodosSobrepoem(
  aInicio: string,
  aFim: string,
  bInicio: string,
  bFim: string
): boolean {
  return aInicio <= bFim && bInicio <= aFim;
}

export function dataNoPeriodo(
  dataIso: string,
  inicio: string,
  fim: string
): boolean {
  const data = dataAgendamentoIso(dataIso);
  if (!data || !inicio || !fim) return false;
  return data >= inicio && data <= fim;
}

/**
 * Janela de consulta: do início do mês anterior ao fim do mês de fechamento,
 * ampliada por períodos já gravados que ultrapassem esse intervalo.
 * O fim é inclusivo. A consulta deve usar o dia seguinte como limite exclusivo.
 */
export function janelaBuscaFechamento(
  mesReferencia: string,
  periodos: { inicio: string | null | undefined; fim: string | null | undefined }[]
): { inicio: string; fim: string } | null {
  const parsed = parseMesReferenciaBR(mesReferencia);
  if (!parsed) return null;
  const anterior = mesAnterior(parsed.ano, parsed.mes);
  let inicio = isoDataCivil(anterior.ano, anterior.mes, 1);
  let fim = isoDataCivil(parsed.ano, parsed.mes, diasNoMes(parsed.ano, parsed.mes));
  for (const periodo of periodos) {
    const ini = periodo.inicio?.split("T")[0];
    const end = periodo.fim?.split("T")[0];
    if (ini && ini < inicio) inicio = ini;
    if (end && end > fim) fim = end;
  }
  return { inicio, fim };
}

export function indexClinicasCiclo(
  clinicas: ClinicaCicloConfig[]
): Map<string, ClinicaCicloConfig> {
  const map = new Map<string, ClinicaCicloConfig>();
  for (const clinica of clinicas) {
    for (const nome of clinica.nomes) {
      const key = normalizarNomeClinica(nome);
      if (key && !map.has(key)) map.set(key, clinica);
    }
  }
  return map;
}

function mesmaClinicaPeriodo(
  periodo: PeriodoRegistradoClinica,
  nomeKey: string,
  clinicaId: string | null | undefined
): boolean {
  if (clinicaId && periodo.referenciaId && periodo.referenciaId === clinicaId) {
    return true;
  }
  return normalizarNomeClinica(periodo.referenciaNome) === nomeKey;
}

/**
 * A data já pertence a outro fechamento da mesma clínica.
 * Período salvo desta competência não é "outro". Período canônico de outro mês
 * continua dono da data enquanto não houver exceção gravada que a libere.
 */
export function dataOcupadaPorOutroFechamento(params: {
  dataIso: string;
  nomeClinica: string;
  clinicaId?: string | null;
  mesFechamentoIso: string;
  faturaIdAtual?: string | null;
  periodoSalvoNestaCompetencia: boolean;
  periodos: PeriodoRegistradoClinica[];
  config: Pick<ClinicaCicloConfig, "fechamentoApuracao" | "diaFechamento"> | null;
}): boolean {
  const data = dataAgendamentoIso(params.dataIso);
  const nomeKey = normalizarNomeClinica(params.nomeClinica);
  for (const periodo of params.periodos) {
    if (!mesmaClinicaPeriodo(periodo, nomeKey, params.clinicaId)) continue;
    if (params.faturaIdAtual && periodo.faturaId === params.faturaIdAtual) continue;
    if (periodo.mesReferencia && periodo.mesReferencia === params.mesFechamentoIso) {
      continue;
    }
    if (dataNoPeriodo(data, periodo.inicio, periodo.fim)) return true;
  }
  if (params.periodoSalvoNestaCompetencia) return false;
  const dono = mesFechamentoDaData(data, params.config);
  if (dono && dono.iso !== params.mesFechamentoIso) return true;
  return false;
}

export function validarAjustePeriodo(params: {
  inicio: string;
  fim: string;
  motivo: string;
  mesFechamento: string;
  faturaIdAtual?: string | null;
  clinicaId?: string | null;
  referenciaNome: string;
  config: Pick<ClinicaCicloConfig, "fechamentoApuracao" | "diaFechamento"> | null;
  periodos: PeriodoRegistradoClinica[];
  examesNovos: ExameVinculoFatura[];
  examesVinculados: ExameVinculoFatura[];
}): string | null {
  const motivo = params.motivo.trim();
  if (!motivo) return "Informe o motivo do ajuste.";
  const inicio = params.inicio.trim().split("T")[0];
  const fim = params.fim.trim().split("T")[0];
  if (!parseIsoCivil(inicio) || !parseIsoCivil(fim)) {
    return "Informe a data inicial e a data final.";
  }
  if (inicio > fim) {
    return "A data inicial não pode ser posterior à data final.";
  }
  const mes = parseMesReferenciaBR(params.mesFechamento);
  if (!mes) return "Mês de fechamento inválido.";

  const nomeKey = normalizarNomeClinica(params.referenciaNome);
  for (const periodo of params.periodos) {
    if (!mesmaClinicaPeriodo(periodo, nomeKey, params.clinicaId)) continue;
    if (params.faturaIdAtual && periodo.faturaId === params.faturaIdAtual) continue;
    if (!periodo.inicio || !periodo.fim) continue;
    if (!periodosSobrepoem(inicio, fim, periodo.inicio, periodo.fim)) continue;
    const qual = periodo.mesReferencia
      ? rotuloMesFechamento(periodo.mesReferencia)
      : "outro fechamento";
    const fatura = periodo.numero ? ` (fatura ${periodo.numero})` : "";
    return (
      `O período ${isoParaBR(inicio)} a ${isoParaBR(fim)} sobrepõe o fechamento de ${qual}` +
      `${fatura}, de ${isoParaBR(periodo.inicio)} a ${isoParaBR(periodo.fim)}. ` +
      "Ajuste as datas para que os mesmos exames não entrem em dois fechamentos."
    );
  }

  const vistos = new Set<string>();
  let cursor = parseIsoCivil(inicio);
  const limite = mesSeguinte(
    parseIsoCivil(fim)?.ano ?? mes.ano,
    parseIsoCivil(fim)?.mes ?? mes.mes
  );
  while (cursor) {
    const iso = `${cursor.ano}-${pad2(cursor.mes)}`;
    if (!vistos.has(iso) && iso !== mes.iso) {
      vistos.add(iso);
      const jaSalvo = params.periodos.some(
        (periodo) =>
          mesmaClinicaPeriodo(periodo, nomeKey, params.clinicaId) &&
          periodo.mesReferencia === iso &&
          !(params.faturaIdAtual && periodo.faturaId === params.faturaIdAtual)
      );
      if (!jaSalvo) {
        const canonico = periodoFechamentoClinica({
          ano: cursor.ano,
          mes: cursor.mes,
          fechamentoApuracao: params.config?.fechamentoApuracao,
          diaFechamento: params.config?.diaFechamento,
        });
        if (periodosSobrepoem(inicio, fim, canonico.inicio, canonico.fim)) {
          return (
            `O período ${isoParaBR(inicio)} a ${isoParaBR(fim)} sobrepõe o fechamento de ` +
            `${rotuloMesFechamento(iso)} (${isoParaBR(canonico.inicio)} a ${isoParaBR(canonico.fim)}). ` +
            "Ajuste as datas para que os mesmos exames não entrem em dois fechamentos."
          );
        }
      }
    }
    if (cursor.ano === limite.ano && cursor.mes === limite.mes) break;
    const proximo = mesSeguinte(cursor.ano, cursor.mes);
    cursor = { ano: proximo.ano, mes: proximo.mes, dia: 1 };
    if (vistos.size > 36) break;
  }

  const vinculados = new Map<string, ExameVinculoFatura>();
  for (const exame of params.examesVinculados) {
    if (params.faturaIdAtual && exame.faturaId === params.faturaIdAtual) continue;
    if (!exame.agendamentoId) continue;
    vinculados.set(exameChave(exame.agendamentoId, exame.exameNome), exame);
  }
  for (const exame of params.examesNovos) {
    if (!exame.agendamentoId) continue;
    const outro = vinculados.get(exameChave(exame.agendamentoId, exame.exameNome));
    if (!outro) continue;
    const fatura = outro.numero ? `à fatura ${outro.numero}` : "a outra fatura";
    return (
      `O exame ${exame.exameNome} de ${isoParaBR(exame.data)} já está vinculado ${fatura}. ` +
      "O mesmo exame não pode entrar em duas faturas."
    );
  }

  return null;
}

export function mensagemFechamentoCadastro(params: {
  fechamentoApuracao: string;
  diaFechamento: string;
}): string | null {
  if (params.fechamentoApuracao !== "dia_especifico") return null;
  const dia = Number(params.diaFechamento);
  if (!Number.isInteger(dia) || dia < 1 || dia > 31) {
    return "Informe o dia do fechamento.";
  }
  return null;
}
