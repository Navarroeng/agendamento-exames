import { mesReferenciaIsoFromPeriodoInicio } from "@/lib/duplicidade-validations";
import {
  formatAuditoriaMarcarConferido,
  formatAuditoriaReabrirConferencia,
} from "@/lib/custos-clinicas-conferencia";
import {
  AUDITORIA_ACOES,
  type AuditoriaUsuarioContext,
} from "@/lib/auditoria";
import { createClient } from "@/lib/supabase/client";
import {
  FATURA_AGENDAMENTO_NAO_ELEGIVEL_MSG,
  FATURA_SEM_ELEGIVEIS_MSG,
  isAgendamentoElegivelFatura,
} from "@/lib/fatura-elegibilidade";
import {
  COMPROVANTE_OBRIGATORIO_MSG,
  ComprovanteValidationError,
  isComprovantePagamentoDbError,
} from "@/lib/fatura-comprovante";
import { assertFaturaMesDisponivel } from "@/services/duplicidade.service";
import {
  deleteComprovantePagamento,
  uploadComprovantePagamento,
} from "@/services/fatura-comprovante.service";
import {
  moduloAuditoriaFromFaturaTipo,
  registrarAuditoria,
} from "@/services/auditoria.service";
import type {  FaturaComItens,
  FaturaItemInsert,
  FaturaRecord,
  FaturaStatus,
  FaturaTipo,
} from "@/lib/types";

async function gerarNumeroFatura(tipo: FaturaTipo): Promise<string> {
  const supabase = createClient();
  const prefix = tipo === "cliente" ? "FAT-CLI" : "FAT-CLN";
  const year = new Date().getFullYear();

  const { count, error } = await supabase
    .from("faturas")
    .select("*", { count: "exact", head: true })
    .like("numero", `${prefix}-${year}-%`);

  if (error) throw error;

  const seq = String((count ?? 0) + 1).padStart(5, "0");
  return `${prefix}-${year}-${seq}`;
}

export async function listarFaturas(limit = 100): Promise<FaturaRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("faturas")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as FaturaRecord[];
}

export async function buscarFaturaComItens(
  id: string
): Promise<FaturaComItens | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("faturas")
    .select("*, fatura_itens(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as FaturaComItens & {
    fatura_itens: FaturaComItens["fatura_itens"];
  };

  row.fatura_itens = (row.fatura_itens ?? []).sort((a, b) =>
    a.data_agendamento.localeCompare(b.data_agendamento)
  );

  return row;
}

interface SalvarFaturaInput {
  faturaId?: string | null;
  tipo: FaturaTipo;
  referencia_nome: string;
  referencia_id?: string | null;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  mes_referencia?: string | null;
  mes_referencia_label?: string | null;
  data_vencimento: string;
  valor_total: number;
  total_exames: number;
  status: FaturaStatus;
  gerado_por: string;
  itens: FaturaItemInsert[];
  /** Reemissão: número da fatura substituída de origem. */
  reemitida_de_fatura_numero?: string | null;
  fatura_origem_id?: string | null;
  ignorarFaturaId?: string | null;
}

export interface FaturaAuditOptions {
  auditContext?: AuditoriaUsuarioContext;
}

async function auditarFatura(
  auditOptions: FaturaAuditOptions | undefined,
  input: {
    tipo: FaturaTipo;
    acao: (typeof AUDITORIA_ACOES)[keyof typeof AUDITORIA_ACOES];
    registroId: string;
    registroNome: string;
    descricao: string;
  }
): Promise<void> {
  const nome =
    auditOptions?.auditContext?.usuarioNome?.trim() || "Sistema";

  await registrarAuditoria({
    usuarioId: auditOptions?.auditContext?.usuarioId ?? null,
    usuarioNome: nome,
    usuarioEmail: auditOptions?.auditContext?.usuarioEmail ?? "",
    modulo: moduloAuditoriaFromFaturaTipo(input.tipo),
    acao: input.acao,
    registroId: input.registroId,
    registroNome: input.registroNome,
    descricao: input.descricao,
  });
}

