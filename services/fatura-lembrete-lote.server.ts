import type { AuditoriaUsuarioContext } from "@/lib/auditoria";
import { todayIsoSaoPaulo } from "@/lib/agendamento-datetime";
import { isEmailValido } from "@/lib/email-validacao";
import {
  buildLembreteFaturaTexto,
  dataVencimentoCivil,
  diasAtrasoCivil,
  faturaElegivelLembreteHoje,
  faturaElegivelLembreteVencida,
  lembreteAceitoNoDia,
  resolverEmailFaturamentoEmpresa,
  selecionarFaturasLembreteHoje,
  selecionarFaturasLembreteVencida,
  type EnvioFaturamentoEmpresa,
  type FaturaLembreteHojeAlvo,
} from "@/lib/fatura-lembrete";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarLembreteFaturaClienteResend } from "@/services/fatura-lembrete-email.server";
import {
  liberarLembreteExecucao,
  reservarLembreteExecucao,
  type ReservaLembrete,
} from "@/services/fatura-lembrete-lock.server";

const PAGINA = 1000;

export type FaturaLembreteHojePendente = FaturaLembreteHojeAlvo & {
  email: string;
  jaLembradaHoje: boolean;
  diasAtraso: number;
};

export type ModoLembreteLote = "hoje" | "vencidas";

export type PainelLembretesHoje = {
  hojeIso: string;
  elegiveis: number;
  pendentes: FaturaLembreteHojePendente[];
  jaLembradas: { id: string; numero: string; empresa: string }[];
};

export type ResultadoLembreteHojeItem = {
  faturaId: string;
  numero: string;
  empresa: string;
  valor: number;
  tipo: "aceito" | "sem_email" | "ja_lembrada" | "falha";
  email?: string | null;
  motivo?: string;
  enviadoEm?: string;
  resendMessageId?: string | null;
};

export type ResultadoLembretesHoje = {
  hojeIso: string;
  aceitos: ResultadoLembreteHojeItem[];
  semEmail: ResultadoLembreteHojeItem[];
  jaLembradas: ResultadoLembreteHojeItem[];
  falhas: ResultadoLembreteHojeItem[];
};

type ReservaLote = ReservaLembrete;

export type LembretesHojeDeps = {
  hojeIso: () => string;
  agoraMs: () => number;
  listarCandidatas: (hojeIso: string) => Promise<FaturaLembreteHojeAlvo[]>;
  modo: ModoLembreteLote;
  listarEnviosEmpresa: (
    referenciaIds: string[]
  ) => Promise<EnvioFaturamentoEmpresa[]>;
  listarLembretes: (
    faturaIds: string[]
  ) => Promise<{ fatura_id: string; enviado_em: string }[]>;
  buscarFatura: (faturaId: string) => Promise<FaturaLembreteHojeAlvo | null>;
  reservar: (faturaId: string, diaCivil: string) => Promise<ReservaLote>;
  liberar: (faturaId: string, diaCivil: string) => Promise<void>;
  enviarUm: (params: {
    faturaId: string;
    email: string;
    assunto: string;
    mensagem: string;
    requestId: string;
    request?: Request;
    auditContext?: AuditoriaUsuarioContext;
  }) => Promise<{
    enviadoEm: string;
    email: string;
    resendMessageId: string | null;
    reutilizado: boolean;
  }>;
};

export async function listarPaginas<T>(
  buscar: (from: number, to: number) => Promise<T[]>,
  tamanho = PAGINA
): Promise<T[]> {
  const todos: T[] = [];
  let from = 0;
  for (;;) {
    const pagina = await buscar(from, from + tamanho - 1);
    todos.push(...pagina);
    if (pagina.length < tamanho) break;
    from += tamanho;
  }
  return todos;
}

