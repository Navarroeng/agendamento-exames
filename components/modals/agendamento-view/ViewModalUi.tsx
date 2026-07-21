import { formatDateBR } from "@/lib/format";
import type { AgendamentoStatus } from "@/lib/types";

export const PURPLE = "#5b4acb";
export const PURPLE_DARK = "#3f2f8f";

export function statusBadge(status: AgendamentoStatus) {
  const styles = {
    agendado: {
      label: "Agendado",
      bg: "bg-[#ecfdf3]",
      text: "text-[#16a34a]",
      icon: "✓",
    },
    rascunho: {
      label: "Rascunho",
      bg: "bg-[#f3edff]",
      text: "text-[#7c3aed]",
      icon: "◷",
    },
    aso_retido: {
      label: "ASO Retido",
      bg: "bg-[#fff7ed]",
      text: "text-[#ea580c]",
      icon: "⏸",
    },
    cancelado: {
      label: "Cancelado",
      bg: "bg-[#fef2f2]",
      text: "text-[#dc2626]",
      icon: "✕",
    },
  } as const;

  return (
    styles[status as keyof typeof styles] ?? {
      label: "Pendente",
      bg: "bg-[#fff7ed]",
      text: "text-[#ea580c]",
      icon: "⏳",
    }
  );
}

export function SectionHeading({
  icon,
  iconBg,
  title,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white ${iconBg}`}
      >
        {icon}
      </div>
      <h3 className="text-[17px] font-extrabold text-[#2d2a4a]">{title}</h3>
    </div>
  );
}

export function DataRow({
  icon,
  label,
  value,
  valueNode,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  valueNode?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f4f6fb] text-[#7b879b]">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium text-[#8b95a8]">{label}</p>
        {valueNode ?? (
          <p className="mt-0.5 text-[14px] font-bold text-[#1f2937]">{value}</p>
        )}
      </div>
    </div>
  );
}

export function DocMiniCard({
  icon,
  title,
  concluido,
  data,
  extra,
  dataLabel,
  extraLabel,
}: {
  icon: React.ReactNode;
  title: string;
  concluido: boolean;
  data: string | null | undefined;
  extra?: string | null;
  dataLabel?: string;
  extraLabel?: string;
}) {
  const dataFmt = data ? formatDateBR(data) : null;
  const extraFmt = extra?.trim() ? extra.trim() : null;

  return (
    <div className="flex min-w-[140px] flex-1 flex-col rounded-2xl border border-[#e8edf5] bg-white p-4 shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
      <div className="mb-3 text-[#8b97ff]">{icon}</div>
      <p className="mb-2 text-[12px] font-semibold leading-snug text-[#52617a]">
        {title}
      </p>
      {concluido ? (
        <>
          <span className="inline-flex w-fit rounded-lg bg-[#ecfdf3] px-2.5 py-1 text-[11px] font-bold text-[#16a34a]">
            Concluído
          </span>
          {dataFmt && dataFmt !== "—" && (
            <p className="mt-2 text-[11px] font-medium text-[#8b95a8]">
              {dataLabel ? `${dataLabel}: ${dataFmt}` : dataFmt}
            </p>
          )}
          {extraFmt && (
            <p className="mt-1 text-[11px] font-medium text-[#8b95a8]">
              {extraLabel ?? "Nº Recibo"}: {extraFmt}
            </p>
          )}
        </>
      ) : (
        <span className="inline-flex w-fit rounded-lg bg-[#fff7ed] px-2.5 py-1 text-[11px] font-bold text-[#ea580c]">
          Pendente
        </span>
      )}
    </div>
  );
}

export const IconCalendar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);
export const IconBuilding = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-4h6v4" />
  </svg>
);
export const IconUser = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
  </svg>
);
export const IconBriefcase = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2M2 12h20" />
  </svg>
);
export const IconClock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);
export const IconHospital = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 21h18M6 21V9l6-4 6 4v12M10 14h4v7h-4z" />
  </svg>
);
export const IconStethoscope = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4.8 4.8a4 4 0 1 1 5.6 5.6M9 9v2a5 5 0 0 0 10 0v-1M16 20h2a2 2 0 0 0 0-4h-1" />
  </svg>
);
export const IconNote = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6M8 13h8M8 17h5" />
  </svg>
);
export const IconId = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M2 10h20M6 15h4" />
  </svg>
);
export const IconCloud = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
  </svg>
);
export const IconPencil = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);
export const IconSend = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
  </svg>
);
export const IconFlask = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 3h6M10 3v6l-5 9a4 4 0 0 0 3.5 6h7a4 4 0 0 0 3.5-6l-5-9V3" />
  </svg>
);
export const IconDoc = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
  </svg>
);
export const IconShield = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