async function validarItensFaturaElegiveis(
  itens: FaturaItemInsert[]
): Promise<FaturaItemInsert[]> {
  if (itens.length === 0) {
    throw new Error(FATURA_SEM_ELEGIVEIS_MSG);
  }

  if (itens.some((item) => !item.agendamento_id)) {
    throw new Error(FATURA_AGENDAMENTO_NAO_ELEGIVEL_MSG);
  }

  const ids = Array.from(new Set(itens.map((item) => item.agendamento_id!)));
  const supabase = createClient();

  const { data, error } = await supabase
    .from("agendamentos")
    .select("id, status")
    .in("id", ids);

  if (error) throw error;

  const statusById = new Map(
    (data ?? []).map((row) => [row.id as string, row.status as string])
  );

  const hasInvalid = ids.some(
    (id) => !isAgendamentoElegivelFatura(statusById.get(id))
  );

  if (hasInvalid || statusById.size !== ids.length) {
    throw new Error(FATURA_AGENDAMENTO_NAO_ELEGIVEL_MSG);
  }

  return itens;
}

export async function salvarFatura(
  input: SalvarFaturaInput,
  auditOptions?: FaturaAuditOptions
): Promise<FaturaComItens> {
  const itens = await validarItensFaturaElegiveis(input.itens);
  const valorTotal = itens.reduce(
    (sum, item) => sum + Number(item.valor_total),
    0
  );
  const totalExames = itens.length;
  const mesReferencia =
    input.mes_referencia ??
    mesReferenciaIsoFromPeriodoInicio(input.periodo_inicio);

  if (mesReferencia) {
    await assertFaturaMesDisponivel({
      tipo: input.tipo,
      referenciaNome: input.referencia_nome,
      referenciaId: input.referencia_id,
      mesReferenciaIso: mesReferencia,
      ignorarFaturaId: input.ignorarFaturaId ?? input.faturaId,
    });
  }

  const supabase = createClient();

  if (input.faturaId) {
    const existing = await buscarFaturaComItens(input.faturaId);
    if (!existing) throw new Error("Fatura não encontrada.");
    if (existing.status === "cancelada" || existing.status === "substituida") {
      throw new Error("Fatura cancelada ou substituída não pode ser alterada.");
    }
    if (existing.status === "necessita_reemissao") {
      throw new Error(
        "Fatura que necessita reemissão não pode ser editada. Reemitir a fatura."
      );
    }

    const payload: Record<string, unknown> = {
      tipo: input.tipo,
      referencia_nome: input.referencia_nome,
      referencia_id: input.referencia_id ?? null,
      periodo_inicio: input.periodo_inicio,
      periodo_fim: input.periodo_fim,
      mes_referencia: mesReferencia,
      data_vencimento: input.data_vencimento,
      valor_total: valorTotal,
      total_exames: totalExames,
      status: input.status,
      gerado_por: input.gerado_por,
    };

    if (input.status === "emitida" && !existing.data_emissao) {
      payload.data_emissao = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from("faturas")
      .update(payload)
      .eq("id", input.faturaId);

    if (updateError) throw updateError;

    const { error: deleteError } = await supabase
      .from("fatura_itens")
      .delete()
      .eq("fatura_id", input.faturaId);

    if (deleteError) throw deleteError;

    const { error: insertError } = await supabase.from("fatura_itens").insert(
      itens.map((item) => ({
        ...item,
        fatura_id: input.faturaId,
      }))
    );

    if (insertError) throw insertError;

    const updated = await buscarFaturaComItens(input.faturaId);
    if (!updated) throw new Error("Erro ao recarregar fatura.");

    const usuario =
      auditOptions?.auditContext?.usuarioNome?.trim() || input.gerado_por;

    if (
      input.tipo === "clinica" &&
      input.status === "emitida" &&
      existing.status === "rascunho"
    ) {
      await auditarFatura(auditOptions, {
        tipo: input.tipo,
        acao: AUDITORIA_ACOES.custo_clinica_marcado_conferido,
        registroId: updated.id,
        registroNome: updated.numero,
        descricao: formatAuditoriaMarcarConferido(
          usuario,
          updated.referencia_nome
        ),
      });
    } else {
      await auditarFatura(auditOptions, {
        tipo: input.tipo,
        acao: AUDITORIA_ACOES.edicao,
        registroId: updated.id,
        registroNome: updated.numero,
        descricao: `${usuario} editou a fatura ${updated.numero} (${updated.referencia_nome}).`,
      });
    }

    return updated;
  }

  const numero = await gerarNumeroFatura(input.tipo);

  const { data: fatura, error: faturaError } = await supabase
    .from("faturas")
    .insert({
      numero,
      tipo: input.tipo,
      referencia_nome: input.referencia_nome,
      referencia_id: input.referencia_id ?? null,
      periodo_inicio: input.periodo_inicio,
      periodo_fim: input.periodo_fim,
      mes_referencia: mesReferencia,
      data_vencimento: input.data_vencimento,
      valor_total: valorTotal,
      total_exames: totalExames,
      status: input.status,
      gerado_por: input.gerado_por,
      data_emissao: input.status === "emitida" ? new Date().toISOString() : null,
      fatura_origem_id: input.fatura_origem_id ?? null,
    })
    .select("*")
    .single();

  if (faturaError) throw faturaError;

  const { error: itensError } = await supabase.from("fatura_itens").insert(
    itens.map((item) => ({
      ...item,
      fatura_id: fatura.id,
    }))
  );

  if (itensError) throw itensError;

  const created = await buscarFaturaComItens(fatura.id);
  if (!created) throw new Error("Erro ao carregar fatura criada.");

  const usuario =
    auditOptions?.auditContext?.usuarioNome?.trim() || input.gerado_por;

  if (input.reemitida_de_fatura_numero?.trim()) {
    const mesLabel =
      input.mes_referencia_label?.trim() ||
      input.mes_referencia?.trim() ||
      "—";

    await auditarFatura(auditOptions, {
      tipo: input.tipo,
      acao: AUDITORIA_ACOES.fatura_reemitida,
      registroId: created.id,
      registroNome: created.numero,
      descricao:
        `${usuario} reemitiu a fatura ${input.reemitida_de_fatura_numero?.trim() ?? "—"} ` +
        `para ${created.referencia_nome}. Nova fatura: ${created.numero}. ` +
        `Mês de referência: ${mesLabel}.`,
    });
  } else if (input.tipo === "clinica" && input.status === "emitida") {
    await auditarFatura(auditOptions, {
      tipo: input.tipo,
      acao: AUDITORIA_ACOES.custo_clinica_marcado_conferido,
      registroId: created.id,
      registroNome: created.numero,
      descricao: formatAuditoriaMarcarConferido(
        usuario,
        created.referencia_nome
      ),
    });
  } else {
    await auditarFatura(auditOptions, {
      tipo: input.tipo,
      acao: AUDITORIA_ACOES.criacao,
      registroId: created.id,
      registroNome: created.numero,
      descricao: `${usuario} criou a fatura ${created.numero} (${created.referencia_nome}).`,
    });
  }

  return created;
}

export interface ReemitirFaturaClienteInput {
  faturaCanceladaId: string;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  mes_referencia: string | null;
  mes_referencia_label: string;
  data_vencimento: string;
  gerado_por: string;
  itens: FaturaItemInsert[];
}

export async function marcarFaturaClienteNecessitaReemissao(
  faturaId: string,
  auditOptions?: FaturaAuditOptions,
  context?: {
    agendamentoId?: string;
    cliente?: string;
    colaborador?: string;
    motivo?: string;
  }
): Promise<boolean> {
  const existing = await buscarFaturaComItens(faturaId);
  if (!existing || existing.tipo !== "cliente") return false;
  if (
    existing.status !== "emitida" &&
    existing.status !== "necessita_reemissao"
  ) {
    return false;
  }
  if (existing.status === "necessita_reemissao") return true;

  const supabase = createClient();
  const { error } = await supabase
    .from("faturas")
    .update({ status: "necessita_reemissao" })
    .eq("id", faturaId)
    .eq("status", "emitida");

  if (error) throw error;

  const usuario =
    auditOptions?.auditContext?.usuarioNome?.trim() || "Sistema";

  await auditarFatura(auditOptions, {
    tipo: "cliente",
    acao: AUDITORIA_ACOES.fatura_necessita_reemissao,
    registroId: existing.id,
    registroNome: existing.numero,
    descricao:
      `${usuario} alterou a fatura ${existing.numero} para "Necessita reemissão". ` +
      `Cliente: ${context?.cliente ?? existing.referencia_nome}.` +
      (context?.colaborador
        ? ` Colaborador afetado: ${context.colaborador}.`
        : "") +
      (context?.motivo ? ` Motivo: ${context.motivo.trim()}.` : ""),
  });

  return true;
}

export async function sincronizarFaturasClienteNecessitaReemissao(
  faturaIds: string[],
  auditOptions?: FaturaAuditOptions
): Promise<number> {
  let atualizadas = 0;
  for (const id of faturaIds) {
    const ok = await marcarFaturaClienteNecessitaReemissao(id, auditOptions);
    if (ok) atualizadas += 1;
  }
  return atualizadas;
}

export async function obterFaturasClienteIdsPorAgendamento(
  agendamentoId: string
): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("fatura_itens")
    .select("fatura_id, faturas ( id, tipo, status )")
    .eq("agendamento_id", agendamentoId);

  if (error) throw error;

  const ids = new Set<string>();
  for (const row of data ?? []) {
    const faturas = Array.isArray(row.faturas)
      ? row.faturas
      : row.faturas
        ? [row.faturas]
        : [];
    for (const fatura of faturas) {
      const f = fatura as Pick<FaturaRecord, "id" | "tipo" | "status">;
      if (
        f.tipo === "cliente" &&
        (f.status === "emitida" || f.status === "necessita_reemissao")
      ) {
        ids.add(f.id);
      }
    }
  }

  return Array.from(ids);
}

