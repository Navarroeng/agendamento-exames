"use client";

import { Modal } from "@/components/ui/Modal";
import { RiscosPsicossociaisPainel } from "@/components/riscos-psicossociais/RiscosPsicossociaisPainel";
import { formatClienteNomeDisplay } from "@/lib/cliente-display";
import { isOrigemManualCliente } from "@/lib/riscos-campanha-origem";
import type {
  RiscosCampanhaParticipanteRecord,
  RiscosParticipanteInput,
} from "@/lib/riscos-campanha-participantes";
import type { RiscosPsicossociaisProcesso } from "@/lib/riscos-psicossociais";

interface RiscosPsicossociaisModalProps {
  open: boolean;
  processo: RiscosPsicossociaisProcesso | null;
  savingLista?: boolean;
  savingLogo?: boolean;
  savingCampanha?: boolean;
  participantes?: RiscosCampanhaParticipanteRecord[];
  savingParticipante?: boolean;
  onClose: () => void;
  onSalvarSolicitacaoLista?: (input: {
    dataSolicitacaoIso: string;
    email: string;
  }) => Promise<void>;
  onSalvarRecebimentoLista?: (file: File) => Promise<void>;
  onRemoverAnexoLista?: () => Promise<void>;
  onVisualizarAnexoLista?: () => Promise<void>;
  onUploadLogoCampanha?: (file: File) => Promise<void>;
  onRemoverLogoCampanha?: () => Promise<void>;
  onCriarCampanha?: (input: {
    dataInicioIso: string;
    dataEncerramentoIso: string;
  }) => Promise<void>;
  onAbrirCampanha?: () => Promise<void>;
  onEncerrarCampanha?: () => Promise<void>;
  onCancelarProcesso?: (motivo: string) => Promise<void>;
  onExcluirCampanha?: (confirmacaoCodigo: string) => Promise<void>;
  exclusaoDefinitivaDisponivel?: boolean;
  onGarantirCodigoAcesso?: (regenerar?: boolean) => Promise<void>;
  onCriarParticipante?: (input: RiscosParticipanteInput) => Promise<void>;
  onEditarParticipante?: (
    participanteId: string,
    input: RiscosParticipanteInput
  ) => Promise<void>;
  onPrepararImportacaoParticipantesExcel?: (
    file: File
  ) => Promise<{
    arquivoNome: string;
    linhasEncontradas: number;
    validos: number;
    comErro: number;
    avaliadas: import("@/lib/riscos-participantes-excel").LinhaAvaliacaoImportacao[];
    linhasProntas: import("@/lib/riscos-participantes-excel").LinhaImportacaoParticipante[];
  }>;
  onConfirmarImportacaoParticipantesExcel?: (
    linhas: import("@/lib/riscos-participantes-excel").LinhaImportacaoParticipante[]
  ) => Promise<{
    importados: number;
    ignorados: number;
    erros: Array<{ linha?: number; cpf: string; motivo: string }>;
  }>;
  onRemoverParticipante?: (participanteId: string) => Promise<void>;
  podeGerenciarParticipante?: boolean;
  campanhaStatusSincronizado?: boolean;
  auditContext?: import("@/lib/auditoria").AuditoriaUsuarioContext;
  onRelatorioAtualizado?: (relatorioGerado: boolean) => void;
}

export function RiscosPsicossociaisModal({
  open,
  processo,
  savingLista = false,
  savingLogo = false,
  savingCampanha = false,
  participantes = [],
  savingParticipante = false,
  onClose,
  onSalvarSolicitacaoLista,
  onSalvarRecebimentoLista,
  onRemoverAnexoLista,
  onVisualizarAnexoLista,
  onUploadLogoCampanha,
  onRemoverLogoCampanha,
  onCriarCampanha,
  onAbrirCampanha,
  onEncerrarCampanha,
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
}: RiscosPsicossociaisModalProps) {
  if (!open || !processo) return null;

  const { orcamento, numeroContrato } = processo.implantacao;
  const tituloManual = isOrigemManualCliente(processo.origem);
  const titulo = tituloManual
    ? `Riscos Psicossociais · ${formatClienteNomeDisplay(orcamento.cliente_nome)}`
    : `Riscos Psicossociais · ${orcamento.numero || formatClienteNomeDisplay(orcamento.cliente_nome)}`;
  const subtitleParts = [
    formatClienteNomeDisplay(orcamento.cliente_nome),
    !tituloManual && numeroContrato ? `Contrato ${numeroContrato}` : null,
    tituloManual ? "Origem: Inclusão manual" : null,
    processo.progressoLabel,
  ].filter(Boolean);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={titulo}
      subtitle={subtitleParts.join(" · ")}
      size="xxl"
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            className="btn btn-primary justify-center px-6 sm:w-auto"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>
      }
    >
      <RiscosPsicossociaisPainel
        processo={processo}
        participantes={participantes}
        savingLista={savingLista}
        savingLogo={savingLogo}
        savingCampanha={savingCampanha}
        savingParticipante={savingParticipante}
        onSalvarSolicitacaoLista={async (input) => {
          await onSalvarSolicitacaoLista?.(input);
        }}
        onSalvarRecebimentoLista={async (file) => {
          await onSalvarRecebimentoLista?.(file);
        }}
        onRemoverAnexoLista={async () => {
          await onRemoverAnexoLista?.();
        }}
        onVisualizarAnexoLista={async () => {
          await onVisualizarAnexoLista?.();
        }}
        onUploadLogoCampanha={async (file) => {
          await onUploadLogoCampanha?.(file);
        }}
        onRemoverLogoCampanha={async () => {
          await onRemoverLogoCampanha?.();
        }}
        onCriarCampanha={async (input) => {
          await onCriarCampanha?.(input);
        }}
        onAbrirCampanha={async () => {
          await onAbrirCampanha?.();
        }}
        onEncerrarCampanha={async () => {
          await onEncerrarCampanha?.();
        }}
        onCancelarProcesso={async (motivo) => {
          await onCancelarProcesso?.(motivo);
        }}
        onExcluirCampanha={async (codigo) => {
          await onExcluirCampanha?.(codigo);
        }}
        exclusaoDefinitivaDisponivel={exclusaoDefinitivaDisponivel}
        onGarantirCodigoAcesso={async (regenerar) => {
          await onGarantirCodigoAcesso?.(regenerar);
        }}
        onCriarParticipante={async (input) => {
          await onCriarParticipante?.(input);
        }}
        onEditarParticipante={async (id, input) => {
          await onEditarParticipante?.(id, input);
        }}
        onPrepararImportacaoParticipantesExcel={async (file) => {
          if (!onPrepararImportacaoParticipantesExcel) {
            throw new Error("Importação indisponível.");
          }
          return onPrepararImportacaoParticipantesExcel(file);
        }}
        onConfirmarImportacaoParticipantesExcel={async (linhas) => {
          if (!onConfirmarImportacaoParticipantesExcel) {
            throw new Error("Importação indisponível.");
          }
          return onConfirmarImportacaoParticipantesExcel(linhas);
        }}
        onRemoverParticipante={async (id) => {
          await onRemoverParticipante?.(id);
        }}
        podeGerenciarParticipante={podeGerenciarParticipante}
        campanhaStatusSincronizado={campanhaStatusSincronizado}
        auditContext={auditContext}
        onRelatorioAtualizado={onRelatorioAtualizado}
      />
    </Modal>
  );
}
