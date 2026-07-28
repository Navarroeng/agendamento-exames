import { createClient } from "@/lib/supabase/client";
import type { OrcamentoAprovacaoRecord } from "@/lib/orcamento-aprovacao";

const APROVACAO_SELECT = `
  *,
  orcamento_aprovacao_itens (*)
`;

function sortAprovacao(
  data: OrcamentoAprovacaoRecord
): OrcamentoAprovacaoRecord {
  return {
    ...data,
    orcamento_aprovacao_itens: [
      ...(data.orcamento_aprovacao_itens ?? []),
    ].sort((a, b) => a.ordem - b.ordem),
  };
}

async function fetchAprovacao(
  aprovacaoId: string
): Promise<OrcamentoAprovacaoRecord> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("orcamento_aprovacoes")
    .select(APROVACAO_SELECT)
    .eq("id", aprovacaoId)
    .single();
  if (error) throw error;
  return sortAprovacao(data as OrcamentoAprovacaoRecord);
}

export async function salvarOrcamentoProcuracao(
  aprovacaoId: string,
  orcamentoId: string,
  payload: {
    procuracao_status: "ativa" | "inativa";
    observacao_procuracao: string | null;
  }
): Promise<OrcamentoAprovacaoRecord> {
  const supabase = createClient();
  const { error } = await supabase
    .from("orcamento_aprovacoes")
    .update({
      procuracao_status: payload.procuracao_status,
      observacao_procuracao: payload.observacao_procuracao,
      procuracao_salva_em: new Date().toISOString(),
    })
    .eq("id", aprovacaoId);
  if (error) throw error;

  // Espelha no cadastro do cliente vinculado ao orçamento
  const { data: orc } = await supabase
    .from("orcamentos")
    .select("cliente_id")
    .eq("id", orcamentoId)
    .maybeSingle();

  if (orc?.cliente_id) {
    await supabase
      .from("clientes")
      .update({ procuracao: payload.procuracao_status })
      .eq("id", orc.cliente_id);
  }

  return fetchAprovacao(aprovacaoId);
}

export async function salvarOrcamentoListaFuncionarios(
  aprovacaoId: string,
  fileMeta: {
    path: string;
    nome: string;
    tipo: string;
    tamanho: number;
  }
): Promise<OrcamentoAprovacaoRecord> {
  const supabase = createClient();
  const { error } = await supabase
    .from("orcamento_aprovacoes")
    .update({
      funcionarios_lista_path: fileMeta.path,
      funcionarios_lista_nome: fileMeta.nome,
      funcionarios_lista_tipo: fileMeta.tipo,
      funcionarios_lista_tamanho: fileMeta.tamanho,
      funcionarios_lista_salva_em: new Date().toISOString(),
    })
    .eq("id", aprovacaoId);
  if (error) throw error;
  return fetchAprovacao(aprovacaoId);
}

export async function salvarOrcamentoLogo(
  aprovacaoId: string,
  fileMeta: {
    path: string;
    nome: string;
    tipo: string;
    tamanho: number;
  }
): Promise<OrcamentoAprovacaoRecord> {
  const supabase = createClient();
  const { error } = await supabase
    .from("orcamento_aprovacoes")
    .update({
      logo_path: fileMeta.path,
      logo_nome: fileMeta.nome,
      logo_tipo: fileMeta.tipo,
      logo_tamanho: fileMeta.tamanho,
      logo_salva_em: new Date().toISOString(),
    })
    .eq("id", aprovacaoId);
  if (error) throw error;
  return fetchAprovacao(aprovacaoId);
}

export async function salvarOrcamentoVisitaTecnica(
  aprovacaoId: string,
  payload: {
    visita_tecnica_necessaria: boolean;
    visita_tecnica_data: string | null;
    visita_tecnica_endereco: string | null;
    visita_tecnica_observacoes: string | null;
  }
): Promise<OrcamentoAprovacaoRecord> {
  const supabase = createClient();
  const { error } = await supabase
    .from("orcamento_aprovacoes")
    .update({
      visita_tecnica_necessaria: payload.visita_tecnica_necessaria,
      visita_tecnica_data: payload.visita_tecnica_necessaria
        ? payload.visita_tecnica_data
        : null,
      visita_tecnica_endereco: payload.visita_tecnica_necessaria
        ? payload.visita_tecnica_endereco
        : null,
      visita_tecnica_observacoes: payload.visita_tecnica_necessaria
        ? payload.visita_tecnica_observacoes
        : null,
      visita_tecnica_salva_em: new Date().toISOString(),
    })
    .eq("id", aprovacaoId);
  if (error) throw error;
  return fetchAprovacao(aprovacaoId);
}

/** Marca timestamps de conclusão nas etapas Contrato/Financeiro. */
export async function marcarEtapaContratoSalva(
  aprovacaoId: string
): Promise<void> {
  const supabase = createClient();
  await supabase
    .from("orcamento_aprovacoes")
    .update({ contrato_salvo_em: new Date().toISOString() })
    .eq("id", aprovacaoId);
}

export async function marcarEtapaFinanceiroSalva(
  aprovacaoId: string
): Promise<void> {
  const supabase = createClient();
  await supabase
    .from("orcamento_aprovacoes")
    .update({ financeiro_salvo_em: new Date().toISOString() })
    .eq("id", aprovacaoId);
}
