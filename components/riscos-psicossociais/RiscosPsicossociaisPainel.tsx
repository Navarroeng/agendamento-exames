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
  onGarantirCodigoAcesso: (regenerar?: boolean) => Promise<void>;
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
  onAbrirCampanha,
  onGarantirCodigoAcesso,
  onCriarParticipante,
  onEditarParticipante,
  onRemoverParticipante,
}: RiscosPsicossociaisPainelProps) {
  const { orcamento, numeroContrato } = processo.implantacao;
  const campanha = processo.campanha;
  const cnpj = orcamento.cliente_cnpj ?? campanha?.cnpj ?? "";

  const statusLabel = useMemo(() => {
    if (processo.status === "concluido") return "Concluído";
    if (campanha) return RISCOS_CAMPANHA_STATUS_LABELS[campanha.status];
    return "Em andamento";
  }, [processo.status, campanha]);

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-[#dbeafe] bg-gradient-to-br from-[#f8fbff] to-white px-4 py-3.5 shadow-sm sm:px-5">
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
            {cnpj.replace(/\D/g, "").length === 14 ? formatCNPJ(cnpj) : cnpj || "—"}
          </span>
          {numeroContrato ? (
            <>
              {" · "}Contrato{" "}
              <span className="font-semibold text-navy">{numeroContrato}</span>
            </>
          ) : null}
        </p>
      </header>

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
        onGarantirCodigoAcesso={onGarantirCodigoAcesso}
        onCriarParticipante={onCriarParticipante}
        onEditarParticipante={onEditarParticipante}
        onRemoverParticipante={onRemoverParticipante}
      />
    </div>
  );
}
