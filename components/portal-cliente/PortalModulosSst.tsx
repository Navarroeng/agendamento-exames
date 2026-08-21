"use client";

import {
  IconCalendar,
  IconEsocial,
  IconFileText,
  IconShield,
} from "@/components/ui/icons/OutlineIcons";
import {
  PORTAL_STATUS_LABELS,
  type PortalResumo,
} from "@/lib/portal-cliente";

type ModuloSstId = "riscos" | "exames" | "laudos" | "esocial";

function participacaoLabel(resumo: PortalResumo): string | null {
  if (resumo.participacaoPercentual == null) return null;
  return `${resumo.participacaoPercentual}% de participação`;
}

export function PortalModulosSst({
  resumo,
  onVerAvaliacao,
}: {
  resumo: PortalResumo;
  onVerAvaliacao: () => void;
}) {
  const temAvaliacao = resumo.statusPortal !== "sem_avaliacao";

  return (
    <section>
      <h2 className="text-base font-semibold tracking-tight text-[#0b1f4d]">
        Serviços da sua empresa
      </h2>
      <p className="mt-1 text-sm text-[#64748b]">
        Acompanhe o andamento de cada módulo de SST.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <ModuloCard
          id="riscos"
          titulo="Riscos Psicossociais"
          destaque
          disponivel={temAvaliacao}
          linhas={
            temAvaliacao
              ? [
                  resumo.ciclo ? `Ciclo ${resumo.ciclo}` : null,
                  participacaoLabel(resumo),
                  PORTAL_STATUS_LABELS[resumo.statusPortal],
                ].filter((l): l is string => Boolean(l))
              : ["Nenhuma avaliação disponível no momento."]
          }
          acao={
            temAvaliacao
              ? { label: "Ver avaliação", onClick: onVerAvaliacao }
              : null
          }
        />
        <ModuloCard
          id="exames"
          titulo="Exames Ocupacionais"
          disponivel={false}
          linhas={[
            "Exames pendentes, periódicos, ASOs e agendamentos.",
          ]}
        />
        <ModuloCard
          id="laudos"
          titulo="Laudos SST"
          disponivel={false}
          linhas={["PGR, PCMSO, LTCAT, LIP, AET e demais documentos."]}
        />
        <ModuloCard
          id="esocial"
          titulo="eSocial"
          disponivel={false}
          linhas={["Informações dos serviços relacionados ao eSocial."]}
        />
      </div>
    </section>
  );
}

function ModuloCard({
  id,
  titulo,
  disponivel,
  linhas,
  acao,
  destaque,
}: {
  id: ModuloSstId;
  titulo: string;
  disponivel: boolean;
  linhas: string[];
  acao?: { label: string; onClick: () => void } | null;
  destaque?: boolean;
}) {
  return (
    <article
      className={`flex flex-col rounded-2xl border px-4 py-3.5 ${
        destaque && disponivel
          ? "border-[#d7e0ee] bg-white"
          : disponivel
            ? "border-[#e8edf5] bg-white"
            : "border-[#eef2f7] bg-[#f8fafc]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
              destaque && disponivel
                ? "bg-[#0b1f4d] text-white"
                : "bg-[#eef2f7] text-[#64748b]"
            }`}
          >
            <ModuloIcon id={id} />
          </span>
          <h3 className="text-[15px] font-semibold text-[#0b1f4d]">{titulo}</h3>
        </div>
        {disponivel ? (
          <span className="shrink-0 rounded-full bg-[#f1f5f9] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#334155]">
            Disponível
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
            Em preparação
          </span>
        )}
      </div>
      <ul className="mt-2.5 space-y-0.5">
        {linhas.map((linha) => (
          <li
            key={linha}
            className={`text-sm leading-snug ${
              disponivel ? "text-[#475569]" : "text-[#94a3b8]"
            }`}
          >
            {linha}
          </li>
        ))}
      </ul>
      {acao ? (
        <button
          type="button"
          className="mt-3 inline-flex w-fit items-center rounded-lg bg-[#0b1f4d] px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-[#12316f]"
          onClick={acao.onClick}
        >
          {acao.label}
        </button>
      ) : (
        <p className="mt-2.5 text-xs leading-relaxed text-[#94a3b8]">
          Este módulo será liberado quando o serviço estiver disponível para
          a sua empresa.
        </p>
      )}
    </article>
  );
}

function ModuloIcon({ id }: { id: ModuloSstId }) {
  const props = { size: 16 };
  if (id === "riscos") return <IconShield {...props} />;
  if (id === "exames") return <IconCalendar {...props} />;
  if (id === "laudos") return <IconFileText {...props} />;
  return <IconEsocial {...props} />;
}
