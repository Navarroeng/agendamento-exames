import { createClient } from "@/lib/supabase/client";
import type { OrcamentoAprovacaoRecord } from "@/lib/orcamento-aprovacao";
import type { OrcamentoRecord } from "@/lib/orcamento-types";
import type { ClienteContratoRecord } from "@/lib/types";
import {
  buildImplantacaoProcesso,
  type ImplantacaoProcesso,
} from "@/lib/implantacao-clientes";
import { contarColaboradoresPorContratos } from "@/services/contrato-agendamentos.service";
import { contarProgramacoesFuturasPorContratos } from "@/services/contrato-programacao-futura.service";

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

  const [aprovacoesRes, contratosRes, orcamentosAprovadosRes] =
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
    ]);

  if (aprovacoesRes.error) throw aprovacoesRes.error;
  if (contratosRes.error) throw contratosRes.error;
  if (orcamentosAprovadosRes.error) throw orcamentosAprovadosRes.error;

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
    // Preferir o mais recente por aprovado_em / created_at
    const prevKey = prev.aprovado_em ?? prev.created_at ?? "";
    const nextKey = c.aprovado_em ?? c.created_at ?? "";
    if (nextKey > prevKey) contratoByOrcamento.set(c.orcamento_id, c);
  }

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

  const processos: ImplantacaoProcesso[] = [];

  for (const id of Array.from(orcamentoIds)) {
    const orcamento = orcamentoById.get(id);
    if (!orcamento) continue;

    // Cancelado sem ter passado por aprovação: fora da implantação
    const aprovacao = aprovacaoByOrcamento.get(id) ?? null;
    const contrato = contratoByOrcamento.get(id) ?? null;
    const foiAprovado =
      orcamento.status === "aprovado" ||
      Boolean(aprovacao) ||
      Boolean(contrato);

    if (!foiAprovado) continue;

    // Reprovado nunca entra
    if (orcamento.status === "reprovado") continue;

    // Em elaboração / enviado / em negociação sem aprovação: não entra
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

    processos.push(
      buildImplantacaoProcesso({
        orcamento,
        aprovacao,
        contrato,
        agendamentosRealizados: agendados,
        examesProgramadosFuturos: programados,
      })
    );
  }

  return processos;
}
