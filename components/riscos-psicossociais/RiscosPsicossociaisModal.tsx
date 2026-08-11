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
  onCriarCampanha?: (input: {
    dataInicioIso: string;
    dataEncerramentoIso: string;
    quantidadePrevista: number;
  }) => Promise<void>;
  onAbrirCampanha?: () => Promise<void>;
  onEncerrarCampanha?: () => Promise<void>;
  onGarantirCodigoAcesso?: (regenerar?: boolean) => Promise<void>;
  onCriarParticipante?: (input: RiscosParticipanteInput) => Promise<void>;
  onEditarParticipante?: (
    participanteId: string,
    input: RiscosParticipanteInput
  ) => Promise<void>;
  onRemoverParticipante?: (participanteId: string) => Promise<void>;
  campanhaStatusSincronizado?: boolean;
}

export function RiscosPsicossociaisModal({
  open,
  processo,
  savingLista = false,
  savingCampanha = false,
  participantes = [],
  savingParticipante = false,
  onClose,
  onSalvarSolicitacaoLista,
  onSalvarRecebimentoLista,
  onRemoverAnexoLista,
  onVisualizarAnexoLista,
  onCriarCampanha,
  onAbrirCampanha,
  onEncerrarCampanha,
  onGarantirCodigoAcesso,
  onCriarParticipante,
  onEditarParticipante,
  onRemoverParticipante,
  campanhaStatusSincronizado = false,
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
        onCriarCampanha={async (input) => {
          await onCriarCampanha?.(input);
        }}
        onAbrirCampanha={async () => {
          await onAbrirCampanha?.();
        }}
        onEncerrarCampanha={async () => {
          await onEncerrarCampanha?.();
        }}
        onGarantirCodigoAcesso={async (regenerar) => {
          await onGarantirCodigoAcesso?.(regenerar);
        }}
        onCriarParticipante={async (input) => {
          await onCriarParticipante?.(input);
        }}
        onEditarParticipante={async (id, input) => {
          await onEditarParticipante?.(id, input);
        }}
        onRemoverParticipante={async (id) => {
          await onRemoverParticipante?.(id);
        }}
        campanhaStatusSincronizado={campanhaStatusSincronizado}
      />
    </Modal>
  );
}
