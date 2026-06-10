import {
  formatAgendamentoId,
  formatCreatedAtBR,
} from "@/lib/format-datetime";
import type { AgendamentoStatus, AgendamentoWithExames } from "@/lib/types";
import {
  IconCalendar as ViewModalCalendarIcon,
  PURPLE,
  PURPLE_DARK,
  statusBadge,
} from "./ViewModalUi";
import {
  IconCalendar,
  IconClipboard,
  IconShield,
} from "@/components/ui/icons/OutlineIcons";

interface ViewModalHeaderProps {
  agendamento: AgendamentoWithExames;
  onClose: () => void;
}

export function ViewModalHeader({ agendamento, onClose }: ViewModalHeaderProps) {
  const status = statusBadge(agendamento.status as AgendamentoStatus);
  const responsavelInicial = agendamento.responsavel.charAt(0).toUpperCase();

  return (
    <header className="relative shrink-0 bg-white px-6 pb-0 pt-6 sm:px-8 sm:pt-7">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-full border border-[#e8edf5] bg-white text-lg text-[#8b95a8] shadow-sm transition hover:border-[#d4d9e8] hover:text-[#5b4acb]"
        aria-label="Fechar"
      >
        ×
      </button>

      <div className="flex flex-col gap-4 pr-12 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <div
            className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-2xl text-white shadow-[0_10px_24px_rgba(91,74,203,0.4)]"
            style={{ background: `linear-gradient(145deg, ${PURPLE}, #7c6cf0)` }}
          >
            <ViewModalCalendarIcon />
          </div>
          <div>
            <h2
              id="view-modal-title"
              className="text-[22px] font-extrabold leading-tight text-[#2d2a4a] sm:text-2xl"
            >
              Visualizar agendamento
            </h2>
            <p className="mt-1 text-sm text-[#8b95a8]">
              Detalhes completos do agendamento de exames
            </p>
          </div>
        </div>

        <div className="hidden shrink-0 sm:block sm:w-[200px]">
          <div className="relative flex h-[100px] w-full items-center justify-center overflow-hidden rounded-2xl border border-[#e8edf5]/80 bg-gradient-to-br from-[#f3edff] via-[#faf5ff] to-[#eef4ff]">
            <IconCalendar
              size={32}
              className="absolute right-4 top-3 text-[#5b4acb]/25"
            />
            <IconClipboard
              size={24}
              className="absolute bottom-4 left-4 text-[#5b4acb]/20"
            />
            <div className="flex items-center gap-1.5 rounded-xl border border-white/60 bg-white/80 px-2.5 py-1 text-xs font-semibold text-[#5b4acb] shadow-sm">
              <IconShield size={12} />
              ASO
            </div>
          </div>
        </div>
      </div>

      <div
        className="mt-6 grid grid-cols-1 gap-4 rounded-2xl px-5 py-4 text-white sm:grid-cols-2 lg:grid-cols-4 lg:gap-6 lg:px-6"
        style={{ background: `linear-gradient(90deg, ${PURPLE_DARK}, ${PURPLE})` }}
      >
        <div>
          <p className="text-[11px] font-medium text-white/70">
            Status do agendamento
          </p>
          <span
            className={`mt-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold ${status.bg} ${status.text}`}
          >
            <span>{status.icon}</span>
            {status.label}
          </span>
        </div>
        <div>
          <p className="text-[11px] font-medium text-white/70">Responsável</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#50c6d8] text-sm font-extrabold text-white">
              {responsavelInicial}
            </span>
            <span className="text-sm font-bold">{agendamento.responsavel}</span>
          </div>
        </div>
        <div>
          <p className="text-[11px] font-medium text-white/70">Criado em</p>
          <div className="mt-2 flex items-center gap-2 text-sm font-bold">
            <span className="opacity-80">
              <ViewModalCalendarIcon />
            </span>
            {formatCreatedAtBR(agendamento.created_at)}
          </div>
        </div>
        <div>
          <p className="text-[11px] font-medium text-white/70">
            ID do agendamento
          </p>
          <p className="mt-2 text-sm font-bold tracking-wide">
            {formatAgendamentoId(agendamento.id, agendamento.created_at)}
          </p>
        </div>
      </div>
    </header>
  );
}
