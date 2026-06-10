interface CargoFormActionsProps {
  saving: boolean;
  isEditing: boolean;
  onClear: () => void;
  onCancel: () => void;
  onSave: () => void;
}

export function CargoFormActions({
  saving,
  isEditing,
  onClear,
  onCancel,
  onSave,
}: CargoFormActionsProps) {
  return (
    <div className="mb-[18px] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
      <button
        type="button"
        className="btn justify-center sm:w-auto"
        onClick={onClear}
        disabled={saving}
      >
        Limpar
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
            : "Salvar cargo"}
      </button>
    </div>
  );
}
