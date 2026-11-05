import { lerPorIdentificadores } from "@/lib/consulta-lotes";
import { createClient } from "@/lib/supabase/client";
import {
  buildLaudosSstProcesso,
  isLaudosSstConcluido,
  deveCorrigirEntradaInicialLaudosSst,
  isProcessoElegivelLaudosSst,
  isProcessoVisivelLaudosSst,
  LAUDOS_SST_ETAPAS,
  LAUDOS_SST_TOTAL_ETAPAS,
  payloadInicialLaudosSst,
  sortLaudosSstProcessos,
  type LaudosSstEtapaId,
  type LaudosSstProcesso,
  type OrcamentoLaudosSstRecord,
} from "@/lib/laudos-sst";
import type { ImplantacaoProcesso } from "@/lib/implantacao-clientes";
import { listarProcessosImplantacao } from "@/services/implantacao-clientes.service";
import {
  contarEtapasConsecutivasConcluidas,
  isLaudosEtapaConcluida,
  isPgrPcmsoLtcatDocumentosProntos,
  proximaEtapaLaudos,
  resolverEtapaAtualLaudos,
  type LaudosSstWorkflow,
} from "@/lib/laudos-sst-etapas";
import type {
  LaudosSstAnexoMeta,
  LaudosSstAnexoTipo,
} from "@/lib/laudos-sst-anexos";
import {
  AUDITORIA_ACOES,
  AUDITORIA_MODULOS,
  type AuditoriaAcao,
  type AuditoriaUsuarioContext,
} from "@/lib/auditoria";
import { registrarAuditoria } from "@/services/auditoria.service";
import {
  removerArquivoLaudosSstAnexo,
  uploadLaudosSstAnexo,
} from "@/services/laudos-sst-anexos-storage.service";

const LAUDOS_TRACKING_SELECT = [
  "orcamento_id",
  "etapa_atual",
  "etapas_concluidas",
  "status",
  "entrada_em",
  "concluido_em",
  "created_at",
  "updated_at",
  "epi_disponibiliza",
  "cadastro_realizado",
  "cadastro_data",
  "cronograma_elaborado",
  "cronograma_data",
  "cronograma_epi_respostas",
  "pgr_realizado",
  "pgr_data",
  "pgr_anexo_path",
  "pgr_anexo_nome",
  "pgr_anexo_tipo",
  "pgr_anexo_tamanho",
  "pcmso_realizado",
  "pcmso_data",
  "pcmso_anexo_path",
  "pcmso_anexo_nome",
  "pcmso_anexo_tipo",
  "pcmso_anexo_tamanho",
  "ltcat_realizado",
  "ltcat_data",
  "ltcat_anexo_path",
  "ltcat_anexo_nome",
  "ltcat_anexo_tipo",
  "ltcat_anexo_tamanho",
  "enviado_pedro",
  "enviado_pedro_em",
  "aprovacao_pedro",
  "aprovacao_pedro_em",
  "aprovacao_pedro_por",
  "aprovacao_pedro_por_nome",
  "enviado_cliente",
  "enviado_cliente_email",
  "enviado_cliente_data",
].join(", ");

/**
 * Lista processos de Laudos SST.
 * Pacote completo - SST e Gestão SST mensal entram após a visita técnica
 * salva (agendamentos podem continuar pendentes) ou, no legado e na
 * renovação sem novo registro de visita, com a implantação já pronta.
 * Cria um tracking por orçamento, em andamento na etapa EPIs. Reexecutar
 * não duplica e não copia o processo do contrato anterior. Em linha ainda
 * sem progresso, só corrige a data de entrada. Não conclui a implantação
 * nem marca laudos como elaborados ou enviados. Não apaga linhas antigas.
 * Laudo pontual exclusivo aparece após a visita realizada, reusando implantacao_aet.
 */
