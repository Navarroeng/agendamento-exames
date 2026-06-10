import { ReactNode } from "react";
import { PanelIcon } from "@/components/ui/IconBox";

interface PanelProps {
  id?: string;
  title: string;
  icon?: ReactNode;
  iconTone?: "blue" | "green" | "purple" | "orange";
  action?: ReactNode;
  /** Quando false, o card cresce com o conteúdo (sem clip/scroll interno). */
  clipContent?: boolean;
  bodyClassName?: string;
  children: ReactNode;
}

export function Panel({
  id,
  title,
  icon,
  iconTone = "blue",
  action,
  clipContent = true,
  bodyClassName = "",
  children,
}: PanelProps) {
  return (
    <section
      id={id}
      className={`panel-card mb-4 scroll-mt-6 ${
        clipContent ? "overflow-hidden" : "overflow-visible"
      }`}
    >
      <div className="flex items-center justify-between border-b border-[#eef2f7]/80 bg-gradient-to-b from-white to-[#fafbff] px-5 py-3.5">
        <div className="flex items-center gap-2.5 text-[15px] font-semibold tracking-[-0.2px] text-navy">
          {icon ? <PanelIcon tone={iconTone}>{icon}</PanelIcon> : null}
          {title}
        </div>
        {action}
      </div>
      <div className={`p-5 ${bodyClassName}`.trim()}>{children}</div>
    </section>
  );
}
