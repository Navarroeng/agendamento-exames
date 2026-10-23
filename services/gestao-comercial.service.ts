import { createClient } from "@/lib/supabase/client";
import {
  montarFechamentoGestaoComercial,
  type GestaoComercialFechamentoRow,
  type GestaoComercialHistoricoMensal,
} from "@/lib/gestao-comercial";
import type {
  FonteMensalidadePrevista,
  VigenciaMensalidadePrevista,
} from "@/lib/gestao-comercial-mensalidades";
import {
  MENSALIDADE_PARCELAS_MIGRATION_MSG,
  type ParcelaMensalidadeRegistrada,
} from "@/lib/mensalidade-parcelas";
import { isOrcamentoOrigemCliente } from "@/lib/orcamento-origem";
import { isPerfilAdmin } from "@/lib/permissions";
import { normalizePerfilUsuario } from "@/lib/contrato-permissoes";
import type { ClienteContratoStatus, ClienteContratoTipo } from "@/lib/types";

export class GestaoComercialForbiddenError extends Error {
  constructor(message = "Acesso restrito a administradores.") {
    super(message);
    this.name = "GestaoComercialForbiddenError";
  }
}

async function assertAdminGestaoComercial(): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new GestaoComercialForbiddenError();

  const { data: perfil, error } = await supabase
    .from("perfis_usuarios")
    .select("perfil")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  const normalized = normalizePerfilUsuario(perfil?.perfil);
  if (!isPerfilAdmin(normalized)) {
    throw new GestaoComercialForbiddenError();
  }
}

type ContratoQueryRow = {
  id: string;
  numero: string | null;
  status: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  encerrado_em: string | null;
  tipo_contrato: string | null;
  condicao_pagamento: string | null;
  contrato_assinado_em: string | null;
  boleto_pago: boolean | null;
};

type AprovacaoQueryRow = {
  id: string;
  orcamento_id: string;
  aprovado_em: string;
  valor_final: number | null;
  quantidade_colaboradores: number | null;
  condicao_pagamento: string | null;
  quantidade_parcelas: number | null;
  valor_parcela: number | null;
  valor_avista: number | null;
  mensalidade_pagamento: string | null;
  mensalidade_valor_mensal: number | null;
  mensalidade_meses: number | null;
  mensalidade_valor_bruto: number | null;
  mensalidade_valor_pontual: number | null;
  mensalidade_desconto_valor: number | null;
  responsavel_no_fechamento: string | null;
  responsavel_no_fechamento_aproximado: boolean | null;
  orcamentos: {
    id: string;
    numero: string;
    cliente_nome: string;
    cliente_cnpj: string;
    origem_cliente: string | null;
    responsavel: string | null;
    valor_total: number | null;
    status: string | null;
    modalidade: string | null;
    cliente_contratos: ContratoQueryRow[] | ContratoQueryRow | null;
  } | null;
};

/**
 * Carrega todos os fechamentos (aprovações) para a camada única de cálculo.
 * Backend valida ADM.
 */
export async function listarFechamentosGestaoComercial(): Promise<
  GestaoComercialFechamentoRow[]
