import { createClient } from "@/lib/supabase/client";
import {
  buildContratoAgendamentoContagem,
  isAgendamentoSelecionavel,
  isDataNaVigencia,
  type ContratoAgendamentoContagem,
} from "@/lib/contrato-agendamentos";
import type {
  AgendamentoWithExames,
  ClienteContratoRecord,
  ClienteRecord,
} from "@/lib/types";

const AGENDAMENTO_SELECT = `
  *,
  agendamento_exames (
    id,
    agendamento_id,
    tipo_exame,
    valor_cliente,
    custo_clinica,
    motivo_valor_zero
  )
`;

export type ContratoAgendamentoVinculo = {
  id: string;
  contrato_id: string;
  agendamento_id: string;
  contabiliza_previsao: boolean;
  vinculado_por: string | null;
  vinculado_em: string;
  removido_em: string | null;
};

export type AgendamentoNaVigenciaItem = {
  agendamento: AgendamentoWithExames;
  selecionado: boolean;
  selecionavel: boolean;
  bloqueadoOutroContrato: boolean;
  outroContratoNumero: string | null;
};

function digitsOnly(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

export async function buscarContratoPorOrcamentoId(
  orcamentoId: string
): Promise<ClienteContratoRecord | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("cliente_contratos")
    .select("*")
    .eq("orcamento_id", orcamentoId)
    .order("aprovado_em", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as ClienteContratoRecord | null) ?? null;
}

export async function buscarContratoPorId(
  contratoId: string
): Promise<ClienteContratoRecord | null> {
  if (!contratoId) return null;
  const supabase = createClient();
  const { data, error } = await supabase
    .from("cliente_contratos")
    .select("*")
    .eq("id", contratoId)
    .maybeSingle();
  if (error) throw error;
  return (data as ClienteContratoRecord | null) ?? null;
}

