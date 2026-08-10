"use client";

import { useMemo } from "react";
import { formatCNPJ } from "@/lib/cnpj";
import { formatClienteNomeDisplay } from "@/lib/cliente-display";
import {
  RISCOS_CAMPANHA_STATUS_LABELS,
  formatPeriodoCampanha,
} from "@/lib/riscos-campanha";
import {
  buildParticipantesResumo,
  type RiscosCampanhaParticipanteRecord,
  type RiscosParticipanteInput,
} from "@/lib/riscos-campanha-participantes";
import type { RiscosPsicossociaisProcesso } from "@/lib/riscos-psicossociais";
import { RiscosPainelCards } from "@/components/riscos-psicossociais/RiscosPainelCards";
import { RiscosPainelPreRequisitos } from "@/components/riscos-psicossociais/RiscosPainelPreRequisitos";
import { RiscosPainelSituacaoAtual } from "@/components/riscos-psicossociais/RiscosPainelSituacaoAtual";

interface RiscosPsicossociaisPainelProps {
  processo: RiscosPsicossociaisProcesso;
  participantes: RiscosCampanhaParticipanteRecord[];
  savingLista?: boolean;
  savingCampanha?: boolean;
  savingParticipante?: boolean;
  onSalvarSolicitacaoLista: (input: {
    dataSolicitacaoIso: string;
    email: string;
  }) => Promise<void>;
  onSalvarRecebimentoLista: (file: File) => Promise<void>;
  onRemoverAnexoLista: () => Promise<void>;
  onVisualizarAnexoLista: () => Promise<void>;
  onCriarCampanha: (input: {
    dataInicioIso: string;
    dataEncerramentoIso: string;
    quantidadePrevista: number;
  }) => Promise<void>;
  onCriarParticipante: (input: RiscosParticipanteInput) => Promise<void>;
  onEditarParticipante: (
    participanteId: string,
    input: RiscosParticipanteInput
  ) => Promise<void>;
  onRemoverParticipante: (participanteId: string) => Promise<void>;
}

export function RiscosPsicossociaisPainel({
  processo,
  participantes,
  savingLista = false,
  savingCampanha = false,
  savingParticipante = false,
  onSalvarSolicitacaoLista,
  onSalvarRecebimentoLista,
  onRemoverAnexoLista,
  onVisualizarAnexoLista,
  onCriarCampanha,
  onCriarParticipante,
  onEditarParticipante,
  onRemoverParticipante,
}: RiscosPsicossociaisPainelProps) {
  const { orcamento, numeroContrato } = processo.implantacao;
  const campanha = processo.campanha;
  const cnpj = orcamento.cliente_cnpj ?? campanha?.cnpj ?? "";

  const resumo = useMemo(() => {
    const previstos = campanha?.quantidade_prevista ?? 0;
    return buildParticipantesResumo(previstos, participantes);
  }, [campanha?.quantidade_prevista, participantes]);

  const faltamCadastrar = Math.max(0, resumo.previstos - resumo.cadastrados);

  const baseParticipacao =
    resumo.previstos > 0
      ? resumo.previstos
      : resumo.cadastrados > 0
        ? resumo.cadastrados
        : 0;
  const participacaoPct =
    baseParticipacao > 0
      ? Math.round((resumo.respondidos / baseParticipacao) * 100)
      : 0;

  const progressoPct = Math.round(
    (processo.etapasConcluidas / Math.max(processo.totalEtapas, 1)) * 100
  );

  const statusLabel =
    processo.status === "concluido"
      ? "Concluído"
      : campanha
        ? RISCOS_CAMPANHA_STATUS_LABELS[campanha.status]
        : "Em andamento";

  const periodo = campanha
    ? formatPeriodoCampanha(campanha.data_inicio, campanha.data_encerramento)
    : "—";

  const headerMetrics = [
    { label: "Previstos", value: String(resumo.previstos) },
    { label: "Cadastrados", value: String(resumo.cadastrados) },
    { label: "Responderam", value: String(resumo.respondidos) },
    { label: "Pendentes", value: String(resumo.pendentes) },
    { label: "Participação", value: `${participacaoPct}%` },
  ];

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-[#dbeafe] bg-gradient-to-br from-[#f8fbff] to-white px-4 py-3.5 shadow-sm sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-base font-extrabold text-navy sm:text-lg">
                {formatClienteNomeDisplay(orcamento.cliente_nome)}
              </h2>
              <span className="inline-flex rounded-full bg-[#eef2ff] px-2.5 py-0.5 text-[10px] font-extrabold text-[#4338ca]">
                {statusLabel}
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-[#64748b] sm:text-xs">
              CNPJ{" "}
              <span className="tabular-nums font-semibold text-navy">
                {cnpj.replace(/\D/g, "").length === 14
                  ? formatCNPJ(cnpj)
                  : cnpj || "—"}
              </span>
              {numeroContrato ? (
                <>
                  {" · "}Contrato{" "}
                  <span className="font-semibold text-navy">{numeroContrato}</span>
                </>
              ) : null}
              {" · "}Resp.{" "}
              <span className="font-semibold text-navy">
                {orcamento.responsavel?.trim() || "—"}
              </span>
              {" · "}Período{" "}
              <span className="font-semibold text-navy">{periodo}</span>
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5">
          {headerMetrics.map((m) => (
            <div
              key={m.label}
              className="rounded-xl border border-[#e8edf5] bg-white/80 px-2.5 py-1.5"
            >
              <p className="text-[9px] font-bold uppercase tracking-wide text-[#94a3b8]">
                {m.label}
              </p>
              <p className="text-sm font-extrabold tabular-nums text-navy">
                {m.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-3 space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-semibold text-[#64748b]">
            <span>Progresso geral · {processo.progressoLabel}</span>
            <span className="tabular-nums text-navy">{participacaoPct}% part.</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#e2e8f0]">
            <div
              className="h-full rounded-full bg-brand-blue transition-all"
              style={{ width: `${Math.min(100, Math.max(0, progressoPct))}%` }}
            />
          </div>
        </div>
      </header>

      <RiscosPainelSituacaoAtual
        processo={processo}
        resumo={resumo}
        faltamCadastrar={faltamCadastrar}
        participacaoPct={participacaoPct}
      />

      <RiscosPainelPreRequisitos
        processo={processo}
        savingLista={savingLista}
        onSalvarSolicitacaoLista={onSalvarSolicitacaoLista}
        onSalvarRecebimentoLista={onSalvarRecebimentoLista}
        onRemoverAnexoLista={onRemoverAnexoLista}
        onVisualizarAnexoLista={onVisualizarAnexoLista}
      />

      <RiscosPainelCards
        processo={processo}
        participantes={participantes}
        savingCampanha={savingCampanha}
        savingParticipante={savingParticipante}
        onCriarCampanha={onCriarCampanha}
        onCriarParticipante={onCriarParticipante}
        onEditarParticipante={onEditarParticipante}
        onRemoverParticipante={onRemoverParticipante}
      />
    </div>
  );
}
