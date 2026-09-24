import { createClient } from "@/lib/supabase/client";
import {
  validateAetElaboracaoPayload,
  validateAetEnvioPayload,
  validateAetVisitaPayload,
  type ImplantacaoAetElaboracaoPayload,
  type ImplantacaoAetEnvioPayload,
  type ImplantacaoAetRecord,
  type ImplantacaoAetVisitaPayload,
} from "@/lib/implantacao-aet";
import {
  assertPodeEditarElaboracaoEnvioLaudoPontual,
  type LaudoPontualEdicaoOrigem,
  type LaudoPontualKind,
} from "@/lib/servico-laudo-pontual";

function mapAet(row: ImplantacaoAetRecord): ImplantacaoAetRecord {
  return row;
}

export async function buscarAetPorAprovacaoId(
  aprovacaoId: string
): Promise<ImplantacaoAetRecord | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("implantacao_aet")
    .select("*")
    .eq("aprovacao_id", aprovacaoId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapAet(data as ImplantacaoAetRecord) : null;
}

export async function buscarAetPorOrcamentoIds(
  orcamentoIds: string[]
): Promise<Map<string, ImplantacaoAetRecord>> {
  const map = new Map<string, ImplantacaoAetRecord>();
  if (orcamentoIds.length === 0) return map;
  const supabase = createClient();
  const { data, error } = await supabase
    .from("implantacao_aet")
    .select("*")
    .in("orcamento_id", orcamentoIds);
  if (error) throw error;
  for (const row of (data ?? []) as ImplantacaoAetRecord[]) {
    map.set(row.orcamento_id, mapAet(row));
  }
  return map;
}

export async function garantirImplantacaoAet(params: {
  orcamentoId: string;
  aprovacaoId: string;
  usuarioNome: string;
}): Promise<ImplantacaoAetRecord> {
  const existing = await buscarAetPorAprovacaoId(params.aprovacaoId);
  if (existing) return existing;

  const agora = new Date().toISOString();
  const usuario = params.usuarioNome.trim() || "Sistema";
  const supabase = createClient();
  const { data, error } = await supabase
    .from("implantacao_aet")
    .insert({
      orcamento_id: params.orcamentoId,
      aprovacao_id: params.aprovacaoId,
      criado_em: agora,
      criado_por: usuario,
      atualizado_em: agora,
      atualizado_por: usuario,
    })
    .select("*")
    .single();
  if (error) {
    const retry = await buscarAetPorAprovacaoId(params.aprovacaoId);
    if (retry) return retry;
    throw error;
  }
  return mapAet(data as ImplantacaoAetRecord);
}

async function updateAetRow(
  aetId: string,
  patch: Record<string, unknown>
): Promise<ImplantacaoAetRecord> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("implantacao_aet")
    .update(patch)
    .eq("id", aetId)
    .select("*")
    .single();
  if (error) throw error;
  return mapAet(data as ImplantacaoAetRecord);
}

export async function salvarVisitaAet(params: {
  aetId: string;
  payload: ImplantacaoAetVisitaPayload;
  usuarioNome: string;
}): Promise<ImplantacaoAetRecord> {
  const validationError = validateAetVisitaPayload(params.payload);
  if (validationError) throw new Error(validationError);

  const agora = new Date().toISOString();
  const usuario = params.usuarioNome.trim() || "Sistema";
  return updateAetRow(params.aetId, {
    visita_status: params.payload.visita_status,
    visita_data: params.payload.visita_data,
    visita_horario: params.payload.visita_horario,
    visita_responsavel: params.payload.visita_responsavel,
    visita_observacao: params.payload.visita_observacao,
    visita_realizada_em:
      params.payload.visita_status === "realizada" ? agora : null,
    atualizado_em: agora,
    atualizado_por: usuario,
  });
}

export async function salvarElaboracaoAet(params: {
  aet: ImplantacaoAetRecord;
  payload: ImplantacaoAetElaboracaoPayload;
  usuarioNome: string;
  kind?: LaudoPontualKind;
  origem: LaudoPontualEdicaoOrigem;
}): Promise<ImplantacaoAetRecord> {
  assertPodeEditarElaboracaoEnvioLaudoPontual(params.origem);
  const validationError = validateAetElaboracaoPayload(
    params.payload,
    params.aet,
    params.kind ?? "aet"
  );
  if (validationError) throw new Error(validationError);

  const agora = new Date().toISOString();
  const usuario = params.usuarioNome.trim() || "Sistema";
  return updateAetRow(params.aet.id, {
    elaboracao_status: params.payload.elaboracao_status,
    elaboracao_observacao: params.payload.elaboracao_observacao,
    elaboracao_concluida_em:
      params.payload.elaboracao_status === "concluido" ? agora : null,
    atualizado_em: agora,
    atualizado_por: usuario,
  });
}

export async function salvarLaudoAet(params: {
  aetId: string;
  fileMeta: {
    path: string;
    nome: string;
    tipo: string;
    tamanho: number;
  };
  usuarioNome: string;
  origem: LaudoPontualEdicaoOrigem;
}): Promise<ImplantacaoAetRecord> {
  assertPodeEditarElaboracaoEnvioLaudoPontual(params.origem);
  const agora = new Date().toISOString();
  const usuario = params.usuarioNome.trim() || "Sistema";
  return updateAetRow(params.aetId, {
    laudo_path: params.fileMeta.path,
    laudo_nome: params.fileMeta.nome,
    laudo_tipo: params.fileMeta.tipo,
    laudo_tamanho: params.fileMeta.tamanho,
    atualizado_em: agora,
    atualizado_por: usuario,
  });
}

export async function removerLaudoAet(params: {
  aetId: string;
  usuarioNome: string;
  origem: LaudoPontualEdicaoOrigem;
}): Promise<ImplantacaoAetRecord> {
  assertPodeEditarElaboracaoEnvioLaudoPontual(params.origem);
  const agora = new Date().toISOString();
  const usuario = params.usuarioNome.trim() || "Sistema";
  return updateAetRow(params.aetId, {
    laudo_path: null,
    laudo_nome: null,
    laudo_tipo: null,
    laudo_tamanho: null,
    elaboracao_status: "em_elaboracao",
    elaboracao_concluida_em: null,
    atualizado_em: agora,
    atualizado_por: usuario,
  });
}

export async function salvarEnvioAet(params: {
  aet: ImplantacaoAetRecord;
  payload: ImplantacaoAetEnvioPayload;
  usuarioNome: string;
  kind?: LaudoPontualKind;
  origem: LaudoPontualEdicaoOrigem;
}): Promise<ImplantacaoAetRecord> {
  assertPodeEditarElaboracaoEnvioLaudoPontual(params.origem);
  const validationError = validateAetEnvioPayload(
    params.payload,
    params.aet,
    params.kind ?? "aet"
  );
  if (validationError) throw new Error(validationError);

  const agora = new Date().toISOString();
  const usuario = params.usuarioNome.trim() || "Sistema";
  return updateAetRow(params.aet.id, {
    enviado_cliente: params.payload.enviado_cliente,
    enviado_em: params.payload.enviado_em,
    envio_observacao: params.payload.envio_observacao,
    atualizado_em: agora,
    atualizado_por: usuario,
  });
}