function mapFatura(row: Record<string, unknown>): FaturaLembreteHojeAlvo {
  return {
    id: String(row.id),
    numero: String(row.numero ?? ""),
    tipo: row.tipo === "clinica" ? "clinica" : "cliente",
    status: String(row.status ?? "rascunho") as FaturaLembreteHojeAlvo["status"],
    pago: Boolean(row.pago),
    referencia_id: row.referencia_id ? String(row.referencia_id) : null,
    referencia_nome: String(row.referencia_nome ?? ""),
    data_vencimento: String(row.data_vencimento ?? ""),
    mes_referencia: row.mes_referencia ? String(row.mes_referencia) : null,
    periodo_inicio: row.periodo_inicio ? String(row.periodo_inicio) : null,
    valor_total: Number(row.valor_total ?? 0),
    fatura_enviada_email: row.fatura_enviada_email
      ? String(row.fatura_enviada_email)
      : null,
    fatura_enviada_em: row.fatura_enviada_em
      ? String(row.fatura_enviada_em)
      : null,
  };
}

const COLUNAS_FATURA =
  "id, numero, tipo, status, pago, referencia_id, referencia_nome, data_vencimento, mes_referencia, periodo_inicio, valor_total, fatura_enviada_email, fatura_enviada_em";

async function listarCandidatasAdmin(hojeIso: string): Promise<FaturaLembreteHojeAlvo[]> {
  const admin = createAdminClient();
  const rows = await listarPaginas(async (from, to) => {
    const { data, error } = await admin
      .from("faturas")
      .select(COLUNAS_FATURA)
      .eq("tipo", "cliente")
      .eq("status", "emitida")
      .eq("pago", false)
      .eq("data_vencimento", hojeIso)
      .order("numero", { ascending: true })
      .range(from, to);
    if (error) throw error;
    return (data ?? []) as Record<string, unknown>[];
  });
  return selecionarFaturasLembreteHoje(rows.map(mapFatura), hojeIso);
}

async function listarEnviosEmpresaAdmin(
  referenciaIds: string[]
): Promise<EnvioFaturamentoEmpresa[]> {
  if (referenciaIds.length === 0) return [];
  const admin = createAdminClient();
  const rows = await listarPaginas(async (from, to) => {
    const { data, error } = await admin
      .from("faturas")
      .select("id, referencia_id, fatura_enviada_email, fatura_enviada_em")
      .eq("tipo", "cliente")
      .in("referencia_id", referenciaIds)
      .not("fatura_enviada_em", "is", null)
      .order("fatura_enviada_em", { ascending: false })
      .range(from, to);
    if (error) throw error;
    return (data ?? []) as EnvioFaturamentoEmpresa[];
  });
  return rows;
}

async function listarLembretesAdmin(
  faturaIds: string[]
): Promise<{ fatura_id: string; enviado_em: string }[]> {
  if (faturaIds.length === 0) return [];
  const admin = createAdminClient();
  const rows = await listarPaginas(async (from, to) => {
    const { data, error } = await admin
      .from("fatura_lembretes")
      .select("fatura_id, enviado_em")
      .in("fatura_id", faturaIds)
      .order("enviado_em", { ascending: false })
      .range(from, to);
    if (error) throw error;
    return (data ?? []) as { fatura_id: string; enviado_em: string }[];
  });
  return rows;
}

async function listarCandidatasVencidasAdmin(
  hojeIso: string
): Promise<FaturaLembreteHojeAlvo[]> {
  const admin = createAdminClient();
  const rows = await listarPaginas(async (from, to) => {
    const { data, error } = await admin
      .from("faturas")
      .select(COLUNAS_FATURA)
      .eq("tipo", "cliente")
      .in("status", ["emitida", "vencida"])
      .eq("pago", false)
      .lt("data_vencimento", hojeIso)
      .order("data_vencimento", { ascending: true })
      .order("numero", { ascending: true })
      .range(from, to);
    if (error) throw error;
    return (data ?? []) as Record<string, unknown>[];
  });
  return selecionarFaturasLembreteVencida(rows.map(mapFatura), hojeIso);
}

async function buscarFaturaAdmin(
  faturaId: string
): Promise<FaturaLembreteHojeAlvo | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("faturas")
    .select(COLUNAS_FATURA)
    .eq("id", faturaId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapFatura(data as Record<string, unknown>);
}

