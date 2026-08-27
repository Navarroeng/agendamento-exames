"use client";

import { formatCreatedAtBR } from "@/lib/format-datetime";
import { formatCNPJ } from "@/lib/cnpj";
import { formatClienteNomeDisplay } from "@/lib/cliente-display";
import type { RiscosCampanhaParticipanteRecord } from "@/lib/riscos-campanha-participantes";
import type { RiscosParticipanteInput } from "@/lib/riscos-campanha-participantes";
import type { RiscosPsicossociaisProcesso } from "@/lib/riscos-psicossociais";
import { RiscosEtapaAtualBadge } from "@/components/riscos-psicossociais/RiscosEtapaAtualBadge";
import { RiscosPainelCards } from "@/components/riscos-psicossociais/RiscosPainelCards";

interface RiscosPsicossociaisPainelProps {
  processo: RiscosPsicossociaisProcesso;
  participantes: RiscosCampanhaParticipanteRecord[];
  savingLista?: boolean;
  savingLogo?: boolean;
  savingCampanha?: boolean;
  savingParticipante?: boolean;
  onSalvarSolicitacaoLista: (input: {
    dataSolicitacaoIso: string;
  }) => Promise<void>;
  onSalvarRecebimentoLista: (file: File) => Promise<void>;
  onRemoverAnexoLista: () => Promise<void>;
  onVisualizarAnexoLista: () => Promise<void>;
  onUploadLogoCampanha: (file: File) => Promise<void>;
  onRemoverLogoCampanha: () => Promise<void>;
  onCriarCampanha: (input: {
    dataInicioIso: string;
    dataEncerramentoIso: string;
  }) => Promise<void>;
  onAbrirCampanha: () => Promise<void>;
  onEncerrarCampanha: () => Promise<void>;
  onProrrogarPrazo: (novaDataEncerramentoIso: string) => Promise<void>;
  onReabrirCampanha: (novaDataEncerramentoIso: string) => Promise<void>;
  onEditarPeriodo: (input: {
    novaDataInicioIso: string;
    novaDataEncerramentoIso: string;
    confirmarPrazoEncerrado?: boolean;
  }) => Promise<void>;
  onCancelarProcesso: (motivo: string) => Promise<void>;
  onExcluirCampanha: (confirmacaoCodigo: string) => Promise<void>;
  exclusaoDefinitivaDisponivel?: boolean;
  onGarantirCodigoAcesso: (regenerar?: boolean) => Promise<void>;
  onCriarParticipante: (input: RiscosParticipanteInput) => Promise<void>;
  onEditarParticipante: (
    participanteId: string,
    input: RiscosParticipanteInput
  ) => Promise<void>;
  onPrepararImportacaoParticipantesExcel: (
    file: File
  ) => Promise<{
    arquivoNome: string;
    linhasEncontradas: number;
    validos: number;
    comErro: number;
    avaliadas: import("@/lib/riscos-participantes-excel").LinhaAvaliacaoImportacao[];
    linhasProntas: import("@/lib/riscos-participantes-excel").LinhaImportacaoParticipante[];
  }>;
  onConfirmarImportacaoParticipantesExcel: (
    linhas: import("@/lib/riscos-participantes-excel").LinhaImportacaoParticipante[]
  ) => Promise<{
    importados: number;
    ignorados: number;
    erros: Array<{ linha?: number; cpf: string; motivo: string }>;
  }>;
  onRemoverParticipante: (participanteId: string) => Promise<void>;
  podeGerenciarParticipante?: boolean;
  campanhaStatusSincronizado?: boolean;
  auditContext?: import("@/lib/auditoria").AuditoriaUsuarioContext;
  onRelatorioAtualizado?: (relatorioGerado: boolean) => void;
}