export async function listarProcessosLaudosSst(): Promise<LaudosSstProcesso[]> {
  const implantacao = await listarProcessosImplantacao();
  if (implantacao.length === 0) return [];

  const todosIds = implantacao.map((p) => p.orcamento.id);
  const trackingExistente = await buscarTrackingLaudosSst(todosIds);
  const elegiveis = implantacao.filter(isProcessoElegivelLaudosSst);
  const trackingMap = await garantirTrackingLaudosSst(
    elegiveis,
    trackingExistente
  );
  await regularizarEntradaInicialLaudosSst(elegiveis, trackingMap);
  await sincronizarConclusaoLaudosSst(trackingMap);

  const visiveis = implantacao.filter((p) =>
    isProcessoVisivelLaudosSst(p, trackingMap.get(p.orcamento.id) ?? null)
  );

  const processos = visiveis.map((p) =>
    buildLaudosSstProcesso(p, trackingMap.get(p.orcamento.id) ?? null)
  );

  return sortLaudosSstProcessos(processos);
}

export async function buscarTrackingLaudosSst(
  orcamentoIds: string[]
): Promise<Map<string, OrcamentoLaudosSstRecord>> {
  const map = new Map<string, OrcamentoLaudosSstRecord>();
  if (orcamentoIds.length === 0) return map;

  const supabase = createClient();
  const ler = (select: string) =>
    lerPorIdentificadores(orcamentoIds, async (grupo, from, to) => {
      const { data, error } = await supabase
        .from("orcamento_laudos_sst")
        .select(select)
        .in("orcamento_id", grupo)
        .order("orcamento_id", { ascending: true })
        .range(from, to);
      if (error) throw error;
      return (data ?? []) as unknown as OrcamentoLaudosSstRecord[];
    });

  let rows: OrcamentoLaudosSstRecord[];
  try {
    rows = await ler(LAUDOS_TRACKING_SELECT);
  } catch (error) {
    try {
      rows = await ler(
        "orcamento_id, etapa_atual, etapas_concluidas, status, entrada_em, concluido_em, created_at, updated_at"
      );
    } catch {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message ?? "")
          : "";
      console.warn("laudos-sst tracking indisponível:", message);
      return map;
    }
  }

  for (const row of rows) map.set(row.orcamento_id, row);
  return map;
}

/**
 * Cria tracking ao entrar em Laudos SST, só se o serviço for acompanhado.
 * Um registro por orçamento (`orcamento_id`), da vigência daquele contrato.
 * Reexecutar ignora a linha já existente: não duplica, não sobrescreve
 * progresso e não copia documentos do contrato anterior.
 * Não altera o status da implantação.
 */
async function garantirTrackingLaudosSst(
  elegiveis: ImplantacaoProcesso[],
  trackingExistente?: Map<string, OrcamentoLaudosSstRecord>
): Promise<Map<string, OrcamentoLaudosSstRecord>> {
  const ids = elegiveis
    .filter(isProcessoElegivelLaudosSst)
    .map((p) => p.orcamento.id);
  const map =
    trackingExistente ?? (await buscarTrackingLaudosSst(ids));
  const faltantes = elegiveis.filter(
    (p) => isProcessoElegivelLaudosSst(p) && !map.has(p.orcamento.id)
  );
  if (faltantes.length === 0) return map;

  const supabase = createClient();
  const agora = new Date().toISOString();

  for (const processo of faltantes) {
    const payload = payloadInicialLaudosSst(processo, agora);
    const { error: insertError } = await supabase
      .from("orcamento_laudos_sst")
      .upsert(payload, { onConflict: "orcamento_id", ignoreDuplicates: true });

    if (insertError) {
      console.warn("falha ao criar tracking Laudos SST:", insertError.message);
      map.set(processo.orcamento.id, payload);
    }
  }

  const confirmados = await buscarTrackingLaudosSst(
    faltantes.map((p) => p.orcamento.id)
  );
  for (const processo of faltantes) {
    const id = processo.orcamento.id;
    const row = confirmados.get(id);
    if (row) {
      map.set(id, row);
      continue;
    }
    if (!map.has(id)) {
      map.set(id, payloadInicialLaudosSst(processo, agora));
    }
  }

  return map;
}

