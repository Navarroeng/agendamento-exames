interface ClienteFormActionsProps {
  saving: boolean;
  onClear: () => void;
  onSave: () => void;
}

export function ClienteFormActions({
  saving,
  onClear,
  onSave,
}: ClienteFormActionsProps) {
  return (
    <div className="bottom-actions mt-[22px] flex flex-col justify-end gap-3 sidebar:flex-row">
      <button
        type="button"
        className="btn justify-center sidebar:w-auto"
        onClick={onClear}
        disabled={saving}
      >
        Limpar campos
      </button>
      <button
        type="button"
        className="btn btn-primary justify-center sidebar:w-auto"
        onClick={onSave}
        disabled={saving}
      >
        {saving ? "Salvando..." : "Salvar cliente"}
      </button>
    </div>
  );
}
