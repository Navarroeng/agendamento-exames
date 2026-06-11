import { mesReferenciaIsoFromPeriodoInicio } from "@/lib/duplicidade-validations";
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
import { assertFaturaMesDisponivel } from "@/services/duplicidade.service";
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
  data_vencimento: string;
  valor_total: number;
  total_exames: number;
  status: FaturaStatus;
  gerado_por: string;
  itens: FaturaItemInsert[];
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
      ignorarFaturaId: input.faturaId,
    });
  }

  const supabase = createClient();

  if (input.faturaId) {
    const existing = await buscarFaturaComItens(input.faturaId);
    if (!existing) throw new Error("Fatura não encontrada.");
    if (existing.status === "cancelada") {
      throw new Error("Fatura cancelada não pode ser alterada.");
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

    await auditarFatura(auditOptions, {
      tipo: input.tipo,
      acao: AUDITORIA_ACOES.edicao,
      registroId: updated.id,
      registroNome: updated.numero,
      descricao: `${auditOptions?.auditContext?.usuarioNome ?? input.gerado_por} editou a fatura ${updated.numero} (${updated.referencia_nome}).`,
    });

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

  await auditarFatura(auditOptions, {
    tipo: input.tipo,
    acao: AUDITORIA_ACOES.criacao,
    registroId: created.id,
    registroNome: created.numero,
    descricao: `${auditOptions?.auditContext?.usuarioNome ?? input.gerado_por} criou a fatura ${created.numero} (${created.referencia_nome}).`,
  });

  return created;
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
}

export async function registrarPagamentoFatura(
  id: string,
  input: FaturaPagamentoInput,
  auditOptions?: FaturaAuditOptions
): Promise<void> {
  const existing = await buscarFaturaComItens(id);

  const supabase = createClient();
  const { error } = await supabase
    .from("faturas")
    .update({
      pago: true,
      data_pagamento: input.data_pagamento,
      observacao_pagamento: input.observacao_pagamento?.trim() || null,
    })
    .eq("id", id)
    .eq("status", "emitida");

  if (error) throw error;

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

export async function marcarFaturaPendente(
  id: string,
  auditOptions?: FaturaAuditOptions
): Promise<void> {
  const existing = await buscarFaturaComItens(id);

  const supabase = createClient();
  const { error } = await supabase
    .from("faturas")
    .update({
      pago: false,
      data_pagamento: null,
      observacao_pagamento: null,
    })
    .eq("id", id)
    .eq("status", "emitida");

  if (error) throw error;

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