async function buscarNomesClienteParaMatch(
  clienteId: string
): Promise<{ nomes: string[]; cliente: ClienteRecord | null }> {
  const supabase = createClient();
  const { data: cliente, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", clienteId)
    .maybeSingle();
  if (error) throw error;
  if (!cliente) return { nomes: [], cliente: null };

  const nomes = new Set<string>([String(cliente.nome).trim()]);
  const cnpjDigits = digitsOnly(cliente.cnpj as string);
  if (cnpjDigits.length >= 11) {
    const { data: mesmos } = await supabase.from("clientes").select("nome, cnpj");
    for (const row of mesmos ?? []) {
      if (digitsOnly(row.cnpj as string) === cnpjDigits) {
        const n = String(row.nome ?? "").trim();
        if (n) nomes.add(n);
      }
    }
  }
  return { nomes: Array.from(nomes), cliente: cliente as ClienteRecord };
}

export async function listarVinculosAtivosPorContrato(
  contratoId: string
): Promise<ContratoAgendamentoVinculo[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("contrato_agendamentos")
    .select("*")
    .eq("contrato_id", contratoId)
    .is("removido_em", null)
    .eq("contabiliza_previsao", true);
  if (error) throw error;
  return (data ?? []) as ContratoAgendamentoVinculo[];
}

/** Contagem de utilizados (seleções válidas) por contrato. */
export async function contarColaboradoresPorContratos(
  contratoIds: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (contratoIds.length === 0) return map;
  for (const id of contratoIds) map.set(id, 0);

  const supabase = createClient();
  const { data, error } = await supabase
    .from("contrato_agendamentos")
    .select("contrato_id, agendamento_id, contabiliza_previsao, removido_em")
    .in("contrato_id", contratoIds)
    .is("removido_em", null)
    .eq("contabiliza_previsao", true);

  if (error) throw error;
  const agIds = Array.from(
    new Set((data ?? []).map((r) => String(r.agendamento_id)))
  );
  if (agIds.length === 0) return map;

  const { data: ags, error: agErr } = await supabase
    .from("agendamentos")
    .select("id, status")
    .in("id", agIds);
  if (agErr) throw agErr;

  const statusById = new Map(
    (ags ?? []).map((a) => [String(a.id), String(a.status)])
  );

  for (const row of data ?? []) {
    const agId = String(row.agendamento_id);
    const status = statusById.get(agId);
    if (!status || status === "cancelado") continue;
    const cid = String(row.contrato_id);
    map.set(cid, (map.get(cid) ?? 0) + 1);
  }
  return map;
}

export async function carregarAgendamentosVigenciaContrato(params: {
  contrato: ClienteContratoRecord;
  quantidadeContratada: number;
}): Promise<{
  itens: AgendamentoNaVigenciaItem[];
  contagem: ContratoAgendamentoContagem;
}> {
  const { contrato, quantidadeContratada } = params;
  const supabase = createClient();
  const { nomes } = await buscarNomesClienteParaMatch(contrato.cliente_id);
  const dispensado = Boolean(contrato.agendamentos_iniciais_dispensados);

  if (
    !nomes.length ||
    !contrato.data_inicio?.trim() ||
    !contrato.data_fim?.trim()
  ) {
    return {
      itens: [],
      contagem: buildContratoAgendamentoContagem(quantidadeContratada, 0, 0, {
        dispensado,
      }),
    };
  }

  // Busca por nomes do cliente (agendamentos não têm cliente_id).
  const { data: raw, error } = await supabase
    .from("agendamentos")
    .select(AGENDAMENTO_SELECT)
    .gte("data_agendamento", contrato.data_inicio.slice(0, 10))
    .lte("data_agendamento", contrato.data_fim.slice(0, 10))
    .order("data_agendamento", { ascending: true })
    .order("horario", { ascending: true })
    .limit(2000);

  if (error) throw error;

  const nomesNorm = new Set(nomes.map((n) => n.trim().toLowerCase()));
  const agendamentos = ((raw ?? []) as AgendamentoWithExames[]).filter((ag) => {
    const nome = (ag.cliente_nome ?? "").trim().toLowerCase();
    if (!nomesNorm.has(nome)) return false;
    return isDataNaVigencia(
      ag.data_agendamento,
      contrato.data_inicio,
      contrato.data_fim
    );
  });

  const { data: vinculos, error: vErr } = await supabase
    .from("contrato_agendamentos")
    .select("*")
    .is("removido_em", null)
    .eq("contabiliza_previsao", true);
  if (vErr) throw vErr;

  const selecionadosDeste = new Set(
    (vinculos ?? [])
      .filter((v) => v.contrato_id === contrato.id)
      .map((v) => String(v.agendamento_id))
  );

  const emOutroContrato = new Map<string, string>();
  const outrosContratoIds = Array.from(
    new Set(
      (vinculos ?? [])
        .filter((v) => v.contrato_id !== contrato.id)
        .map((v) => String(v.contrato_id))
    )
  );
  const numeroByContrato = new Map<string, string>();
  if (outrosContratoIds.length > 0) {
    const { data: ctrs } = await supabase
      .from("cliente_contratos")
      .select("id, numero")
      .in("id", outrosContratoIds);
    for (const c of ctrs ?? []) {
      numeroByContrato.set(String(c.id), String(c.numero ?? c.id));
    }
    for (const v of vinculos ?? []) {
      if (v.contrato_id === contrato.id) continue;
      emOutroContrato.set(
        String(v.agendamento_id),
        numeroByContrato.get(String(v.contrato_id)) ?? String(v.contrato_id)
      );
    }
  }

  const itens: AgendamentoNaVigenciaItem[] = agendamentos.map((ag) => {
    const selecionado =
      !dispensado && selecionadosDeste.has(ag.id);
    const outro = emOutroContrato.get(ag.id) ?? null;
    const selecionavel =
      !dispensado &&
      isAgendamentoSelecionavel(ag.status) &&
      (!outro || selecionado);
    return {
      agendamento: ag,
      selecionado,
      selecionavel,
      bloqueadoOutroContrato: Boolean(outro) && !selecionado,
      outroContratoNumero: outro,
    };
  });

  const utilizados = dispensado
    ? 0
    : itens.filter(
        (i) =>
          i.selecionado && isAgendamentoSelecionavel(i.agendamento.status)
      ).length;
  const adicionais = itens.filter(
    (i) =>
      !i.selecionado && isAgendamentoSelecionavel(i.agendamento.status)
  ).length;

  return {
    itens,
    contagem: buildContratoAgendamentoContagem(
      quantidadeContratada,
      utilizados,
      adicionais,
      { dispensado }
    ),
  };
}

/** Compat com chamadas antigas da aba. */
export async function carregarResumoAgendamentosContrato(params: {
  contratoId: string;
  quantidadeContratada: number;
}): Promise<{
  agendamentos: AgendamentoWithExames[];
  contagem: ContratoAgendamentoContagem;
}> {
  const contrato = await buscarContratoPorId(params.contratoId);
  if (!contrato) {
    return {
      agendamentos: [],
      contagem: buildContratoAgendamentoContagem(
        params.quantidadeContratada,
        0,
        0
      ),
    };
  }
  const resumo = await carregarAgendamentosVigenciaContrato({
    contrato,
    quantidadeContratada: params.quantidadeContratada,
  });
  return {
    agendamentos: resumo.itens.map((i) => i.agendamento),
    contagem: resumo.contagem,
  };
}

export async function salvarSelecaoAgendamentosContrato(params: {
  contratoId: string;
  agendamentoIdsSelecionados: string[];
  usuarioNome: string;
  quantidadePrevista: number;
}): Promise<void> {
  const {
    contratoId,
    agendamentoIdsSelecionados,
    usuarioNome,
    quantidadePrevista,
  } = params;

  if (agendamentoIdsSelecionados.length > quantidadePrevista) {
    throw new Error(
      `A quantidade prevista de ${quantidadePrevista} colaboradores para este contrato já foi atingida.`
    );
  }

  const supabase = createClient();
  const agora = new Date().toISOString();

  // Validar status e existência
  if (agendamentoIdsSelecionados.length > 0) {
    const { data: ags, error: agStatusErr } = await supabase
      .from("agendamentos")
      .select("id, status, colaborador")
      .in("id", agendamentoIdsSelecionados);
    if (agStatusErr) throw agStatusErr;
    const invalidos = (ags ?? []).filter(
      (a) => !isAgendamentoSelecionavel(String(a.status))
    );
    if (invalidos.length > 0) {
      throw new Error(
        "Agendamento cancelado não pode ser contabilizado no contrato."
      );
    }
  }

  // Validar bloqueio em outros contratos
  if (agendamentoIdsSelecionados.length > 0) {
    const { data: conflitos, error } = await supabase
      .from("contrato_agendamentos")
      .select("agendamento_id, contrato_id")
      .in("agendamento_id", agendamentoIdsSelecionados)
      .eq("contabiliza_previsao", true)
      .is("removido_em", null)
      .neq("contrato_id", contratoId);
    if (error) throw error;
    if (conflitos?.length) {
      const cid = String(conflitos[0].contrato_id);
      const { data: ctr } = await supabase
        .from("cliente_contratos")
        .select("numero")
        .eq("id", cid)
        .maybeSingle();
      throw new Error(
        `Este agendamento já está contabilizado no contrato ${ctr?.numero || cid}.`
      );
    }
  }

  const { data: contratoRow } = await supabase
    .from("cliente_contratos")
    .select("numero, agendamentos_iniciais_dispensados")
    .eq("id", contratoId)
    .maybeSingle();

  if (contratoRow?.agendamentos_iniciais_dispensados) {
    throw new Error(
      "Os agendamentos iniciais deste contrato foram dispensados pelo cliente. Não é possível vincular agendamentos à previsão inicial."
    );
  }

  const contratoNumero = String(contratoRow?.numero ?? contratoId);

  // Soft-remove seleções atuais que saíram
  const { data: atuais, error: atualErr } = await supabase
    .from("contrato_agendamentos")
    .select("id, agendamento_id")
    .eq("contrato_id", contratoId)
    .is("removido_em", null)
    .eq("contabiliza_previsao", true);
  if (atualErr) throw atualErr;

  const selectedSet = new Set(agendamentoIdsSelecionados);
  const removidos = (atuais ?? []).filter(
    (r) => !selectedSet.has(String(r.agendamento_id))
  );
  const removerIds = removidos.map((r) => String(r.id));
  const adicionados = agendamentoIdsSelecionados.filter(
    (id) => !(atuais ?? []).some((r) => String(r.agendamento_id) === id)
  );

  if (removerIds.length > 0) {
    const { error } = await supabase
      .from("contrato_agendamentos")
      .update({
        contabiliza_previsao: false,
        removido_em: agora,
        removido_por: usuarioNome,
        updated_at: agora,
      })
      .in("id", removerIds);
    if (error) throw error;
  }

  // Upsert novas seleções
  for (const agendamentoId of agendamentoIdsSelecionados) {
    const { data: existing } = await supabase
      .from("contrato_agendamentos")
      .select("id")
      .eq("contrato_id", contratoId)
      .eq("agendamento_id", agendamentoId)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabase
        .from("contrato_agendamentos")
        .update({
          contabiliza_previsao: true,
          removido_em: null,
          removido_por: null,
          vinculado_por: usuarioNome,
          vinculado_em: agora,
          updated_at: agora,
        })
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("contrato_agendamentos").insert({
        contrato_id: contratoId,
        agendamento_id: agendamentoId,
        contabiliza_previsao: true,
        vinculado_por: usuarioNome,
        vinculado_em: agora,
      });
      if (error) throw error;
    }
  }

  // Auditoria de alterações de seleção
  const idsParaNome = [
    ...adicionados,
    ...removidos.map((r) => String(r.agendamento_id)),
  ];
  let nomesById = new Map<string, string>();
  if (idsParaNome.length > 0) {
    const { data: nomeRows } = await supabase
      .from("agendamentos")
      .select("id, colaborador")
      .in("id", idsParaNome);
    nomesById = new Map(
      (nomeRows ?? []).map((r) => [
        String(r.id),
        String(r.colaborador ?? r.id),
      ])
    );
  }

  const { registrarAuditoria } = await import("@/services/auditoria.service");
  const { AUDITORIA_ACOES, AUDITORIA_MODULOS } = await import(
    "@/lib/auditoria"
  );

  for (const id of adicionados) {
    const nome = nomesById.get(id) ?? id;
    await registrarAuditoria({
      usuarioNome,
      usuarioEmail: "",
      modulo: AUDITORIA_MODULOS.orcamentos,
      acao: AUDITORIA_ACOES.vinculo_contrato_implantacao,
      registroId: contratoId,
      registroNome: contratoNumero,
      descricao: `${usuarioNome} vinculou ${nome} ao contrato ${contratoNumero}.`,
    });
  }
  for (const row of removidos) {
    const id = String(row.agendamento_id);
    const nome = nomesById.get(id) ?? id;
    await registrarAuditoria({
      usuarioNome,
      usuarioEmail: "",
      modulo: AUDITORIA_MODULOS.orcamentos,
      acao: AUDITORIA_ACOES.sem_vinculo_contrato_implantacao,
      registroId: contratoId,
      registroNome: contratoNumero,
      descricao: `${usuarioNome} removeu ${nome} do contrato ${contratoNumero}.`,
    });
  }

  const utilizados = agendamentoIdsSelecionados.length;
  const concluiu = quantidadePrevista > 0 && utilizados >= quantidadePrevista;
  const antes = (atuais ?? []).length;
  const antesConcluido = quantidadePrevista > 0 && antes >= quantidadePrevista;
  if (antesConcluido !== concluiu) {
    await registrarAuditoria({
      usuarioNome,
      usuarioEmail: "",
      modulo: AUDITORIA_MODULOS.orcamentos,
      acao: AUDITORIA_ACOES.edicao,
      registroId: contratoId,
      registroNome: contratoNumero,
      descricao: concluiu
        ? `${usuarioNome} concluiu a etapa Agendamentos do contrato ${contratoNumero} (${utilizados} de ${quantidadePrevista}).`
        : `${usuarioNome} reabriu a etapa Agendamentos do contrato ${contratoNumero} (${utilizados} de ${quantidadePrevista}).`,
    });
  }
}

