import { IconBuilding, IconUsers } from "@/components/ui/icons/OutlineIcons";

interface TopActionsProps {
  onNovoAgendamento: () => void;
}

export function TopActions({ onNovoAgendamento }: TopActionsProps) {
  return (
    <div className="top-actions mb-[18px] flex flex-col items-stretch justify-end gap-3 sidebar:flex-row sidebar:items-center">
      <button type="button" className="btn justify-center sidebar:w-auto">
        <IconUsers size={15} className="text-brand-blue" />
        Cadastrar Cliente
      </button>
      <a href="/clinicas" className="btn justify-center sidebar:w-auto">
        <IconBuilding size={15} className="text-brand-blue" />
        Cadastrar Clínica
      </a>
      <button
        type="button"
        className="btn btn-primary justify-center sidebar:w-auto"
        onClick={onNovoAgendamento}
      >
        + Novo Agendamento
      </button>
    </div>
  );
}
