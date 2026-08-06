import { createClient } from "@/lib/supabase/client";
import {
  AUDITORIA_ACOES,
  AUDITORIA_MODULOS,
} from "@/lib/auditoria";
import { registrarAuditoria } from "@/services/auditoria.service";
import {
  isCreditoUtilizavel,
  type ContratoCreditoAsoRecord,
  type ContratoCreditoAsoStatus,
} from "@/lib/contrato-creditos-aso";

const SELECT_CREDITO = `
  id, contrato_id, orcamento_id, cliente_id, cliente_cnpj, quantidade, status,
  valido_ate, observacao, agendamento_id, colaborador, colaborador_cpf,
  criado_por, criado_em, utilizado_por, utilizado_em, removido_por, removido_em,
  expirado_em, created_at, updated_at
`;

function mapCredito(row: Record<string, unknown>): ContratoCreditoAsoRecord {
  return {
    id: String(row.id),
    contrato_id: String(row.contrato_id),
    orcamento_id: row.orcamento_id ? String(row.orcamento_id) : null,
    cliente_id: row.cliente_id ? String(row.cliente_id) : null,
    cliente_cnpj: row.cliente_cnpj ? String(row.cliente_cnpj) : null,
    quantidade: Number(row.quantidade) || 1,
    status: row.status as ContratoCreditoAsoStatus,
    valido_ate: row.valido_ate ? String(row.valido_ate).slice(0, 10) : null,
    observacao: row.observacao ? String(row.observacao) : null,
    agendamento_id: row.agendamento_id ? String(row.agendamento_id) : null,
    colaborador: row.colaborador ? String(row.colaborador) : null,
    colaborador_cpf: row.colaborador_cpf ? String(row.colaborador_cpf) : null,
    criado_por: row.criado_por ? String(row.criado_por) : null,
    criado_em: String(row.criado_em ?? ""),
    utilizado_por: row.utilizado_por ? String(row.utilizado_por) : null,
    utilizado_em: row.utilizado_em ? String(row.utilizado_em) : null,
    removido_por: row.removido_por ? String(row.removido_por) : null,
    removido_em: row.removido_em ? String(row.removido_em) : null,
    expirado_em: row.expirado_em ? String(row.expirado_em) : null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export async function contarCreditosDisponiveisDoContrato(
  contratoId: string
): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("contrato_creditos_aso")
    .select("id", { count: "exact", head: true })
    .eq("contrato_id", contratoId)
    .eq("status", "disponivel");
  if (error) throw error;
  return count ?? 0;
}

export async function contarCreditosDisponiveisPorContratos(
  contratoIds: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (contratoIds.length === 0) return map;
  for (const id of contratoIds) map.set(id, 0);

  const supabase = createClient();
  const { data, error } = await supabase
    .from("contrato_creditos_aso")
    .select("contrato_id")
    .in("contrato_id", contratoIds)
    .eq("status", "disponivel");
  if (error) throw error;

  for (const row of data ?? []) {
    const cid = String(row.contrato_id ?? "");
    if (!cid) continue;
    map.set(cid, (map.get(cid) ?? 0) + 1);
  }
  return map;
}

export async function listarCreditosDoContrato(
  contratoId: string
): Promise<ContratoCreditoAsoRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("contrato_creditos_aso")
    .select(SELECT_CREDITO)
    .eq("contrato_id", contratoId)
    .neq("status", "removido")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => mapCredito(r as Record<string, unknown>));
}

export async function listarCreditosDisponiveisDoCliente(params: {
  clienteId?: string | null;
  clienteCnpj?: string | null;
}): Promise<
  (ContratoCreditoAsoRecord & {
    contrato_numero: string | null;
    contrato_data_inicio: string | null;
    contrato_data_fim: string | null;
  })[]
