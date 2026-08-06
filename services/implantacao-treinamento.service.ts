import { createClient } from "@/lib/supabase/client";
import {
  validateTreinamentoPayload,
  type ImplantacaoTreinamentoEventoRecord,
  type ImplantacaoTreinamentoEventoTipo,
  type ImplantacaoTreinamentoRecord,
  type ImplantacaoTreinamentoSavePayload,
  type ImplantacaoTreinamentoStatus,
} from "@/lib/implantacao-treinamento";

function mapTreinamento(row: ImplantacaoTreinamentoRecord): ImplantacaoTreinamentoRecord {
  return row;
}

function resolveEventoTipo(
  prev: ImplantacaoTreinamentoRecord | null,
  next: ImplantacaoTreinamentoSavePayload
): ImplantacaoTreinamentoEventoTipo {
  if (!prev) return "criacao";
  if (next.status === "cancelado" && prev.status !== "cancelado") {
    return "cancelamento";
  }
  if (next.status === "confirmado" && prev.status !== "confirmado") {
    return "confirmacao";
  }
  if (next.status === "realizado" && prev.status !== "realizado") {
    return "realizacao";
  }
  const dataMudou =
    (prev.data_treinamento ?? "") !== (next.data_treinamento ?? "") ||
    (prev.horario_inicio ?? "") !== (next.horario_inicio ?? "") ||
    (prev.horario_termino ?? "") !== (next.horario_termino ?? "");
  if (next.status === "reagendado" || (dataMudou && Boolean(prev.data_treinamento))) {
    return "reagendamento";
  }
  return "edicao";
}

async function insertEvento(params: {
  treinamentoId: string;
  tipo: ImplantacaoTreinamentoEventoTipo;
  statusAnterior: string | null;
  statusNovo: string | null;
  dataAnterior: string | null;
  dataNova: string | null;
  horarioInicioAnterior: string | null;
  horarioInicioNovo: string | null;
  motivo: string | null;
  usuarioNome: string;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("implantacao_treinamentos_eventos").insert({
    treinamento_id: params.treinamentoId,
    tipo_evento: params.tipo,
    status_anterior: params.statusAnterior,
    status_novo: params.statusNovo,
    data_anterior: params.dataAnterior,
    data_nova: params.dataNova,
    horario_inicio_anterior: params.horarioInicioAnterior,
    horario_inicio_novo: params.horarioInicioNovo,
    motivo: params.motivo,
    usuario_nome: params.usuarioNome.trim() || "Sistema",
  });
  if (error) throw error;
}

export async function buscarTreinamentoPorAprovacaoId(
  aprovacaoId: string
): Promise<ImplantacaoTreinamentoRecord | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("implantacao_treinamentos")
    .select("*")
    .eq("aprovacao_id", aprovacaoId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapTreinamento(data as ImplantacaoTreinamentoRecord) : null;
}

export async function buscarTreinamentosPorOrcamentoIds(
  orcamentoIds: string[]
): Promise<Map<string, ImplantacaoTreinamentoRecord>> {
  const map = new Map<string, ImplantacaoTreinamentoRecord>();
  if (orcamentoIds.length === 0) return map;
  const supabase = createClient();
  const { data, error } = await supabase
    .from("implantacao_treinamentos")
    .select("*")
    .in("orcamento_id", orcamentoIds);
  if (error) throw error;
  for (const row of (data ?? []) as ImplantacaoTreinamentoRecord[]) {
    map.set(row.orcamento_id, mapTreinamento(row));
  }
  return map;
}

export async function listarEventosTreinamento(
  treinamentoId: string
): Promise<ImplantacaoTreinamentoEventoRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("implantacao_treinamentos_eventos")
    .select("*")
    .eq("treinamento_id", treinamentoId)
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ImplantacaoTreinamentoEventoRecord[];
}

