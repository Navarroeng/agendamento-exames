interface ExameTopActionsProps {
  onNovoExame: () => void;
}

export function ExameTopActions({ onNovoExame }: ExameTopActionsProps) {
  return (
    <div className="top-actions mb-[18px] flex flex-col items-stretch justify-end gap-3 sidebar:flex-row sidebar:items-center">
      <button
        type="button"
        className="btn btn-primary justify-center sidebar:w-auto"
        onClick={onNovoExame}
      >
        + Novo Exame
      </button>
    </div>
  );
}
