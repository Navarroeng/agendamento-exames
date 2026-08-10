"use client";

import { Modal } from "@/components/ui/Modal";
import { RiscosPsicossociaisPainel } from "@/components/riscos-psicossociais/RiscosPsicossociaisPainel";
import { formatClienteNomeDisplay } from "@/lib/cliente-display";
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
  onCriarParticipante?: (input: RiscosParticipanteInput) => Promise<void>;
  onEditarParticipante?: (
    participanteId: string,
    input: RiscosParticipanteInput
  ) => Promise<void>;
  onRemoverParticipante?: (participanteId: string) => Promise<void>;
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
  onCriarParticipante,
  onEditarParticipante,
  onRemoverParticipante,
}: RiscosPsicossociaisModalProps) {
  if (!open || !processo) return null;

  const { orcamento, numeroContrato } = processo.implantacao;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Riscos Psicossociais · ${orcamento.numero}`}
      subtitle={`${formatClienteNomeDisplay(orcamento.cliente_nome)}${
        numeroContrato ? ` · Contrato ${numeroContrato}` : ""
      } · ${processo.progressoLabel}`}
      size="xl"
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            className="btn justify-center sm:w-auto"
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
        onCriarParticipante={async (input) => {
          await onCriarParticipante?.(input);
        }}
        onEditarParticipante={async (id, input) => {
          await onEditarParticipante?.(id, input);
        }}
        onRemoverParticipante={async (id) => {
          await onRemoverParticipante?.(id);
        }}
      />
    </Modal>
  );
}
