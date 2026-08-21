import {
  AUDITORIA_ACOES,
  AUDITORIA_MODULOS,
  type AuditoriaUsuarioContext,
} from "@/lib/auditoria";
import { createClient } from "@/lib/supabase/client";
import type { PeriodicoFuturoRecord } from "@/lib/types";
import { registrarAuditoria } from "@/services/auditoria.service";
import {
  buscarCargoPorId,
  listarExamesObrigatoriosPorCargo,
} from "@/services/cargo.service";
import {
  cargoGeraAlertaPeriodico,
  computeProximaDataPeriodico,
  parseValidadePeriodicoMeses,
} from "@/lib/cargo-periodico";
import { ORIGEM_PERIODICO_IMPLANTACAO } from "@/lib/contrato-programacao-futura";
import { efeitoCancelamentoAsoSobrePeriodico } from "@/lib/periodico-cancelamento";
import { canEditarProximaDataPeriodico } from "@/lib/periodicos-futuro";
import {
  nomesColaboradorEquivalentes,
  normalizeIdentidadeColaborador,
} from "@/lib/periodico-agrupamento";
import {
  PeriodicoCpfConflitoError,
  resolverConflitoCpfRegularizacao,
  validarCpfRegularizacaoPeriodico,
  type PeriodicoCpfConflito,
} from "@/lib/periodico-cpf-regularizacao";
import { isValidCPF, maskCPFInput, normalizeCpfDigits } from "@/lib/cpf";
import { verificarContratoVigentePorNome } from "@/lib/cliente-contrato-vigencia";
import {
  decidirOrigemPeriodicoFuturo,
  isAsoDemissional,
} from "@/lib/periodico-geracao";

export interface CriarPeriodicosAgendamentoParams {
  cliente_nome: string;
  colaborador: string;
  colaborador_cpf?: string | null;
  cargo_id: string;
  cargo_nome: string | null;
  data_agendamento: string;
  exames: { tipo_exame: string }[];
  tipoAso?: string | null;
  cumprindoPeriodicoExistente?: boolean;
}

type PeriodicoFuturoWithCargo = PeriodicoFuturoRecord & {
  cargos?: { validade_periodico_meses: number } | null;
};

function isPeriodicoDeCargoComAlerta(record: PeriodicoFuturoWithCargo): boolean {
  const validade = record.cargos?.validade_periodico_meses;
  return cargoGeraAlertaPeriodico(validade);
}

function deveListarPeriodico(record: PeriodicoFuturoWithCargo): boolean {
  const origem = (record.origem ?? "").trim().toLowerCase();
  if (origem === ORIGEM_PERIODICO_IMPLANTACAO) return true;
  if (record.consome_previsao_contrato) return true;
  return isPeriodicoDeCargoComAlerta(record);
}

function stripCargoJoin(
  record: PeriodicoFuturoWithCargo
): PeriodicoFuturoRecord {
  const { cargos: _cargos, ...rest } = record;
  return rest;
}

export async function listarPeriodicosFuturos(
  limit = 2000
): Promise<PeriodicoFuturoRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("periodicos_futuros")
    .select("*, cargos(validade_periodico_meses)")
    .order("proxima_data", { ascending: true })
    .limit(limit);

  if (error) throw error;

  return anexarDatasAgendamentoVinculado(
    ((data ?? []) as PeriodicoFuturoWithCargo[])
      .filter(deveListarPeriodico)
      .map(stripCargoJoin)
  );
}

async function anexarDatasAgendamentoVinculado(
  rows: PeriodicoFuturoRecord[]
): Promise<PeriodicoFuturoRecord[]> {
  const ids = Array.from(
    new Set(
      rows
        .flatMap((row) => [
          row.agendamento_vinculado_id,
          row.status === "reagendado" ? row.agendamento_id : null,
        ])
        .map((id) => (id ?? "").trim())
        .filter(Boolean)
    )
  );
  if (ids.length === 0) return rows;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("agendamentos")
    .select("id, data_agendamento, status")
    .in("id", ids);
  if (error) throw error;

  const porId = new Map(
    (data ?? []).map((row) => [
      String(row.id),
      {
        data: String(row.data_agendamento ?? "").slice(0, 10),
        status: String(row.status ?? ""),
      },
    ])
  );

  return rows.map((row) => {
    const vinculoId =
      (row.agendamento_vinculado_id ?? "").trim() ||
      (row.status === "reagendado" ? (row.agendamento_id ?? "").trim() : "");
    const ag = vinculoId ? porId.get(vinculoId) : undefined;
    if (!ag || ag.status === "cancelado" || !/^\d{4}-\d{2}-\d{2}$/.test(ag.data)) {
      return row;
    }
    return { ...row, data_agendada: ag.data };
  });
}