> {
  await assertAdminGestaoComercial();
  const supabase = createClient();

  const { data, error } = await supabase
    .from("orcamento_aprovacoes")
    .select(
      `
      id,
      orcamento_id,
      aprovado_em,
      valor_final,
      quantidade_colaboradores,
      condicao_pagamento,
      quantidade_parcelas,
      valor_parcela,
      valor_avista,
      mensalidade_pagamento,
      mensalidade_valor_mensal,
      mensalidade_meses,
      mensalidade_valor_bruto,
      mensalidade_valor_pontual,
      mensalidade_desconto_valor,
      responsavel_no_fechamento,
      responsavel_no_fechamento_aproximado,
      orcamentos!inner (
        id,
        numero,
        cliente_nome,
        cliente_cnpj,
        origem_cliente,
        responsavel,
        valor_total,
        status,
        modalidade,
        cliente_contratos (
          id,
          numero,
          status,
          data_inicio,
          data_fim,
          encerrado_em,
          tipo_contrato,
          condicao_pagamento,
          contrato_assinado_em,
          boleto_pago
        )
      )
      `
    )
    .order("aprovado_em", { ascending: false });

  if (error) throw error;

  const rows: GestaoComercialFechamentoRow[] = [];
  for (const raw of (data ?? []) as unknown as AprovacaoQueryRow[]) {
    const orc = raw.orcamentos;
    if (!orc) continue;

    const contratos = Array.isArray(orc.cliente_contratos)
      ? orc.cliente_contratos
      : orc.cliente_contratos
        ? [orc.cliente_contratos]
        : [];
    const contrato = contratos[0] ?? null;

    const origem = isOrcamentoOrigemCliente(orc.origem_cliente)
      ? orc.origem_cliente
      : null;

    const responsavel =
      (raw.responsavel_no_fechamento ?? "").trim() ||
      (orc.responsavel ?? "").trim() ||
      "Não informado";

    rows.push(
      montarFechamentoGestaoComercial({
        aprovacaoId: raw.id,
        orcamentoId: orc.id,
        aprovadoEm: raw.aprovado_em,
        numeroOrcamento: orc.numero,
        clienteNome: orc.cliente_nome,
        clienteCnpj: orc.cliente_cnpj,
        origem,
        responsavelNoFechamento: responsavel,
        responsavelAproximado:
          raw.responsavel_no_fechamento_aproximado === true ||
          !(raw.responsavel_no_fechamento ?? "").trim(),
        quantidadeColaboradores: Number(raw.quantidade_colaboradores) || 0,
        orcamentoStatus: orc.status,
        modalidade: orc.modalidade,
        mensalidadePagamento: raw.mensalidade_pagamento,
        valorMensal: raw.mensalidade_valor_mensal ?? raw.valor_final,
        valorMensalOriginal: orc.valor_total,
        meses: raw.mensalidade_meses,
        condicaoPagamento: raw.condicao_pagamento,
        valorBruto: raw.mensalidade_valor_bruto,
        valorPontual: raw.mensalidade_valor_pontual,
        descontoValor: raw.mensalidade_desconto_valor,
        valorAvista: raw.valor_avista,
        valorFinal: raw.valor_final,
        valorTotalOrcamento: orc.valor_total,
        quantidadeParcelas: raw.quantidade_parcelas,
        valorParcela: raw.valor_parcela,
        contrato: contrato
          ? {
              id: contrato.id,
              numero: contrato.numero,
              status: (contrato.status as ClienteContratoStatus | null) ?? null,
              dataInicio: contrato.data_inicio,
              dataFim: contrato.data_fim,
              encerradoEm: contrato.encerrado_em,
              tipoContrato: (contrato.tipo_contrato as ClienteContratoTipo | null) ?? null,
              condicaoPagamento: contrato.condicao_pagamento,
              contratoAssinadoEm: contrato.contrato_assinado_em,
              boletoPago: contrato.boleto_pago,
            }
          : null,
      })
    );
  }

  return rows;
}

const SELECT_PAGE_SIZE = 1000;

function isoData(value: string | null | undefined): string | null {
  const texto = (value ?? "").trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) ? texto : null;
}

function numeroOuNulo(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const numero = Number(value);
  return Number.isFinite(numero) ? numero : null;
}

function parcelasAusentes(error: { message?: string; code?: string }): boolean {
  const message = error.message ?? "";
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /orcamento_mensalidade_parcelas/i.test(message)
  );
}

type AprovacaoMensalidadeQueryRow = {
  id: string;
  mensalidade_pagamento: string | null;
  mensalidade_valor_mensal: number | string | null;
  mensalidade_dia_vencimento: number | null;
  valor_final: number | string | null;
  orcamentos: {
    numero: string;
    cliente_nome: string;
    modalidade: string | null;
    cliente_contratos:
      | ContratoMensalidadeQueryRow[]
      | ContratoMensalidadeQueryRow
      | null;
  } | null;
};

type ContratoMensalidadeQueryRow = {
  id: string;
  numero: string | null;
  data_inicio: string | null;
  data_fim: string | null;
};

export type CargaFontesMensalidadesPrevistas = {
  fontes: FonteMensalidadePrevista[];
  leituraParcelasOk: boolean;
  mensagemLeitura: string | null;
};

/**
 * Contratações para o card de mensalidades previstas.
 * Lê todas as vigências vinculadas, inclusive de contrato depois encerrado.
 * Não filtra por status ativo e não grava parcela.
 */
