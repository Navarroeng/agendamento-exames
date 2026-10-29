import {
  MENSALIDADE_BAIXA_COLUNAS_MSG,
  parcelaEntraEmCobrancas,
  type CobrancaParcela,
} from "@/lib/cobrancas-mensalidades";
import { MENSALIDADE_PARCELAS_MIGRATION_MSG } from "@/lib/mensalidade-parcelas";
import { createClient } from "@/lib/supabase/client";

const PAGE = 1000;

const SELECT_CONTRATO = `
  id,
  aprovacao_id,
  numero,
  vencimento,
  valor,
  pago_em,
  valor_recebido,
  comprovante_path,
  comprovante_nome,
  orcamento_aprovacoes!inner (
    mensalidade_pagamento,
    orcamentos!inner (
      id,
      numero,
      cliente_nome,
      cliente_cnpj,
      modalidade,
      status,
      cliente_contratos ( numero )
    )
  )
`;

type ContratoJoin = { numero: string | null };
type OrcamentoJoin = {
  id: string;
  numero: string;
  cliente_nome: string;
  cliente_cnpj: string | null;
  modalidade: string | null;
  status: string;
  cliente_contratos: ContratoJoin | ContratoJoin[] | null;
};
type AprovacaoJoin = {
  mensalidade_pagamento: string | null;
  revertida_em?: string | null;
  orcamentos: OrcamentoJoin | OrcamentoJoin[] | null;
};
type ParcelaListaRow = {
  id: string;
  aprovacao_id: string;
  numero: number | string;
  vencimento: string;
  valor: number | string;
  pago_em: string | null;
  valor_recebido?: number | string | null;
  comprovante_path?: string | null;
  comprovante_nome?: string | null;
  sem_vigencia_em?: string | null;
  orcamento_aprovacoes: AprovacaoJoin | AprovacaoJoin[] | null;
};

function um<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function iso(value: string | null | undefined): string | null {
  const texto = (value ?? "").trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) ? texto : null;
}

function colunaAusente(error: { message?: string; code?: string }): boolean {
  const message = error.message ?? "";
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    /schema cache|sem_vigencia_em|valor_recebido|comprovante_/i.test(message)
  );
}

function erroLista(error: { message?: string; code?: string }): Error {
  const message = error.message ?? "";
  if (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /orcamento_mensalidade_parcelas/i.test(message)
  ) {
    return new Error(MENSALIDADE_PARCELAS_MIGRATION_MSG);
  }
  return new Error(message || "Não foi possível carregar as cobranças.");
}

function numeroContrato(
  value: ContratoJoin | ContratoJoin[] | null | undefined
): string | null {
  const lista = value == null ? [] : Array.isArray(value) ? value : [value];
  for (const item of lista) {
    const numero = item.numero?.trim();
    if (numero) return numero;
  }
  return null;
}

function mapLista(row: ParcelaListaRow): CobrancaParcela | null {
  if (row.sem_vigencia_em) return null;
  const aprovacao = um(row.orcamento_aprovacoes);
  const orcamento = um(aprovacao?.orcamentos);
  if (!aprovacao || !orcamento) return null;
  if (aprovacao.revertida_em) return null;
  if (
    !parcelaEntraEmCobrancas({
      modalidade: orcamento.modalidade,
      mensalidadePagamento: aprovacao.mensalidade_pagamento,
      semVigencia: false,
    })
  ) {
    return null;
  }
  const vencimentoIso = iso(row.vencimento);
  if (!vencimentoIso) return null;
  const valor = Number(row.valor);
  if (!Number.isFinite(valor) || valor <= 0) return null;
  return {
    id: row.id,
    aprovacaoId: row.aprovacao_id,
    orcamentoId: orcamento.id,
    numeroOrcamento: orcamento.numero,
    numeroContrato: numeroContrato(orcamento.cliente_contratos),
    empresa: orcamento.cliente_nome,
    cnpj: orcamento.cliente_cnpj,
    numero: Number(row.numero),
    vencimentoIso,
    valor,
    pagoEmIso: iso(row.pago_em),
    valorRecebido:
      row.valor_recebido == null || row.valor_recebido === ""
        ? null
        : Number(row.valor_recebido),
    comprovantePath: row.comprovante_path?.trim() || null,
    comprovanteNome: row.comprovante_nome?.trim() || null,
    situacao: "em_aberto",
    statusOrcamento: orcamento.status,
  };
}

/**
 * Lê as parcelas já gravadas. Não insere nem altera vencimento, valor ou pagamento.
 */
export async function listarCobrancasMensalidades(): Promise<CobrancaParcela[]> {
  const supabase = createClient();
  let filtrarVigencia = true;
  {
    let probe = supabase
      .from("orcamento_mensalidade_parcelas")
      .select(SELECT_CONTRATO)
      .order("vencimento", { ascending: true })
      .order("id", { ascending: true })
      .range(0, 0)
      .is("sem_vigencia_em", null);
    let { error } = await probe;
    if (error && /sem_vigencia_em/i.test(error.message ?? "")) {
      filtrarVigencia = false;
      ({ error } = await supabase
        .from("orcamento_mensalidade_parcelas")
        .select(SELECT_CONTRATO)
        .order("vencimento", { ascending: true })
        .order("id", { ascending: true })
        .range(0, 0));
    }
    if (error && colunaAusente(error)) {
      throw new Error(MENSALIDADE_BAIXA_COLUNAS_MSG);
    }
    if (error) throw erroLista(error);
  }

  const parcelas: CobrancaParcela[] = [];
  for (let from = 0; ; from += PAGE) {
    let query = supabase
      .from("orcamento_mensalidade_parcelas")
      .select(SELECT_CONTRATO)
      .order("vencimento", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (filtrarVigencia) query = query.is("sem_vigencia_em", null);
    const { data, error } = await query;
    if (error) throw erroLista(error);
    const batch = (data ?? []) as unknown as ParcelaListaRow[];
    for (const row of batch) {
      const parcela = mapLista(row);
      if (parcela) parcelas.push(parcela);
    }
    if (batch.length < PAGE) break;
  }
  return parcelas;
}