export async function criarPeriodicosDeAgendamento(
  agendamentoId: string,
  params: CriarPeriodicosAgendamentoParams
): Promise<number> {
  if (isAsoDemissional(params.tipoAso)) return 0;
  if (params.cumprindoPeriodicoExistente) return 0;

  const supabase = createClient();
  const { count: jaCumprindo, error: vinculoErr } = await supabase
    .from("periodicos_futuros")
    .select("id", { count: "exact", head: true })
    .eq("agendamento_vinculado_id", agendamentoId);
  if (vinculoErr) throw vinculoErr;
  if ((jaCumprindo ?? 0) > 0) return 0;

  const cargo = await buscarCargoPorId(params.cargo_id);
  const cargoGeraAlerta = cargo
    ? cargoGeraAlertaPeriodico(cargo.validade_periodico_meses)
    : false;
  const validade = parseValidadePeriodicoMeses(
    cargo?.validade_periodico_meses
  );
  const dataRealizada = params.data_agendamento.split("T")[0];
  const proximaData = computeProximaDataPeriodico(dataRealizada, validade);

  let contratoDataFim: string | null = null;
  try {
    const cobertura = await verificarContratoVigentePorNome(
      params.cliente_nome,
      dataRealizada
    );
    contratoDataFim = cobertura.dataFim ?? null;
  } catch {
    contratoDataFim = null;
  }

  const cpfDigits = normalizeCpfDigits(params.colaborador_cpf);
  const cpf = isValidCPF(cpfDigits) ? cpfDigits : null;

  let jaExisteObrigacaoEquivalente = false;
  if (cpf) {
    const masked = maskCPFInput(cpf);
    const { data: existentes, error: eqErr } = await supabase
      .from("periodicos_futuros")
      .select(
        "id, agendamento_id, proxima_data, data_prevista_original, status, colaborador_cpf"
      )
      .in("status", ["ativo", "reagendado"])
      .or(`colaborador_cpf.eq.${cpf},colaborador_cpf.eq."${masked}"`);
    if (eqErr) throw eqErr;
    jaExisteObrigacaoEquivalente = ((existentes ?? []) as Array<{
      agendamento_id?: string | null;
      proxima_data: string;
      data_prevista_original?: string | null;
      colaborador_cpf?: string | null;
    }>).some((row) => {
      if ((row.agendamento_id ?? "") === agendamentoId) return false;
      if (normalizeCpfDigits(row.colaborador_cpf) !== cpf) return false;
      const ciclo = String(
        row.data_prevista_original || row.proxima_data || ""
      ).slice(0, 10);
      return ciclo === proximaData;
    });
  }

  const decisao = decidirOrigemPeriodicoFuturo({
    tipoAso: params.tipoAso,
    cumprindoPeriodicoExistente: false,
    cargoGeraAlerta,
    proximaDataIso: proximaData,
    contratoDataFim,
    jaExisteObrigacaoEquivalente,
  });
  if (!decisao.gerar) return 0;

  const examesCargo = await listarExamesObrigatoriosPorCargo(params.cargo_id);
  if (examesCargo.length === 0) return 0;

  const tiposAgendamento = new Set(
    params.exames
      .map((exame) => exame.tipo_exame.trim().toLowerCase())
      .filter(Boolean)
  );

  const rows = examesCargo
    .filter((exame) => tiposAgendamento.has(exame.nome.trim().toLowerCase()))
    .map((exame) => ({
      agendamento_id: agendamentoId,
      cliente_nome: params.cliente_nome.trim(),
      colaborador: params.colaborador.trim(),
      colaborador_cpf: cpf,
      cargo_id: params.cargo_id,
      cargo_nome: params.cargo_nome,
      exame_id: exame.id,
      tipo_exame: exame.nome,
      exame_nome: exame.nome,
      data_realizada: dataRealizada,
      proxima_data: proximaData,
      data_prevista_original: proximaData,
      antecipado: false,
      status: "ativo" as const,
    }));

  if (rows.length === 0) return 0;

  const { data, error } = await supabase
    .from("periodicos_futuros")
    .upsert(rows, {
      onConflict: "agendamento_id,exame_id",
      ignoreDuplicates: true,
    })
    .select("id");

  if (error) throw error;
  return data?.length ?? 0;
}