> {
  const supabase = createClient();
  const hoje = new Date().toISOString().slice(0, 10);

  let query = supabase
    .from("contrato_creditos_aso")
    .select(
      `
      ${SELECT_CREDITO},
      cliente_contratos (
        numero, data_inicio, data_fim, status
      )
    `
    )
    .eq("status", "disponivel");

  if (params.clienteId) {
    query = query.eq("cliente_id", params.clienteId);
  } else if (params.clienteCnpj) {
    query = query.eq("cliente_cnpj", params.clienteCnpj);
  } else {
    return [];
  }

  const { data, error } = await query.order("created_at", { ascending: true });
  if (error) throw error;

  const rows = (data ?? []) as Array<
    Record<string, unknown> & {
      cliente_contratos?:
        | {
            numero?: string | null;
            data_inicio?: string | null;
            data_fim?: string | null;
            status?: string | null;
          }
        | Array<{
            numero?: string | null;
            data_inicio?: string | null;
            data_fim?: string | null;
            status?: string | null;
          }>
        | null;
    }
  >;

  return rows
    .map((row) => {
      const ctrRaw = row.cliente_contratos;
      const ctr = Array.isArray(ctrRaw) ? ctrRaw[0] : ctrRaw;
      const mapped = mapCredito(row);
      return {
        ...mapped,
        contrato_numero: ctr?.numero ? String(ctr.numero) : null,
        contrato_data_inicio: ctr?.data_inicio
          ? String(ctr.data_inicio).slice(0, 10)
          : null,
        contrato_data_fim: ctr?.data_fim
          ? String(ctr.data_fim).slice(0, 10)
          : null,
        _contratoStatus: ctr?.status ? String(ctr.status) : null,
      };
    })
    .filter((c) => {
      if (c._contratoStatus === "cancelado" || c._contratoStatus === "encerrado") {
        return false;
      }
      return isCreditoUtilizavel(c, hoje);
    })
    .map(({ _contratoStatus: _, ...rest }) => rest);
}

export async function registrarCreditosAsoEmAberto(params: {
  contratoId: string;
  orcamentoId?: string | null;
  clienteId?: string | null;
  clienteCnpj?: string | null;
  quantidade: number;
  observacao?: string | null;
  validoAte: string | null;
  usuarioNome: string;
  numeroContrato?: string | null;
}): Promise<ContratoCreditoAsoRecord[]> {
  const qtd = Math.floor(Number(params.quantidade));
  if (!Number.isFinite(qtd) || qtd < 1) {
    throw new Error("Informe a quantidade de ASOs em aberto (mínimo 1).");
  }

  const supabase = createClient();

  // Garante que há vagas restantes (ag + futuros + abertos < previstos)
  // A validação detalhada fica no chamador; aqui só cria as linhas.

  const rows = Array.from({ length: qtd }, () => ({
    contrato_id: params.contratoId,
    orcamento_id: params.orcamentoId ?? null,
    cliente_id: params.clienteId ?? null,
    cliente_cnpj: params.clienteCnpj ?? null,
    quantidade: 1,
    status: "disponivel",
    valido_ate: params.validoAte ? params.validoAte.slice(0, 10) : null,
    observacao: params.observacao?.trim() || null,
    criado_por: params.usuarioNome,
  }));

  const { data, error } = await supabase
    .from("contrato_creditos_aso")
    .insert(rows)
    .select(SELECT_CREDITO);
  if (error) throw error;

  const created = (data ?? []).map((r) =>
    mapCredito(r as Record<string, unknown>)
  );

  await registrarAuditoria({
    modulo: AUDITORIA_MODULOS.orcamentos,
    acao: AUDITORIA_ACOES.credito_aso_registrado,
    registroId: params.contratoId,
    registroNome: params.numeroContrato ?? params.contratoId,
    descricao: `${params.usuarioNome} registrou ${qtd} ASO contratual${qtd > 1 ? "is" : ""} em aberto no contrato ${params.numeroContrato ?? params.contratoId}.`,
    usuarioNome: params.usuarioNome,
    usuarioEmail: "",
  });

  return created;
}

