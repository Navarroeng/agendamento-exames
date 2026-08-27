import {
  AUDITORIA_ACOES,
  AUDITORIA_MODULOS,
  type AuditoriaUsuarioContext,
} from "@/lib/auditoria";
import {
  criarHashCodigoAcessoCampanha,
  gerarCodigoAcessoCompartilhado,
} from "@/lib/avaliacao-acesso";
import {
  CampanhaCicloExistenteError,
  MSG_CAMPANHA_CICLO_EXISTENTE,
  campanhaDoCicloJaExiste,
  validateProrrogarPrazoCampanha,
  validateReabrirCampanha,
} from "@/lib/riscos-campanha-ciclo";
import {
  gerarCodigoPublicoCampanha,
  isRiscosCampanhaSelectSchemaError,
  mapRiscosCampanhaRow,
  RISCOS_CAMPANHA_SELECT,
  RISCOS_CAMPANHA_SELECT_LEGACY,
  RISCOS_CAMPANHA_SELECT_SEM_LOGO,
  validateRiscosCampanhaCreateInput,
  type RiscosCampanhaCreateInput,
  type RiscosCampanhaRecord,
} from "@/lib/riscos-campanha";
import {
  escolherCampanhaParaProgresso,
  RISCOS_CAMPANHA_ORIGEM,
} from "@/lib/riscos-campanha-origem";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarAuditoria } from "@/services/auditoria.service";
import { assertProcessoRiscosNaoCanceladoNoServidor } from "@/services/riscos-campanha-cancelar.server";

type CampanhaAuditOptions = {
  auditContext?: AuditoriaUsuarioContext;
};

async function selectCampanhas(
  build: (select: string) => Promise<{
    data: Array<Record<string, unknown>> | null;
    error: { message?: string; code?: string } | null;
  }>
): Promise<RiscosCampanhaRecord[]> {
  const primary = await build(RISCOS_CAMPANHA_SELECT);
  if (isRiscosCampanhaSelectSchemaError(primary.error)) {
    const semLogo = await build(RISCOS_CAMPANHA_SELECT_SEM_LOGO);
    if (isRiscosCampanhaSelectSchemaError(semLogo.error)) {
      const legacy = await build(RISCOS_CAMPANHA_SELECT_LEGACY);
      if (legacy.error) throw legacy.error;
      return (legacy.data ?? []).map(mapRiscosCampanhaRow);
    }
    if (semLogo.error) throw semLogo.error;
    return (semLogo.data ?? []).map(mapRiscosCampanhaRow);
  }
  if (primary.error) throw primary.error;
  return (primary.data ?? []).map(mapRiscosCampanhaRow);
}

export async function listarCampanhasDoOrcamentoNoServidor(
  orcamentoId: string
): Promise<RiscosCampanhaRecord[]> {
  const id = orcamentoId.trim();
  if (!id) return [];
  const admin = createAdminClient();
  return selectCampanhas(async (select) => {
    const res = await admin
      .from("riscos_campanhas")
      .select(select)
      .eq("orcamento_id", id)
      .order("created_at", { ascending: true });
    return {
      data: (res.data as Array<Record<string, unknown>> | null) ?? null,
      error: res.error,
    };
  });
}

export async function campanhaDoCicloPorOrcamento(
  orcamentoId: string
): Promise<RiscosCampanhaRecord | null> {
  const todas = await listarCampanhasDoOrcamentoNoServidor(orcamentoId);
  if (!campanhaDoCicloJaExiste(todas)) return null;
  return (
    escolherCampanhaParaProgresso(todas) ??
    [...todas].sort((a, b) =>
      String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""))
    )[0] ??
    null
  );
}

async function gerarCodigoPublicoUnico(): Promise<string> {
  const admin = createAdminClient();
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const codigo = gerarCodigoPublicoCampanha(6);
    const { data, error } = await admin
      .from("riscos_campanhas")
      .select("id")
      .eq("codigo_publico", codigo)
      .maybeSingle();
    if (error) throw error;
    if (!data) return codigo;
  }
  throw new Error("Não foi possível gerar um código único para a campanha.");
}

