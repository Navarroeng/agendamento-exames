import {
  AUDITORIA_ACOES,
  AUDITORIA_MODULOS,
} from "@/lib/auditoria";
import {
  EXAME_FUTURO_FORA_VIGENCIA_MSG,
  ORIGEM_PERIODICO_IMPLANTACAO,
  PROGRAMACAO_FUTURA_NAO_EDITAVEL_AGENDADA_MSG,
  dataPrevistaDentroDaVigenciaContrato,
  determinarStatusProgramacaoFutura,
  descreverAlteracaoProgramacaoFutura,
  motivoBloqueioEdicaoProgramacaoFutura,
  validarEdicaoProgramacaoFutura,
  type ColaboradorSugestao,
  type CriarExameFuturoInput,
  type StatusExameFuturoImplantacao,
} from "@/lib/contrato-programacao-futura";
import {
  filtroOrCpfExato,
  isValidCPF,
  maskCPFInput,
  normalizeCpfDigits,
} from "@/lib/cpf";
import { isAsoDemissional } from "@/lib/periodico-geracao";
import { isAsoPontual } from "@/lib/agendamento-aso-pontual";
import { filtrarPeriodicosDoCliente } from "@/lib/agendamento-cliente-lookup";
import {
  agruparPeriodicosPendentesParaVinculo,
  chaveCicloPeriodico,
  labelExamesCicloVinculo,
  type PeriodicoFuturoGrupo,
} from "@/lib/periodico-agrupamento";
import { isPeriodicoCanceladoManualmente } from "@/lib/periodico-cancelamento";
import { formatHorarioForForm } from "@/lib/agendamento-datetime";
import {
  montarVisualizacaoPeriodicoProgramado,
  type RegistroVisualizacaoPeriodico,
  type VisualizacaoPeriodicoProgramado,
} from "@/lib/periodico-programado-visualizacao";
import { buildPatchVinculoPeriodico } from "@/lib/periodicos-futuro";
import {
  exigirGravacaoUnica,
  lerPorIdentificadores,
  lerTodosOsLotes,
} from "@/lib/consulta-lotes";
import { createClient } from "@/lib/supabase/client";
import type { PeriodicoFuturoRecord } from "@/lib/types";
import { registrarAuditoria } from "@/services/auditoria.service";
import { listarContratosPorCliente } from "@/services/cliente-contrato.service";

export type PeriodicoProgramadoContrato = Pick<
  PeriodicoFuturoRecord,
  | "id"
  | "colaborador"
  | "colaborador_cpf"
  | "cliente_nome"
  | "cargo_id"
  | "cargo_nome"
  | "tipo_aso"
  | "tipo_exame"
  | "exame_nome"
  | "proxima_data"
  | "motivo"
  | "motivo_detalhe"
  | "observacoes"
  | "origem"
  | "status"
  | "contrato_id"
  | "consome_previsao_contrato"
  | "agendamento_vinculado_id"
  | "agendamento_id"
  | "data_prevista_original"
  | "data_realizada"
  | "cancelado_em"
  | "motivo_cancelamento"
> & {
  data_agendada?: string | null;
  agendamento_status?: string | null;
  agendamento_cumprido?: boolean | null;
  statusExibicao?: StatusExameFuturoImplantacao;
};

/** Contagem de programações futuras que ainda consomem previsão por contrato. */
export async function contarProgramacoesFuturasPorContratos(
  contratoIds: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (contratoIds.length === 0) return map;
  for (const id of contratoIds) map.set(id, 0);

  const supabase = createClient();
  const data = await lerPorIdentificadores(
    contratoIds,
    async (grupo, from, to) => {
      const { data: page, error } = await supabase
        .from("periodicos_futuros")
        .select("contrato_id")
        .in("contrato_id", grupo)
        .eq("consome_previsao_contrato", true)
        .in("status", ["ativo", "reagendado"])
        .order("id", { ascending: true })
        .range(from, to);
      if (error) throw error;
      return page ?? [];
    }
  );

  for (const row of data) {
    const cid = String(row.contrato_id ?? "");
    if (!cid) continue;
    map.set(cid, (map.get(cid) ?? 0) + 1);
  }
  return map;
}