/** Ao cancelar agendamento: deixa de contabilizar previsão. */
export async function invalidarContabilizacaoPorCancelamento(
  agendamentoId: string,
  usuarioNome: string
): Promise<void> {
  const supabase = createClient();
  const agora = new Date().toISOString();

  const { data: vinculos } = await supabase
    .from("contrato_agendamentos")
    .select("id, contrato_id")
    .eq("agendamento_id", agendamentoId)
    .eq("contabiliza_previsao", true)
    .is("removido_em", null);

  if (!vinculos?.length) return;

  const { error } = await supabase
    .from("contrato_agendamentos")
    .update({
      contabiliza_previsao: false,
      removido_em: agora,
      removido_por: usuarioNome,
      updated_at: agora,
    })
    .eq("agendamento_id", agendamentoId)
    .eq("contabiliza_previsao", true)
    .is("removido_em", null);
  if (error) throw error;

  const { data: ag } = await supabase
    .from("agendamentos")
    .select("colaborador")
    .eq("id", agendamentoId)
    .maybeSingle();
  const colaborador = String(ag?.colaborador ?? agendamentoId);

  const { registrarAuditoria } = await import("@/services/auditoria.service");
  const { AUDITORIA_ACOES, AUDITORIA_MODULOS } = await import(
    "@/lib/auditoria"
  );

  for (const v of vinculos) {
    const { data: ctr } = await supabase
      .from("cliente_contratos")
      .select("numero")
      .eq("id", v.contrato_id)
      .maybeSingle();
    const numero = String(ctr?.numero ?? v.contrato_id);
    await registrarAuditoria({
      usuarioNome,
      usuarioEmail: "",
      modulo: AUDITORIA_MODULOS.agendamentos,
      acao: AUDITORIA_ACOES.cancelamento,
      registroId: String(v.contrato_id),
      registroNome: numero,
      descricao: `${usuarioNome} cancelou o agendamento de ${colaborador}; a contabilização no contrato ${numero} foi removida automaticamente.`,
    });
  }
}

