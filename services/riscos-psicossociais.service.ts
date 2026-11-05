import { lerPorIdentificadores, lerTodosOsLotes } from "@/lib/consulta-lotes";
import { createClient } from "@/lib/supabase/client";
import { buildLaudosSstProcesso } from "@/lib/laudos-sst";
import type { ImplantacaoProcesso } from "@/lib/implantacao-clientes";
import {
  buildRiscosProcessoManualCliente,
  buildRiscosPsicossociaisProcesso,
  isProcessoElegivelRiscosPsicossociais,
  isProcessoVisivelRiscosAutomatico,
  sortRiscosPsicossociaisProcessos,
  type OrcamentoRiscosPsicossociaisRecord,
  type RiscosPsicossociaisProcesso,
} from "@/lib/riscos-psicossociais";
import { deveInserirTrackingRiscosNoSincronismo } from "@/lib/riscos-processo-cancelamento";
import { isOrigemManualCliente } from "@/lib/riscos-campanha-origem";
import {
  listarCampanhasManuaisAtivas,
  listarCampanhasPorOrcamentos,
} from "@/services/riscos-campanha.service";
import { buscarFluxoCampanha } from "@/services/riscos-lista-presenca.service";
import { listarProcessosImplantacao } from "@/services/implantacao-clientes.service";
import { buscarTrackingLaudosSst } from "@/services/laudos-sst.service";

const RISCOS_TRACKING_SELECT =
  "orcamento_id, etapa_atual, etapas_concluidas, status, entrada_em, concluido_em, created_at, updated_at, lista_solicitada, lista_solicitada_em, lista_solicitada_email, lista_solicitada_por, lista_solicitada_registrado_em, lista_recebida, lista_anexo_path, lista_anexo_nome, lista_anexo_tipo, lista_anexo_tamanho, lista_recebida_em, lista_recebida_por, cancelado_em, cancelado_por, motivo_cancelamento, pausa_situacao, pausa_em, pausa_por, pausa_observacao";

const RISCOS_TRACKING_SELECT_SEM_PAUSA =
  "orcamento_id, etapa_atual, etapas_concluidas, status, entrada_em, concluido_em, created_at, updated_at, lista_solicitada, lista_solicitada_em, lista_solicitada_email, lista_solicitada_por, lista_solicitada_registrado_em, lista_recebida, lista_anexo_path, lista_anexo_nome, lista_anexo_tipo, lista_anexo_tamanho, lista_recebida_em, lista_recebida_por, cancelado_em, cancelado_por, motivo_cancelamento";

const RISCOS_TRACKING_SELECT_SEM_CANCELAMENTO =
  "orcamento_id, etapa_atual, etapas_concluidas, status, entrada_em, concluido_em, created_at, updated_at, lista_solicitada, lista_solicitada_em, lista_solicitada_email, lista_solicitada_por, lista_solicitada_registrado_em, lista_recebida, lista_anexo_path, lista_anexo_nome, lista_anexo_tipo, lista_anexo_tamanho, lista_recebida_em, lista_recebida_por";

/**
 * Lista processos de Riscos Psicossociais:
 * - automático: Implantação pronta + Pacote completo - SST;
 * - tracking antigo com trabalho real (não apaga, só exibe);
 * - inclusões manuais pelo cadastro do cliente.
 * Não chama listarProcessosLaudosSst — não cria tracking de Laudos.
 */
export async function listarProcessosRiscosPsicossociais(): Promise<
  RiscosPsicossociaisProcesso[]