function defaultDeps(modo: ModoLembreteLote = "hoje"): LembretesHojeDeps {
  return {
    hojeIso: () => todayIsoSaoPaulo(),
    agoraMs: () => Date.now(),
    modo,
    listarCandidatas:
      modo === "vencidas" ? listarCandidatasVencidasAdmin : listarCandidatasAdmin,
    listarEnviosEmpresa: listarEnviosEmpresaAdmin,
    listarLembretes: listarLembretesAdmin,
    buscarFatura: buscarFaturaAdmin,
    reservar: reservarLembreteExecucao,
    liberar: liberarLembreteExecucao,
    enviarUm: async (params) => {
      const result = await enviarLembreteFaturaClienteResend(params);
      return {
        enviadoEm: result.faturaLembreteUltimoEm,
        email: result.faturaLembreteUltimoEmail,
        resendMessageId: result.resendMessageId,
        reutilizado: result.reutilizado,
      };
    },
  };
}

function montarPainel(
  candidatas: FaturaLembreteHojeAlvo[],
  envios: EnvioFaturamentoEmpresa[],
  lembretes: { fatura_id: string; enviado_em: string }[],
  hojeIso: string,
  modo: ModoLembreteLote
): PainelLembretesHoje {
  const elegiveis =
    modo === "vencidas"
      ? selecionarFaturasLembreteVencida(candidatas, hojeIso)
      : selecionarFaturasLembreteHoje(candidatas, hojeIso);
  const pendentes: FaturaLembreteHojePendente[] = [];
  const jaLembradas: PainelLembretesHoje["jaLembradas"] = [];

  for (const fatura of elegiveis) {
    const lembrada = lembretes.some(
      (item) =>
        item.fatura_id === fatura.id &&
        lembreteAceitoNoDia(item.enviado_em, hojeIso)
    );
    if (lembrada) {
      jaLembradas.push({
        id: fatura.id,
        numero: fatura.numero,
        empresa: fatura.referencia_nome,
      });
      continue;
    }
    pendentes.push({
      ...fatura,
      email: resolverEmailFaturamentoEmpresa(fatura, envios),
      jaLembradaHoje: false,
      diasAtraso: diasAtrasoCivil(fatura.data_vencimento, hojeIso),
    });
  }

  return {
    hojeIso,
    elegiveis: elegiveis.length,
    pendentes,
    jaLembradas,
  };
}

export async function consultarLembretesHoje(
  deps: Partial<LembretesHojeDeps> = {}
): Promise<PainelLembretesHoje> {
  return consultarLote("hoje", deps);
}

export async function consultarLembretesVencidas(
  deps: Partial<LembretesHojeDeps> = {}
): Promise<PainelLembretesHoje> {
  return consultarLote("vencidas", deps);
}

async function consultarLote(
  modo: ModoLembreteLote,
  deps: Partial<LembretesHojeDeps>
): Promise<PainelLembretesHoje> {
  const merged = { ...defaultDeps(modo), ...deps, modo };
  const hojeIso = merged.hojeIso();
  const candidatas = await merged.listarCandidatas(hojeIso);
  const referenciaIds = Array.from(
    new Set(
      candidatas
        .map((fatura) => fatura.referencia_id?.trim() ?? "")
        .filter(Boolean)
    )
  );
  const [envios, lembretes] = await Promise.all([
    merged.listarEnviosEmpresa(referenciaIds),
    merged.listarLembretes(candidatas.map((fatura) => fatura.id)),
  ]);
  return montarPainel(candidatas, envios, lembretes, hojeIso, merged.modo);
}

function motivoForaDoLote(
  fatura: FaturaLembreteHojeAlvo,
  hojeIso: string,
  modo: ModoLembreteLote
): string {
  const vencimento = dataVencimentoCivil(fatura.data_vencimento);
  if (fatura.pago) return "Não é possível enviar lembrete de fatura paga.";
  if (fatura.status === "cancelada") {
    return "Não é possível enviar lembrete de fatura cancelada.";
  }
  if (modo === "vencidas") {
    if (fatura.status !== "emitida" && fatura.status !== "vencida") {
      return "A fatura não está emitida nem vencida.";
    }
    if (vencimento === hojeIso) {
      return "A fatura vence hoje e não entra no lote de vencidas.";
    }
    if (vencimento > hojeIso) return "A fatura ainda não venceu.";
    return "Esta fatura não entra no lote de vencidas.";
  }
  if (fatura.status !== "emitida") return "A fatura não está com status emitida.";
  if (vencimento !== hojeIso) return "A fatura não vence na data de hoje.";
  return "Esta fatura não entra no lote de hoje.";
}