export async function salvarImplantacaoTreinamento(params: {
  orcamentoId: string;
  aprovacaoId: string;
  payload: ImplantacaoTreinamentoSavePayload;
  usuarioNome: string;
}): Promise<ImplantacaoTreinamentoRecord> {
  const validationError = validateTreinamentoPayload(params.payload);
  if (validationError) throw new Error(validationError);

  const existing = await buscarTreinamentoPorAprovacaoId(params.aprovacaoId);
  const agora = new Date().toISOString();
  const usuario = params.usuarioNome.trim() || "Sistema";
  const payload = params.payload;

  const dataMudou =
    existing &&
    ((existing.data_treinamento ?? "") !== (payload.data_treinamento ?? "") ||
      (existing.horario_inicio ?? "") !== (payload.horario_inicio ?? "") ||
      (existing.horario_termino ?? "") !== (payload.horario_termino ?? ""));

  const preserveAnterior =
    Boolean(existing) &&
    (payload.status === "reagendado" ||
      payload.status === "cancelado" ||
      dataMudou);

  const row = {
    orcamento_id: params.orcamentoId,
    aprovacao_id: params.aprovacaoId,
    data_treinamento: payload.data_treinamento,
    horario_inicio: payload.horario_inicio?.trim() || null,
    horario_termino: payload.horario_termino?.trim() || null,
    modalidade: payload.modalidade,
    local_treinamento: payload.local_treinamento?.trim() || null,
    endereco: payload.endereco?.trim() || null,
    link_reuniao: payload.link_reuniao?.trim() || null,
    tipo_nome: payload.tipo_nome?.trim() || null,
    quantidade_participantes: payload.quantidade_participantes,
    instrutor_responsavel: payload.instrutor_responsavel?.trim() || null,
    contato_empresa: payload.contato_empresa?.trim() || null,
    observacoes: payload.observacoes?.trim() || null,
    status: payload.status as ImplantacaoTreinamentoStatus,
    motivo_cancelamento:
      payload.status === "cancelado"
        ? payload.motivo_cancelamento?.trim() || null
        : existing?.motivo_cancelamento ?? null,
    motivo_reagendamento:
      payload.status === "reagendado" || (dataMudou && existing?.data_treinamento)
        ? payload.motivo_reagendamento?.trim() ||
          existing?.motivo_reagendamento ||
          null
        : existing?.motivo_reagendamento ?? null,
    data_anterior: preserveAnterior
      ? existing?.data_treinamento ?? null
      : existing?.data_anterior ?? null,
    horario_inicio_anterior: preserveAnterior
      ? existing?.horario_inicio ?? null
      : existing?.horario_inicio_anterior ?? null,
    horario_termino_anterior: preserveAnterior
      ? existing?.horario_termino ?? null
      : existing?.horario_termino_anterior ?? null,
    atualizado_em: agora,
    atualizado_por: usuario,
  };

  const supabase = createClient();
  let saved: ImplantacaoTreinamentoRecord;

  if (existing) {
    const { data, error } = await supabase
      .from("implantacao_treinamentos")
      .update(row)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw error;
    saved = mapTreinamento(data as ImplantacaoTreinamentoRecord);
  } else {
    const { data, error } = await supabase
      .from("implantacao_treinamentos")
      .insert({
        ...row,
        criado_em: agora,
        criado_por: usuario,
      })
      .select("*")
      .single();
    if (error) throw error;
    saved = mapTreinamento(data as ImplantacaoTreinamentoRecord);
  }

  const tipo = resolveEventoTipo(existing, payload);
  await insertEvento({
    treinamentoId: saved.id,
    tipo,
    statusAnterior: existing?.status ?? null,
    statusNovo: saved.status,
    dataAnterior: existing?.data_treinamento ?? null,
    dataNova: saved.data_treinamento,
    horarioInicioAnterior: existing?.horario_inicio ?? null,
    horarioInicioNovo: saved.horario_inicio,
    motivo:
      tipo === "cancelamento"
        ? saved.motivo_cancelamento
        : tipo === "reagendamento"
          ? saved.motivo_reagendamento
          : null,
    usuarioNome: usuario,
  });

  return saved;
}
