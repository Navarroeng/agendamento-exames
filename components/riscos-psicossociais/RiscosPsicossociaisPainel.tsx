"use client";

import { useMemo } from "react";
import { formatCNPJ } from "@/lib/cnpj";
import { formatClienteNomeDisplay } from "@/lib/cliente-display";
import {
  RISCOS_CAMPANHA_STATUS_LABELS,
} from "@/lib/riscos-campanha";
import type { RiscosCampanhaParticipanteRecord } from "@/lib/riscos-campanha-participantes";
import type { RiscosParticipanteInput } from "@/lib/riscos-campanha-participantes";
import type { RiscosPsicossociaisProcesso } from "@/lib/riscos-psicossociais";
import { RiscosPainelCards } from "@/components/riscos-psicossociais/RiscosPainelCards";

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
  onAbrirCampanha: () => Promise<void>;
  onEncerrarCampanha: () => Promise<void>;
  onCancelarProcesso: (motivo: string) => Promise<void>;
  onExcluirCampanha: (confirmacaoCodigo: string) => Promise<void>;
  exclusaoDefinitivaDisponivel?: boolean;
  onGarantirCodigoAcesso: (regenerar?: boolean) => Promise<void>;
  onCriarParticipante: (input: RiscosParticipanteInput) => Promise<void>;
  onImportarParticipantesExcel: (file: File) => Promise<void>;
  onRemoverParticipante: (participanteId: string) => Promise<void>;
  podeRemoverParticipante?: boolean;
  campanhaStatusSincronizado?: boolean;
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
  onAbrirCampanha,
  onEncerrarCampanha,
  onCancelarProcesso,
  onExcluirCampanha,
  exclusaoDefinitivaDisponivel = false,
  onGarantirCodigoAcesso,
  onCriarParticipante,
  onImportarParticipantesExcel,
  onRemoverParticipante,
  podeRemoverParticipante = false,
  campanhaStatusSincronizado = false,
}: RiscosPsicossociaisPainelProps) {
  const { orcamento, numeroContrato } = processo.implantacao;
  const campanha = processo.campanha;
  const cnpjRaw = orcamento.cliente_cnpj ?? campanha?.cnpj ?? "";
  const cnpjDigits = cnpjRaw.replace(/\D/g, "");
  const cnpjDisplay =
    cnpjDigits.length === 14 ? formatCNPJ(cnpjRaw) : cnpjRaw.trim() || "—";

  const statusLabel = useMemo(() => {
    if (!campanha) return "Em andamento";
    if (!campanhaStatusSincronizado) return "Sincronizando…";
    return RISCOS_CAMPANHA_STATUS_LABELS[campanha.status];
  }, [campanha, campanhaStatusSincronizado]);

  const progressoPct = Math.round(
    (processo.etapasConcluidas / Math.max(processo.totalEtapas, 1)) * 100
  );

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-[#dbeafe] bg-gradient-to-br from-[#f8fbff] to-white px-4 py-3.5 shadow-sm sm:px-5">
        <h2 className="text-base font-extrabold leading-snug text-navy sm:text-lg">
          <span className="break-words">
            {formatClienteNomeDisplay(orcamento.cliente_nome)}
          </span>
          <span className="font-semibold text-[#64748b]"> · </span>
          <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-[#475569] sm:text-base">
            CNPJ {cnpjDisplay}
          </span>
        </h2>
        <p className="mt-1.5 text-[11px] leading-relaxed text-[#64748b] sm:text-xs">
          {!processo.exigeLaudosSst ? (
            <>
              <span className="font-semibold text-navy">Origem: Inclusão manual</span>
              {" · "}
            </>
          ) : numeroContrato ? (
            <>
              Contrato{" "}
              <span className="font-semibold text-navy">{numeroContrato}</span>
              {" · "}
            </>
          ) : null}
          <span className="font-semibold text-navy">
            {processo.etapasConcluidas} de {processo.totalEtapas} etapas
          </span>
        </p>
      </header>

      <section className="w-full rounded-2xl border border-[#e8edf5] bg-white px-4 py-3.5 shadow-sm sm:px-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-2 overflow-hidden rounded-full bg-[#e2e8f0]">
              <div
                className="h-full rounded-full bg-brand-blue transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(0, progressoPct))}%`,
                }}
              />
            </div>
            <p className="text-xs font-semibold text-[#64748b]">
              <span className="text-base font-extrabold tabular-nums text-navy">
                {progressoPct}%
              </span>
              {" · "}
              {processo.etapasConcluidas} de {processo.totalEtapas} etapas
              concluídas
            </p>
          </div>
          <p className="text-xs font-semibold text-[#64748b]">
            Status:{" "}
            <span className="font-extrabold text-navy">{statusLabel}</span>
          </p>
        </div>
      </section>

      <RiscosPainelCards
        processo={processo}
        participantes={participantes}
        savingLista={savingLista}
        savingCampanha={savingCampanha}
        savingParticipante={savingParticipante}
        onSalvarSolicitacaoLista={onSalvarSolicitacaoLista}
        onSalvarRecebimentoLista={onSalvarRecebimentoLista}
        onRemoverAnexoLista={onRemoverAnexoLista}
        onVisualizarAnexoLista={onVisualizarAnexoLista}
        onCriarCampanha={onCriarCampanha}
        onAbrirCampanha={onAbrirCampanha}
        onEncerrarCampanha={onEncerrarCampanha}
        onCancelarProcesso={onCancelarProcesso}
        onExcluirCampanha={onExcluirCampanha}
        exclusaoDefinitivaDisponivel={exclusaoDefinitivaDisponivel}
        onGarantirCodigoAcesso={onGarantirCodigoAcesso}
        onCriarParticipante={onCriarParticipante}
        onImportarParticipantesExcel={onImportarParticipantesExcel}
        onRemoverParticipante={onRemoverParticipante}
        podeRemoverParticipante={podeRemoverParticipante}
        campanhaStatusSincronizado={campanhaStatusSincronizado}
      />
    </div>
  );
}
