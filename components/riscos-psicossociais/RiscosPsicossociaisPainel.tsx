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

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-[#dbeafe] bg-gradient-to-br from-[#f8fbff] to-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
              Painel da pesquisa
            </p>
            <h2 className="mt-0.5 truncate text-lg font-extrabold text-navy">
              {formatClienteNomeDisplay(orcamento.cliente_nome)}
            </h2>
            <p className="mt-1 text-xs text-[#64748b]">
              CNPJ{" "}
              <span className="tabular-nums font-semibold text-navy">
                {cnpj.replace(/\D/g, "").length === 14
                  ? formatCNPJ(cnpj)
                  : cnpj || "—"}
              </span>
              {numeroContrato ? (
                <>
                  {" "}
                  · Contrato{" "}
                  <span className="font-semibold text-navy">{numeroContrato}</span>
                </>
              ) : null}
              {" · "}
              Resp.{" "}
              <span className="font-semibold text-navy">
                {orcamento.responsavel?.trim() || "—"}
              </span>
            </p>
            <p className="mt-1 text-xs text-[#64748b]">
              Período:{" "}
              <span className="font-semibold text-navy">{periodo}</span>
            </p>
          </div>
          <span className="inline-flex rounded-full bg-[#eef2ff] px-3 py-1 text-[11px] font-extrabold text-[#4338ca]">
            {statusLabel}
          </span>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold text-[#64748b]">
            <span>
              Progresso geral · {processo.progressoLabel}
            </span>
            <span className="tabular-nums text-navy">
              {participacaoPct}% participação
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#e2e8f0]">
            <div
              className="h-full rounded-full bg-brand-blue transition-all"
              style={{ width: `${Math.min(100, Math.max(0, progressoPct))}%` }}
            />
          </div>
        </div>
      </header>

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
