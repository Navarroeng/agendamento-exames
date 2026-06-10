import type { ReactNode } from "react";
import { PanelIcon } from "@/components/ui/IconBox";

interface ClinicaFormCardProps {
  title: string;
  icon?: ReactNode;
  iconTone?: "blue" | "green" | "purple" | "orange";
  children: ReactNode;
}

export function ClinicaFormCard({
  title,
  icon,
  iconTone = "blue",
  children,
}: ClinicaFormCardProps) {
  return (
    <section className="panel-card overflow-hidden">
      <div className="flex items-center gap-3 border-b border-[#eef2f7]/80 bg-gradient-to-b from-white to-[#fafbff] px-5 py-3.5">
        {icon ? <PanelIcon tone={iconTone}>{icon}</PanelIcon> : null}
        <h3 className="text-[15px] font-semibold tracking-[-0.2px] text-navy">
          {title}
        </h3>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