/**
 * Linha ainda em EPIs, sem trabalho, pode ter entrado com a data de hoje.
 * Reexecutar só ajusta `entrada_em` para a visita ou a aprovação.
 * Não altera etapa, documentos nem processo que já teve progresso.
 */
async function regularizarEntradaInicialLaudosSst(
  elegiveis: ImplantacaoProcesso[],
  trackingMap: Map<string, OrcamentoLaudosSstRecord>
): Promise<void> {
  const ajustes = elegiveis.flatMap((processo) => {
    const row = trackingMap.get(processo.orcamento.id) ?? null;
    const entrada = deveCorrigirEntradaInicialLaudosSst(processo, row);
    if (!entrada || !row) return [];
    return [{ id: processo.orcamento.id, entrada, row }];
  });
  if (ajustes.length === 0) return;

  const supabase = createClient();
  for (const ajuste of ajustes) {
    const { error } = await supabase
      .from("orcamento_laudos_sst")
      .update({ entrada_em: ajuste.entrada })
      .eq("orcamento_id", ajuste.id)
      .eq("etapa_atual", "epis")
      .eq("etapas_concluidas", 0);

    if (error) {
      console.warn(
        "falha ao regularizar entrada Laudos SST:",
        error.message
      );
      continue;
    }

    trackingMap.set(ajuste.id, { ...ajuste.row, entrada_em: ajuste.entrada });
  }
}

/**
 * Se etapas_concluidas >= 6 e status ainda não é concluido, persiste a conclusão.
 * Isso habilita a entrada automática em Riscos Psicossociais.
 */
async function sincronizarConclusaoLaudosSst(
  trackingMap: Map<string, OrcamentoLaudosSstRecord>
): Promise<void> {
  const pendentes = Array.from(trackingMap.values()).filter(
    (row) => isLaudosSstConcluido(row) && row.status !== "concluido"
  );
  if (pendentes.length === 0) return;

  const supabase = createClient();
  const now = new Date().toISOString();

  for (const row of pendentes) {
    const { error } = await supabase
      .from("orcamento_laudos_sst")
      .update({
        status: "concluido",
        etapa_atual: "envio_cliente",
        etapas_concluidas: LAUDOS_SST_TOTAL_ETAPAS,
        concluido_em: row.concluido_em ?? now,
      })
      .eq("orcamento_id", row.orcamento_id);

    if (error) {
      console.warn(
        "falha ao sincronizar conclusão Laudos SST:",
        error.message
      );
      continue;
    }

    trackingMap.set(row.orcamento_id, {
      ...row,
      status: "concluido",
      etapa_atual: "envio_cliente",
      etapas_concluidas: LAUDOS_SST_TOTAL_ETAPAS,
      concluido_em: row.concluido_em ?? now,
    });
  }
}