export async function atualizarObservacaoCreditoAso(params: {
  creditoId: string;
  observacao: string | null;
  usuarioNome: string;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("contrato_creditos_aso")
    .update({ observacao: params.observacao?.trim() || null })
    .eq("id", params.creditoId)
    .eq("status", "disponivel");
  if (error) throw error;

  await registrarAuditoria({
    modulo: AUDITORIA_MODULOS.orcamentos,
    acao: AUDITORIA_ACOES.credito_aso_observacao_editada,
    registroId: params.creditoId,
    registroNome: params.creditoId,
    descricao: `${params.usuarioNome} editou a observação do ASO contratual em aberto.`,
    usuarioNome: params.usuarioNome,
    usuarioEmail: "",
  });
}

export async function removerCreditoAsoEmAberto(params: {
  creditoId: string;
  usuarioNome: string;
  numeroContrato?: string | null;
}): Promise<void> {
  const supabase = createClient();
  const agora = new Date().toISOString();

  const { data, error } = await supabase
    .from("contrato_creditos_aso")
    .update({
      status: "removido",
      removido_por: params.usuarioNome,
      removido_em: agora,
    })
    .eq("id", params.creditoId)
    .eq("status", "disponivel")
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data?.id) {
    throw new Error(
      "Não foi possível remover o crédito. Ele pode já ter sido utilizado ou removido."
    );
  }

  await registrarAuditoria({
    modulo: AUDITORIA_MODULOS.orcamentos,
    acao: AUDITORIA_ACOES.credito_aso_removido,
    registroId: params.creditoId,
    registroNome: params.numeroContrato ?? params.creditoId,
    descricao: `${params.usuarioNome} removeu a classificação de ASO contratual em aberto${params.numeroContrato ? ` do contrato ${params.numeroContrato}` : ""}.`,
    usuarioNome: params.usuarioNome,
    usuarioEmail: "",
  });
}

/**
 * Consome crédito com proteção de concorrência:
 * UPDATE ... WHERE status = 'disponivel' (só 1 vence).
 */
export async function consumirCreditoAsoNoAgendamento(params: {
  creditoId: string;
  agendamentoId: string;
  colaborador: string;
  colaboradorCpf: string | null;
  usuarioNome: string;
  numeroContrato?: string | null;
}): Promise<ContratoCreditoAsoRecord> {
  const supabase = createClient();
  const agora = new Date().toISOString();
  const hoje = agora.slice(0, 10);

  const { data: atual, error: fetchErr } = await supabase
    .from("contrato_creditos_aso")
    .select(SELECT_CREDITO)
    .eq("id", params.creditoId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!atual) throw new Error("Crédito contratual não encontrado.");

  const mapped = mapCredito(atual as Record<string, unknown>);
  if (!isCreditoUtilizavel(mapped, hoje)) {
    throw new Error(
      "Este ASO contratual não está mais disponível para utilização."
    );
  }

  const { data, error } = await supabase
    .from("contrato_creditos_aso")
    .update({
      status: "utilizado",
      agendamento_id: params.agendamentoId,
      colaborador: params.colaborador,
      colaborador_cpf: params.colaboradorCpf,
      utilizado_por: params.usuarioNome,
      utilizado_em: agora,
    })
    .eq("id", params.creditoId)
    .eq("status", "disponivel")
    .select(SELECT_CREDITO)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new Error(
      "Este ASO contratual acabou de ser utilizado por outro usuário. Selecione outro crédito ou continue sem utilizá-lo."
    );
  }

  const used = mapCredito(data as Record<string, unknown>);

  await registrarAuditoria({
    modulo: AUDITORIA_MODULOS.agendamentos,
    acao: AUDITORIA_ACOES.credito_aso_utilizado,
    registroId: params.creditoId,
    registroNome: params.colaborador,
    descricao: `${params.usuarioNome} utilizou o ASO contratual aberto no agendamento de ${params.colaborador}${params.numeroContrato ? ` (contrato ${params.numeroContrato})` : ""}.`,
    usuarioNome: params.usuarioNome,
    usuarioEmail: "",
  });

  return used;
}

/**
 * Após criar o agendamento: consome crédito + vínculo de previsão do contrato.
 */