export async function listarProgramacoesFuturasDoContrato(
  contratoId: string
): Promise<PeriodicoProgramadoContrato[]> {
  const supabase = createClient();
  const data = await lerTodosOsLotes(async (from, to) => {
    const { data: page, error } = await supabase
      .from("periodicos_futuros")
      .select(
        "id, colaborador, colaborador_cpf, cliente_nome, cargo_id, cargo_nome, tipo_aso, tipo_exame, exame_nome, proxima_data, motivo, motivo_detalhe, observacoes, origem, status, contrato_id, consome_previsao_contrato, agendamento_vinculado_id, agendamento_id, data_prevista_original, data_realizada, cancelado_em, motivo_cancelamento"
      )
      .eq("contrato_id", contratoId)
      .eq("consome_previsao_contrato", true)
      .in("status", ["ativo", "reagendado"])
      .order("proxima_data", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to);
    if (error) throw error;
    return page ?? [];
  });
  const rows = data as PeriodicoProgramadoContrato[];
  if (rows.length === 0) return [];

  const agIds = Array.from(
    new Set(
      rows
        .flatMap((r) => [
          r.agendamento_vinculado_id,
          r.status === "reagendado" ? r.agendamento_id : null,
        ])
        .map((id) => (id ?? "").trim())
        .filter(Boolean)
    )
  );

  const agMap = new Map<
    string,
    {
      data: string;
      status: string;
      cumprido: boolean;
    }
  >();

  if (agIds.length > 0) {
    const agsData = await lerPorIdentificadores(agIds, async (grupo, from, to) => {
      const { data: page, error } = await supabase
        .from("agendamentos")
        .select("id, data_agendamento, status, aso_assinado, data_aso_assinado")
        .in("id", grupo)
        .order("id", { ascending: true })
        .range(from, to);
      if (error) throw error;
      return page ?? [];
    });

    for (const ag of agsData) {
      const dataIso = String(ag.data_agendamento ?? "").slice(0, 10);
      const st = String(ag.status ?? "");
      const assinado =
        String(ag.aso_assinado ?? "").trim().toLowerCase() === "sim" ||
        Boolean(ag.data_aso_assinado);
      agMap.set(String(ag.id), {
        data: dataIso,
        status: st,
        cumprido: assinado,
      });
    }
  }

  return rows.map((row) => {
    const vinculoId =
      (row.agendamento_vinculado_id ?? "").trim() ||
      (row.status === "reagendado" ? (row.agendamento_id ?? "").trim() : "");
    const agInfo = vinculoId ? agMap.get(vinculoId) : undefined;
    const agCancelado =
      !agInfo || String(agInfo.status).trim().toLowerCase() === "cancelado";

    const statusExibicao = determinarStatusProgramacaoFutura({
      status: row.status,
      canceladoManualmente: isPeriodicoCanceladoManualmente(
        row as unknown as PeriodicoFuturoRecord
      ),
      agendamentoVinculadoId: vinculoId || null,
      agendamentoStatus: agInfo?.status ?? null,
      agendamentoCumprido: agInfo?.cumprido,
      dataRealizada: row.data_realizada,
    });

    const dataAgendada =
      !agCancelado && agInfo?.data && /^\d{4}-\d{2}-\d{2}$/.test(agInfo.data)
        ? agInfo.data
        : null;

    return {
      ...row,
      data_agendada: dataAgendada,
      agendamento_status: agInfo?.status ?? null,
      agendamento_cumprido: agInfo?.cumprido ?? false,
      statusExibicao,
    };
  });
}

/**
 * Consulta somente leitura do periódico vinculado a uma vaga Programado.
 * Não grava, não altera status e não cria agendamento.
 */
export async function carregarVisualizacaoPeriodicoProgramado(
  periodicoId: string
): Promise<VisualizacaoPeriodicoProgramado | null> {
  const id = periodicoId.trim();
  if (!id) return null;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("periodicos_futuros")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const registro = data as PeriodicoFuturoRecord;
  let registros: PeriodicoFuturoRecord[] = [registro];
  const contratoId = (registro.contrato_id ?? "").trim();
  if (contratoId) {
    const doContrato = await lerTodosOsLotes(async (from, to) => {
      const { data: page, error: loteErr } = await supabase
        .from("periodicos_futuros")
        .select("*")
        .eq("contrato_id", contratoId)
        .order("id", { ascending: true })
        .range(from, to);
      if (loteErr) throw loteErr;
      return (page ?? []) as PeriodicoFuturoRecord[];
    });
    const chave = chaveCicloPeriodico(registro);
    const ciclo = doContrato.filter(
      (row) => chaveCicloPeriodico(row) === chave
    );
    if (ciclo.some((row) => row.id === registro.id)) registros = ciclo;
  }

  let clinica: string | null = null;
  let horario: string | null = null;
  const agendamentoId = (registro.agendamento_vinculado_id ?? "").trim();
  if (agendamentoId) {
    const { data: agendamento, error: agErr } = await supabase
      .from("agendamentos")
      .select("clinica_nome, horario, status")
      .eq("id", agendamentoId)
      .maybeSingle();
    if (agErr) throw agErr;
    const cancelado =
      String(agendamento?.status ?? "")
        .trim()
        .toLowerCase() === "cancelado";
    if (agendamento && !cancelado) {
      clinica = String(agendamento.clinica_nome ?? "").trim() || null;
      horario = formatHorarioForForm(
        agendamento.horario ? String(agendamento.horario) : null
      );
    }
  }

  return montarVisualizacaoPeriodicoProgramado({
    registroId: registro.id,
    registros: registros as RegistroVisualizacaoPeriodico[],
    clinica,
    horario,
  });
}

