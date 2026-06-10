import Link from "next/link";
import type { DashboardDocumentacaoCounts } from "@/lib/dashboard/types";

interface DashboardDocumentacaoSectionProps {
  counts: DashboardDocumentacaoCounts;
}

const ITEMS: {
  key: keyof DashboardDocumentacaoCounts;
  label: string;
  tone: string;
  href: string;
}[] = [
  {
    key: "naoAssinados",
    label: "ASOs não assinados",
    tone: "border-[#fde68a]/80 bg-[#fffbeb] text-[#b45309]",
    href: "/exames",
  },
  {
    key: "naoEnviadosCliente",
    label: "Não enviados ao cliente",
    tone: "border-[#e9d5ff]/80 bg-[#faf5ff] text-[#7c3aed]",
    href: "/exames",
  },
  {
    key: "semRecebimento",
    label: "Sem recebimento",
    tone: "border-[#fecaca]/60 bg-[#fef2f2] text-brand-red",
    href: "/exames",
  },
  {
    key: "pendentesClinica",
    label: "Pendentes de clínica",
    tone: "border-[#c7d7f5]/80 bg-[#f0f4ff] text-brand-blue",
    href: "/exames",
  },
];

export function DashboardDocumentacaoSection({
  counts,
}: DashboardDocumentacaoSectionProps) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {ITEMS.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={`rounded-xl border px-3.5 py-3 shadow-[0_2px_12px_rgba(15,23,42,0.04)] transition-all hover:shadow-[0_4px_16px_rgba(15,23,42,0.08)] ${item.tone}`}
        >
          <p className="text-[10px] font-bold uppercase tracking-wide opacity-80">
            {item.label}
          </p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums">
            {counts[item.key]}
          </p>
        </Link>
      ))}
    </div>
  );
}
