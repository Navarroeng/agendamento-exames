import type { ServicoSstRecord } from "@/lib/orcamento-types";
import { resolveItensInclusosServico } from "@/lib/servico-sst-pacote";

interface OrcamentoPacoteInclusosCardProps {
  servico?: Pick<ServicoSstRecord, "nome" | "itens_inclusos"> | null;
  servicoNome?: string | null;
  compact?: boolean;
}

export function OrcamentoPacoteInclusosCard({
  servico,
  servicoNome,
  compact = false,
}: OrcamentoPacoteInclusosCardProps) {
  const itens = resolveItensInclusosServico(servico, servicoNome);
  if (itens.length === 0) return null;

  return (
    <div
      className={`rounded-[10px] border border-brand-blue/15 bg-gradient-to-br from-brand-blue-soft/50 to-white ${
        compact ? "mt-2 px-3 py-2" : "mt-3 px-3.5 py-3"
      }`}
    >
      <p
        className={`font-bold text-navy ${compact ? "text-[10px]" : "text-[11px]"}`}
      >
        Este pacote inclui:
      </p>
      <ul
        className={`mt-1.5 space-y-1 text-[#475569] ${
          compact ? "text-[10px]" : "text-[11px]"
        }`}
      >
        {itens.map((item) => (
          <li key={item} className="flex gap-1.5">
            <span className="text-brand-blue">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