function dateOrNull(value: string | null | undefined): string | null {
  if (!value) return null;
  const day = value.split("T")[0];
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

export interface SalvarLaudosSstEtapaInput {
  orcamentoId: string;
  etapa: LaudosSstEtapaId;
  workflow: LaudosSstWorkflow;
  atual: OrcamentoLaudosSstRecord | null;
  aprovador?: { userId: string | null; nome: string | null };
  clienteNome?: string;
  auditContext?: AuditoriaUsuarioContext;
}

export interface SalvarLaudosSstEtapaResult {
  tracking: OrcamentoLaudosSstRecord;
  etapaConcluida: boolean;
  proximaEtapa: LaudosSstEtapaId | null;
}

export async function salvarEtapaLaudosSst(
  input: SalvarLaudosSstEtapaInput
): Promise<SalvarLaudosSstEtapaResult> {
  const ordem = LAUDOS_SST_ETAPAS.map((e) => e.id);
  const w = input.workflow;
  const agora = new Date().toISOString();
  const atual = input.atual;

  const docsProntos = isPgrPcmsoLtcatDocumentosProntos(w);
  let enviadoPedroEm = atual?.enviado_pedro_em ?? null;
  if (docsProntos && w.enviadoPedro === true && atual?.enviado_pedro !== true) {
    enviadoPedroEm = agora;
  }

  let aprovacaoEm = atual?.aprovacao_pedro_em ?? null;
  let aprovacaoPor = atual?.aprovacao_pedro_por ?? null;
  let aprovacaoNome = atual?.aprovacao_pedro_por_nome ?? null;
  if (w.aprovacaoPedro === true && atual?.aprovacao_pedro !== true) {
    aprovacaoEm = agora;
    aprovacaoPor = input.aprovador?.userId || null;
    aprovacaoNome = input.aprovador?.nome || null;
  }

  const payload = {
    orcamento_id: input.orcamentoId,
    epi_disponibiliza: w.epiDisponibiliza,
    cadastro_realizado: w.cadastroRealizado,
    cadastro_data: dateOrNull(w.cadastroData),
    cronograma_elaborado: w.cronogramaElaborado,
    cronograma_data: dateOrNull(w.cronogramaData),
    cronograma_epi_respostas: w.cronogramaEpiRespostas ?? {},
    pgr_realizado: w.pgrRealizado,
    pgr_data: dateOrNull(w.pgrData),
    pcmso_realizado: w.pcmsoRealizado,
    pcmso_data: dateOrNull(w.pcmsoData),
    ltcat_realizado: w.ltcatRealizado,
    ltcat_data: dateOrNull(w.ltcatData),
    enviado_pedro: w.enviadoPedro,
    enviado_pedro_em: enviadoPedroEm,
    aprovacao_pedro: w.aprovacaoPedro,
    aprovacao_pedro_em: aprovacaoEm,
    aprovacao_pedro_por: aprovacaoPor,
    aprovacao_pedro_por_nome: aprovacaoNome,
    enviado_cliente: w.enviadoCliente,
    enviado_cliente_email: w.enviadoClienteEmail?.trim() || null,
    enviado_cliente_data: dateOrNull(w.enviadoClienteData),
  };

  const merged: LaudosSstWorkflow = {
    ...w,
    enviadoPedroEm,
    aprovacaoPedroEm: aprovacaoEm,
    aprovacaoPedroPorNome: aprovacaoNome,
  };

  const etapasConcluidas = contarEtapasConsecutivasConcluidas(merged, ordem);
  const etapaAtual = resolverEtapaAtualLaudos(merged, ordem);
  const concluido = etapasConcluidas >= LAUDOS_SST_TOTAL_ETAPAS;
  const etapaConcluida = isLaudosEtapaConcluida(input.etapa, merged);

  const supabase = createClient();
  const { data, error } = await supabase
    .from("orcamento_laudos_sst")
    .upsert(
      {
        ...payload,
        etapa_atual: concluido ? "envio_cliente" : etapaAtual,
        etapas_concluidas: etapasConcluidas,
        status: concluido ? "concluido" : "em_andamento",
        concluido_em: concluido ? atual?.concluido_em ?? agora : null,
        entrada_em: atual?.entrada_em ?? agora,
      },
      { onConflict: "orcamento_id" }
    )
    .select(LAUDOS_TRACKING_SELECT)
    .maybeSingle();

  if (error || !data) {
    const msg = error?.message ?? "";
    if (/does not exist|schema cache/i.test(msg)) {
      throw new Error(
        "A estrutura do banco ainda não foi atualizada. Execute a migration 108_laudos_sst_workflow.sql no Supabase."
      );
    }
    throw new Error(msg || "Não foi possível salvar a etapa.");
  }

  const usuarioNome =
    input.auditContext?.usuarioNome?.trim() ||
    input.aprovador?.nome?.trim() ||
    "Sistema";
  const usuarioEmail = input.auditContext?.usuarioEmail?.trim() || "";
  const usuarioId =
    input.auditContext?.usuarioId ?? input.aprovador?.userId ?? null;
  const cliente = input.clienteNome?.trim() || "empresa";

  let acaoAudit: AuditoriaAcao = AUDITORIA_ACOES.edicao;
  let descAudit = `${usuarioNome} atualizou a etapa de Laudos SST da empresa ${cliente}.`;

  if (input.etapa === "epis") {
    acaoAudit = AUDITORIA_ACOES.laudos_epis_salvos;
    descAudit = `${usuarioNome} salvou o questionário de EPIs de Laudos SST da empresa ${cliente}.`;
  } else if (input.etapa === "processo_inicial") {
    acaoAudit = AUDITORIA_ACOES.laudos_cadastro_concluido;
    descAudit = `${usuarioNome} concluiu o cadastro inicial de Laudos SST da empresa ${cliente}.`;
  } else if (input.etapa === "cronograma_acoes") {
    acaoAudit = AUDITORIA_ACOES.laudos_cronograma_concluido;
    descAudit = `${usuarioNome} elaborou o cronograma de ações de Laudos SST da empresa ${cliente}.`;
  } else if (input.etapa === "pgr_pcmso_ltcat") {
    if (w.pgrRealizado && !atual?.pgr_realizado) {
      acaoAudit = AUDITORIA_ACOES.laudos_pgr_concluido;
      descAudit = `${usuarioNome} concluiu a elaboração do PGR da empresa ${cliente}.`;
    } else if (w.pcmsoRealizado && !atual?.pcmso_realizado) {
      acaoAudit = AUDITORIA_ACOES.laudos_pcmso_concluido;
      descAudit = `${usuarioNome} concluiu a elaboração do PCMSO da empresa ${cliente}.`;
    } else if (w.ltcatRealizado && !atual?.ltcat_realizado) {
      acaoAudit = AUDITORIA_ACOES.laudos_ltcat_concluido;
      descAudit = `${usuarioNome} concluiu a elaboração do LTCAT da empresa ${cliente}.`;
    } else {
      acaoAudit = AUDITORIA_ACOES.laudos_pgr_concluido;
      descAudit = `${usuarioNome} atualizou os documentos de Laudos SST da empresa ${cliente}.`;
    }
  } else if (input.etapa === "autorizacao_pedro") {
    if (w.enviadoPedro === true && !atual?.enviado_pedro) {
      acaoAudit = AUDITORIA_ACOES.laudos_enviado_aprovacao;
      descAudit = `${usuarioNome} enviou os laudos da empresa ${cliente} para aprovação técnica.`;
    } else if (w.aprovacaoPedro === true && !atual?.aprovacao_pedro) {
      acaoAudit = AUDITORIA_ACOES.laudos_aprovado_tecnico;
      descAudit = `${usuarioNome} aprovou tecnicamente os laudos da empresa ${cliente}.`;
    } else if (w.aprovacaoPedro === false && atual?.aprovacao_pedro !== false) {
      acaoAudit = AUDITORIA_ACOES.laudos_reprovado_tecnico;
      descAudit = `${usuarioNome} devolveu os laudos da empresa ${cliente} na aprovação técnica.`;
    }
  } else if (input.etapa === "envio_cliente") {
    acaoAudit = AUDITORIA_ACOES.laudos_enviado_cliente;
    descAudit = `${usuarioNome} registrou o envio dos laudos da empresa ${cliente}${
      w.enviadoClienteEmail ? ` para ${w.enviadoClienteEmail}` : ""
    }.`;
  }

  await registrarAuditoria({
    usuarioId,
    usuarioNome,
    usuarioEmail,
    modulo: AUDITORIA_MODULOS.laudos_sst,
    acao: acaoAudit,
    registroId: input.orcamentoId,
    registroNome: cliente,
    descricao: descAudit,
    dadosDepois: {
      etapa: input.etapa,
      etapa_concluida: etapaConcluida,
      etapas_concluidas: etapasConcluidas,
      concluido,
    },
  });

  if (concluido && atual?.status !== "concluido") {
    await registrarAuditoria({
      usuarioId,
      usuarioNome,
      usuarioEmail,
      modulo: AUDITORIA_MODULOS.laudos_sst,
      acao: AUDITORIA_ACOES.laudos_processo_concluido,
      registroId: input.orcamentoId,
      registroNome: cliente,
      descricao: `${usuarioNome} concluiu o processo de Laudos SST da empresa ${cliente}.`,
      dadosDepois: {
        etapas_concluidas: etapasConcluidas,
        concluido_em: agora,
      },
    });
  }

  return {
    tracking: data as unknown as OrcamentoLaudosSstRecord,
    etapaConcluida,
    proximaEtapa:
      etapaConcluida ? proximaEtapaLaudos(input.etapa, ordem) : null,
  };
}

function anexoColumnPrefix(tipo: LaudosSstAnexoTipo): "pgr" | "pcmso" | "ltcat" {
  return tipo;
}

function anexoDbPayload(
  tipo: LaudosSstAnexoTipo,
  meta: LaudosSstAnexoMeta | null
): Record<string, string | number | null> {
  const prefix = anexoColumnPrefix(tipo);
  if (!meta) {
    return {
      [`${prefix}_anexo_path`]: null,
      [`${prefix}_anexo_nome`]: null,
      [`${prefix}_anexo_tipo`]: null,
      [`${prefix}_anexo_tamanho`]: null,
    };
  }
  return {
    [`${prefix}_anexo_path`]: meta.path,
    [`${prefix}_anexo_nome`]: meta.nome,
    [`${prefix}_anexo_tipo`]: meta.tipo,
    [`${prefix}_anexo_tamanho`]: meta.tamanho,
  };
}

function pathAtualDoAnexo(
  tracking: OrcamentoLaudosSstRecord | null | undefined,
  tipo: LaudosSstAnexoTipo
): string | null {
  if (!tracking) return null;
  if (tipo === "pgr") return tracking.pgr_anexo_path ?? null;
  if (tipo === "pcmso") return tracking.pcmso_anexo_path ?? null;
  return tracking.ltcat_anexo_path ?? null;
}

/** Upload + persiste metadados do anexo (um arquivo por tipo de laudo). */
export async function salvarAnexoLaudoSst(input: {
  orcamentoId: string;
  tipo: LaudosSstAnexoTipo;
  file: File;
  trackingAtual?: OrcamentoLaudosSstRecord | null;
}): Promise<OrcamentoLaudosSstRecord> {
  const antigoPath = pathAtualDoAnexo(input.trackingAtual, input.tipo);
  const meta = await uploadLaudosSstAnexo(
    input.orcamentoId,
    input.tipo,
    input.file
  );

  const supabase = createClient();
  const { data, error } = await supabase
    .from("orcamento_laudos_sst")
    .update(anexoDbPayload(input.tipo, meta))
    .eq("orcamento_id", input.orcamentoId)
    .select(LAUDOS_TRACKING_SELECT)
    .maybeSingle();

  if (error || !data) {
    await removerArquivoLaudosSstAnexo(meta.path);
    const msg = error?.message ?? "";
    if (/does not exist|schema cache|pgr_anexo/i.test(msg)) {
      throw new Error(
        "A estrutura do banco ainda não foi atualizada. Execute a migration 118_laudos_sst_anexos_pgr_pcmso_ltcat.sql no Supabase."
      );
    }
    throw new Error(msg || "Não foi possível salvar o anexo.");
  }

  if (antigoPath && antigoPath !== meta.path) {
    await removerArquivoLaudosSstAnexo(antigoPath);
  }

  return data as unknown as OrcamentoLaudosSstRecord;
}

/** Remove metadados e arquivo do storage. */
export async function removerAnexoLaudoSst(input: {
  orcamentoId: string;
  tipo: LaudosSstAnexoTipo;
  trackingAtual?: OrcamentoLaudosSstRecord | null;
}): Promise<OrcamentoLaudosSstRecord> {
  const path = pathAtualDoAnexo(input.trackingAtual, input.tipo);
  const supabase = createClient();
  const { data, error } = await supabase
    .from("orcamento_laudos_sst")
    .update(anexoDbPayload(input.tipo, null))
    .eq("orcamento_id", input.orcamentoId)
    .select(LAUDOS_TRACKING_SELECT)
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message || "Não foi possível remover o anexo.");
  }

  await removerArquivoLaudosSstAnexo(path);
  return data as unknown as OrcamentoLaudosSstRecord;
}