export function RiscosPsicossociaisPainel({
  processo,
  participantes,
  savingLista = false,
  savingLogo = false,
  savingCampanha = false,
  savingParticipante = false,
  onSalvarSolicitacaoLista,
  onSalvarRecebimentoLista,
  onRemoverAnexoLista,
  onVisualizarAnexoLista,
  onUploadLogoCampanha,
  onRemoverLogoCampanha,
  onCriarCampanha,
  onAbrirCampanha,
  onEncerrarCampanha,
  onProrrogarPrazo,
  onReabrirCampanha,
  onEditarPeriodo,
  onCancelarProcesso,
  onExcluirCampanha,
  exclusaoDefinitivaDisponivel = false,
  onGarantirCodigoAcesso,
  onCriarParticipante,
  onEditarParticipante,
  onPrepararImportacaoParticipantesExcel,
  onConfirmarImportacaoParticipantesExcel,
  onRemoverParticipante,
  podeGerenciarParticipante = false,
  campanhaStatusSincronizado = false,
  auditContext,
  onRelatorioAtualizado,
}: RiscosPsicossociaisPainelProps) {
  const { orcamento, numeroContrato } = processo.implantacao;
  const campanha = processo.campanha;
  const cnpjRaw = orcamento.cliente_cnpj ?? campanha?.cnpj ?? "";
  const cnpjDigits = cnpjRaw.replace(/\D/g, "");
  const cnpjDisplay =
    cnpjDigits.length === 14 ? formatCNPJ(cnpjRaw) : cnpjRaw.trim() || "—";

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

      {processo.status === "cancelado" || processo.etapaAtual === "cancelado" ? (
        <section className="rounded-2xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3.5 sm:px-5">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-brand-red">
            Processo cancelado
          </p>
          <dl className="mt-2 space-y-1.5 text-sm text-[#475569]">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
                Motivo
              </dt>
              <dd className="font-semibold text-navy">
                {processo.motivoCancelamento?.trim() || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
                Cancelado em
              </dt>
              <dd>{formatCreatedAtBR(processo.canceladoEm)}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
                Cancelado por
              </dt>
              <dd>{processo.canceladoPor?.trim() || "—"}</dd>
            </div>
          </dl>
        </section>
      ) : null}

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
          <p className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#64748b]">
            Etapa atual:
            <RiscosEtapaAtualBadge processo={processo} />
          </p>
        </div>
      </section>

      <RiscosPainelCards
        processo={processo}
        participantes={participantes}
        savingLista={savingLista}
        savingLogo={savingLogo}
        savingCampanha={savingCampanha}
        savingParticipante={savingParticipante}
        onSalvarSolicitacaoLista={onSalvarSolicitacaoLista}
        onSalvarRecebimentoLista={onSalvarRecebimentoLista}
        onRemoverAnexoLista={onRemoverAnexoLista}
        onVisualizarAnexoLista={onVisualizarAnexoLista}
        onUploadLogoCampanha={onUploadLogoCampanha}
        onRemoverLogoCampanha={onRemoverLogoCampanha}
        onCriarCampanha={onCriarCampanha}
        onAbrirCampanha={onAbrirCampanha}
        onEncerrarCampanha={onEncerrarCampanha}
        onProrrogarPrazo={onProrrogarPrazo}
        onReabrirCampanha={onReabrirCampanha}
        onEditarPeriodo={onEditarPeriodo}
        onCancelarProcesso={onCancelarProcesso}
        onExcluirCampanha={onExcluirCampanha}
        exclusaoDefinitivaDisponivel={exclusaoDefinitivaDisponivel}
        onGarantirCodigoAcesso={onGarantirCodigoAcesso}
        onCriarParticipante={onCriarParticipante}
        onEditarParticipante={onEditarParticipante}
        onPrepararImportacaoParticipantesExcel={
          onPrepararImportacaoParticipantesExcel
        }
        onConfirmarImportacaoParticipantesExcel={
          onConfirmarImportacaoParticipantesExcel
        }
        onRemoverParticipante={onRemoverParticipante}
        podeGerenciarParticipante={
          podeGerenciarParticipante &&
          processo.status !== "cancelado" &&
          processo.etapaAtual !== "cancelado"
        }
        campanhaStatusSincronizado={campanhaStatusSincronizado}
        auditContext={auditContext}
        onRelatorioAtualizado={onRelatorioAtualizado}
      />
    </div>
  );
}
