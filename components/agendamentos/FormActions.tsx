interface FormActionsProps {
  saving: boolean;
  contratoInvalido?: boolean;
  somenteDocumentacao?: boolean;
  formularioClienteLiberado?: boolean;
  onClear: () => void;
  onSaveDraft: () => void;
  onSave: () => void;
  onCopyClinicaMessage: () => void;
}

export function FormActions({
  saving,
  contratoInvalido = false,
  somenteDocumentacao = false,
  formularioClienteLiberado = true,
  onClear,
  onSaveDraft,
  onSave,
  onCopyClinicaMessage,
}: FormActionsProps) {
  const saveDisabled =
    saving ||
    (!somenteDocumentacao && (contratoInvalido || !formularioClienteLiberado));

  if (somenteDocumentacao) {
    return (
      <div className="bottom-actions mt-4 flex flex-col justify-end gap-2 border-t border-[#eef2f7] pt-4 sidebar:flex-row sidebar:flex-wrap">
        <button
          type="button"
          className="btn btn-primary justify-center sidebar:w-auto"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? "Salvando..." : "Salvar documentação"}
        </button>
      </div>
    );
  }

  return (
    <div className="bottom-actions mt-4 flex flex-col justify-end gap-2 border-t border-[#eef2f7] pt-4 sidebar:flex-row sidebar:flex-wrap">
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
        className="btn justify-center sidebar:w-auto"
        onClick={onSaveDraft}
        disabled={saveDisabled}
      >
        {saving ? "Salvando..." : "Salvar rascunho"}
      </button>
      <button
        type="button"
        className="btn btn-muted justify-center sidebar:w-auto"
        onClick={onCopyClinicaMessage}
        disabled={saving}
      >
        Copiar mensagem da clínica
      </button>
      <button
        type="button"
        className="btn btn-primary justify-center sidebar:w-auto"
        onClick={onSave}
        disabled={saveDisabled}
      >
        {saving ? "Salvando..." : "Salvar agendamento"}
      </button>
    </div>
  );
}
