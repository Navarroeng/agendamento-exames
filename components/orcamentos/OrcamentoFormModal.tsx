"use client";

import { Modal } from "@/components/ui/Modal";
import type { OrcamentoFormField } from "@/hooks/useOrcamentoForm";
import type { CondicoesPagamentoProposta } from "@/lib/orcamento-pagamento";
import type {
  OrcamentoFormValues,
  ServicoSstRecord,
} from "@/lib/orcamento-types";
import type { ClienteRecord } from "@/lib/types";
import { OrcamentoForm } from "./OrcamentoForm";
import { OrcamentoFormActions } from "./OrcamentoFormActions";

interface OrcamentoFormModalProps {
  open: boolean;
  isEditing: boolean;
  form: OrcamentoFormValues;
  clientes: ClienteRecord[];
  servicos: ServicoSstRecord[];
  servicosLoading: boolean;
  servicosError: string | null;
  subtotal: number;
  valorTotal: number;
  validadeProposta: string;
  condicoesPagamento: CondicoesPagamentoProposta;
  saving: boolean;
  discardConfirmOpen: boolean;
  closeOnOverlayClick: boolean;
  onChange: (field: OrcamentoFormField, value: string) => void;
  onSelectCliente: (clienteId: string) => void;
  onAddItem: () => void;
  onRemoveItem: (id: string) => void;
  onUpdateItem: (
    id: string,
    field: keyof OrcamentoFormValues["itens"][number],
    value: string,
    servicoNome?: string
  ) => void;
  onApplyValorSugerido: (itemId: string, valor: number | null) => void;
  onClear: () => void;
  onRequestClose: () => void;
  onSave: () => void;
  onContinueEditing: () => void;
  onDiscardAndClose: () => void;
}

export function OrcamentoFormModal({
  open,
  isEditing,
  form,
  clientes,
  servicos,
  servicosLoading,
  servicosError,
  subtotal,
  valorTotal,
  validadeProposta,
  condicoesPagamento,
  saving,
  discardConfirmOpen,
  closeOnOverlayClick,
  onChange,
  onSelectCliente,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
  onApplyValorSugerido,
  onClear,
  onRequestClose,
  onSave,
  onContinueEditing,
  onDiscardAndClose,
}: OrcamentoFormModalProps) {
  return (
    <>
      <Modal
        open={open}
        onClose={onRequestClose}
        title={isEditing ? "Editar Orçamento" : "Novo Orçamento"}
        subtitle={
          isEditing
            ? "Atualize os dados da proposta e salve as alterações."
            : "Preencha os dados da proposta comercial."
        }
        size="xl"
        closeOnOverlayClick={closeOnOverlayClick}
        footer={
          <OrcamentoFormActions
            saving={saving}
            isEditing={isEditing}
            onClear={onClear}
            onCancel={onRequestClose}
            onSave={onSave}
            compact
          />
        }
      >
        <OrcamentoForm
          form={form}
          isEditing={isEditing}
          embeddedInModal
          clientes={clientes}
          servicos={servicos}
          servicosLoading={servicosLoading}
          servicosError={servicosError}
          subtotal={subtotal}
          valorTotal={valorTotal}
          validadeProposta={validadeProposta}
          condicoesPagamento={condicoesPagamento}
          onChange={onChange}
          onSelectCliente={onSelectCliente}
          onAddItem={onAddItem}
          onRemoveItem={onRemoveItem}
          onUpdateItem={onUpdateItem}
          onApplyValorSugerido={onApplyValorSugerido}
        />
      </Modal>

      <Modal
        open={discardConfirmOpen}
        onClose={onContinueEditing}
        title="Alterações não salvas"
        closeOnOverlayClick={false}
        footer={
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn justify-center sm:w-auto"
              onClick={onContinueEditing}
            >
              Continuar preenchendo
            </button>
            <button
              type="button"
              className="btn btn-primary justify-center sm:w-auto"
              onClick={onDiscardAndClose}
            >
              Descartar e fechar
            </button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-[#475569]">
          Existem informações não salvas. Deseja realmente fechar este
          orçamento?
        </p>
      </Modal>
    </>
  );
}
