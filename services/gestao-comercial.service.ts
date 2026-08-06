import { createClient } from "@/lib/supabase/client";
import {
  resolveFormaPagamentoFechamento,
  resolveValorFechado,
  type GestaoComercialFechamentoRow,
} from "@/lib/gestao-comercial";
import { isOrcamentoOrigemCliente } from "@/lib/orcamento-origem";
import { isPerfilAdmin } from "@/lib/permissions";
import { normalizePerfilUsuario } from "@/lib/contrato-permissoes";
import type { ClienteContratoStatus } from "@/lib/types";

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

type AprovacaoQueryRow = {
  id: string;
  orcamento_id: string;
  aprovado_em: string;
  valor_final: number | null;
  quantidade_colaboradores: number | null;
  condicao_pagamento: string | null;
  quantidade_parcelas: number | null;
  valor_parcela: number | null;
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
    cliente_contratos: Array<{
      id: string;
      numero: string | null;
      status: string | null;
    }> | null;
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
        cliente_contratos (
          id,
          numero,
          status
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

    const valorOriginal = Number(orc.valor_total) || 0;
    const { valor, usouFallback } = resolveValorFechado(
      raw.valor_final,
      valorOriginal
    );

    const origem = isOrcamentoOrigemCliente(orc.origem_cliente)
      ? orc.origem_cliente
      : null;

    const responsavel =
      (raw.responsavel_no_fechamento ?? "").trim() ||
      (orc.responsavel ?? "").trim() ||
      "Não informado";

    rows.push({
      aprovacaoId: raw.id,
      orcamentoId: orc.id,
      contratoId: contrato?.id ?? null,
      aprovadoEm: raw.aprovado_em,
      numeroOrcamento: orc.numero,
      numeroContrato: contrato?.numero ?? null,
      clienteNome: orc.cliente_nome,
      clienteCnpj: orc.cliente_cnpj,
      origem,
      responsavelNoFechamento: responsavel,
      responsavelAproximado:
        raw.responsavel_no_fechamento_aproximado === true ||
        !(raw.responsavel_no_fechamento ?? "").trim(),
      quantidadeColaboradores: Number(raw.quantidade_colaboradores) || 0,
      valorOriginalOrcamento: valorOriginal,
      valorFinalAprovado:
        raw.valor_final != null && Number(raw.valor_final) > 0
          ? Number(raw.valor_final)
          : null,
      valorFechado: valor,
      usouValorOriginalFallback: usouFallback,
      formaPagamento: resolveFormaPagamentoFechamento({
        quantidade_parcelas: raw.quantidade_parcelas,
        valor_parcela: raw.valor_parcela,
        condicao_pagamento: raw.condicao_pagamento,
      }),
      condicaoPagamento: raw.condicao_pagamento,
      statusContrato: (contrato?.status as ClienteContratoStatus | null) ?? null,
      orcamentoStatus: orc.status,
    });
  }

  return rows;
}
