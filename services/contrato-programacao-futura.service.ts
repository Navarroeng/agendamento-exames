import {
  AUDITORIA_ACOES,
  AUDITORIA_MODULOS,
} from "@/lib/auditoria";
import {
  ORIGEM_PERIODICO_IMPLANTACAO,
  type ColaboradorSugestao,
  type CriarExameFuturoInput,
} from "@/lib/contrato-programacao-futura";
import { normalizeCpfDigits } from "@/lib/cpf";
import { createClient } from "@/lib/supabase/client";
import type { PeriodicoFuturoRecord } from "@/lib/types";
import { registrarAuditoria } from "@/services/auditoria.service";

export type PeriodicoProgramadoContrato = Pick<
  PeriodicoFuturoRecord,
  | "id"
  | "colaborador"
  | "colaborador_cpf"
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
>;

/** Contagem de programações futuras que ainda consomem previsão por contrato. */
export async function contarProgramacoesFuturasPorContratos(
  contratoIds: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (contratoIds.length === 0) return map;
  for (const id of contratoIds) map.set(id, 0);

  const supabase = createClient();
  const { data, error } = await supabase
    .from("periodicos_futuros")
    .select("contrato_id")
    .in("contrato_id", contratoIds)
    .eq("consome_previsao_contrato", true)
    .in("status", ["ativo", "reagendado"]);

  if (error) throw error;

  for (const row of data ?? []) {
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
  const { data, error } = await supabase
    .from("periodicos_futuros")
    .select(
      "id, colaborador, colaborador_cpf, tipo_aso, tipo_exame, exame_nome, proxima_data, motivo, motivo_detalhe, observacoes, origem, status, contrato_id, consome_previsao_contrato"
    )
    .eq("contrato_id", contratoId)
    .eq("consome_previsao_contrato", true)
    .in("status", ["ativo", "reagendado"])
    .order("proxima_data", { ascending: true });

  if (error) throw error;
  return (data ?? []) as PeriodicoProgramadoContrato[];
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
  let query = supabase
    .from("agendamentos")
    .select("colaborador, colaborador_cpf, cliente_nome, cliente_id")
    .neq("status", "cancelado")
    .order("colaborador", { ascending: true })
    .limit(2000);

  if (clienteId) {
    query = query.eq("cliente_id", clienteId);
  } else {
    query = query.in("cliente_nome", nomes);
  }

  const { data, error } = await query;
  if (error) throw error;

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

  if (!colaborador) throw new Error("Informe o colaborador.");
  if (!tipoAso) throw new Error("Informe o tipo de ASO.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataPrevista)) {
    throw new Error("Informe a data prevista.");
  }
  if (!input.motivo) throw new Error("Informe o motivo.");
  if (input.motivo === "Outro" && !(input.motivoDetalhe ?? "").trim()) {
    throw new Error("Descreva o motivo (Outro).");
  }

  // Garante que ainda há vaga (agendamentos + programações).
  const { data: agRows, error: agErr } = await supabase
    .from("contrato_agendamentos")
    .select("agendamento_id")
    .eq("contrato_id", input.contratoId)
    .eq("contabiliza_previsao", true)
    .is("removido_em", null);
  if (agErr) throw agErr;

  const agIds = (agRows ?? []).map((r) => String(r.agendamento_id));
  let utilizadosAg = 0;
  if (agIds.length > 0) {
    const { data: ags, error: stErr } = await supabase
      .from("agendamentos")
      .select("id, status")
      .in("id", agIds);
    if (stErr) throw stErr;
    utilizadosAg = (ags ?? []).filter((a) => a.status !== "cancelado").length;
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

  const { data: contrato, error: cErr } = await supabase
    .from("cliente_contratos")
    .select("id, numero, quantidade_colaboradores, orcamento_id")
    .eq("id", input.contratoId)
    .maybeSingle();
  if (cErr) throw cErr;
  if (!contrato) throw new Error("Contrato não encontrado.");

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
  if (previstos > 0 && utilizados >= previstos) {
    throw new Error(
      "Não há vagas disponíveis neste contrato para programar exame futuro."
    );
  }

  const row = {
    agendamento_id: null,
    cliente_nome: input.clienteNome.trim(),
    colaborador,
    cargo_id: null,
    cargo_nome: null,
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
  });

  return record;
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
}): Promise<PeriodicoFuturoRecord[]> {
  const supabase = createClient();
  const cliente = params.clienteNome.trim();
  const colaborador = params.colaborador.trim();
  const cpf = params.colaboradorCpf
    ? normalizeCpfDigits(params.colaboradorCpf)
    : "";
  const tipoAso = (params.tipoAso ?? "").trim();

  if (!cliente || (!colaborador && cpf.length !== 11)) return [];

  let query = supabase
    .from("periodicos_futuros")
    .select("*")
    .eq("status", "ativo")
    .order("proxima_data", { ascending: true })
    .limit(100);

  if (cpf.length === 11) {
    const masked = `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
    query = query.or(
      `colaborador_cpf.eq.${cpf},colaborador_cpf.eq."${masked}"`
    );
  } else {
    query = query
      .ilike("cliente_nome", cliente)
      .ilike("colaborador", colaborador);
  }

  const { data, error } = await query;
  if (error) throw error;

  let rows = (data ?? []) as PeriodicoFuturoRecord[];
  if (rows.length === 0) return [];

  if (cpf.length === 11) {
    rows = rows.filter(
      (r) => normalizeCpfDigits(r.colaborador_cpf) === cpf
    );
  }

  const clienteNorm = cliente.toLowerCase();
  const matchEmpresa = rows.filter(
    (r) => (r.cliente_nome ?? "").trim().toLowerCase() === clienteNorm
  );
  rows = matchEmpresa.length > 0 ? matchEmpresa : rows;

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
 * Busca periódico futuro ativo do colaborador (CPF preferencial; senão nome + empresa).
 * Retorna o mais próximo por data prevista.
 */
export async function buscarPeriodicoPendenteColaborador(params: {
  clienteNome: string;
  colaborador: string;
  colaboradorCpf?: string | null;
  tipoAso?: string | null;
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
  periodicoId: string;
  agendamentoId: string;
  usuarioNome: string;
  dataAgendamentoIso?: string | null;
  usuarioEmail?: string;
  usuarioId?: string | null;
}): Promise<{ antecipado: boolean; dataPrevistaOriginal: string }> {
  const supabase = createClient();
  const { data: record, error: findErr } = await supabase
    .from("periodicos_futuros")
    .select("*")
    .eq("id", params.periodicoId)
    .maybeSingle();
  if (findErr) throw findErr;
  if (!record) throw new Error("Periódico futuro não encontrado.");
  if (record.status !== "ativo") {
    throw new Error("Este periódico futuro já foi atendido ou cancelado.");
  }

  const dataPrevistaOriginal =
    (record.data_prevista_original as string | null)?.slice(0, 10) ||
    String(record.proxima_data).slice(0, 10);
  const dataAgLabel = (params.dataAgendamentoIso ?? "").slice(0, 10);
  const antecipado = isAntecipacaoPeriodico(
    params.dataAgendamentoIso,
    dataPrevistaOriginal
  );

  const { error } = await supabase
    .from("periodicos_futuros")
    .update({
      agendamento_id: params.agendamentoId,
      status: "reagendado",
      data_prevista_original: dataPrevistaOriginal,
      antecipado,
      ...(dataAgLabel && /^\d{4}-\d{2}-\d{2}$/.test(dataAgLabel)
        ? { proxima_data: dataAgLabel }
        : {}),
    })
    .eq("id", params.periodicoId)
    .eq("status", "ativo");
  if (error) throw error;

  const descricao = antecipado
    ? `${params.usuarioNome} antecipou o exame ${record.tipo_aso || record.exame_nome || "Periódico"} de ${record.colaborador}, originalmente previsto para ${dataPrevistaOriginal}, vinculando-o ao agendamento de ${dataAgLabel || params.agendamentoId}.`
    : `${params.usuarioNome} vinculou o agendamento ${dataAgLabel || params.agendamentoId} ao periódico futuro de ${record.colaborador} (${record.cliente_nome}), previsto para ${dataPrevistaOriginal}.`;

  await registrarAuditoria({
    usuarioId: params.usuarioId ?? null,
    usuarioNome: params.usuarioNome,
    usuarioEmail: params.usuarioEmail ?? "",
    modulo: AUDITORIA_MODULOS.periodicos_futuros,
    acao: AUDITORIA_ACOES.reagendamento,
    registroId: params.periodicoId,
    registroNome: String(record.colaborador ?? ""),
    descricao,
    dadosAntes: {
      status: "ativo",
      proxima_data: record.proxima_data,
      data_prevista_original: dataPrevistaOriginal,
    },
    dadosDepois: {
      status: "reagendado",
      agendamento_id: params.agendamentoId,
      antecipado,
      data_prevista_original: dataPrevistaOriginal,
      data_agendamento: dataAgLabel || null,
    },
  });

  return { antecipado, dataPrevistaOriginal };
}