> {
  const implantacao = await listarProcessosImplantacao();
  const ids = implantacao.map((p) => p.orcamento.id);
  const [laudosTracking, riscosMap, campanhasMap] = await Promise.all([
    buscarTrackingLaudosSst(ids),
    garantirTrackingRiscosPsicossociais(implantacao),
    listarCampanhasPorOrcamentos(ids),
  ]);

  const visiveis = implantacao.filter((p) =>
    isProcessoVisivelRiscosAutomatico(
      p,
      riscosMap.get(p.orcamento.id) ?? null,
      campanhasMap.has(p.orcamento.id)
    )
  );

  const manuais = await listarCampanhasManuaisAtivas();
  const campanhaIds = [
    ...Array.from(campanhasMap.values()).map((c) => c.id),
    ...manuais.map((c) => c.id),
  ];
  const participantesPorCampanha =
    await listarStatusParticipantesPorCampanhas(campanhaIds);
  const relatoriosMap = await listarRelatoriosMetaPorCampanhas(campanhaIds);

  const processosNormais = visiveis.map((processo) => {
    const orcamentoId = processo.orcamento.id;
    const campanha = campanhasMap.get(orcamentoId) ?? null;
    const relMeta = campanha ? relatoriosMap.get(campanha.id) : undefined;
    const laudos = buildLaudosSstProcesso(
      processo,
      laudosTracking.get(orcamentoId) ?? null
    );
    return buildRiscosPsicossociaisProcesso(
      laudos,
      riscosMap.get(orcamentoId) ?? null,
      campanha,
      {
        participantes: campanha
          ? participantesPorCampanha.get(campanha.id) ?? []
          : [],
        relatorioGerado: campanha ? Boolean(relMeta) : false,
        relatorioGeradoEm: relMeta?.gerado_em ?? null,
        relatorioEnviadoEm: relMeta?.relatorio_enviado_em ?? null,
      }
    );
  });

  const processosManuais: RiscosPsicossociaisProcesso[] = [];
  for (const campanha of manuais) {
    if (!isOrigemManualCliente(campanha.origem)) continue;
    const fluxo = await buscarFluxoCampanha(campanha.id);
    processosManuais.push(
      buildRiscosProcessoManualCliente({
        campanha,
        tracking: fluxo,
        participantes: participantesPorCampanha.get(campanha.id) ?? [],
        relatorioGerado: Boolean(relatoriosMap.get(campanha.id)),
        relatorioGeradoEm: relatoriosMap.get(campanha.id)?.gerado_em ?? null,
        relatorioEnviadoEm:
          relatoriosMap.get(campanha.id)?.relatorio_enviado_em ?? null,
      })
    );
  }

  return sortRiscosPsicossociaisProcessos([
    ...processosNormais,
    ...processosManuais,
  ]);
}

/** Status ativos por campanha (exclui removidos) — base do progresso. */
async function listarStatusParticipantesPorCampanhas(
  campanhaIds: string[]
): Promise<Map<string, Array<{ status: string }>>> {
  const map = new Map<string, Array<{ status: string }>>();
  const ids = Array.from(new Set(campanhaIds.filter(Boolean)));
  if (ids.length === 0) return map;

  const supabase = createClient();
  const ler = (select: string, ocultarRemovidos: boolean) =>
    lerTodosOsLotes(async (from, to) => {
      let query = supabase
        .from("riscos_campanha_participantes")
        .select(select)
        .in("campanha_id", ids)
        .order("id", { ascending: true });
      if (ocultarRemovidos) query = query.neq("status", "removido");
      const { data: page, error: pageError } = await query.range(from, to);
      if (pageError) throw pageError;
      return (page ?? []) as unknown as Array<Record<string, unknown>>;
    });

  let data: Array<Record<string, unknown>>;
  try {
    data = await ler("campanha_id, status, removido_em", false);
  } catch (error) {
    const message =
      error && typeof error === "object" && "message" in error
        ? String((error as { message?: string }).message ?? "")
        : "";
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: string }).code ?? "")
        : "";
    if (/removido_em/i.test(message)) {
      try {
        data = await ler("campanha_id, status", true);
      } catch (fallback) {
        console.warn("riscos participantes (progresso) indisponível:", fallback);
        return map;
      }
    } else if (code === "42P01" || /does not exist/i.test(message)) {
      return map;
    } else {
      console.warn("riscos participantes (progresso) indisponível:", error);
      return map;
    }
  }

  for (const row of data ?? []) {
    const campanhaId = String(
      (row as { campanha_id?: string }).campanha_id ?? ""
    );
    if (!campanhaId) continue;
    const status = String((row as { status?: string }).status ?? "pendente");
    const removidoEm = (row as { removido_em?: string | null }).removido_em;
    if (status === "removido" || removidoEm) continue;
    const list = map.get(campanhaId) ?? [];
    list.push({ status });
    map.set(campanhaId, list);
  }

  return map;
}

/** Metadados de relatório final por campanha (listagem). */
async function listarRelatoriosMetaPorCampanhas(
  campanhaIds: string[]
): Promise<
  Map<string, { gerado_em: string; relatorio_enviado_em: string | null }>