export async function vincularCreditoUtilizadoAoContrato(params: {
  creditoId: string;
  agendamentoId: string;
  contratoId: string;
  colaborador: string;
  colaboradorCpf: string | null;
  usuarioNome: string;
  numeroContrato?: string | null;
}): Promise<void> {
  await consumirCreditoAsoNoAgendamento({
    creditoId: params.creditoId,
    agendamentoId: params.agendamentoId,
    colaborador: params.colaborador,
    colaboradorCpf: params.colaboradorCpf,
    usuarioNome: params.usuarioNome,
    numeroContrato: params.numeroContrato,
  });

  const supabase = createClient();
  const agora = new Date().toISOString();

  await supabase
    .from("agendamentos")
    .update({
      contrato_id: params.contratoId,
      consome_saldo_contrato: true,
      vinculado_contrato_em: agora,
      vinculado_contrato_por: params.usuarioNome,
    })
    .eq("id", params.agendamentoId);

  const { data: existing } = await supabase
    .from("contrato_agendamentos")
    .select("id")
    .eq("contrato_id", params.contratoId)
    .eq("agendamento_id", params.agendamentoId)
    .maybeSingle();

  if (existing?.id) {
    await supabase
      .from("contrato_agendamentos")
      .update({
        contabiliza_previsao: true,
        removido_em: null,
        removido_por: null,
        vinculado_por: params.usuarioNome,
        vinculado_em: agora,
        updated_at: agora,
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("contrato_agendamentos").insert({
      contrato_id: params.contratoId,
      agendamento_id: params.agendamentoId,
      contabiliza_previsao: true,
      vinculado_por: params.usuarioNome,
      vinculado_em: agora,
    });
  }
}

export async function devolverCreditoAsoPorCancelamento(params: {
  agendamentoId: string;
  usuarioNome: string;
  contratoVigente: boolean;
}): Promise<"disponivel" | "expirado" | null> {
  const supabase = createClient();
  const agora = new Date().toISOString();

  const { data: credito, error: fetchErr } = await supabase
    .from("contrato_creditos_aso")
    .select(SELECT_CREDITO)
    .eq("agendamento_id", params.agendamentoId)
    .eq("status", "utilizado")
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!credito) return null;

  const novoStatus: ContratoCreditoAsoStatus = params.contratoVigente
    ? "disponivel"
    : "expirado";

  const patch: Record<string, unknown> = {
    status: novoStatus,
    agendamento_id: null,
    colaborador: null,
    colaborador_cpf: null,
    utilizado_por: null,
    utilizado_em: null,
  };
  if (novoStatus === "expirado") {
    patch.expirado_em = agora;
  }

  const { error } = await supabase
    .from("contrato_creditos_aso")
    .update(patch)
    .eq("id", credito.id)
    .eq("status", "utilizado");
  if (error) throw error;

  await registrarAuditoria({
    modulo: AUDITORIA_MODULOS.agendamentos,
    acao:
      novoStatus === "disponivel"
        ? AUDITORIA_ACOES.credito_aso_devolvido
        : AUDITORIA_ACOES.credito_aso_expirado,
    registroId: String(credito.id),
    registroNome: String(credito.id),
    descricao:
      novoStatus === "disponivel"
        ? `${params.usuarioNome} devolveu o ASO contratual ao status Disponível após cancelamento do agendamento.`
        : `${params.usuarioNome}: agendamento cancelado após o fim da vigência — crédito marcado como Expirado.`,
    usuarioNome: params.usuarioNome,
    usuarioEmail: "",
  });

  return novoStatus;
}

export async function marcarCreditosExpiradosDoContrato(
  contratoId: string,
  usuarioNome = "SISTEMA"
): Promise<number> {
  const supabase = createClient();
  const hoje = new Date().toISOString().slice(0, 10);
  const agora = new Date().toISOString();

  const { data, error } = await supabase
    .from("contrato_creditos_aso")
    .update({ status: "expirado", expirado_em: agora })
    .eq("contrato_id", contratoId)
    .eq("status", "disponivel")
    .lt("valido_ate", hoje)
    .select("id");
  if (error) throw error;

  const qtd = data?.length ?? 0;
  if (qtd > 0) {
    await registrarAuditoria({
      modulo: AUDITORIA_MODULOS.orcamentos,
      acao: AUDITORIA_ACOES.credito_aso_expirado,
      registroId: contratoId,
      registroNome: contratoId,
      descricao: `${usuarioNome}: ${qtd} ASO(s) contratual(is) expirado(s) pelo fim da vigência.`,
      usuarioNome: usuarioNome,
      usuarioEmail: "",
    });
  }
  return qtd;
}