export async function listarSugestoesColaboradoresContrato(params: {
  clienteId?: string | null;
  clienteNomes?: string[];
}): Promise<ColaboradorSugestao[]> {
  const clienteId = (params.clienteId ?? "").trim();
  const nomes = (params.clienteNomes ?? [])
    .map((n) => n.trim())
    .filter(Boolean);
  if (!clienteId && nomes.length === 0) return [];

  const supabase = createClient();
  const data = await lerTodosOsLotes(async (from, to) => {
    let query = supabase
      .from("agendamentos")
      .select("colaborador, colaborador_cpf, cliente_nome, cliente_id")
      .neq("status", "cancelado")
      .order("colaborador", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to);
    if (clienteId) query = query.eq("cliente_id", clienteId);
    else query = query.in("cliente_nome", nomes);
    const { data: page, error } = await query;
    if (error) throw error;
    return page ?? [];
  });

  const nomesNorm = new Set(
    nomes.map((n) => n.replace(/\s+/g, " ").toLocaleLowerCase("pt-BR"))
  );
  const byKey = new Map<string, ColaboradorSugestao>();
  for (const row of data ?? []) {
    const clienteNomeRow = String(row.cliente_nome ?? "")
      .trim()
      .replace(/\s+/g, " ")
      .toLocaleLowerCase("pt-BR");
    if (
      nomesNorm.size > 0 &&
      clienteNomeRow &&
      !nomesNorm.has(clienteNomeRow)
    ) {
      continue;
    }
    const nome = String(row.colaborador ?? "").trim();
    if (!nome) continue;
    const cpf = row.colaborador_cpf
      ? normalizeCpfDigits(String(row.colaborador_cpf))
      : "";
    const key = `${nome.toLowerCase()}|${cpf}`;
    if (byKey.has(key)) continue;
    byKey.set(key, {
      colaborador: nome,
      colaborador_cpf: cpf || null,
    });
  }

  return Array.from(byKey.values()).sort((a, b) =>
    a.colaborador.localeCompare(b.colaborador, "pt-BR")
  );
}

