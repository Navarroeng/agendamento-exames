"use client";

import { useEffect, useId, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { RISCOS_CAMPANHA_STATUS_LABELS } from "@/lib/riscos-campanha";
import type { RiscosCampanhaRecord } from "@/lib/riscos-campanha";
import type { CopsoqClassificacaoResultadoId } from "@/lib/copsoq-engine";
import {
  comportamentosOfensivosPermiteExpansao,
  labelResumoComportamentosOfensivos,
} from "@/lib/riscos-resultados";

type DimensaoResultadoUi = {
  id: string;
  nome: string;
  media: number | null;
  mediaBruta?: number | null;
  maxEscalaFinal?: 3 | 4;
  classificacao: {
    id: CopsoqClassificacaoResultadoId;
    label: string;
  };
  respondentesValidos: number;
};

type OfensivosUi = {
  titulo: string;
  respondentesComAlgumaResposta: number;
  media: null;
  classificacao: null;
  itens: Array<{
    perguntaCodigo: string;
    perguntaTexto: string;
    totais: Array<{ label: string; quantidade: number }>;
  }>;
};

type ResultadosPayload = {
  ok?: boolean;
  sessoesConcluidas: number;
  previstos: number;
  pendentes: number;
  participacaoPercentual: number | null;
  statusCampanha: string;
  riscoGeral: null;
  riscoGeralMensagem: string;
  dimensoes: DimensaoResultadoUi[];
  comportamentosOfensivos: OfensivosUi;
  error?: string;
};

function StatChip({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-xl border border-[#e8edf5] bg-[#f8fafc] px-2.5 py-2">
      <p className="text-[9px] font-bold uppercase tracking-wide text-[#94a3b8]">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-extrabold tabular-nums text-navy sm:text-base">
        {value}
      </p>
    </div>
  );
}

function ResumoSituacaoCard({
  label,
  value,
  dotClass,
  softClass,
}: {
  label: string;
  value: number;
  dotClass: string;
  softClass: string;
}) {
  return (
    <div
      className={`rounded-xl border border-[#e8edf5] px-2.5 py-2.5 ${softClass}`}
    >
      <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wide text-[#64748b]">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`} />
        {label}
      </p>
      <p className="mt-1 text-xl font-extrabold tabular-nums leading-none text-navy">
        {value}
      </p>
    </div>
  );
}

function contarResumoGeral(dimensoes: DimensaoResultadoUi[]) {
  let favoraveis = 0;
  let moderadas = 0;
  let desfavoraveis = 0;

  for (const d of dimensoes) {
    if (d.classificacao.id === "situacao_favoravel") favoraveis += 1;
    else if (d.classificacao.id === "risco_intermediario") moderadas += 1;
    else if (d.classificacao.id === "risco_para_saude") desfavoraveis += 1;
  }

  return {
    favoraveis,
    moderadas,
    desfavoraveis,
    total: favoraveis + moderadas + desfavoraveis,
  };
}

function ComportamentosOfensivosAccordion({
  data,
  aberto,
  onToggle,
}: {
  data: OfensivosUi;
  aberto: boolean;
  onToggle: () => void;
}) {
  const painelId = useId();
  const permiteExpandir = comportamentosOfensivosPermiteExpansao(
    data.respondentesComAlgumaResposta
  );
  const resumo = labelResumoComportamentosOfensivos(
    data.respondentesComAlgumaResposta
  );
  const expandido = permiteExpandir && aberto;

  const header = (
    <>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
          {data.titulo}
        </span>
        <span className="mt-0.5 block text-[11px] leading-snug text-[#64748b]">
          {resumo}
        </span>
      </span>
      {permiteExpandir ? (
        <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-[#64748b]">
          {expandido ? null : <span>Ver detalhes</span>}
          {expandido ? (
            <ChevronUp className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" aria-hidden />
          )}
        </span>
      ) : null}
    </>
  );

  return (
    <div className="overflow-hidden rounded-xl border border-[#e8edf5] bg-[#f8fafc]">
      {permiteExpandir ? (
        <button
          type="button"
          className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-[#f1f5f9]"
          aria-expanded={expandido}
          aria-controls={painelId}
          onClick={onToggle}
        >
          {header}
        </button>
      ) : (
        <div className="flex items-center gap-2 px-3 py-2">{header}</div>
      )}

      {expandido ? (
        <div
          id={painelId}
          className="space-y-2 border-t border-[#eef2f7] bg-white px-3 py-2.5"
        >
          <p className="text-[11px] text-[#64748b]">
            Análise qualitativa consolidada · sem média ou classificação de
            risco.
          </p>
          {data.itens.map((item) => (
            <div
              key={item.perguntaCodigo}
              className="rounded-xl border border-[#e8edf5] bg-[#f8fafc] px-3 py-2.5"
            >
              <p className="text-xs font-extrabold text-navy">
                {item.perguntaCodigo}
              </p>
              <p className="mt-0.5 text-[11px] text-[#64748b]">
                {item.perguntaTexto}
              </p>
              {item.totais.length === 0 ? (
                <p className="mt-1.5 text-[11px] text-[#94a3b8]">
                  Sem respostas.
                </p>
              ) : (
                <ul className="mt-1.5 space-y-0.5 text-[11px] text-navy">
                  {item.totais.map((t) => (
                    <li key={`${item.perguntaCodigo}-${t.label}`}>
                      <span className="font-semibold">{t.label}</span>
                      {": "}
                      <span className="tabular-nums">{t.quantidade}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

interface RiscosResultadosPanelProps {
  campanha: RiscosCampanhaRecord | null;
  /** Muda após invalidação/remoção para recarregar consolidação. */
  refreshKey?: string;
}

export function RiscosResultadosPanel({
  campanha,
  refreshKey = "",
}: RiscosResultadosPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ResultadosPayload | null>(null);
  const [ofensivosAberto, setOfensivosAberto] = useState(false);

  useEffect(() => {
    if (!campanha?.id) {
      setData(null);
      setError(null);
      setOfensivosAberto(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setOfensivosAberto(false);

    void (async () => {
      try {
        const res = await fetch(
          `/api/riscos/campanha/${encodeURIComponent(campanha.id)}/resultados`
        );
        const json = (await res.json()) as ResultadosPayload;
        if (cancelled) return;
        if (!res.ok || !json.ok) {
          setError(json.error || "Não foi possível carregar os resultados.");
          setData(null);
          return;
        }
        setData(json);
      } catch {
        if (!cancelled) {
          setError("Não foi possível carregar os resultados.");
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [campanha?.id, refreshKey]);

  if (!campanha) {
    return (
      <p className="rounded-xl border border-dashed border-[#e2e8f0] bg-[#f8fafc] px-3 py-3 text-xs text-[#64748b]">
        Crie a pesquisa para visualizar resultados.
      </p>
    );
  }

  if (loading) {
    return (
      <p className="text-xs font-medium text-[#64748b]">
        Carregando resultados…
      </p>
    );
  }

  if (error) {
    return (
      <p className="rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-3 text-xs font-medium text-[#b91c1c]">
        {error}
      </p>
    );
  }

  if (!data || data.sessoesConcluidas === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[#e2e8f0] bg-[#f8fafc] px-3 py-3 text-xs leading-relaxed text-[#64748b]">
        Ainda não existem respostas concluídas para esta pesquisa.
      </p>
    );
  }

  const resumo = contarResumoGeral(data.dimensoes);

  const statusLabel =
    RISCOS_CAMPANHA_STATUS_LABELS[
      data.statusCampanha as keyof typeof RISCOS_CAMPANHA_STATUS_LABELS
    ] ?? data.statusCampanha;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatChip
          label="Participação"
          value={
            data.participacaoPercentual != null
              ? `${data.participacaoPercentual}%`
              : "—"
          }
        />
        <StatChip label="Respondidos" value={data.sessoesConcluidas} />
        <StatChip label="Pendentes" value={data.pendentes} />
        <StatChip label="Status" value={statusLabel} />
      </div>

      <p className="text-[11px] text-[#64748b]">{data.riscoGeralMensagem}</p>

      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
          Resumo Geral
        </p>
        <div className="grid grid-cols-3 gap-2">
          <ResumoSituacaoCard
            label="Favoráveis"
            value={resumo.favoraveis}
            dotClass="bg-brand-green"
            softClass="bg-[#f0fdf4]"
          />
          <ResumoSituacaoCard
            label="Moderadas"
            value={resumo.moderadas}
            dotClass="bg-[#ca8a04]"
            softClass="bg-[#fffbeb]"
          />
          <ResumoSituacaoCard
            label="Desfavoráveis"
            value={resumo.desfavoraveis}
            dotClass="bg-[#dc2626]"
            softClass="bg-[#fef2f2]"
          />
        </div>
        <p className="text-[11px] text-[#64748b]">
          {resumo.total}{" "}
          {resumo.total === 1 ? "categoria avaliada" : "categorias avaliadas"}
        </p>
      </div>

      <ComportamentosOfensivosAccordion
        data={data.comportamentosOfensivos}
        aberto={ofensivosAberto}
        onToggle={() => setOfensivosAberto((v) => !v)}
      />
    </div>
  );
}