export async function criarCampanhaRiscosNoServidor(
  input: RiscosCampanhaCreateInput,
  auditOptions?: CampanhaAuditOptions
): Promise<RiscosCampanhaRecord> {
  const validationError = validateRiscosCampanhaCreateInput(input);
  if (validationError) throw new Error(validationError);

  await assertProcessoRiscosNaoCanceladoNoServidor({
    orcamentoId: input.orcamentoId,
    campanhaId: null,
  });

  const existente = await campanhaDoCicloPorOrcamento(input.orcamentoId);
  if (existente) {
    throw new CampanhaCicloExistenteError(existente);
  }

  const admin = createAdminClient();
  const codigo = await gerarCodigoPublicoUnico();
  const codigoAcesso = gerarCodigoAcessoCompartilhado(8);
  const acesso = criarHashCodigoAcessoCampanha(codigoAcesso);
  const cnpjDigits = input.cnpj.replace(/\D/g, "");
  const usuarioNome = auditOptions?.auditContext?.usuarioNome?.trim() || null;

  const payload = {
    orcamento_id: input.orcamentoId,
    cliente_id: input.clienteId,
    cnpj: cnpjDigits,
    empresa_nome: input.empresaNome.trim(),
    data_inicio: input.dataInicioIso.slice(0, 10),
    data_encerramento: input.dataEncerramentoIso.slice(0, 10),
    quantidade_prevista: 1,
    status: "em_preparacao" as const,
    codigo_publico: codigo,
    codigo_acesso_salt: acesso.salt,
    codigo_acesso_hash: acesso.hash,
    codigo_acesso_exibicao: acesso.exibicao,
    origem: RISCOS_CAMPANHA_ORIGEM.orcamento,
    criado_por: usuarioNome,
  };

  const { data, error } = await admin
    .from("riscos_campanhas")
    .insert(payload)
    .select(RISCOS_CAMPANHA_SELECT)
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      const deNovo = await campanhaDoCicloPorOrcamento(input.orcamentoId);
      if (deNovo) throw new CampanhaCicloExistenteError(deNovo);
      throw new Error(MSG_CAMPANHA_CICLO_EXISTENTE);
    }
    throw error;
  }
  if (!data) throw new Error("Não foi possível criar a campanha.");

  const record = mapRiscosCampanhaRow(data as Record<string, unknown>);
  const nome = usuarioNome ?? "Sistema";
  await registrarAuditoria({
    usuarioId: auditOptions?.auditContext?.usuarioId ?? null,
    usuarioNome: nome,
    usuarioEmail: auditOptions?.auditContext?.usuarioEmail ?? "",
    modulo: AUDITORIA_MODULOS.riscos_psicossociais,
    acao: AUDITORIA_ACOES.riscos_campanha_criada,
    registroId: record.id,
    registroNome: record.empresa_nome,
    descricao: `${nome} criou a campanha ${record.codigo_publico} para ${record.empresa_nome}.`,
    dadosDepois: {
      codigo_publico: record.codigo_publico,
      data_inicio: record.data_inicio,
      data_encerramento: record.data_encerramento,
      status: record.status,
      orcamento_id: record.orcamento_id,
      origem: record.origem,
    },
  });

  return record;
}

async function selecionarCampanhaPorId(
  campanhaId: string
): Promise<RiscosCampanhaRecord | null> {
  const admin = createAdminClient();
  const rows = await selectCampanhas(async (select) => {
    const res = await admin
      .from("riscos_campanhas")
      .select(select)
      .eq("id", campanhaId)
      .maybeSingle();
    const row = res.data as Record<string, unknown> | null;
    return {
      data: row ? [row] : [],
      error: res.error,
    };
  });
  return rows[0] ?? null;
}

