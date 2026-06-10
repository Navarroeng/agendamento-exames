import { ReactNode } from "react";

interface RelatoriosSectionProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function RelatoriosSection({
  title,
  subtitle,
  children,
}: RelatoriosSectionProps) {
  return (
    <section className="rounded-[20px] border border-[#e8edf5] bg-gradient-to-b from-white to-[#fbfdff] p-5 shadow-[0_6px_22px_rgba(15,23,42,0.04)]">
      <div className="mb-4">
        <h3 className="text-base font-extrabold text-[#2d2a4a]">{title}</h3>
        {subtitle ? (
          <p className="mt-1 text-xs text-[#8b95a8]">{subtitle}</p>
        ) : null}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}
