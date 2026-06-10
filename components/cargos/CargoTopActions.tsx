interface CargoTopActionsProps {
  onNovoCargo: () => void;
}

export function CargoTopActions({ onNovoCargo }: CargoTopActionsProps) {
  return (
    <div className="top-actions mb-[18px] flex flex-col items-stretch justify-end gap-3 sidebar:flex-row sidebar:items-center">
      <button
        type="button"
        className="btn btn-primary justify-center sidebar:w-auto"
        onClick={onNovoCargo}
      >
        + Novo Cargo
      </button>
    </div>
  );
}