export async function dispensarAgendamentosIniciaisContrato(params: {
  contratoId: string;
  motivo: string;
  usuarioNome: string;
  quantidadePrevista: number;
  clienteNome?: string;
}): Promise<void> {
  const motivo = params.motivo.trim();
  if (!motivo) {
    throw new Error("Informe o motivo / observação da dispensa.");
  }

  const supabase = createClient();
  const { data: contrato, error: cErr } = await supabase
    .from("cliente_contratos")
    .select(
      "id, numero, cliente_id, agendamentos_iniciais_dispensados, quantidade_colaboradores"
    )
    .eq("id", params.contratoId)
    .maybeSingle();
  if (cErr) throw cErr;
  if (!contrato) throw new Error("Contrato não encontrado.");

  if (contrato.agendamentos_iniciais_dispensados) {
    throw new Error(
      "Os agendamentos iniciais deste contrato já estão dispensados."
    );
  }

  const vinculos = await listarVinculosAtivosPorContrato(params.contratoId);
  if (vinculos.length > 0) {
    throw new Error(
      `Este contrato já possui ${vinculos.length} agendamento${
        vinculos.length === 1 ? "" : "s"
      } contabilizado${
        vinculos.length === 1 ? "" : "s"
      }. Remova os vínculos antes de registrar que o cliente não realizará os agendamentos iniciais.`
    );
  }

  const agora = new Date().toISOString();
  const { error } = await supabase
    .from("cliente_contratos")
    .update({
      agendamentos_iniciais_dispensados: true,
      motivo_dispensa_agendamentos: motivo,
      dispensado_em: agora,
      dispensado_por: params.usuarioNome,
      updated_at: agora,
    })
    .eq("id", params.contratoId);
  if (error) throw error;

  let clienteNome = (params.clienteNome ?? "").trim();
  if (!clienteNome && contrato.cliente_id) {
    const { data: cli } = await supabase
      .from("clientes")
      .select("nome")
      .eq("id", contrato.cliente_id)
      .maybeSingle();
    clienteNome = String(cli?.nome ?? "").trim();
  }

  const numero = String(contrato.numero ?? params.contratoId);
  const qtd =
    params.quantidadePrevista ||
    Number(contrato.quantidade_colaboradores) ||
    0;
  const { registrarAuditoria } = await import("@/services/auditoria.service");
  const { AUDITORIA_ACOES, AUDITORIA_MODULOS } = await import(
    "@/lib/auditoria"
  );
  await registrarAuditoria({
    usuarioNome: params.usuarioNome,
    usuarioEmail: "",
    modulo: AUDITORIA_MODULOS.orcamentos,
    acao: AUDITORIA_ACOES.dispensa_agendamentos_iniciais,
    registroId: params.contratoId,
    registroNome: numero,
    descricao: `${params.usuarioNome} registrou que o cliente ${
      clienteNome || "—"
    } optou por não realizar os ${qtd} agendamentos iniciais do contrato ${numero}. Motivo: ${motivo}`,
  });
}

