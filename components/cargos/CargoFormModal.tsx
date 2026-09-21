"use client";

import { Modal } from "@/components/ui/Modal";
import type { CargoFormField } from "@/hooks/useCargoForm";
import type { CargoFormValues, ExameRecord } from "@/lib/types";
import { CargoForm } from "./CargoForm";
import { CargoFormActions } from "./CargoFormActions";

interface CargoFormModalProps {
  open: boolean;
  isEditing: boolean;
  form: CargoFormValues;
  catalogExames: ExameRecord[];
  catalogLoading: boolean;
  saving: boolean;
  onChange: (field: CargoFormField, value: string) => void;
  onToggleExame: (exameId: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export function CargoFormModal({
  open,
  isEditing,
  form,
  catalogExames,
  catalogLoading,
  saving,
  onChange,
  onToggleExame,
  onClose,
  onSave,
}: CargoFormModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Editar cargo" : "Novo cargo"}
      size="xl"
      footer={
        <CargoFormActions
          saving={saving}
          isEditing={isEditing}
          onCancel={onClose}
          onSave={onSave}
        />
      }
    >
      <CargoForm
        form={form}
        catalogExames={catalogExames}
        catalogLoading={catalogLoading}
        isEditing={isEditing}
        embeddedInModal
        onChange={onChange}
        onToggleExame={onToggleExame}
      />
    </Modal>
  );
}
