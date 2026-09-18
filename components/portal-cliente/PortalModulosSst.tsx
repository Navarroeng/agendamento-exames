"use client";

import type { ReactNode } from "react";
import {
  IconCalendar,
  IconFileText,
  IconReceipt,
  IconShield,
  IconUsers,
} from "@/components/ui/icons/OutlineIcons";
import {
  PORTAL_STATUS_LABELS,
  type PortalResumo,
} from "@/lib/portal-cliente";
import type { PortalFaturasResumo } from "@/lib/portal-faturas";
import type { PortalAgendamentosResumo } from "@/lib/portal-agendamentos";
import type { PortalLaudosSstResumo } from "@/lib/portal-laudos-sst";
import type { PortalColaboradoresResumo } from "@/lib/portal-colaboradores";

type ModuloSstId =
  | "riscos"
  | "faturas"
  | "agendamentos"
  | "laudos"
  | "colaboradores";

function participacaoLabel(resumo: PortalResumo): string | null {
  if (resumo.participacaoPercentual == null) return null;
  return `${resumo.participacaoPercentual}%`;
}

export function PortalModulosSst({
  resumo,
  faturasResumo,
  agendamentosResumo,
  laudosResumo,
  colaboradoresResumo,
  onVerAvaliacao,
  onVerFaturas,
  onVerAgendamentos,
  onVerLaudos,
  onVerColaboradores,
}: {
  resumo: PortalResumo;
  faturasResumo: PortalFaturasResumo | null;
  agendamentosResumo: PortalAgendamentosResumo | null;
  laudosResumo: PortalLaudosSstResumo | null;
  colaboradoresResumo: PortalColaboradoresResumo | null;
  onVerAvaliacao: () => void;
  onVerFaturas: () => void;
  onVerAgendamentos: () => void;
  onVerLaudos: () => void;
  onVerColaboradores: () => void;
}) {
  const temAvaliacao = resumo.statusPortal !== "sem_avaliacao";
  const faturaModuloCarregado = faturasResumo !== null;
  const agendamentosModuloCarregado = agendamentosResumo !== null;
  const laudosModuloCarregado = laudosResumo !== null;
  const colaboradoresModuloCarregado = colaboradoresResumo !== null;
  const pct = participacaoLabel(resumo);

  return (
    <section>
      <h2 className="text-base font-semibold tracking-tight text-[#0b1f4d]">
        Serviços e acompanhamento
      </h2>
      <p className="mt-1 text-sm text-[#64748b]">
        Acesse os principais módulos e acompanhe as informações da sua empresa.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
        <ModuloShell
          id="riscos"
          titulo="Riscos Psicossociais"
          className="xl:col-span-2"
          acao={{ label: "Ver avaliação →", onClick: onVerAvaliacao }}
        >
          {temAvaliacao ? (
            <div>
              {pct ? (
                <>
                  <p className="text-[28px] font-bold leading-none tracking-tight text-[#0b1f4d]">
                    {pct}
                  </p>
                  <p className="mt-1 text-sm text-[#64748b]">de participação</p>
                </>
              ) : (
                <p className="text-sm text-[#94a3b8]">Participação indisponível</p>
              )}
              {resumo.ciclo ? (
                <p className="mt-2 text-sm text-[#475569]">Ciclo {resumo.ciclo}</p>
              ) : null}
              <p className="mt-0.5 text-sm font-medium text-[#334155]">
                {PORTAL_STATUS_LABELS[resumo.statusPortal]}
              </p>
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-[#94a3b8]">
              Nenhuma avaliação disponível no momento.
            </p>
          )}
        </ModuloShell>

        <ModuloShell
          id="agendamentos"
          titulo="Agendamentos"
          className="xl:col-span-2"
          acao={
            agendamentosModuloCarregado
              ? { label: "Ver agendamentos →", onClick: onVerAgendamentos }
              : null
          }
        >
          <AgendamentosConteudo resumo={agendamentosResumo} />
        </ModuloShell>

        <ModuloShell
          id="faturas"
          titulo="Faturas"
          className="xl:col-span-2"
          badge={faturaBadge(faturasResumo)}
          acao={
            faturaModuloCarregado
              ? { label: "Ver faturas →", onClick: onVerFaturas }
              : null
          }
        >
          <FaturasConteudo resumo={faturasResumo} />
        </ModuloShell>

        <ModuloShell
          id="laudos"
          titulo="Laudos SST"
          className="xl:col-span-3"
          acao={
            laudosModuloCarregado
              ? { label: "Ver documentos →", onClick: onVerLaudos }
              : null
          }
        >
          <LaudosConteudo resumo={laudosResumo} />
        </ModuloShell>

        <ModuloShell
          id="colaboradores"
          titulo="Colaboradores"
          className="xl:col-span-3"
          acao={
            colaboradoresModuloCarregado
              ? { label: "Ver colaboradores →", onClick: onVerColaboradores }
              : null
          }
        >
          <ColaboradoresConteudo resumo={colaboradoresResumo} />
        </ModuloShell>
      </div>
    </section>
  );
}

function faturaBadge(resumo: PortalFaturasResumo | null): string | null {
  if (!resumo || resumo.totalVencidas <= 0) return null;
  return `${resumo.totalVencidas} vencida${resumo.totalVencidas !== 1 ? "s" : ""}`;
}

function FaturasConteudo({ resumo }: { resumo: PortalFaturasResumo | null }) {
  if (!resumo) {
    return (
      <p className="text-sm leading-relaxed text-[#94a3b8]">
        Acompanhe suas faturas, vencimentos e pagamentos.
      </p>
    );
  }
  if (resumo.totalEmAberto === 0 && resumo.totalVencidas === 0) {
    return (
      <div>
        <p className="text-lg font-semibold leading-snug text-[#0b1f4d]">
          Nenhuma fatura pendente
        </p>
        <p className="mt-1 text-sm text-[#64748b]">Sua empresa está em dia.</p>
      </div>
    );
  }

  const totalAberto = resumo.totalEmAberto + resumo.totalVencidas;

  return (
    <div>
      <p
        className={`text-lg font-semibold leading-snug ${
          resumo.totalVencidas > 0 ? "text-[#b91c1c]" : "text-[#0b1f4d]"
        }`}
      >
        {totalAberto} fatura{totalAberto !== 1 ? "s" : ""} em aberto
      </p>
      {resumo.valorEmAberto > 0 ? (
        <p className="mt-1 text-sm tabular-nums text-[#475569]">
          {resumo.valorEmAbertoFormatado} em aberto
        </p>
      ) : null}
    </div>
  );
}

function AgendamentosConteudo({
  resumo,
}: {
  resumo: PortalAgendamentosResumo | null;
}) {
  if (!resumo) {
    return (
      <p className="text-sm leading-relaxed text-[#94a3b8]">
        Acompanhe os agendamentos ocupacionais da sua empresa.
      </p>
    );
  }

  if (resumo.proximoDataLabel) {
    const quando = resumo.proximoHorarioLabel
      ? `${resumo.proximoDataLabel} às ${resumo.proximoHorarioLabel}`
      : resumo.proximoDataLabel;
    return (
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94a3b8]">
          Próximo agendamento
        </p>
        <p className="mt-1 text-lg font-semibold leading-snug text-[#0b1f4d]">
          {quando}
        </p>
        {resumo.totalProximos > 1 ? (
          <p className="mt-1 text-sm text-[#64748b]">
            +{resumo.totalProximos - 1} próximo
            {resumo.totalProximos - 1 !== 1 ? "s" : ""}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <p className="text-lg font-semibold leading-snug text-[#0b1f4d]">
        Nenhum agendamento futuro
      </p>
      <p className="mt-1 text-sm text-[#64748b]">
        Acompanhe os agendamentos ocupacionais da sua empresa.
      </p>
    </div>
  );
}

function LaudosConteudo({ resumo }: { resumo: PortalLaudosSstResumo | null }) {
  if (!resumo) {
    return (
      <p className="text-sm leading-relaxed text-[#94a3b8]">
        Documentos de PGR, PCMSO e LTCAT liberados pela Navarro.
      </p>
    );
  }

  if (!resumo.temDocumentos) {
    return (
      <p className="text-lg font-semibold leading-snug text-[#0b1f4d]">
        Nenhum documento disponível
      </p>
    );
  }

  return (
    <div>
      <p className="text-lg font-semibold leading-snug text-[#0b1f4d]">
        {resumo.linhaResumo}
      </p>
      {resumo.tiposDisponiveis.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {resumo.tiposDisponiveis.map((tipo) => (
            <span
              key={tipo}
              className="inline-flex rounded-full bg-[#f1f5f9] px-2 py-0.5 text-[11px] font-semibold tracking-wide text-[#334155]"
            >
              {tipo}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ColaboradoresConteudo({
  resumo,
}: {
  resumo: PortalColaboradoresResumo | null;
}) {
  if (!resumo) {
    return (
      <p className="text-sm leading-relaxed text-[#94a3b8]">
        Equipe vinculada ao contrato e aos exames ocupacionais.
      </p>
    );
  }

  const extras: string[] = [];
  if (resumo.totalAdmissionalEmAndamento > 0) {
    extras.push(
      `${resumo.totalAdmissionalEmAndamento} em admissão`
    );
  }
  if (resumo.totalDemissionalEmAndamento > 0) {
    extras.push(
      `${resumo.totalDemissionalEmAndamento} em desligamento`
    );
  }

  return (
    <div>
      <p className="text-lg font-semibold leading-snug text-[#0b1f4d]">
        {resumo.linhaResumo}
      </p>
      {extras.length > 0 ? (
        <p className="mt-1 text-sm text-[#64748b]">{extras.join(" · ")}</p>
      ) : null}
    </div>
  );
}

function ModuloShell({
  id,
  titulo,
  children,
  acao,
  badge,
  className,
}: {
  id: ModuloSstId;
  titulo: string;
  children: ReactNode;
  acao?: { label: string; onClick: () => void } | null;
  badge?: string | null;
  className?: string;
}) {
  return (
    <article
      className={`flex h-full min-h-[168px] flex-col rounded-2xl border border-[#e8edf5] bg-white p-4 ${className ?? ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0b1f4d]/[0.06] text-[#0b1f4d]">
            <ModuloIcon id={id} />
          </span>
          <h3 className="text-[15px] font-semibold tracking-tight text-[#0b1f4d]">
            {titulo}
          </h3>
        </div>
        {badge ? (
          <span className="shrink-0 rounded-full bg-[#fff5f5] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#b91c1c]">
            {badge}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex-1">{children}</div>

      {acao ? (
        <button
          type="button"
          className="mt-3 inline-flex w-fit items-center rounded-md text-sm font-semibold text-[#0b1f4d] transition hover:text-[#12316f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b1f4d]/30"
          onClick={acao.onClick}
        >
          {acao.label}
        </button>
      ) : null}
    </article>
  );
}

function ModuloIcon({ id }: { id: ModuloSstId }) {
  const props = { size: 16 };
  if (id === "riscos") return <IconShield {...props} />;
  if (id === "faturas") return <IconReceipt {...props} />;
  if (id === "agendamentos") return <IconCalendar {...props} />;
  if (id === "laudos") return <IconFileText {...props} />;
  return <IconUsers {...props} />;
}
