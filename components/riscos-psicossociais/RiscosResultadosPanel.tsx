"use client";

import { useEffect, useState } from "react";
import { RISCOS_CAMPANHA_STATUS_LABELS } from "@/lib/riscos-campanha";
import type { RiscosCampanhaRecord } from "@/lib/riscos-campanha";
import type { CopsoqClassificacaoResultadoId } from "@/lib/copsoq-engine";

type DimensaoResultadoUi = {
  id: string;
  nome: string;
  media: number | null;
  mediaBruta?: number | null;
  maxEscalaFinal?: 4 | 5;
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

function badgeClass(id: CopsoqClassificacaoResultadoId): string {
  if (id === "situacao_favoravel") {
    return "bg-brand-green-soft text-brand-green";
  }
  if (id === "risco_intermediario") {
    return "bg-[#fef9c3] text-[#a16207]";
  }
  if (id === "risco_para_saude") {
    return "bg-[#fee2e2] text-[#b91c1c]";
  }
  return "bg-[#f1f5f9] text-[#64748b]";
}

function formatMedia(media: number | null): string {
  if (media == null || Number.isNaN(media)) return "—";
  return media.toFixed(2).replace(".", ",");
}

function formatPontuacaoDimensao(
  media: number | null,
  max: number | undefined
): string {
  const m = formatMedia(media);
  if (m === "—") return m;
  return `${m} / ${max ?? 4}`;
}

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

  useEffect(() => {
    if (!campanha?.id) {
      setData(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

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
          Dimensões
        </p>
        <ul className="divide-y divide-[#eef2f7] overflow-hidden rounded-xl border border-[#e8edf5]">
          {data.dimensoes.map((d) => (
            <li
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-2 bg-white px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-navy">{d.nome}</p>
                <p className="text-[11px] text-[#64748b]">
                  {d.mediaBruta != null && d.mediaBruta !== d.media
                    ? `Original ${formatMedia(d.mediaBruta)} · dimensão ${formatPontuacaoDimensao(d.media, d.maxEscalaFinal)}`
                    : `Pontuação ${formatPontuacaoDimensao(d.media, d.maxEscalaFinal)}`}{" "}
                  · {d.respondentesValidos} respondente(s) válido(s)
                </p>
              </div>
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${badgeClass(
                  d.classificacao.id
                )}`}
              >
                {d.classificacao.label}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
          {data.comportamentosOfensivos.titulo}
        </p>
        <p className="text-[11px] text-[#64748b]">
          Análise qualitativa consolidada · sem média ou classificação de risco.
          {data.comportamentosOfensivos.respondentesComAlgumaResposta > 0
            ? ` · ${data.comportamentosOfensivos.respondentesComAlgumaResposta} sessão(ões) com alguma resposta nesta dimensão.`
            : " · Nenhuma resposta registrada nesta dimensão."}
        </p>
        <div className="space-y-2">
          {data.comportamentosOfensivos.itens.map((item) => (
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
                <p className="mt-1.5 text-[11px] text-[#94a3b8]">Sem respostas.</p>
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
      </div>
    </div>
  );
}
