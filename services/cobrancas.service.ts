import {
  MENSALIDADE_BAIXA_COLUNAS_MSG,
  completarCobrancasComGradeFinanceiro,
  escolherVigenciaFinanceiro,
  parcelaEntraEmCobrancas,
  type CobrancaParcela,
  type FonteGradeCobranca,
} from "@/lib/cobrancas-mensalidades";
import {
  MENSALIDADE_PARCELAS_MIGRATION_MSG,
  type ParcelaMensalidadeRegistrada,
} from "@/lib/mensalidade-parcelas";
import { efeitoValorMensalidadeDaAprovacao } from "@/lib/alterar-contratacao";
import { createClient } from "@/lib/supabase/client";

const PAGE = 1000;

const SELECT_CONTRATO = `
  id,
  aprovacao_id,
  numero,
  vencimento,
  valor,
  vigencia_inicio,
  vigencia_fim,
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
  vigencia_inicio?: string | null;
  vigencia_fim?: string | null;
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
 * Lê as parcelas já gravadas e completa com a grade do Financeiro
 * quando a parcela da vigência ainda não foi salva.
 * Não insere nem altera vencimento, valor ou pagamento.
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
  const registradasPorAprovacao = new Map<string, ParcelaMensalidadeRegistrada[]>();
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
      if (!parcela) continue;
      parcelas.push(parcela);
      const lista = registradasPorAprovacao.get(row.aprovacao_id) ?? [];
      lista.push({
        vigenciaInicio: iso(row.vigencia_inicio) ?? "",
        vigenciaFim: iso(row.vigencia_fim),
        numero: parcela.numero,
        vencimentoIso: parcela.vencimentoIso,
        valor: parcela.valor,
        pagoEmIso: parcela.pagoEmIso,
        valorRecebido: parcela.valorRecebido,
        comprovantePath: parcela.comprovantePath,
        comprovanteNome: parcela.comprovanteNome,
      });
      registradasPorAprovacao.set(row.aprovacao_id, lista);
    }
    if (batch.length < PAGE) break;
  }
  const fontes = await listarFontesGradeCobranca(
    supabase,
    registradasPorAprovacao
  );
  return completarCobrancasComGradeFinanceiro(parcelas, fontes);
}

type ContratoGradeRow = {
  numero?: string | null;
  status?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  created_at?: string | null;
};

type OrcamentoGradeRow = {
  id: string;
  numero: string;
  cliente_nome: string;
  cliente_cnpj: string | null;
  modalidade: string | null;
  status: string;
  cliente_contratos: ContratoGradeRow | ContratoGradeRow[] | null;
};

type AprovacaoGradeRow = {
  id: string;
  mensalidade_pagamento: string | null;
  mensalidade_dia_vencimento: number | null;
  mensalidade_vencimento_regra?: string | null;
  mensalidade_valor_mensal: number | string | null;
  valor_final: number | string | null;
  contratacao_efeito_vigencia_inicio?: string | null;
  contratacao_efeito_numero?: number | null;
  contratacao_valor_anterior?: number | string | null;
  revertida_em?: string | null;
  orcamentos: OrcamentoGradeRow | OrcamentoGradeRow[] | null;
};

function numeroOuNulo(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const numero = Number(value);
  return Number.isFinite(numero) ? numero : null;
}

/**
 * Contratos mensais com vigência, no mesmo recorte da aba Financeiro.
 * Só leitura: não grava parcela.
 */
async function listarFontesGradeCobranca(
  supabase: ReturnType<typeof createClient>,
  registradasPorAprovacao: Map<string, ParcelaMensalidadeRegistrada[]>
): Promise<FonteGradeCobranca[]> {
  const selectComRegra = `
    id,
    mensalidade_pagamento,
    mensalidade_dia_vencimento,
    mensalidade_vencimento_regra,
    mensalidade_valor_mensal,
    valor_final,
    contratacao_efeito_vigencia_inicio,
    contratacao_efeito_numero,
    contratacao_valor_anterior,
    revertida_em,
    orcamentos!inner (
      id,
      numero,
      cliente_nome,
      cliente_cnpj,
      modalidade,
      status,
      cliente_contratos (
        numero,
        status,
        data_inicio,
        data_fim,
        created_at
      )
    )
  `;
  const selectSemRegra = selectComRegra.replace(
    /\n\s*mensalidade_vencimento_regra,/,
    ""
  );
  let selectUsado = selectComRegra;
  const rows: AprovacaoGradeRow[] = [];
  for (let from = 0; ; from += PAGE) {
    let { data, error } = await supabase
      .from("orcamento_aprovacoes")
      .select(selectUsado)
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (
      error &&
      /contratacao_efeito_vigencia_inicio|contratacao_efeito_numero|contratacao_valor_anterior/i.test(
        error.message ?? ""
      )
    ) {
      selectUsado = selectUsado
        .replace(/\n\s*contratacao_efeito_vigencia_inicio,/, "")
        .replace(/\n\s*contratacao_efeito_numero,/, "")
        .replace(/\n\s*contratacao_valor_anterior,/, "");
      ({ data, error } = await supabase
        .from("orcamento_aprovacoes")
        .select(selectUsado)
        .order("id", { ascending: true })
        .range(from, from + PAGE - 1));
    }
    if (
      error &&
      /mensalidade_vencimento_regra|schema cache|42703/i.test(error.message ?? "")
    ) {
      selectUsado = selectSemRegra;
      ({ data, error } = await supabase
        .from("orcamento_aprovacoes")
        .select(selectUsado)
        .order("id", { ascending: true })
        .range(from, from + PAGE - 1));
    }
    if (error && /revertida_em/i.test(error.message ?? "")) {
      selectUsado = selectUsado.replace(/\n\s*revertida_em,/, "");
      ({ data, error } = await supabase
        .from("orcamento_aprovacoes")
        .select(selectUsado)
        .order("id", { ascending: true })
        .range(from, from + PAGE - 1));
    }
    if (error) throw erroLista(error);
    const batch = (data ?? []) as unknown as AprovacaoGradeRow[];
    rows.push(...batch);
    if (batch.length < PAGE) break;
  }

  const fontes: FonteGradeCobranca[] = [];
  for (const row of rows) {
    if (row.revertida_em) continue;
    const orcamento = um(row.orcamentos);
    if (!orcamento) continue;
    const contratos =
      orcamento.cliente_contratos == null
        ? []
        : Array.isArray(orcamento.cliente_contratos)
          ? orcamento.cliente_contratos
          : [orcamento.cliente_contratos];
    const vigencia = escolherVigenciaFinanceiro(contratos);
    if (!vigencia) continue;
    fontes.push({
      aprovacaoId: row.id,
      orcamentoId: orcamento.id,
      numeroOrcamento: orcamento.numero,
      numeroContrato: vigencia.numero,
      empresa: orcamento.cliente_nome,
      cnpj: orcamento.cliente_cnpj,
      statusOrcamento: orcamento.status,
      modalidade: orcamento.modalidade,
      mensalidadePagamento: row.mensalidade_pagamento,
      vigenciaInicio: vigencia.inicio,
      vigenciaFim: vigencia.fim,
      dia: row.mensalidade_dia_vencimento,
      vencimentoRegra: row.mensalidade_vencimento_regra ?? null,
      valorMensal: numeroOuNulo(row.mensalidade_valor_mensal),
      valorFinal: numeroOuNulo(row.valor_final),
      registradas: registradasPorAprovacao.get(row.id) ?? [],
      efeito: efeitoValorMensalidadeDaAprovacao(row, vigencia.inicio),
    });
  }
  return fontes;
}

/**
 * Parcelas da Cobranças de um orçamento, de todos os meses.
 * Usa a mesma leitura da página: parcelas gravadas e as ainda só calculadas.
 * À vista, pontual e sem vigência continuam de fora. Não grava nada.
 */
export async function listarCobrancasMensalidadesDoOrcamento(
  orcamentoId: string
): Promise<CobrancaParcela[]> {
  const id = orcamentoId.trim();
  if (!id) return [];
  const parcelas = await listarCobrancasMensalidades();
  return parcelas.filter((parcela) => parcela.orcamentoId === id);
}