export interface PeriodicoAuditOptions {
  auditContext?: AuditoriaUsuarioContext;
}

async function auditarPeriodico(
  auditOptions: PeriodicoAuditOptions | undefined,
  record: Pick<
    PeriodicoFuturoRecord,
    "id" | "colaborador" | "cliente_nome" | "exame_nome"
  >,
  acao:
    | typeof AUDITORIA_ACOES.reagendamento
    | typeof AUDITORIA_ACOES.cancelamento
    | typeof AUDITORIA_ACOES.edicao,
  verbo: string,
  extra?: {
    dadosAntes?: Record<string, unknown>;
    dadosDepois?: Record<string, unknown>;
  }
): Promise<void> {
  const nome = auditOptions?.auditContext?.usuarioNome ?? "Sistema";
  await registrarAuditoria({
    usuarioId: auditOptions?.auditContext?.usuarioId ?? null,
    usuarioNome: nome,
    usuarioEmail: auditOptions?.auditContext?.usuarioEmail ?? "",
    modulo: AUDITORIA_MODULOS.periodicos_futuros,
    acao,
    registroId: record.id,
    registroNome: record.colaborador,
    descricao: `${nome} ${verbo} o acompanhamento periódico de ${record.colaborador} (${record.cliente_nome}) — exame ${record.exame_nome}.`,
    dadosAntes: extra?.dadosAntes,
    dadosDepois: extra?.dadosDepois,
  });
}

async function buscarPeriodicoPorId(
  id: string
): Promise<PeriodicoFuturoRecord | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("periodicos_futuros")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data as PeriodicoFuturoRecord | null) ?? null;
}

export async function cancelarPeriodicosPorAgendamento(
  agendamentoId: string
): Promise<void> {
  const supabase = createClient();

  // ASO/agendamento cancelado não encerra a obrigação periódica.
  // Periódicos gerados a partir deste agendamento permanecem ativos.
  // Vínculo de cumprimento (reagendado): volta a pendente e libera o ID.
  const { data: vinculados, error: findVinculoErr } = await supabase
    .from("periodicos_futuros")
    .select("id, status, data_prevista_original, proxima_data, agendamento_id, agendamento_vinculado_id")
    .eq("status", "reagendado")
    .or(
      `agendamento_vinculado_id.eq.${agendamentoId},agendamento_id.eq.${agendamentoId}`
    );
  if (findVinculoErr) throw findVinculoErr;

  for (const row of vinculados ?? []) {
    if (efeitoCancelamentoAsoSobrePeriodico(String(row.status)) !== "reativar_cumprimento") {
      continue;
    }
    const dataOriginal =
      (row.data_prevista_original as string | null)?.slice(0, 10) ||
      String(row.proxima_data ?? "").slice(0, 10) ||
      null;
    const origemSobrescrita =
      String(row.agendamento_id ?? "") === agendamentoId;
    const { error: restoreErr } = await supabase
      .from("periodicos_futuros")
      .update({
        status: "ativo",
        antecipado: false,
        agendamento_vinculado_id: null,
        ...(origemSobrescrita ? { agendamento_id: null } : {}),
        ...(dataOriginal ? { proxima_data: dataOriginal } : {}),
      })
      .eq("id", row.id)
      .eq("status", "reagendado");
    if (restoreErr) throw restoreErr;
  }
}

