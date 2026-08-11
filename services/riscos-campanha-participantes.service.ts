import {
  type AuditoriaUsuarioContext,
} from "@/lib/auditoria";
import {
  isRiscosParticipanteStatus,
  validateRiscosParticipanteInput,
  type RiscosCampanhaParticipanteRecord,
  type RiscosParticipanteInput,
  type RiscosParticipanteOrigem,
  type RiscosParticipanteStatus,
} from "@/lib/riscos-campanha-participantes";
import { createClient } from "@/lib/supabase/client";
import { buscarCampanhaPorOrcamento } from "@/services/riscos-campanha.service";

const PARTICIPANTE_SELECT =
  "id, campanha_id, orcamento_id, cliente_id, nome_completo, cpf, data_nascimento, cargo, setor, email, status, codigo_acesso, origem, criado_por, created_at, updated_at, removido_em";

type AuditOptions = { auditContext?: AuditoriaUsuarioContext };

function mapParticipante(
  row: Record<string, unknown>
): RiscosCampanhaParticipanteRecord {
  const statusRaw = String(row.status ?? "pendente");
  const status: RiscosParticipanteStatus = isRiscosParticipanteStatus(statusRaw)
    ? statusRaw
    : "pendente";
  const origemRaw = String(row.origem ?? "manual");
  const origem: RiscosParticipanteOrigem =
    origemRaw === "importacao" ? "importacao" : "manual";

  return {
    id: String(row.id),
    campanha_id: String(row.campanha_id),
    orcamento_id: row.orcamento_id ? String(row.orcamento_id) : null,
    cliente_id: row.cliente_id ? String(row.cliente_id) : null,
    nome_completo: String(row.nome_completo ?? ""),
    cpf: String(row.cpf ?? ""),
    data_nascimento: row.data_nascimento
      ? String(row.data_nascimento).slice(0, 10)
      : null,
    cargo: row.cargo ? String(row.cargo) : null,
    setor: row.setor ? String(row.setor) : null,
    email: row.email ? String(row.email) : null,
    status,
    codigo_acesso: String(row.codigo_acesso ?? ""),
    origem,
    criado_por: row.criado_por ? String(row.criado_por) : null,
    created_at: String(row.created_at ?? ""),
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
    removido_em: row.removido_em ? String(row.removido_em) : null,
  };
}

export async function listarParticipantesCampanha(
  campanhaId: string
): Promise<RiscosCampanhaParticipanteRecord[]> {
  const supabase = createClient();
  const selectComRemovido = PARTICIPANTE_SELECT;
  const selectSemRemovido =
    "id, campanha_id, orcamento_id, cliente_id, nome_completo, cpf, data_nascimento, cargo, setor, email, status, codigo_acesso, origem, criado_por, created_at, updated_at";

  let { data, error } = await supabase
    .from("riscos_campanha_participantes")
    .select(selectComRemovido)
    .eq("campanha_id", campanhaId)
    .is("removido_em", null)
    .order("created_at", { ascending: true });

  if (error && /removido_em/i.test(error.message ?? "")) {
    const fallback = await supabase
      .from("riscos_campanha_participantes")
      .select(selectSemRemovido)
      .eq("campanha_id", campanhaId)
      .neq("status", "removido")
      .neq("status", "invalidado")
      .order("created_at", { ascending: true });
    data = fallback.data as typeof data;
    error = fallback.error;
  }

  if (error) {
    if (error.code === "42P01" || error.message?.includes("does not exist")) {
      return [];
    }
    throw error;
  }

  return (data ?? []).map((row) =>
    mapParticipante(row as Record<string, unknown>)
  );
}

export async function criarParticipanteCampanha(
  params: {
    campanhaId: string;
    input: RiscosParticipanteInput;
  },
  auditOptions?: AuditOptions
): Promise<RiscosCampanhaParticipanteRecord> {
  const validationError = validateRiscosParticipanteInput(params.input);
  if (validationError) throw new Error(validationError);

  const res = await fetch(
    `/api/riscos/campanha/${encodeURIComponent(params.campanhaId)}/participantes`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...params.input,
        usuarioNome: auditOptions?.auditContext?.usuarioNome,
        usuarioEmail: auditOptions?.auditContext?.usuarioEmail,
      }),
    }
  );

  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    participante?: RiscosCampanhaParticipanteRecord;
  };

  if (!res.ok || !json.ok || !json.participante) {
    throw new Error(json.error || "Não foi possível cadastrar o participante.");
  }

  return json.participante;
}

export async function atualizarParticipanteCampanha(
  params: {
    participanteId: string;
    input: RiscosParticipanteInput;
  },
  _auditOptions?: AuditOptions
): Promise<RiscosCampanhaParticipanteRecord> {
  const validationError = validateRiscosParticipanteInput(params.input);
  if (validationError) throw new Error(validationError);

  const res = await fetch(
    `/api/riscos/participante/${encodeURIComponent(params.participanteId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params.input),
    }
  );

  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    participante?: RiscosCampanhaParticipanteRecord;
  };

  if (!res.ok || !json.ok || !json.participante) {
    throw new Error(json.error || "Não foi possível atualizar o participante.");
  }

  return json.participante;
}

export type ImportacaoParticipantesClientResult = {
  importados: number;
  ignorados: number;
  erros: Array<{ linha?: number; cpf: string; motivo: string }>;
};

export async function importarParticipantesCampanhaExcel(
  params: {
    campanhaId: string;
    file: File;
  },
  auditOptions?: AuditOptions
): Promise<ImportacaoParticipantesClientResult> {
  const { parseParticipantesExcel } = await import(
    "@/lib/riscos-participantes-excel"
  );
  const buffer = await params.file.arrayBuffer();
  const linhas = parseParticipantesExcel(buffer);
  if (linhas.length === 0) {
    throw new Error("Nenhuma linha válida encontrada na planilha.");
  }

  const res = await fetch(
    `/api/riscos/campanha/${encodeURIComponent(params.campanhaId)}/participantes`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        importacao: linhas,
        usuarioNome: auditOptions?.auditContext?.usuarioNome,
        usuarioEmail: auditOptions?.auditContext?.usuarioEmail,
      }),
    }
  );

  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    importados?: number;
    ignorados?: number;
    erros?: Array<{ linha?: number; cpf: string; motivo: string }>;
  };

  if (!res.ok || !json.ok) {
    throw new Error(json.error || "Não foi possível importar a planilha.");
  }

  return {
    importados: json.importados ?? 0,
    ignorados: json.ignorados ?? 0,
    erros: json.erros ?? [],
  };
}

export async function removerParticipanteCampanha(
  _participanteId: string,
  _auditOptions?: AuditOptions
): Promise<void> {
  throw new Error(
    "Use a API /api/riscos/participante/[id]/remover (remoção lógica)."
  );
}

/** Reexport útil para o fluxo por orçamento. */
export { buscarCampanhaPorOrcamento };