function itemBase(fatura: FaturaLembreteHojeAlvo): Omit<
  ResultadoLembreteHojeItem,
  "tipo"
> {
  return {
    faturaId: fatura.id,
    numero: fatura.numero,
    empresa: fatura.referencia_nome,
    valor: Number(fatura.valor_total),
  };
}

async function processarUma(
  faturaId: string,
  merged: LembretesHojeDeps,
  hojeIso: string,
  request: Request | undefined,
  auditContext: AuditoriaUsuarioContext | undefined,
  enviosCache: Map<string, EnvioFaturamentoEmpresa[]>
): Promise<ResultadoLembreteHojeItem> {
  const fatura = await merged.buscarFatura(faturaId);
  if (!fatura) {
    return {
      faturaId,
      numero: "—",
      empresa: "—",
      valor: 0,
      tipo: "falha",
      motivo: "Fatura não encontrada.",
    };
  }

  const modo = merged.modo;
  if (
    modo === "vencidas"
      ? !faturaElegivelLembreteVencida(fatura, hojeIso)
      : !faturaElegivelLembreteHoje(fatura, hojeIso)
  ) {
    return {
      ...itemBase(fatura),
      tipo: "falha",
      motivo: motivoForaDoLote(fatura, hojeIso, modo),
    };
  }

  const lembretes = await merged.listarLembretes([fatura.id]);
  if (
    lembretes.some((item) => lembreteAceitoNoDia(item.enviado_em, hojeIso))
  ) {
    return { ...itemBase(fatura), tipo: "ja_lembrada" };
  }

  const ref = fatura.referencia_id?.trim() ?? "";
  let envios = ref ? enviosCache.get(ref) : [];
  if (ref && !envios) {
    envios = await merged.listarEnviosEmpresa([ref]);
    enviosCache.set(ref, envios);
  }
  const email = resolverEmailFaturamentoEmpresa(fatura, envios ?? []);
  if (!isEmailValido(email)) {
    return { ...itemBase(fatura), tipo: "sem_email", email: email || null };
  }

  let reservou = false;
  try {
    const reserva = await merged.reservar(fatura.id, hojeIso);
    if (reserva === "ocupado") {
      return {
        ...itemBase(fatura),
        tipo: "falha",
        motivo: "Outro envio desta fatura já está em andamento.",
      };
    }
    reservou = true;

    const deNovo = await merged.buscarFatura(fatura.id);
    if (!deNovo || !(modo === "vencidas"
      ? faturaElegivelLembreteVencida(deNovo, hojeIso)
      : faturaElegivelLembreteHoje(deNovo, hojeIso))) {
      return {
        ...itemBase(deNovo ?? fatura),
        tipo: "falha",
        motivo: deNovo
          ? motivoForaDoLote(deNovo, hojeIso, modo)
          : "Fatura não encontrada.",
      };
    }
    const lembretesPosLock = await merged.listarLembretes([fatura.id]);
    if (
      lembretesPosLock.some((item) =>
        lembreteAceitoNoDia(item.enviado_em, hojeIso)
      )
    ) {
      return { ...itemBase(deNovo), tipo: "ja_lembrada" };
    }

    const texto =
      modo === "vencidas"
        ? buildLembreteFaturaTexto({
            numero: deNovo.numero,
            clienteNome: deNovo.referencia_nome,
            valor: Number(deNovo.valor_total),
            dataVencimento: deNovo.data_vencimento,
            hojeIso,
          })
        : buildLembreteFaturaTexto({
            numero: deNovo.numero,
            clienteNome: deNovo.referencia_nome,
            valor: Number(deNovo.valor_total),
            dataVencimento: deNovo.data_vencimento,
            mesReferencia: deNovo.mes_referencia,
            periodoInicio: deNovo.periodo_inicio,
            escopo: deNovo.tipo === "cliente" ? "exames_ocupacionais" : "outro",
            hojeIso,
          });
    const enviado = await merged.enviarUm({
      faturaId: deNovo.id,
      email,
      assunto: texto.assunto,
      mensagem: texto.mensagem,
      requestId: crypto.randomUUID(),
      request,
      auditContext,
    });
    if (enviado.reutilizado) {
      return {
        ...itemBase(deNovo),
        tipo: "ja_lembrada",
        email: enviado.email,
      };
    }
    return {
      ...itemBase(deNovo),
      tipo: "aceito",
      email: enviado.email,
      enviadoEm: enviado.enviadoEm,
      resendMessageId: enviado.resendMessageId,
    };
  } catch (err) {
    return {
      ...itemBase(fatura),
      tipo: "falha",
      email,
      motivo:
        err instanceof Error
          ? err.message
          : "Não foi possível enviar o lembrete. O envio não foi registrado.",
    };
  } finally {
    if (reservou) await merged.liberar(fatura.id, hojeIso);
  }
}