export async function criarExameFuturoImplantacao(
  input: CriarExameFuturoInput
): Promise<PeriodicoFuturoRecord> {
  const supabase = createClient();
  const colaborador = input.colaborador.trim();
  const tipoAso = input.tipoAso.trim();
  const dataPrevista = input.dataPrevistaIso.slice(0, 10);
  const cpfDigits = input.colaboradorCpf
    ? normalizeCpfDigits(input.colaboradorCpf)
    : "";
  const vagaId = (input.vagaId ?? "").trim();

  if (!colaborador) throw new Error("Informe o colaborador.");
  if (!tipoAso) throw new Error("Informe o tipo de ASO.");
  if (isAsoDemissional(tipoAso)) {
    throw new Error("ASO Demissional não gera Periódico Futuro.");
  }
  if (isAsoPontual(tipoAso)) {
    throw new Error("ASO Pontual não gera Periódico Futuro.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataPrevista)) {
    throw new Error("Informe a data prevista.");
  }
  if (!input.motivo) throw new Error("Informe o motivo.");
  if (input.motivo === "Outro" && !(input.motivoDetalhe ?? "").trim()) {
    throw new Error("Descreva o motivo (Outro).");
  }

  const { data: contrato, error: cErr } = await supabase
    .from("cliente_contratos")
    .select(
      "id, numero, quantidade_colaboradores, orcamento_id, data_inicio, data_fim"
    )
    .eq("id", input.contratoId)
    .maybeSingle();
  if (cErr) throw cErr;
  if (!contrato) throw new Error("Contrato não encontrado.");

  const dataInicio = String(contrato.data_inicio ?? "").slice(0, 10);
  const dataFim = String(contrato.data_fim ?? "").slice(0, 10);
  if (!dataInicio || !dataFim) {
    throw new Error("Contrato sem vigência definida.");
  }
  if (
    !dataPrevistaDentroDaVigenciaContrato({
      dataPrevistaIso: dataPrevista,
      dataInicio,
      dataFim,
    })
  ) {
    throw new Error(EXAME_FUTURO_FORA_VIGENCIA_MSG);
  }

  let cargoId = (input.cargoId ?? "").trim() || null;
  let cargoNome = (input.cargoNome ?? "").trim() || null;

  if (vagaId) {
    const { data: vagaRow, error: vagaErr } = await supabase
      .from("contrato_vagas")
      .select(
        "id, contrato_id, status, colaborador, colaborador_cpf, cargo_id, cargo_nome, periodico_futuro_id"
      )
      .eq("id", vagaId)
      .maybeSingle();
    if (vagaErr) throw vagaErr;
    if (!vagaRow || String(vagaRow.contrato_id) !== input.contratoId) {
      throw new Error("Vaga contratual não encontrada neste contrato.");
    }
    if (String(vagaRow.status) !== "comprometida") {
      throw new Error(
        "Só é possível programar para o futuro uma vaga ainda Comprometida."
      );
    }
    if (!cargoId) cargoId = vagaRow.cargo_id ? String(vagaRow.cargo_id) : null;
    if (!cargoNome) {
      cargoNome = vagaRow.cargo_nome ? String(vagaRow.cargo_nome) : null;
    }
  }

  // Evita duplicar periódico ativo do mesmo CPF + contrato (consome previsão).
  if (cpfDigits && isValidCPF(cpfDigits)) {
    const { data: existente, error: dupErr } = await supabase
      .from("periodicos_futuros")
      .select("*")
      .eq("contrato_id", input.contratoId)
      .eq("consome_previsao_contrato", true)
      .in("status", ["ativo", "reagendado"])
      .or(filtroOrCpfExato("colaborador_cpf", cpfDigits))
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (dupErr) throw dupErr;

    const candidato =
      existente &&
      normalizeCpfDigits(existente.colaborador_cpf) === cpfDigits
        ? (existente as PeriodicoFuturoRecord)
        : undefined;

    if (candidato) {
      const { data: vagaLigada } = await supabase
        .from("contrato_vagas")
        .select("id, status")
        .eq("periodico_futuro_id", candidato.id)
        .maybeSingle();
      if (vagaLigada && (!vagaId || String(vagaLigada.id) !== vagaId)) {
        throw new Error(
          "Já existe um periódico futuro ativo para este colaborador neste contrato."
        );
      }
      const { ocuparVagaComExameFuturo } = await import(
        "@/services/contrato-vagas.service"
      );
      await ocuparVagaComExameFuturo({
        contratoId: input.contratoId,
        periodicoFuturoId: candidato.id,
        colaborador,
        colaboradorCpf: cpfDigits,
        cargoId,
        cargoNome,
        vagaId: vagaId || null,
      });
      return candidato;
    }
  }

  // Garante que ainda há vaga (agendamentos + programações).
  const agRows = await lerTodosOsLotes(async (from, to) => {
    const { data: page, error: agErr } = await supabase
      .from("contrato_agendamentos")
      .select("agendamento_id")
      .eq("contrato_id", input.contratoId)
      .eq("contabiliza_previsao", true)
      .is("removido_em", null)
      .order("id", { ascending: true })
      .range(from, to);
    if (agErr) throw agErr;
    return page ?? [];
  });

  const agIds = agRows.map((r) => String(r.agendamento_id));
  let utilizadosAg = 0;
  if (agIds.length > 0) {
    const ags = await lerPorIdentificadores(agIds, async (grupo, from, to) => {
      const { data: page, error: stErr } = await supabase
        .from("agendamentos")
        .select("id, status")
        .in("id", grupo)
        .order("id", { ascending: true })
        .range(from, to);
      if (stErr) throw stErr;
      return page ?? [];
    });
    utilizadosAg = ags.filter((a) => a.status !== "cancelado").length;
  }

  const { count: progCount, error: progErr } = await supabase
    .from("periodicos_futuros")
    .select("id", { count: "exact", head: true })
    .eq("contrato_id", input.contratoId)
    .eq("consome_previsao_contrato", true)
    .in("status", ["ativo", "reagendado"]);
  if (progErr) throw progErr;

  const { count: creditoCount, error: creditoErr } = await supabase
    .from("contrato_creditos_aso")
    .select("id", { count: "exact", head: true })
    .eq("contrato_id", input.contratoId)
    .eq("status", "disponivel");
  if (creditoErr) throw creditoErr;

  let previstos = Number(contrato.quantidade_colaboradores) || 0;
  if (contrato.orcamento_id) {
    const { data: aprov } = await supabase
      .from("orcamento_aprovacoes")
      .select("quantidade_colaboradores")
      .eq("orcamento_id", contrato.orcamento_id)
      .maybeSingle();
    const q = Number(aprov?.quantidade_colaboradores);
    if (Number.isFinite(q) && q > 0) previstos = Math.floor(q);
  }

  const utilizados =
    utilizadosAg + (progCount ?? 0) + (creditoCount ?? 0);
  // Converter Comprometido → Programado já possui slot classificado; ainda assim
  // não pode ultrapassar a previsão com periódicos/agendamentos/créditos.
  if (previstos > 0 && utilizados >= previstos) {
    throw new Error(
      "Não há vagas disponíveis neste contrato para programar exame futuro."
    );
  }

  const row = {
    agendamento_id: null,
    cliente_nome: input.clienteNome.trim(),
    colaborador,
    cargo_id: cargoId,
    cargo_nome: cargoNome,
    exame_id: null,
    tipo_exame: tipoAso,
    exame_nome: tipoAso,
    data_realizada: null,
    proxima_data: dataPrevista,
    data_prevista_original: dataPrevista,
    antecipado: false,
    status: "ativo" as const,
    origem: ORIGEM_PERIODICO_IMPLANTACAO,
    motivo: input.motivo,
    motivo_detalhe:
      input.motivo === "Outro" ? (input.motivoDetalhe ?? "").trim() : null,
    observacoes: (input.observacoes ?? "").trim() || null,
    contrato_id: input.contratoId,
    colaborador_cpf: cpfDigits || null,
    tipo_aso: tipoAso,
    consome_previsao_contrato: true,
  };

  const { data, error } = await supabase
    .from("periodicos_futuros")
    .insert(row)
    .select("*")
    .single();

  if (error) throw error;

  const record = data as PeriodicoFuturoRecord;
  await registrarAuditoria({
    usuarioNome: input.criadoPor,
    usuarioEmail: "",
    modulo: AUDITORIA_MODULOS.periodicos_futuros,
    acao: AUDITORIA_ACOES.criacao,
    registroId: record.id,
    registroNome: colaborador,
    descricao: `${input.criadoPor} programou exame futuro (${tipoAso}) de ${colaborador} para ${dataPrevista} no contrato ${contrato.numero ?? input.contratoId} (Implantação Inicial).`,
  });

  const { ocuparVagaComExameFuturo } = await import(
    "@/services/contrato-vagas.service"
  );
  await ocuparVagaComExameFuturo({
    contratoId: input.contratoId,
    periodicoFuturoId: record.id,
    colaborador,
    colaboradorCpf: cpfDigits || null,
    cargoId,
    cargoNome,
    vagaId: vagaId || null,
  });

  return record;
}

/**
 * Corrige data e tipo de ASO da programação futura existente.
 * Sempre UPDATE do mesmo `periodicos_futuros.id`. Nunca INSERT.
 */
export async function atualizarProgramacaoFutura(params: {
  periodicoId: string;
  tipoAso: string;
  dataPrevistaIso: string;
  usuarioNome: string;
  usuarioEmail?: string;
  usuarioId?: string | null;
}): Promise<PeriodicoFuturoRecord> {
  const supabase = createClient();
  const periodicoId = params.periodicoId.trim();
  if (!periodicoId) {
    throw new Error("Programação futura não encontrada.");
  }

  const { data: atual, error: findErr } = await supabase
    .from("periodicos_futuros")
    .select("*")
    .eq("id", periodicoId)
    .maybeSingle();
  if (findErr) throw findErr;
  if (!atual) {
    throw new Error("Programação futura não encontrada.");
  }

  const record = atual as PeriodicoFuturoRecord;
  const bloqueio = motivoBloqueioEdicaoProgramacaoFutura(record);
  if (bloqueio) throw new Error(bloqueio);

  const vinculoId = (record.agendamento_vinculado_id ?? "").trim();
  if (vinculoId) {
    const { data: ag } = await supabase
      .from("agendamentos")
      .select("id, status")
      .eq("id", vinculoId)
      .maybeSingle();
    const agStatus = String(ag?.status ?? "").trim().toLowerCase();
    if (ag && agStatus !== "cancelado") {
      throw new Error(PROGRAMACAO_FUTURA_NAO_EDITAVEL_AGENDADA_MSG);
    }
  }

  let dataInicio: string | null = null;
  let dataFim: string | null = null;
  const contratoId = (record.contrato_id ?? "").trim();
  if (contratoId) {
    const { data: contrato, error: cErr } = await supabase
      .from("cliente_contratos")
      .select("id, data_inicio, data_fim")
      .eq("id", contratoId)
      .maybeSingle();
    if (cErr) throw cErr;
    if (!contrato) throw new Error("Contrato não encontrado.");
    dataInicio = String(contrato.data_inicio ?? "").slice(0, 10) || null;
    dataFim = String(contrato.data_fim ?? "").slice(0, 10) || null;
    if (!dataInicio || !dataFim) {
      throw new Error("Contrato sem vigência definida.");
    }
  }

  const validado = validarEdicaoProgramacaoFutura({
    tipoAso: params.tipoAso,
    dataPrevistaIso: params.dataPrevistaIso,
    dataInicioContrato: dataInicio,
    dataFimContrato: dataFim,
  });
  if (!validado.ok) throw new Error(validado.message);

  const { data: updated, error: updErr } = await supabase
    .from("periodicos_futuros")
    .update({
      proxima_data: validado.patch.proxima_data,
      data_prevista_original: validado.patch.data_prevista_original,
      tipo_aso: validado.patch.tipo_aso,
      tipo_exame: validado.patch.tipo_exame,
      exame_nome: validado.patch.exame_nome,
      antecipado: false,
    })
    .eq("id", periodicoId)
    .eq("status", "ativo")
    .eq("origem", ORIGEM_PERIODICO_IMPLANTACAO)
    .is("data_realizada", null)
    .is("agendamento_vinculado_id", null)
    .select("*")
    .maybeSingle();

  if (updErr) throw updErr;
  if (!updated) {
    throw new Error("Não foi possível atualizar a programação futura.");
  }

  const tipoAntes = String(record.tipo_aso || record.exame_nome || "").trim();
  const tipoDepois = validado.patch.tipo_aso;
  const dataAntes = String(record.proxima_data ?? "").slice(0, 10);
  const dataDepois = validado.patch.proxima_data;
  const alteracao = descreverAlteracaoProgramacaoFutura({
    tipoAsoAntes: tipoAntes,
    tipoAsoDepois: tipoDepois,
    dataAntes,
    dataDepois,
  });
  const nome = params.usuarioNome.trim() || "Sistema";
  const detalhe = alteracao ? ` — ${alteracao}` : "";

  await registrarAuditoria({
    usuarioId: params.usuarioId ?? null,
    usuarioNome: nome,
    usuarioEmail: params.usuarioEmail ?? "",
    modulo: AUDITORIA_MODULOS.periodicos_futuros,
    acao: AUDITORIA_ACOES.edicao,
    registroId: record.id,
    registroNome: record.colaborador,
    descricao: `${nome} editou a programação futura de ${record.colaborador} (${record.cliente_nome})${detalhe}.`,
    dadosAntes: {
      proxima_data: dataAntes,
      data_prevista_original: String(record.data_prevista_original ?? "").slice(0, 10),
      tipo_aso: record.tipo_aso ?? null,
      tipo_exame: record.tipo_exame,
      exame_nome: record.exame_nome,
      antecipado: record.antecipado ?? false,
      origem: record.origem ?? null,
      colaborador: record.colaborador,
    },
    dadosDepois: {
      proxima_data: dataDepois,
      data_prevista_original: validado.patch.data_prevista_original,
      tipo_aso: validado.patch.tipo_aso,
      tipo_exame: validado.patch.tipo_exame,
      exame_nome: validado.patch.exame_nome,
      antecipado: false,
      origem: record.origem ?? null,
      colaborador: record.colaborador,
    },
  });

  return updated as PeriodicoFuturoRecord;
}

/**
 * Busca periódicos futuros ativos do colaborador (CPF normalizado prioritário).
 * Filtra por empresa e, se informado, por tipo de ASO.
 */
export async function listarPeriodicosPendentesColaborador(params: {
  clienteNome: string;
  colaborador: string;
  colaboradorCpf?: string | null;
  tipoAso?: string | null;
  clienteId?: string | null;
}): Promise<PeriodicoFuturoRecord[]> {
  const supabase = createClient();
  const cliente = params.clienteNome.trim();
  const colaborador = params.colaborador.trim();
  const cpfDigits = params.colaboradorCpf
    ? normalizeCpfDigits(params.colaboradorCpf)
    : "";
  const cpf = isValidCPF(cpfDigits) ? cpfDigits : "";
  const tipoAso = (params.tipoAso ?? "").trim();

  if (!cliente || (!colaborador && !cpf)) return [];

  const data = await lerTodosOsLotes(async (from, to) => {
    let query = supabase
      .from("periodicos_futuros")
      .select("*")
      .eq("status", "ativo")
      .order("proxima_data", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to);

    if (cpf) {
      const masked = maskCPFInput(cpf);
      query = query.or(
        `colaborador_cpf.eq.${cpf},colaborador_cpf.eq."${masked}"`
      );
    } else {
      query = query
        .ilike("cliente_nome", cliente)
        .ilike("colaborador", colaborador);
    }

    const { data: page, error } = await query;
    if (error) throw error;
    return (page ?? []) as PeriodicoFuturoRecord[];
  });

  let rows = data;
  if (rows.length === 0) return [];

  if (cpf) {
    rows = rows.filter(
      (r) => normalizeCpfDigits(r.colaborador_cpf) === cpf
    );
  }

  const clienteNorm = cliente.toLowerCase();
  const clienteId = params.clienteId?.trim() ?? "";
  if (clienteId) {
    const contratos = await listarContratosPorCliente(clienteId);
    rows = filtrarPeriodicosDoCliente({
      rows,
      contratoIdsDoCliente: contratos.map((contrato) => contrato.id),
    });
  } else {
    const matchEmpresa = rows.filter(
      (r) => (r.cliente_nome ?? "").trim().toLowerCase() === clienteNorm
    );
    rows = matchEmpresa.length > 0 ? matchEmpresa : rows;
  }

  if (tipoAso) {
    const asoNorm = tipoAso.toLowerCase();
    const matchAso = rows.filter((r) => {
      const tipo = (r.tipo_aso ?? "").trim().toLowerCase();
      const exame = (r.exame_nome ?? r.tipo_exame ?? "").trim().toLowerCase();
      return tipo === asoNorm || exame.includes(asoNorm);
    });
    // Se há match por ASO, prioriza; senão mantém todos para o usuário decidir
    if (matchAso.length > 0) rows = matchAso;
  }

  return rows;
}

/**
 * Periódicos pendentes agrupados por ciclo (mesma regra da página Periódicos Futuros).
 */
export async function listarPeriodicosPendentesAgrupadosColaborador(params: {
  clienteNome: string;
  colaborador: string;
  colaboradorCpf?: string | null;
  tipoAso?: string | null;
  clienteId?: string | null;
}): Promise<PeriodicoFuturoGrupo[]> {
  const rows = await listarPeriodicosPendentesColaborador(params);
  return agruparPeriodicosPendentesParaVinculo(rows);
}

/**
 * Busca periódico futuro ativo do colaborador (CPF preferencial; senão nome + empresa).
 * Retorna o mais próximo por data prevista.
 */
export async function buscarPeriodicoPendenteColaborador(params: {
  clienteNome: string;
  colaborador: string;
  colaboradorCpf?: string | null;
  tipoAso?: string | null;
  clienteId?: string | null;
}): Promise<PeriodicoFuturoRecord | null> {
  const rows = await listarPeriodicosPendentesColaborador(params);
  return rows[0] ?? null;
}

export function isAntecipacaoPeriodico(
  dataAgendamentoIso: string | null | undefined,
  dataPrevistaIso: string | null | undefined
): boolean {
  const ag = (dataAgendamentoIso ?? "").slice(0, 10);
  const prev = (dataPrevistaIso ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ag) || !/^\d{4}-\d{2}-\d{2}$/.test(prev)) {
    return false;
  }
  return ag < prev;
}