export async function prorrogarPrazoCampanhaNoServidor(
  campanhaId: string,
  novaDataEncerramentoIso: string,
  auditOptions?: CampanhaAuditOptions
): Promise<RiscosCampanhaRecord> {
  const id = campanhaId.trim();
  if (!id) throw new Error("Campanha inválida.");

  const before = await selecionarCampanhaPorId(id);
  if (!before) throw new Error("Campanha não encontrada.");

  await assertProcessoRiscosNaoCanceladoNoServidor({
    orcamentoId: before.orcamento_id,
    campanhaId: before.id,
  });

  const validacao = validateProrrogarPrazoCampanha({
    campanha: before,
    novaDataEncerramentoIso,
  });
  if (validacao) throw new Error(validacao);

  const nova = novaDataEncerramentoIso.slice(0, 10);
  const admin = createAdminClient();
  const { error } = await admin
    .from("riscos_campanhas")
    .update({ data_encerramento: nova })
    .eq("id", id)
    .eq("codigo_publico", before.codigo_publico);

  if (error) throw error;

  const confirmed = await selecionarCampanhaPorId(id);
  if (!confirmed) throw new Error("Campanha não encontrada após a prorrogação.");
  if (confirmed.codigo_publico !== before.codigo_publico) {
    throw new Error("O código da campanha não pode ser alterado na prorrogação.");
  }
  if (confirmed.id !== before.id) {
    throw new Error("A prorrogação não pode criar outra campanha.");
  }
  if (dataCivil(confirmed.data_encerramento) !== nova) {
    throw new Error("A nova data de encerramento não foi confirmada no banco.");
  }

  const nome = auditOptions?.auditContext?.usuarioNome?.trim() || "Sistema";
  await registrarAuditoria({
    usuarioId: auditOptions?.auditContext?.usuarioId ?? null,
    usuarioNome: nome,
    usuarioEmail: auditOptions?.auditContext?.usuarioEmail ?? "",
    modulo: AUDITORIA_MODULOS.riscos_psicossociais,
    acao: AUDITORIA_ACOES.riscos_campanha_prazo_prorrogado,
    registroId: confirmed.id,
    registroNome: confirmed.empresa_nome,
    descricao: `${nome} prorrogou o prazo da campanha ${confirmed.codigo_publico} de ${before.data_encerramento} para ${confirmed.data_encerramento}.`,
    dadosAntes: {
      data_encerramento: before.data_encerramento,
      codigo_publico: before.codigo_publico,
      status: before.status,
    },
    dadosDepois: {
      data_encerramento: confirmed.data_encerramento,
      codigo_publico: confirmed.codigo_publico,
      status: confirmed.status,
      campanha_id: confirmed.id,
    },
  });

  return confirmed;
}

export async function reabrirCampanhaRiscosNoServidor(
  campanhaId: string,
  novaDataEncerramentoIso: string,
  auditOptions?: CampanhaAuditOptions
): Promise<RiscosCampanhaRecord> {
  const id = campanhaId.trim();
  if (!id) throw new Error("Campanha inválida.");

  const before = await selecionarCampanhaPorId(id);
  if (!before) throw new Error("Campanha não encontrada.");

  await assertProcessoRiscosNaoCanceladoNoServidor({
    orcamentoId: before.orcamento_id,
    campanhaId: before.id,
  });

  const validacao = validateReabrirCampanha({
    campanha: before,
    novaDataEncerramentoIso,
  });
  if (validacao) throw new Error(validacao);

  const nova = novaDataEncerramentoIso.slice(0, 10);
  const admin = createAdminClient();
  const { error } = await admin
    .from("riscos_campanhas")
    .update({
      status: "aberta",
      data_encerramento: nova,
    })
    .eq("id", id)
    .eq("codigo_publico", before.codigo_publico);

  if (error) throw error;

  const confirmed = await selecionarCampanhaPorId(id);
  if (!confirmed || confirmed.status !== "aberta") {
    throw new Error("A reabertura não foi confirmada no banco.");
  }
  if (confirmed.codigo_publico !== before.codigo_publico) {
    throw new Error("O código da campanha não pode ser alterado na reabertura.");
  }

  const nome = auditOptions?.auditContext?.usuarioNome?.trim() || "Sistema";
  await registrarAuditoria({
    usuarioId: auditOptions?.auditContext?.usuarioId ?? null,
    usuarioNome: nome,
    usuarioEmail: auditOptions?.auditContext?.usuarioEmail ?? "",
    modulo: AUDITORIA_MODULOS.riscos_psicossociais,
    acao: AUDITORIA_ACOES.riscos_campanha_reaberta,
    registroId: confirmed.id,
    registroNome: confirmed.empresa_nome,
    descricao: `${nome} reabriu a campanha ${confirmed.codigo_publico} (prazo até ${confirmed.data_encerramento}).`,
    dadosAntes: {
      status: before.status,
      data_encerramento: before.data_encerramento,
      codigo_publico: before.codigo_publico,
    },
    dadosDepois: {
      status: confirmed.status,
      data_encerramento: confirmed.data_encerramento,
      codigo_publico: confirmed.codigo_publico,
      campanha_id: confirmed.id,
    },
  });

  return confirmed;
}

function dataCivil(value: string | null | undefined): string {
  return String(value ?? "").slice(0, 10);
}
