import { createClient } from "@/lib/supabase/client";
import type { OrcamentoAprovacaoRecord } from "@/lib/orcamento-aprovacao";
import type { OrcamentoRecord } from "@/lib/orcamento-types";
import type { ClienteContratoRecord } from "@/lib/types";
import {
  buildImplantacaoProcesso,
  type ImplantacaoProcesso,
} from "@/lib/implantacao-clientes";
import {
  classifyOrcamentoFluxoImplantacao,
  resolveItensParaFluxoImplantacao,
  resolveTreinamentosServicoId,
} from "@/lib/servico-treinamentos";
import { contarColaboradoresPorContratos } from "@/services/contrato-agendamentos.service";
import { contarCreditosDisponiveisPorContratos } from "@/services/contrato-creditos-aso.service";
import { contarProgramacoesFuturasPorContratos } from "@/services/contrato-programacao-futura.service";
import { buscarTreinamentosPorOrcamentoIds } from "@/services/implantacao-treinamento.service";

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

/**
 * Lista processos de implantação a partir dos dados já existentes
 * (orçamentos aprovados / com aprovação / com contrato vinculado).
 * Não cria estrutura nova.
 */
export async function listarProcessosImplantacao(): Promise<
  ImplantacaoProcesso[]
> {
  const supabase = createClient();

  const [aprovacoesRes, contratosRes, orcamentosAprovadosRes, servicosRes] =
    await Promise.all([
      supabase
        .from("orcamento_aprovacoes")
        .select("*, orcamento_aprovacao_itens (*)")
        .order("aprovado_em", { ascending: true }),
      supabase
        .from("cliente_contratos")
        .select("*")
        .not("orcamento_id", "is", null),
      supabase.from("orcamentos").select("*").eq("status", "aprovado"),
      supabase.from("servicos_sst").select("id, nome"),
    ]);

  if (aprovacoesRes.error) throw aprovacoesRes.error;
  if (contratosRes.error) throw contratosRes.error;
  if (orcamentosAprovadosRes.error) throw orcamentosAprovadosRes.error;
  if (servicosRes.error) throw servicosRes.error;

  const treinamentosServicoId = resolveTreinamentosServicoId(
    (servicosRes.data ?? []) as Array<{ id: string; nome: string }>
  );

  const aprovacoes = (aprovacoesRes.data ?? []).map((row) =>
    sortAprovacao(row as OrcamentoAprovacaoRecord)
  );
  const contratos = (contratosRes.data ?? []) as ClienteContratoRecord[];
  const orcamentosAprovados = (orcamentosAprovadosRes.data ??
    []) as OrcamentoRecord[];

  const orcamentoIds = new Set<string>();
  for (const a of aprovacoes) orcamentoIds.add(a.orcamento_id);
  for (const c of contratos) {
    if (c.orcamento_id) orcamentoIds.add(c.orcamento_id);
  }
  for (const o of orcamentosAprovados) orcamentoIds.add(o.id);

  if (orcamentoIds.size === 0) return [];

  const missingIds = Array.from(orcamentoIds).filter(
    (id) => !orcamentosAprovados.some((o) => o.id === id)
  );

  let orcamentosExtra: OrcamentoRecord[] = [];
  if (missingIds.length > 0) {
    const { data, error } = await supabase
      .from("orcamentos")
      .select("*")
      .in("id", missingIds);
    if (error) throw error;
    orcamentosExtra = (data ?? []) as OrcamentoRecord[];
  }

  const orcamentoById = new Map<string, OrcamentoRecord>();
  for (const o of orcamentosAprovados) orcamentoById.set(o.id, o);
  for (const o of orcamentosExtra) orcamentoById.set(o.id, o);

  const aprovacaoByOrcamento = new Map<string, OrcamentoAprovacaoRecord>();
  for (const a of aprovacoes) aprovacaoByOrcamento.set(a.orcamento_id, a);

  const contratoByOrcamento = new Map<string, ClienteContratoRecord>();
  for (const c of contratos) {
    if (!c.orcamento_id) continue;
    const prev = contratoByOrcamento.get(c.orcamento_id);
    if (!prev) {
      contratoByOrcamento.set(c.orcamento_id, c);
      continue;
    }
    const prevKey = prev.aprovado_em ?? prev.created_at ?? "";
    const nextKey = c.aprovado_em ?? c.created_at ?? "";
    if (nextKey > prevKey) contratoByOrcamento.set(c.orcamento_id, c);
  }

  const idsArray = Array.from(orcamentoIds);
  const itensByOrcamento = new Map<
    string,
    Array<{ servico_id?: string | null; servico_nome?: string | null }>
  >();

  for (const a of aprovacoes) {
    const itens = a.orcamento_aprovacao_itens ?? [];
    if (itens.length > 0) {
      itensByOrcamento.set(a.orcamento_id, itens);
    }
  }
  // Completa com itens do orçamento quando aprovação não trouxe serviços úteis
  const needItens = idsArray.filter((id) => {
    const current = itensByOrcamento.get(id) ?? [];
    return (
      resolveItensParaFluxoImplantacao({
        aprovacaoItens: current,
        orcamentoItens: [],
      }).length === 0
    );
  });
  if (needItens.length > 0) {
    const { data: itensRows, error: itensErr } = await supabase
      .from("orcamento_itens")
      .select("orcamento_id, servico_id, servico_nome")
      .in("orcamento_id", needItens);
    if (itensErr) throw itensErr;
    for (const row of itensRows ?? []) {
      const list = itensByOrcamento.get(row.orcamento_id) ?? [];
      list.push({
        servico_id: row.servico_id,
        servico_nome: row.servico_nome,
      });
      itensByOrcamento.set(row.orcamento_id, list);
    }
  }

  const treinamentosByOrcamento =
    await buscarTreinamentosPorOrcamentoIds(idsArray);

  const contratoIds = Array.from(
    new Set(
      Array.from(contratoByOrcamento.values())
        .map((c) => c.id)
        .filter(Boolean)
    )
  );
  const realizadosPorContrato =
    await contarColaboradoresPorContratos(contratoIds);
  const programacoesPorContrato =
    await contarProgramacoesFuturasPorContratos(contratoIds);
  const creditosPorContrato =
    await contarCreditosDisponiveisPorContratos(contratoIds);

  const processos: ImplantacaoProcesso[] = [];

  for (const id of Array.from(orcamentoIds)) {
    const orcamento = orcamentoById.get(id);
    if (!orcamento) continue;

    const aprovacao = aprovacaoByOrcamento.get(id) ?? null;
    const contrato = contratoByOrcamento.get(id) ?? null;
    const foiAprovado =
      orcamento.status === "aprovado" ||
      Boolean(aprovacao) ||
      Boolean(contrato);

    if (!foiAprovado) continue;
    if (orcamento.status === "reprovado") continue;

    if (
      !aprovacao &&
      !contrato &&
      orcamento.status !== "aprovado"
    ) {
      continue;
    }

    const agendados = contrato
      ? realizadosPorContrato.get(contrato.id) ?? 0
      : 0;
    const programados = contrato
      ? programacoesPorContrato.get(contrato.id) ?? 0
      : 0;
    const emAberto = contrato
      ? creditosPorContrato.get(contrato.id) ?? 0
      : 0;

    const itens = resolveItensParaFluxoImplantacao({
      aprovacaoItens: itensByOrcamento.get(id) ?? [],
      orcamentoItens: [],
    });
    const fluxoImplantacao = classifyOrcamentoFluxoImplantacao(
      itens,
      treinamentosServicoId
    );
    const treinamento = treinamentosByOrcamento.get(id) ?? null;

    processos.push(
      buildImplantacaoProcesso({
        orcamento,
        aprovacao,
        contrato,
        agendamentosRealizados: agendados,
        examesProgramadosFuturos: programados,
        asosContratuaisEmAberto: emAberto,
        fluxoImplantacao,
        treinamento,
      })
    );
  }

  return processos;
}