export async function vincularPeriodicoAoAgendamento(params: {
  periodicoId?: string;
  periodicoIds?: string[];
  agendamentoId: string;
  usuarioNome: string;
  dataAgendamentoIso?: string | null;
  usuarioEmail?: string;
  usuarioId?: string | null;
}): Promise<{
  antecipado: boolean;
  dataPrevistaOriginal: string;
  vinculados: number;
}> {
  const ids = Array.from(
    new Set(
      [...(params.periodicoIds ?? []), params.periodicoId ?? ""]
        .map((id) => id.trim())
        .filter(Boolean)
    )
  );
  if (ids.length === 0) {
    throw new Error("Nenhum periódico futuro selecionado.");
  }

  const supabase = createClient();
  const encontrados = await lerPorIdentificadores(ids, async (grupo, from, to) => {
    const { data: page, error: findErr } = await supabase
      .from("periodicos_futuros")
      .select("*")
      .in("id", grupo)
      .order("id", { ascending: true })
      .range(from, to);
    if (findErr) throw findErr;
    return page ?? [];
  });

  const records = (encontrados as PeriodicoFuturoRecord[]).filter(
    (row) => row.status === "ativo" && !isPeriodicoCanceladoManualmente(row)
  );
  if (records.length === 0) {
    throw new Error("Este periódico futuro já foi atendido ou cancelado.");
  }

  const grupos = agruparPeriodicosPendentesParaVinculo(records);
  const grupo = grupos[0];
  const representante =
    records.find((r) => r.id === (grupo?.ids[0] ?? "")) ?? records[0];
  const chaveCiclo = chaveCicloPeriodico(representante);

  const cpf = normalizeCpfDigits(representante.colaborador_cpf);
  let doCiclo = [...records];
  if (isValidCPF(cpf)) {
    const irmaos = await lerTodosOsLotes(async (from, to) => {
      const { data: page, error: irmaosErr } = await supabase
        .from("periodicos_futuros")
        .select("*")
        .eq("status", "ativo")
        .or(filtroOrCpfExato("colaborador_cpf", cpf))
        .order("id", { ascending: true })
        .range(from, to);
      if (irmaosErr) throw irmaosErr;
      return page ?? [];
    });
    doCiclo = [
      ...doCiclo,
      ...(irmaos as PeriodicoFuturoRecord[]).filter(
        (row) =>
          !isPeriodicoCanceladoManualmente(row) &&
          chaveCicloPeriodico(row) === chaveCiclo
      ),
    ];
  }

  const idsDoCiclo = Array.from(
    new Set(
      [...(grupo?.ids ?? []), ...doCiclo.map((row) => row.id)].filter(Boolean)
    )
  );

  const dataPrevistaOriginal =
    (representante.data_prevista_original as string | null)?.slice(0, 10) ||
    String(representante.proxima_data).slice(0, 10);
  const dataAgLabel = (params.dataAgendamentoIso ?? "").slice(0, 10);
  const { antecipado, patch } = buildPatchVinculoPeriodico({
    agendamentoId: params.agendamentoId,
    dataAgendamentoIso: params.dataAgendamentoIso,
    dataPrevistaOriginal,
  });

  const idsGravacao = exigirGravacaoUnica(idsDoCiclo);
  const { error } = await supabase
    .from("periodicos_futuros")
    .update(patch)
    .in("id", idsGravacao)
    .eq("status", "ativo");
  if (error) throw error;

  const contratoId =
    representante.contrato_id ||
    doCiclo.find((r) => r.contrato_id)?.contrato_id;
  if (contratoId) {
    const { data: vagasAtualizadas, error: vagaErr } = await supabase
      .from("contrato_vagas")
      .update({
        status: "agendada",
        agendamento_id: params.agendamentoId,
        colaborador: representante.colaborador,
        colaborador_cpf: representante.colaborador_cpf || null,
      })
      .eq("contrato_id", contratoId)
      .in("periodico_futuro_id", idsGravacao)
      .select("id");
    if (vagaErr) throw vagaErr;

    if ((vagasAtualizadas ?? []).length === 0 && representante.colaborador_cpf) {
      const normCpf = normalizeCpfDigits(representante.colaborador_cpf);
      const { data: vagaMatch, error: vagaCpfErr } = await supabase
        .from("contrato_vagas")
        .select("id, colaborador_cpf")
        .eq("contrato_id", contratoId)
        .in("status", ["programada", "comprometida"])
        .or(filtroOrCpfExato("colaborador_cpf", normCpf))
        .order("indice", { ascending: true })
        .order("id", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (vagaCpfErr) throw vagaCpfErr;
      if (
        vagaMatch &&
        normalizeCpfDigits(vagaMatch.colaborador_cpf) === normCpf
      ) {
        const { error: ocupaErr } = await supabase
          .from("contrato_vagas")
          .update({
            status: "agendada",
            agendamento_id: params.agendamentoId,
            colaborador: representante.colaborador,
            colaborador_cpf: representante.colaborador_cpf || null,
            periodico_futuro_id: idsGravacao[0] ?? null,
          })
          .eq("id", vagaMatch.id);
        if (ocupaErr) throw ocupaErr;
      }
    }
  }

  const examesLabel = grupo
    ? labelExamesCicloVinculo(grupo)
    : representante.tipo_aso || representante.exame_nome || "Periódico";
  const descricao = antecipado
    ? `${params.usuarioNome} antecipou o periódico ${examesLabel} de ${representante.colaborador}, originalmente previsto para ${dataPrevistaOriginal}, vinculando-o ao agendamento de ${dataAgLabel || params.agendamentoId}.`
    : `${params.usuarioNome} vinculou o agendamento ${dataAgLabel || params.agendamentoId} ao periódico futuro ${examesLabel} de ${representante.colaborador} (${representante.cliente_nome}), previsto para ${dataPrevistaOriginal}.`;

  await registrarAuditoria({
    usuarioId: params.usuarioId ?? null,
    usuarioNome: params.usuarioNome,
    usuarioEmail: params.usuarioEmail ?? "",
    modulo: AUDITORIA_MODULOS.periodicos_futuros,
    acao: AUDITORIA_ACOES.reagendamento,
    registroId: idsDoCiclo[0] ?? null,
    registroNome: String(representante.colaborador ?? ""),
    descricao,
    dadosAntes: {
      status: "ativo",
      proxima_data: representante.proxima_data,
      data_prevista_original: dataPrevistaOriginal,
    },
    dadosDepois: {
      status: "reagendado",
      agendamento_vinculado_id: params.agendamentoId,
      antecipado,
      data_prevista_original: dataPrevistaOriginal,
      data_agendamento: dataAgLabel || null,
      periodico_futuro_ids: idsDoCiclo,
      proxima_data: representante.proxima_data,
    },
  });

  return {
    antecipado,
    dataPrevistaOriginal,
    vinculados: idsDoCiclo.length,
  };
}