async function executarLote(
  modo: ModoLembreteLote,
  params: {
    request?: Request;
    auditContext?: AuditoriaUsuarioContext;
  },
  deps: Partial<LembretesHojeDeps>
): Promise<ResultadoLembretesHoje> {
  const merged = { ...defaultDeps(modo), ...deps, modo };
  const hojeIso = merged.hojeIso();
  const painel =
    modo === "vencidas"
      ? await consultarLembretesVencidas(merged)
      : await consultarLembretesHoje(merged);
  const resultado: ResultadoLembretesHoje = {
    hojeIso,
    aceitos: [],
    semEmail: [],
    jaLembradas: painel.jaLembradas.map((item) => ({
      faturaId: item.id,
      numero: item.numero,
      empresa: item.empresa,
      valor: 0,
      tipo: "ja_lembrada",
    })),
    falhas: [],
  };

  const enviosCache = new Map<string, EnvioFaturamentoEmpresa[]>();
  for (const pendente of painel.pendentes) {
    const item = await processarUma(
      pendente.id,
      merged,
      hojeIso,
      params.request,
      params.auditContext,
      enviosCache
    );
    if (item.tipo === "aceito") resultado.aceitos.push(item);
    else if (item.tipo === "sem_email") resultado.semEmail.push(item);
    else if (item.tipo === "ja_lembrada") resultado.jaLembradas.push(item);
    else resultado.falhas.push(item);
  }

  return resultado;
}

/**
 * Envia um lembrete por fatura que vence hoje. A seleção é refeita no
 * servidor e não usa filtro nem página da tela. Não dispara e-mail em lote
 * para várias empresas.
 */
export async function executarLembretesHoje(
  params: {
    request?: Request;
    auditContext?: AuditoriaUsuarioContext;
  } = {},
  deps: Partial<LembretesHojeDeps> = {}
): Promise<ResultadoLembretesHoje> {
  return executarLote("hoje", params, deps);
}

export async function executarLembretesVencidas(
  params: {
    request?: Request;
    auditContext?: AuditoriaUsuarioContext;
  } = {},
  deps: Partial<LembretesHojeDeps> = {}
): Promise<ResultadoLembretesHoje> {
  return executarLote("vencidas", params, deps);
}

export async function executarLembreteHojeUma(
  faturaId: string,
  params: {
    request?: Request;
    auditContext?: AuditoriaUsuarioContext;
  } = {},
  deps: Partial<LembretesHojeDeps> = {}
): Promise<ResultadoLembreteHojeItem> {
  const merged = { ...defaultDeps("hoje"), ...deps, modo: "hoje" as const };
  const hojeIso = merged.hojeIso();
  return processarUma(
    faturaId,
    merged,
    hojeIso,
    params.request,
    params.auditContext,
    new Map()
  );
}

export async function executarLembreteVencidaUma(
  faturaId: string,
  params: {
    request?: Request;
    auditContext?: AuditoriaUsuarioContext;
  } = {},
  deps: Partial<LembretesHojeDeps> = {}
): Promise<ResultadoLembreteHojeItem> {
  const merged = {
    ...defaultDeps("vencidas"),
    ...deps,
    modo: "vencidas" as const,
  };
  const hojeIso = merged.hojeIso();
  return processarUma(
    faturaId,
    merged,
    hojeIso,
    params.request,
    params.auditContext,
    new Map()
  );
}
