"use client";

import {
  IconBriefcase,
  IconReceipt,
  IconShield,
} from "@/components/ui/icons/OutlineIcons";
import {
  PORTAL_STATUS_LABELS,
  type PortalResumo,
} from "@/lib/portal-cliente";
import type {
  PortalContratoBadgeTone,
  PortalContratoResumo,
} from "@/lib/portal-contrato";
import type { PortalFaturasResumo } from "@/lib/portal-faturas";

type ModuloSstId = "riscos" | "faturas" | "contrato";

function participacaoLabel(resumo: PortalResumo): string | null {
  if (resumo.participacaoPercentual == null) return null;
  return `${resumo.participacaoPercentual}% de participação`;
}

export function PortalModulosSst({
  resumo,
  faturasResumo,
  onVerAvaliacao,
  onVerFaturas,
}: {
  resumo: PortalResumo;
  faturasResumo: PortalFaturasResumo | null;
  onVerAvaliacao: () => void;
  onVerFaturas: () => void;
}) {
  const temAvaliacao = resumo.statusPortal !== "sem_avaliacao";

  const linhasFaturas: string[] = faturasResumo
    ? faturasResumo.temFaturas
      ? [
          faturasResumo.totalEmAberto > 0
            ? `${faturasResumo.totalEmAberto} fatura${faturasResumo.totalEmAberto !== 1 ? "s" : ""} em aberto`
            : null,
          faturasResumo.valorEmAberto > 0
            ? `${faturasResumo.valorEmAbertoFormatado} em aberto`
            : null,
          faturasResumo.totalVencidas > 0
            ? `${faturasResumo.totalVencidas} vencida${faturasResumo.totalVencidas !== 1 ? "s" : ""}`
            : null,
        ].filter((l): l is string => Boolean(l))
      : ["Nenhuma fatura disponível no momento."]
    : ["Acompanhe suas faturas, vencimentos e pagamentos."];

  const faturaModuloCarregado = faturasResumo !== null;

  return (
    <section>
      <h2 className="text-base font-semibold tracking-tight text-[#0b1f4d]">
        Serviços da sua empresa
      </h2>
      <p className="mt-1 text-sm text-[#64748b]">
        Acompanhe o andamento de cada módulo de SST.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
          id="faturas"
          titulo="Faturas"
          disponivel={faturaModuloCarregado}
          linhas={linhasFaturas}
          destaqueVencida={(faturasResumo?.totalVencidas ?? 0) > 0}
          acao={
            faturaModuloCarregado
              ? { label: "Ver faturas", onClick: onVerFaturas }
              : null
          }
        />
        <ContratoCard contrato={resumo.contrato} />
      </div>
    </section>
  );
}

function ContratoCard({ contrato }: { contrato: PortalContratoResumo }) {
  return (
    <article className="flex flex-col rounded-2xl border border-[#e8edf5] bg-white px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#eef2f7] text-[#64748b]">
            <IconBriefcase size={16} />
          </span>
          <h3 className="text-[15px] font-semibold text-[#0b1f4d]">
            Contrato e acesso aos serviços
          </h3>
        </div>
      </div>
      <dl className="mt-3 space-y-2">
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94a3b8]">
            Vigência
          </dt>
          <dd className="mt-0.5 text-sm font-semibold text-[#0b1f4d]">
            {contrato.vigenciaLabel}
          </dd>
        </div>
        <ContratoCampo
          label="Procuração"
          valor={contrato.procuracaoLabel}
          tone={contrato.procuracaoTone}
        />
        <ContratoCampo
          label="Disponível para agendamento"
          valor={contrato.disponivelAgendamentoLabel}
          tone={contrato.disponivelAgendamentoTone}
        />
        <ContratoCampo
          label="Agendamento liberado"
          valor={contrato.agendamentoLiberadoLabel}
          tone={contrato.agendamentoLiberadoTone}
        />
      </dl>
    </article>
  );
}

function ContratoCampo({
  label,
  valor,
  tone,
}: {
  label: string;
  valor: string;
  tone: PortalContratoBadgeTone;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-sm text-[#64748b]">{label}</dt>
      <dd>
        <span
          className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badgeClass(tone)}`}
        >
          {valor}
        </span>
      </dd>
    </div>
  );
}

function badgeClass(tone: PortalContratoBadgeTone): string {
  if (tone === "ok") {
    return "bg-[#f0fdf4] text-[#15803d] border border-[#bbf7d0]";
  }
  if (tone === "pendente") {
    return "bg-[#fffbeb] text-[#b45309] border border-[#fde68a]";
  }
  if (tone === "bloqueio") {
    return "bg-[#fff5f5] text-[#dc2626] border border-[#fecaca]";
  }
  return "bg-[#f8fafc] text-[#64748b] border border-[#e2e8f0]";
}

function ModuloCard({
  id,
  titulo,
  disponivel,
  linhas,
  acao,
  destaque,
  destaqueVencida,
}: {
  id: ModuloSstId;
  titulo: string;
  disponivel: boolean;
  linhas: string[];
  acao?: { label: string; onClick: () => void } | null;
  destaque?: boolean;
  destaqueVencida?: boolean;
}) {
  return (
    <article
      className={`flex flex-col rounded-2xl border px-4 py-3.5 ${
        destaque && disponivel
          ? "border-[#d7e0ee] bg-white"
          : destaqueVencida && disponivel
            ? "border-[#fca5a5] bg-white"
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
  if (id === "faturas") return <IconReceipt {...props} />;
  return <IconBriefcase {...props} />;
}
