import {
  IMPLANTACAO_ETAPA_BADGE,
  IMPLANTACAO_ETAPA_BADGE_BASE,
} from "@/lib/implantacao-clientes";
import { formatDateBR } from "@/lib/format";
import { formatCurrency } from "@/lib/money";
import type { ServicoPontualContratado } from "@/lib/servicos-pontuais";

interface ClienteServicosPontuaisSectionProps {
  itens: ServicoPontualContratado[];
  loading: boolean;
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-[#e8edf5] bg-white px-3.5 py-3 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#8b95a8]">
        {label}
      </p>
      <p className="mt-1 text-sm font-extrabold text-[#1f2937]">{value}</p>
    </div>
  );
}

export function ClienteServicosPontuaisSection({
  itens,
  loading,
}: ClienteServicosPontuaisSectionProps) {
  return (
    <div className="mt-5 rounded-[20px] border border-[#e8edf5] bg-gradient-to-b from-white to-[#fbfdff] p-5 shadow-[0_6px_22px_rgba(15,23,42,0.04)]">
      <div className="mb-4">
        <h4 className="text-[15px] font-extrabold text-[#2d2a4a]">
          Serviços pontuais contratados
        </h4>
        <p className="mt-0.5 text-xs text-[#8b95a8]">
          Contratações específicas independentes do contrato SST.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-[#8b95a8]">Carregando serviços pontuais…</p>
      ) : itens.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#d7deec] bg-gradient-to-br from-[#fbfcff] to-[#f6f8fc] px-5 py-8 text-center">
          <p className="text-sm font-bold text-[#52617a]">
            Nenhum serviço pontual contratado
          </p>
          <p className="mt-1 text-xs text-[#8b95a8]">
            Laudos, perícias e avaliações específicas aparecerão aqui após a
            aprovação do orçamento.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {itens.map((item) => {
            const badge = IMPLANTACAO_ETAPA_BADGE[item.statusId];
            return (
              <div
                key={item.aprovacaoId}
                className="rounded-2xl border border-[#dbe4f4] bg-gradient-to-br from-white via-[#fbfdff] to-[#f0f4ff] p-5 shadow-[0_8px_28px_rgba(67,84,232,0.08)]"
              >
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-extrabold text-navy">
                      {item.servicoNome}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-[#52617a]">
                      Orçamento: {item.numeroOrcamento || "—"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`${IMPLANTACAO_ETAPA_BADGE_BASE} ${badge.className}`}
                    >
                      {item.statusLabel}
                    </span>
                    {item.financeiroPendente ? (
                      <span
                        className={`${IMPLANTACAO_ETAPA_BADGE_BASE} ${IMPLANTACAO_ETAPA_BADGE.financeiro.className}`}
                      >
                        {item.financeiroLabel}
                      </span>
                    ) : null}
                    <a
                      href={item.href}
                      className="btn btn-primary !px-4 !py-2 text-xs"
                    >
                      Acessar
                    </a>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <Metric
                    label="Valor"
                    value={formatCurrency(item.valorFinal)}
                  />
                  <Metric
                    label="Contratação"
                    value={formatDateBR(item.contratadoEm)}
                  />
                  <Metric label="Status operacional" value={item.statusLabel} />
                  <Metric label="Financeiro" value={item.financeiroLabel} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
