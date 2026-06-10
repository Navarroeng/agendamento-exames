import { NAVARRO_DADOS_BANCARIOS } from "@/lib/navarro-pagamento";

export function FaturaPagamentoCard() {
  const d = NAVARRO_DADOS_BANCARIOS;

  const bankRows: { label: string; value: string }[] = [
    { label: "Banco", value: d.banco },
    { label: "Agência", value: d.agencia },
    { label: "Conta", value: d.conta },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-[#c7d7f5] shadow-[0_6px_24px_rgba(15,31,77,0.1)]">
      <div className="bg-gradient-to-r from-[#15204d] via-[#1a2d6e] to-[#1e3a8a] px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/95">
          {d.titulo}
        </p>
      </div>

      <div className="bg-gradient-to-b from-white to-[#f6f9ff] px-4 py-4">
        <dl className="space-y-2.5">
          {bankRows.map((row) => (
            <div key={row.label} className="grid grid-cols-[72px_1fr] gap-x-3">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-[#64748b]">
                {row.label}
              </dt>
              <dd className="text-[12px] font-bold text-[#0f172a]">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-4 overflow-hidden rounded-lg border border-[#d4af37]/35 shadow-[0_4px_16px_rgba(15,31,77,0.15)]">
          <div className="bg-gradient-to-r from-[#1a2555] to-[#243876] px-4 py-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#f5d77a]">
              CNPJ PIX
            </p>
            <p className="mt-1.5 font-mono text-[15px] font-bold tracking-wide text-white">
              {d.pixCnpj}
            </p>
          </div>
        </div>

        <div className="mt-4 border-t border-[#e2e8f0] pt-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#94a3b8]">
            Favorecido
          </p>
          <p className="mt-1.5 text-[10px] font-semibold leading-relaxed text-[#1e293b]">
            {d.favorecido}
          </p>
        </div>
      </div>
    </div>
  );
}