export async function reemitirFaturaClienteCancelada(
  input: ReemitirFaturaClienteInput,
  auditOptions?: FaturaAuditOptions
): Promise<FaturaComItens> {
  return reemitirFaturaCliente(input, auditOptions);
}

export async function reemitirFaturaCliente(
  input: ReemitirFaturaClienteInput,
  auditOptions?: FaturaAuditOptions
): Promise<FaturaComItens> {
  const existente = await buscarFaturaComItens(input.faturaCanceladaId);
  if (!existente) throw new Error("Fatura não encontrada.");
  if (existente.tipo !== "cliente") {
    throw new Error("Reemissão disponível apenas para faturas de clientes.");
  }

  if (existente.status === "emitida") {
    await marcarFaturaClienteNecessitaReemissao(
      input.faturaCanceladaId,
      auditOptions
    );
  }

  const statusAtual =
    existente.status === "emitida"
      ? ("necessita_reemissao" as FaturaStatus)
      : existente.status;

  if (statusAtual !== "necessita_reemissao" && statusAtual !== "cancelada") {
    throw new Error(
      "Somente faturas que necessitam reemissão ou canceladas podem ser reemitidas."
    );
  }

  const valorTotal = input.itens.reduce(
    (sum, item) => sum + Number(item.valor_total),
    0
  );

  const nova = await salvarFatura(
    {
      tipo: "cliente",
      referencia_nome: existente.referencia_nome,
      referencia_id: existente.referencia_id,
      periodo_inicio: input.periodo_inicio,
      periodo_fim: input.periodo_fim,
      mes_referencia: input.mes_referencia,
      mes_referencia_label: input.mes_referencia_label,
      data_vencimento: input.data_vencimento,
      valor_total: valorTotal,
      total_exames: input.itens.length,
      status: "emitida",
      gerado_por: input.gerado_por,
      itens: input.itens,
      reemitida_de_fatura_numero: existente.numero,
      fatura_origem_id: existente.id,
      ignorarFaturaId: existente.id,
    },
    auditOptions
  );

  if (statusAtual === "necessita_reemissao") {
    const supabase = createClient();
    const { error } = await supabase
      .from("faturas")
      .update({
        status: "substituida",
        fatura_substituta_id: nova.id,
      })
      .eq("id", existente.id)
      .eq("status", "necessita_reemissao");

    if (error) throw error;
  }

  return nova;
}