export async function listarFontesMensalidadesPrevistas(): Promise<CargaFontesMensalidadesPrevistas> {
  await assertAdminGestaoComercial();
  const supabase = createClient();

  const aprovacoes: AprovacaoMensalidadeQueryRow[] = [];
  for (let from = 0; ; from += SELECT_PAGE_SIZE) {
    const { data, error } = await supabase
      .from("orcamento_aprovacoes")
      .select(
        `
        id,
        mensalidade_pagamento,
        mensalidade_valor_mensal,
        mensalidade_dia_vencimento,
        valor_final,
        orcamentos!inner (
          numero,
          cliente_nome,
          modalidade,
          cliente_contratos (
            id,
            numero,
            data_inicio,
            data_fim
          )
        )
        `
      )
      .order("id", { ascending: true })
      .range(from, from + SELECT_PAGE_SIZE - 1);
    if (error) throw error;
    const batch = (data ?? []) as unknown as AprovacaoMensalidadeQueryRow[];
    aprovacoes.push(...batch);
    if (batch.length < SELECT_PAGE_SIZE) break;
  }

  const parcelasPorAprovacao = new Map<string, ParcelaMensalidadeRegistrada[]>();
  for (let from = 0; ; from += SELECT_PAGE_SIZE) {
    const { data, error } = await supabase
      .from("orcamento_mensalidade_parcelas")
      .select(
        "aprovacao_id, vigencia_inicio, vigencia_fim, numero, vencimento, valor, pago_em"
      )
      .order("id", { ascending: true })
      .range(from, from + SELECT_PAGE_SIZE - 1);
    if (error) {
      if (parcelasAusentes(error)) {
        throw new Error(MENSALIDADE_PARCELAS_MIGRATION_MSG);
      }
      throw error;
    }
    const batch = data ?? [];
    for (const row of batch) {
      const aprovacaoId = String(row.aprovacao_id ?? "");
      if (!aprovacaoId) continue;
      const lista = parcelasPorAprovacao.get(aprovacaoId) ?? [];
      lista.push({
        vigenciaInicio: isoData(String(row.vigencia_inicio ?? "")) ?? "",
        vigenciaFim: isoData(
          row.vigencia_fim == null ? null : String(row.vigencia_fim)
        ),
        numero: Number(row.numero),
        vencimentoIso: isoData(String(row.vencimento ?? "")) ?? "",
        valor: Number(row.valor),
        pagoEmIso: isoData(row.pago_em == null ? null : String(row.pago_em)),
      });
      parcelasPorAprovacao.set(aprovacaoId, lista);
    }
    if (batch.length < SELECT_PAGE_SIZE) break;
  }

  const fontes: FonteMensalidadePrevista[] = [];
  for (const raw of aprovacoes) {
    const orc = raw.orcamentos;
    if (!orc) continue;
    const contratos = Array.isArray(orc.cliente_contratos)
      ? orc.cliente_contratos
      : orc.cliente_contratos
        ? [orc.cliente_contratos]
        : [];
    const vigencias: VigenciaMensalidadePrevista[] = [];
    for (const contrato of contratos) {
      const inicio = isoData(contrato.data_inicio);
      if (!inicio) continue;
      vigencias.push({
        inicio,
        fim: isoData(contrato.data_fim),
        contratoId: contrato.id,
        numeroContrato: (contrato.numero ?? "").trim() || null,
      });
    }
    fontes.push({
      aprovacaoId: raw.id,
      clienteNome: orc.cliente_nome,
      numeroOrcamento: orc.numero,
      modalidade: orc.modalidade,
      mensalidadePagamento: raw.mensalidade_pagamento,
      diaVencimento: numeroOuNulo(raw.mensalidade_dia_vencimento),
      valorMensal: numeroOuNulo(raw.mensalidade_valor_mensal),
      valorFinal: numeroOuNulo(raw.valor_final),
      vigencias,
      parcelasRegistradas: parcelasPorAprovacao.get(raw.id) ?? [],
    });
  }

  return {
    fontes,
    leituraParcelasOk: true,
    mensagemLeitura: null,
  };
}

export async function listarHistoricoMensalGestaoComercial(): Promise<
  GestaoComercialHistoricoMensal[]
> {
  await assertAdminGestaoComercial();
  const supabase = createClient();

  const { data, error } = await supabase
    .from("gestao_comercial_historico_mensal")
    .select("ano, mes, valor_fechado, origem_dado, observacao")
    .order("ano", { ascending: true })
    .order("mes", { ascending: true });

  if (error) {
    console.error(
      "[gestao-comercial] falha ao ler gestao_comercial_historico_mensal:",
      error
    );
    throw error;
  }

  const rows = (data ?? []).map((row) => ({
    ano: Number(row.ano),
    mes: Number(row.mes),
    valorFechado: Number(row.valor_fechado) || 0,
    origemDado: "historico_manual" as const,
    observacao: row.observacao ?? null,
  }));

  if (rows.length === 0) {
    console.warn(
      "[gestao-comercial] gestao_comercial_historico_mensal retornou 0 linhas. Verifique seed/RLS/GRANT."
    );
  }

  return rows;
}
