interface OrcamentoFormActionsProps {
  saving: boolean;
  isEditing: boolean;
  onClear: () => void;
  onCancel: () => void;
  onSave: () => void;
  compact?: boolean;
}

export function OrcamentoFormActions({
  saving,
  isEditing,
  onClear,
  onCancel,
  onSave,
  compact = false,
}: OrcamentoFormActionsProps) {
  return (
    <div
      className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end ${
        compact ? "" : "mb-[18px]"
      }`}
    >
      <button
        type="button"
        className="btn justify-center sm:w-auto"
        onClick={onClear}
        disabled={saving}
      >
        Limpar campos
      </button>
      <button
        type="button"
        className="btn justify-center sm:w-auto"
        onClick={onCancel}
        disabled={saving}
      >
        Cancelar
      </button>
      <button
        type="button"
        className="btn btn-primary justify-center sm:w-auto"
        onClick={onSave}
        disabled={saving}
      >
        {saving
          ? "Salvando..."
          : isEditing
            ? "Salvar alterações"
            : "Salvar orçamento"}
      </button>
    </div>
  );
}