export async function reabrirAgendamentosIniciaisContrato(params: {
  contratoId: string;
  motivo: string;
  usuarioNome: string;
  clienteNome?: string;
}): Promise<void> {
  const motivo = params.motivo.trim();
  if (!motivo) {
    throw new Error("Informe o motivo da reabertura.");
  }

  const supabase = createClient();
  const { data: contrato, error: cErr } = await supabase
    .from("cliente_contratos")
    .select(
      "id, numero, cliente_id, agendamentos_iniciais_dispensados"
    )
    .eq("id", params.contratoId)
    .maybeSingle();
  if (cErr) throw cErr;
  if (!contrato) throw new Error("Contrato não encontrado.");

  if (!contrato.agendamentos_iniciais_dispensados) {
    throw new Error(
      "Os agendamentos iniciais deste contrato não estão dispensados."
    );
  }

  const agora = new Date().toISOString();
  const { error } = await supabase
    .from("cliente_contratos")
    .update({
      agendamentos_iniciais_dispensados: false,
      reaberto_em: agora,
      reaberto_por: params.usuarioNome,
      motivo_reabertura: motivo,
      updated_at: agora,
    })
    .eq("id", params.contratoId);
  if (error) throw error;

  let clienteNome = (params.clienteNome ?? "").trim();
  if (!clienteNome && contrato.cliente_id) {
    const { data: cli } = await supabase
      .from("clientes")
      .select("nome")
      .eq("id", contrato.cliente_id)
      .maybeSingle();
    clienteNome = String(cli?.nome ?? "").trim();
  }

  const numero = String(contrato.numero ?? params.contratoId);
  const { registrarAuditoria } = await import("@/services/auditoria.service");
  const { AUDITORIA_ACOES, AUDITORIA_MODULOS } = await import(
    "@/lib/auditoria"
  );
  await registrarAuditoria({
    usuarioNome: params.usuarioNome,
    usuarioEmail: "",
    modulo: AUDITORIA_MODULOS.orcamentos,
    acao: AUDITORIA_ACOES.reabertura_agendamentos_iniciais,
    registroId: params.contratoId,
    registroNome: numero,
    descricao: `${params.usuarioNome} reabriu os agendamentos iniciais do contrato ${numero}${
      clienteNome ? ` (cliente ${clienteNome})` : ""
    }. Motivo: ${motivo}`,
  });
}

// Mantidos para compatibilidade de imports legados (sem uso no novo fluxo de criação).
export type ContratoAptoAgendamento = {
  contrato: ClienteContratoRecord;
  realizados: number;
  contratados: number;
  disponiveis: number;
  origemLabel: string;
};

export async function listarContratosComSaldoParaVinculo(_clienteNome: string) {
  return { comSaldo: [] as ContratoAptoAgendamento[], semSaldo: [] as ContratoAptoAgendamento[] };
}

export async function listarContratosAptosParaAgendamento(_clienteNome: string) {
  return [] as ContratoAptoAgendamento[];
}

export async function resolverConsomeSaldoAoVincular() {
  return false;
}