export async function marcarPeriodicoReagendado(
  id: string,
  auditOptions?: PeriodicoAuditOptions
): Promise<void> {
  const record = await buscarPeriodicoPorId(id);

  const supabase = createClient();
  const { error } = await supabase
    .from("periodicos_futuros")
    .update({ status: "reagendado" })
    .eq("id", id)
    .eq("status", "ativo");

  if (error) throw error;

  if (record) {
    await auditarPeriodico(
      auditOptions,
      record,
      AUDITORIA_ACOES.reagendamento,
      "marcou como reagendado"
    );
  }
}

export async function cancelarPeriodicoFuturoManual(params: {
  ids: string[];
  motivo: string;
  usuarioNome?: string;
  usuarioEmail?: string;
}): Promise<{ atualizados: number; ids: string[] }> {
  const res = await fetch("/api/periodicos-futuros/cancelar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ids: params.ids,
      motivo: params.motivo,
      usuarioNome: params.usuarioNome,
      usuarioEmail: params.usuarioEmail,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    atualizados?: number;
    ids?: string[];
  };
  if (!res.ok) {
    throw new Error(data.error || "Não foi possível cancelar o periódico.");
  }
  return {
    atualizados: data.atualizados ?? 0,
    ids: data.ids ?? params.ids,
  };
}

export async function periodicoTemAgendamentoAtivoVinculado(
  agendamentoIds: string[]
): Promise<boolean> {
  const ids = Array.from(new Set(agendamentoIds.map((id) => id.trim()).filter(Boolean)));
  if (ids.length === 0) return false;
  const supabase = createClient();
  const { data, error } = await supabase
    .from("agendamentos")
    .select("id, status")
    .in("id", ids);
  if (error) throw error;
  return (data ?? []).some((row) => String(row.status ?? "") !== "cancelado");
}

export async function atualizarProximaDataPeriodico(
  id: string,
  novaDataIso: string,
  auditOptions?: PeriodicoAuditOptions
): Promise<PeriodicoFuturoRecord> {
  const data = novaDataIso.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    throw new Error("Informe uma data válida (AAAA-MM-DD).");
  }

  const record = await buscarPeriodicoPorId(id);
  if (!record) {
    throw new Error("Periódico futuro não encontrado.");
  }
  if (!canEditarProximaDataPeriodico(record)) {
    throw new Error(
      record.status !== "ativo"
        ? "Só é possível editar a próxima data de periódicos ativos."
        : "Não é possível editar a próxima data de um periódico já realizado."
    );
  }

  const dataAnterior = String(record.proxima_data ?? "").slice(0, 10);
  const dataOriginal =
    (record.data_prevista_original as string | null)?.slice(0, 10) ||
    dataAnterior ||
    null;

  const supabase = createClient();
  const { data: updated, error } = await supabase
    .from("periodicos_futuros")
    .update({
      proxima_data: data,
      ...(dataOriginal && data !== dataOriginal ? { antecipado: true } : {}),
      ...(dataOriginal && data === dataOriginal ? { antecipado: false } : {}),
    })
    .eq("id", id)
    .eq("status", "ativo")
    .is("data_realizada", null)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  if (!updated) {
    throw new Error("Não foi possível atualizar a próxima data.");
  }

  await auditarPeriodico(
    auditOptions,
    record,
    AUDITORIA_ACOES.edicao,
    "alterou a próxima data de",
    {
      dadosAntes: { proxima_data: dataAnterior },
      dadosDepois: { proxima_data: data },
    }
  );

  return updated as PeriodicoFuturoRecord;
}