> {
  const map = new Map<
    string,
    { gerado_em: string; relatorio_enviado_em: string | null }
  >();
  const ids = Array.from(new Set(campanhaIds.filter(Boolean)));
  if (ids.length === 0) return map;

  const supabase = createClient();
  const ler = (select: string) =>
    lerPorIdentificadores(ids, async (grupo, from, to) => {
      const { data, error } = await supabase
        .from("riscos_relatorios")
        .select(select)
        .in("campanha_id", grupo)
        .order("id", { ascending: true })
        .range(from, to);
      if (error) throw error;
      return data ?? [];
    });

  let data: unknown[];
  try {
    data = await ler("campanha_id, gerado_em, relatorio_enviado_em");
  } catch (error) {
    const falha = error as { message?: string; code?: string };
    if (falha.code === "42P01" || falha.message?.includes("does not exist")) {
      return map;
    }
    if (
      /relatorio_enviado_em/i.test(falha.message ?? "") ||
      falha.code === "42703"
    ) {
      try {
        data = await ler("campanha_id, gerado_em");
      } catch (fallback) {
        console.warn("riscos_relatorios (listagem) indisponível:", fallback);
        return map;
      }
    } else {
      console.warn("riscos_relatorios (listagem) indisponível:", falha.message);
      return map;
    }
  }

  for (const row of data) {
    const cid = String((row as { campanha_id?: string }).campanha_id ?? "");
    if (!cid) continue;
    map.set(cid, {
      gerado_em: String((row as { gerado_em?: string }).gerado_em ?? ""),
      relatorio_enviado_em: (row as { relatorio_enviado_em?: string | null })
        .relatorio_enviado_em
        ? String(
            (row as { relatorio_enviado_em: string }).relatorio_enviado_em
          )
        : null,
    });
  }
  return map;
}

async function garantirTrackingRiscosPsicossociais(
  implantacao: ImplantacaoProcesso[]
): Promise<Map<string, OrcamentoRiscosPsicossociaisRecord>> {
  const map = new Map<string, OrcamentoRiscosPsicossociaisRecord>();
  const ids = implantacao.map((p) => p.orcamento.id);
  if (ids.length === 0) return map;

  const supabase = createClient();
  const ler = (select: string) =>
    lerPorIdentificadores(ids, async (grupo, from, to) => {
      const { data, error } = await supabase
        .from("orcamento_riscos_psicossociais")
        .select(select)
        .in("orcamento_id", grupo)
        .order("orcamento_id", { ascending: true })
        .range(from, to);
      if (error) throw error;
      return data ?? [];
    });

  let rows: Array<Record<string, unknown>>;
  try {
    rows = (await ler(RISCOS_TRACKING_SELECT)) as unknown as Array<
      Record<string, unknown>
    >;
  } catch (error) {
    const message =
      error && typeof error === "object" && "message" in error
        ? String((error as { message?: string }).message ?? "")
        : "";
    try {
      if (/pausa_situacao|pausa_em|pausa_por|pausa_observacao/i.test(message)) {
        rows = (await ler(RISCOS_TRACKING_SELECT_SEM_PAUSA)) as unknown as Array<
          Record<string, unknown>
        >;
      } else if (
        /cancelado_em|cancelado_por|motivo_cancelamento/i.test(message)
      ) {
        rows = (await ler(
          RISCOS_TRACKING_SELECT_SEM_CANCELAMENTO
        )) as unknown as Array<Record<string, unknown>>;
      } else {
        console.warn("riscos-psicossociais tracking indisponível:", message);
        return map;
      }
    } catch (fallback) {
      console.warn("riscos-psicossociais tracking indisponível:", fallback);
      return map;
    }
  }

  for (const row of rows) {
    map.set(
      String(row.orcamento_id),
      row as unknown as OrcamentoRiscosPsicossociaisRecord
    );
  }

  const faltantes = implantacao.filter((p) =>
    deveInserirTrackingRiscosNoSincronismo(
      isProcessoElegivelRiscosPsicossociais(p),
      map.get(p.orcamento.id) ?? null
    )
  );

  for (const processo of faltantes) {
    const orcamentoId = processo.orcamento.id;
    const entradaEm =
      processo.treinamento?.atualizado_em ??
      processo.treinamento?.criado_em ??
      processo.aprovacao?.updated_at ??
      new Date().toISOString();
    const { data: inserted, error: insertError } = await supabase
      .from("orcamento_riscos_psicossociais")
      .upsert(
        {
          orcamento_id: orcamentoId,
          etapa_atual: "lista_presenca",
          etapas_concluidas: 0,
          status: "em_andamento",
          entrada_em: entradaEm,
        },
        { onConflict: "orcamento_id", ignoreDuplicates: true }
      )
      .select(RISCOS_TRACKING_SELECT)
      .maybeSingle();

    if (insertError) {
      console.warn(
        "falha ao criar tracking Riscos Psicossociais:",
        insertError.message
      );
      map.set(orcamentoId, {
        orcamento_id: orcamentoId,
        etapa_atual: "lista_presenca",
        etapas_concluidas: 0,
        status: "em_andamento",
        entrada_em: entradaEm,
      });
      continue;
    }

    if (inserted) {
      map.set(orcamentoId, inserted as OrcamentoRiscosPsicossociaisRecord);
    } else {
      map.set(orcamentoId, {
        orcamento_id: orcamentoId,
        etapa_atual: "lista_presenca",
        etapas_concluidas: 0,
        status: "em_andamento",
        entrada_em: entradaEm,
      });
    }
  }

  return map;
}