export async function reabrirConferenciaCustosClinica(
  id: string,
  auditOptions?: FaturaAuditOptions
): Promise<void> {
  const existing = await buscarFaturaComItens(id);
  if (!existing) throw new Error("Registro de custos não encontrado.");
  if (existing.tipo !== "clinica") {
    throw new Error("Reabrir conferência disponível apenas para custos de clínicas.");
  }
  if (existing.status !== "emitida") {
    throw new Error("Somente custos conferidos podem ser reabertos.");
  }
  if (existing.pago) {
    throw new Error("Não é possível reabrir conferência de custos já pagos.");
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("faturas")
    .update({
      status: "rascunho",
      data_emissao: null,
    })
    .eq("id", id)
    .eq("tipo", "clinica")
    .eq("status", "emitida");

  if (error) throw error;

  const usuario =
    auditOptions?.auditContext?.usuarioNome?.trim() || "Sistema";

  await auditarFatura(auditOptions, {
    tipo: "clinica",
    acao: AUDITORIA_ACOES.custo_clinica_conferencia_reaberta,
    registroId: existing.id,
    registroNome: existing.numero,
    descricao: formatAuditoriaReabrirConferencia(
      usuario,
      existing.referencia_nome
    ),
  });
}

export async function cancelarFatura(
  id: string,
  auditOptions?: FaturaAuditOptions
): Promise<void> {
  const existing = await buscarFaturaComItens(id);

  const supabase = createClient();
  const { error } = await supabase
    .from("faturas")
    .update({ status: "cancelada" })
    .eq("id", id)
    .neq("status", "cancelada");

  if (error) throw error;

  if (existing) {
    await auditarFatura(auditOptions, {
      tipo: existing.tipo,
      acao: AUDITORIA_ACOES.cancelamento,
      registroId: existing.id,
      registroNome: existing.numero,
      descricao: `${auditOptions?.auditContext?.usuarioNome ?? "Sistema"} cancelou a fatura ${existing.numero} (${existing.referencia_nome}).`,
    });
  }
}

export interface FaturaPagamentoInput {
  data_pagamento: string;
  observacao_pagamento: string | null;
  comprovanteFile?: File | null;
}

function assertComprovanteInformado(file: File | null | undefined): asserts file is File {
  if (!file) {
    throw new ComprovanteValidationError(COMPROVANTE_OBRIGATORIO_MSG);
  }
}

export async function registrarPagamentoFatura(
  id: string,
  input: FaturaPagamentoInput,
  auditOptions?: FaturaAuditOptions
): Promise<void> {
  assertComprovanteInformado(input.comprovanteFile);

  const existing = await buscarFaturaComItens(id);
  const uploaded = await uploadComprovantePagamento(id, input.comprovanteFile);

  const supabase = createClient();
  const { error } = await supabase
    .from("faturas")
    .update({
      pago: true,
      data_pagamento: input.data_pagamento,
      observacao_pagamento: input.observacao_pagamento?.trim() || null,
      comprovante_pagamento_path: uploaded.path,
      comprovante_pagamento_nome: uploaded.nome,
    })
    .eq("id", id)
    .eq("status", "emitida");

  if (error) {
    await deleteComprovantePagamento(uploaded.path).catch(() => undefined);
    if (isComprovantePagamentoDbError(error)) {
      throw new ComprovanteValidationError(COMPROVANTE_OBRIGATORIO_MSG);
    }
    throw error;
  }

  if (existing) {
    await auditarFatura(auditOptions, {
      tipo: existing.tipo,
      acao: AUDITORIA_ACOES.edicao,
      registroId: existing.id,
      registroNome: existing.numero,
      descricao: `${auditOptions?.auditContext?.usuarioNome ?? "Sistema"} registrou pagamento da fatura ${existing.numero}.`,
    });
  }
}

export async function atualizarPagamentoFatura(
  id: string,
  input: FaturaPagamentoInput,
  comprovanteAtualPath: string | null,
  auditOptions?: FaturaAuditOptions
): Promise<void> {
  const existing = await buscarFaturaComItens(id);

  let comprovantePath = comprovanteAtualPath?.trim() || null;
  let comprovanteNome = existing?.comprovante_pagamento_nome ?? null;
  let uploadedPath: string | null = null;
  const previousPath = comprovantePath;

  if (input.comprovanteFile) {
    const uploaded = await uploadComprovantePagamento(id, input.comprovanteFile);
    uploadedPath = uploaded.path;
    comprovantePath = uploaded.path;
    comprovanteNome = uploaded.nome;
  }

  if (!comprovantePath) {
    throw new ComprovanteValidationError(COMPROVANTE_OBRIGATORIO_MSG);
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("faturas")
    .update({
      pago: true,
      data_pagamento: input.data_pagamento,
      observacao_pagamento: input.observacao_pagamento?.trim() || null,
      comprovante_pagamento_path: comprovantePath,
      comprovante_pagamento_nome: comprovanteNome,
    })
    .eq("id", id)
    .eq("status", "emitida");

  if (error) {
    if (uploadedPath) {
      await deleteComprovantePagamento(uploadedPath).catch(() => undefined);
    }
    if (isComprovantePagamentoDbError(error)) {
      throw new ComprovanteValidationError(COMPROVANTE_OBRIGATORIO_MSG);
    }
    throw error;
  }

  if (uploadedPath && previousPath && previousPath !== uploadedPath) {
    await deleteComprovantePagamento(previousPath).catch(() => undefined);
  }

  if (existing) {
    await auditarFatura(auditOptions, {
      tipo: existing.tipo,
      acao: AUDITORIA_ACOES.edicao,
      registroId: existing.id,
      registroNome: existing.numero,
      descricao: `${auditOptions?.auditContext?.usuarioNome ?? "Sistema"} atualizou o pagamento da fatura ${existing.numero}.`,
    });
  }
}

export async function marcarFaturaPendente(
  id: string,
  auditOptions?: FaturaAuditOptions
): Promise<void> {
  const existing = await buscarFaturaComItens(id);
  const comprovantePath = existing?.comprovante_pagamento_path?.trim() || null;

  const supabase = createClient();
  const { error } = await supabase
    .from("faturas")
    .update({
      pago: false,
      data_pagamento: null,
      observacao_pagamento: null,
      comprovante_pagamento_path: null,
      comprovante_pagamento_nome: null,
    })
    .eq("id", id)
    .eq("status", "emitida");

  if (error) throw error;

  if (comprovantePath) {
    await deleteComprovantePagamento(comprovantePath).catch(() => undefined);
  }

  if (existing) {
    await auditarFatura(auditOptions, {
      tipo: existing.tipo,
      acao: AUDITORIA_ACOES.edicao,
      registroId: existing.id,
      registroNome: existing.numero,
      descricao: `${auditOptions?.auditContext?.usuarioNome ?? "Sistema"} marcou a fatura ${existing.numero} como pagamento pendente.`,
    });
  }
}