export async function regularizarCpfPeriodicosFuturos(params: {
  periodicoIds: string[];
  cpf: string;
  colaborador: string;
  clienteNome: string;
  cargoId?: string | null;
  cargoNome?: string | null;
  contratoId?: string | null;
  auditOptions?: PeriodicoAuditOptions;
}): Promise<{ atualizados: number }> {
  const validado = validarCpfRegularizacaoPeriodico(params.cpf);
  if (!validado.ok) {
    throw new Error(validado.message);
  }
  const { digits, masked } = validado;
  const ids = Array.from(new Set(params.periodicoIds.filter(Boolean)));
  if (ids.length === 0) {
    throw new Error("Nenhum periódico selecionado para regularizar o CPF.");
  }

  const supabase = createClient();
  const ocorrencias: Array<{
    colaborador: string;
    cliente_nome: string;
    origem: PeriodicoCpfConflito["origem"];
  }> = [];

  const { data: periodicosCpf, error: perErr } = await supabase
    .from("periodicos_futuros")
    .select("id, colaborador, cliente_nome, colaborador_cpf")
    .or(`colaborador_cpf.eq.${digits},colaborador_cpf.eq."${masked}"`);
  if (perErr) throw perErr;
  for (const row of periodicosCpf ?? []) {
    if (normalizeCpfDigits(row.colaborador_cpf as string | null) !== digits) {
      continue;
    }
    ocorrencias.push({
      colaborador: String(row.colaborador ?? ""),
      cliente_nome: String(row.cliente_nome ?? ""),
      origem: "periodico",
    });
  }

  const { data: agsCpf, error: agErr } = await supabase
    .from("agendamentos")
    .select("id, colaborador, cliente_nome, colaborador_cpf")
    .eq("colaborador_cpf_digits", digits);
  if (agErr) throw agErr;
  for (const row of agsCpf ?? []) {
    ocorrencias.push({
      colaborador: String(row.colaborador ?? ""),
      cliente_nome: String(row.cliente_nome ?? ""),
      origem: "agendamento",
    });
  }

  const { data: vagasCpf, error: vagasCpfErr } = await supabase
    .from("contrato_vagas")
    .select("colaborador, colaborador_cpf")
    .or(`colaborador_cpf.eq.${digits},colaborador_cpf.eq."${masked}"`);
  if (!vagasCpfErr) {
    for (const row of vagasCpf ?? []) {
      if (normalizeCpfDigits(row.colaborador_cpf as string | null) !== digits) {
        continue;
      }
      if (!String(row.colaborador ?? "").trim()) continue;
      ocorrencias.push({
        colaborador: String(row.colaborador ?? ""),
        cliente_nome: "Lista de funcionários do contrato",
        origem: "vaga",
      });
    }
  }

  const conflito = resolverConflitoCpfRegularizacao({
    colaboradorAtual: params.colaborador,
    ocorrencias,
  });
  if (conflito) {
    throw new PeriodicoCpfConflitoError(conflito);
  }

  const { data: grupoRows, error: grupoErr } = await supabase
    .from("periodicos_futuros")
    .select(
      "id, agendamento_id, contrato_id, cliente_nome, colaborador, cargo_id, cargo_nome, colaborador_cpf"
    )
    .in("id", ids);
  if (grupoErr) throw grupoErr;
  const grupo = (grupoRows ?? []) as Array<{
    id: string;
    agendamento_id: string | null;
    contrato_id: string | null;
    cliente_nome: string;
    colaborador: string;
    cargo_id: string | null;
    cargo_nome: string | null;
    colaborador_cpf: string | null;
  }>;
  if (grupo.length === 0) {
    throw new Error("Periódico futuro não encontrado.");
  }
  if (grupo.some((row) => isValidCPF(row.colaborador_cpf))) {
    throw new Error("Este agrupamento já possui CPF. A alteração de CPF existente não é permitida nesta tela.");
  }

  const empresaNorm = normalizeIdentidadeColaborador(params.clienteNome);
  const nomeNorm = normalizeIdentidadeColaborador(params.colaborador);
  const cargoId = (params.cargoId ?? grupo[0].cargo_id ?? "").trim();
  const cargoNomeNorm = normalizeIdentidadeColaborador(
    params.cargoNome ?? grupo[0].cargo_nome
  );

  const { data: irmaos, error: irmaosErr } = await supabase
    .from("periodicos_futuros")
    .select(
      "id, agendamento_id, contrato_id, cliente_nome, colaborador, cargo_id, cargo_nome, colaborador_cpf"
    )
    .eq("cliente_nome", grupo[0].cliente_nome);
  if (irmaosErr) throw irmaosErr;

  const idsParaAtualizar = new Set(ids);
  const agendamentoIds = new Set<string>();
  const contratoIds = new Set<string>();

  for (const row of [...grupo, ...(irmaos ?? [])]) {
    const cpfAtual = normalizeCpfDigits(row.colaborador_cpf as string | null);
    if (cpfAtual && cpfAtual !== digits) continue;
    if (cpfAtual === digits) {
      idsParaAtualizar.add(String(row.id));
      continue;
    }
    if (normalizeIdentidadeColaborador(row.cliente_nome) !== empresaNorm) {
      continue;
    }
    if (normalizeIdentidadeColaborador(row.colaborador) !== nomeNorm) {
      continue;
    }
    const rowCargoId = String(row.cargo_id ?? "").trim();
    const mesmoCargo = cargoId
      ? rowCargoId === cargoId
      : normalizeIdentidadeColaborador(row.cargo_nome) === cargoNomeNorm;
    if (!mesmoCargo) continue;
    idsParaAtualizar.add(String(row.id));
    if (row.agendamento_id) agendamentoIds.add(String(row.agendamento_id));
    if (row.contrato_id) contratoIds.add(String(row.contrato_id));
  }

  for (const row of grupo) {
    if (row.agendamento_id) agendamentoIds.add(row.agendamento_id);
    if (row.contrato_id) contratoIds.add(row.contrato_id);
  }

  const { error: updPerErr } = await supabase
    .from("periodicos_futuros")
    .update({ colaborador_cpf: digits })
    .in("id", Array.from(idsParaAtualizar));
  if (updPerErr) throw updPerErr;

  if (agendamentoIds.size > 0) {
    const { data: ags, error: agLoadErr } = await supabase
      .from("agendamentos")
      .select("id, colaborador_cpf")
      .in("id", Array.from(agendamentoIds));
    if (agLoadErr) throw agLoadErr;
    const agsSemCpf = (ags ?? []).filter(
      (row) => !isValidCPF(row.colaborador_cpf as string | null)
    );
    if (agsSemCpf.length > 0) {
      const { error: updAgErr } = await supabase
        .from("agendamentos")
        .update({ colaborador_cpf: masked })
        .in(
          "id",
          agsSemCpf.map((row) => String(row.id))
        );
      if (updAgErr) throw updAgErr;
    }
  }

  const contratoAlvo =
    params.contratoId?.trim() ||
    (contratoIds.size === 1 ? Array.from(contratoIds)[0] : "");
  if (contratoAlvo) {
    const { data: vagas, error: vagasErr } = await supabase
      .from("contrato_vagas")
      .select("id, colaborador, colaborador_cpf")
      .eq("contrato_id", contratoAlvo);
    if (!vagasErr) {
      const candidatas = (vagas ?? []).filter((vaga) => {
        if (isValidCPF(vaga.colaborador_cpf as string | null)) return false;
        return nomesColaboradorEquivalentes(
          vaga.colaborador as string | null,
          params.colaborador
        );
      });
      const cpfJaNaLista = (vagas ?? []).some(
        (vaga) => normalizeCpfDigits(vaga.colaborador_cpf as string | null) === digits
      );
      if (candidatas.length === 1 && !cpfJaNaLista) {
        await supabase
          .from("contrato_vagas")
          .update({ colaborador_cpf: digits })
          .eq("id", candidatas[0].id)
          .is("colaborador_cpf", null);
      }
    }
  }

  const nome = params.auditOptions?.auditContext?.usuarioNome ?? "Sistema";
  await registrarAuditoria({
    usuarioId: params.auditOptions?.auditContext?.usuarioId ?? null,
    usuarioNome: nome,
    usuarioEmail: params.auditOptions?.auditContext?.usuarioEmail ?? "",
    modulo: AUDITORIA_MODULOS.periodicos_futuros,
    acao: AUDITORIA_ACOES.periodico_cpf_regularizado,
    registroId: ids[0],
    registroNome: params.colaborador,
    descricao: `${nome} regularizou o CPF de ${params.colaborador} (${params.clienteNome}) em ${idsParaAtualizar.size} periódico(s) futuro(s).`,
    dadosDepois: { colaborador_cpf: masked, ids: Array.from(idsParaAtualizar) },
  });

  return { atualizados: idsParaAtualizar.size };
}
