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

function participacaoValor(resumo: PortalResumo): string | null {
  if (resumo.participacaoPercentual == null) return null;
  return `${resumo.participacaoPercentual}%`;
}

function plural(n: number, singular: string, pluralForm: string): string {
  return n === 1 ? singular : pluralForm;
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
  const temAvaliacao =
    resumo.statusPortal !== "sem_avaliacao" ||
    resumo.campanhasLista.length > 0;
  const faturaModuloCarregado = faturasResumo !== null;
  const agendamentosModuloCarregado = agendamentosResumo !== null;
  const laudosModuloCarregado = laudosResumo !== null;
  const colaboradoresModuloCarregado = colaboradoresResumo !== null;
  const pct = participacaoValor(resumo);
  const faturasPendentes = faturasResumo
    ? faturasResumo.totalEmAberto + faturasResumo.totalVencidas
    : 0;
  const faturasIcone =
    faturasResumo && faturasResumo.totalVencidas > 0
      ? "alerta"
      : faturasResumo && faturasPendentes > 0
        ? "atencao"
        : "ok";

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
          acao={
            temAvaliacao
              ? { label: "Ver avaliação", onClick: onVerAvaliacao }
              : null
          }
        >
          {temAvaliacao ? (
            <DadoPrincipal
              valor={pct ?? "—"}
              rotulo="de participação"
              extra={
                <>
                  {resumo.ciclo ? <p>Ciclo {resumo.ciclo}</p> : null}
                  <p className="font-medium text-[#334155]">
                    {PORTAL_STATUS_LABELS[resumo.statusPortal]}
                  </p>
                </>
              }
            />
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
              ? { label: "Ver agendamentos", onClick: onVerAgendamentos }
              : null
          }
        >
          <AgendamentosConteudo resumo={agendamentosResumo} />
        </ModuloShell>

        <ModuloShell
          id="faturas"
          titulo="Faturas de Exames Ocupacionais"
          className="xl:col-span-2"
          iconeVariante={faturasIcone}
          badge={faturaBadge(faturasResumo)}
          acao={
            faturaModuloCarregado
              ? { label: "Ver faturas", onClick: onVerFaturas }
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
              ? { label: "Ver documentos", onClick: onVerLaudos }
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
              ? { label: "Ver colaboradores", onClick: onVerColaboradores }
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

function DadoPrincipal({
  valor,
  rotulo,
  extra,
  tom = "padrao",
}: {
  valor: string;
  rotulo: string;
  extra?: ReactNode;
  tom?: "padrao" | "alerta";
}) {
  return (
    <div>
      <p
        className={`text-[32px] font-bold leading-none tracking-tight tabular-nums ${
          tom === "alerta" ? "text-[#b91c1c]" : "text-[#0b1f4d]"
        }`}
      >
        {valor}
      </p>
      <p className="mt-1.5 text-sm text-[#64748b]">{rotulo}</p>
      {extra ? (
        <div className="mt-2 space-y-0.5 text-sm text-[#475569]">{extra}</div>
      ) : null}
    </div>
  );
}

function FaturasConteudo({ resumo }: { resumo: PortalFaturasResumo | null }) {
  if (!resumo) {
    return (
      <p className="text-sm leading-relaxed text-[#94a3b8]">
        Acompanhe as faturas dos exames ocupacionais, vencimentos e pagamentos.
      </p>
    );
  }

  const pendentes = resumo.totalEmAberto + resumo.totalVencidas;
  return (
    <DadoPrincipal
      valor={String(pendentes)}
      rotulo={plural(pendentes, "fatura pendente", "faturas pendentes")}
      tom={resumo.totalVencidas > 0 ? "alerta" : "padrao"}
      extra={
        resumo.valorEmAberto > 0 ? (
          <p className="tabular-nums">{resumo.valorEmAbertoFormatado} em aberto</p>
        ) : pendentes === 0 ? (
          <p>Sua empresa está em dia.</p>
        ) : null
      }
    />
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
    return (
      <DadoPrincipal
        valor={resumo.proximoDataLabel}
        rotulo={
          resumo.proximoHorarioLabel
            ? `às ${resumo.proximoHorarioLabel}`
            : "próximo agendamento"
        }
        extra={
          resumo.totalProximos > 1 ? (
            <p>
              +{resumo.totalProximos - 1} próximo
              {resumo.totalProximos - 1 !== 1 ? "s" : ""}
            </p>
          ) : null
        }
      />
    );
  }

  return (
    <DadoPrincipal valor="0" rotulo="agendamentos futuros" />
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

  return (
    <DadoPrincipal
      valor={String(resumo.totalDocumentos)}
      rotulo={plural(
        resumo.totalDocumentos,
        "documento disponível",
        "documentos disponíveis"
      )}
      extra={
        resumo.tiposDisponiveis.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {resumo.tiposDisponiveis.map((tipo) => (
              <span
                key={tipo}
                className="inline-flex rounded-full bg-[#f1f5f9] px-2 py-0.5 text-[11px] font-semibold tracking-wide text-[#334155]"
              >
                {tipo}
              </span>
            ))}
          </div>
        ) : null
      }
    />
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
    extras.push(`${resumo.totalAdmissionalEmAndamento} em admissão`);
  }
  if (resumo.totalDemissionalEmAndamento > 0) {
    extras.push(`${resumo.totalDemissionalEmAndamento} em desligamento`);
  }

  return (
    <DadoPrincipal
      valor={String(resumo.totalAtivos)}
      rotulo={plural(
        resumo.totalAtivos,
        "colaborador ativo",
        "colaboradores ativos"
      )}
      extra={extras.length > 0 ? <p>{extras.join(" · ")}</p> : null}
    />
  );
}

function ModuloShell({
  id,
  titulo,
  children,
  acao,
  badge,
  className,
  iconeVariante,
}: {
  id: ModuloSstId;
  titulo: string;
  children: ReactNode;
  acao?: { label: string; onClick: () => void } | null;
  badge?: string | null;
  className?: string;
  iconeVariante?: "ok" | "atencao" | "alerta";
}) {
  return (
    <article
      className={`flex h-full min-h-[184px] flex-col rounded-2xl border border-[#DDE5F0] bg-white p-4 shadow-[0_6px_18px_rgba(11,31,77,0.05)] transition duration-200 hover:border-[#c5d4ea] hover:shadow-[0_10px_24px_rgba(11,31,77,0.09)] ${className ?? ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${moduloIconWrapClass(id, iconeVariante)}`}
          >
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
          className="mt-3 flex w-full items-center justify-between border-t border-[#eef2f7] pt-3 text-sm font-semibold text-[#0b1f4d] transition hover:text-[#12316f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b1f4d]/30"
          onClick={acao.onClick}
        >
          <span>{acao.label}</span>
          <span aria-hidden>→</span>
        </button>
      ) : null}
    </article>
  );
}

function moduloIconWrapClass(
  id: ModuloSstId,
  variante?: "ok" | "atencao" | "alerta"
): string {
  if (id === "riscos") return "bg-[#0B1F4D] text-white";
  if (id === "agendamentos") return "bg-[#dbeafe] text-[#0B1F4D]";
  if (id === "faturas") {
    if (variante === "alerta") return "bg-[#fee2e2] text-[#b91c1c]";
    if (variante === "atencao") return "bg-[#fef3c7] text-[#b45309]";
    return "bg-[#dcfce7] text-[#15803d]";
  }
  if (id === "laudos") return "bg-[#e0e7ff] text-[#3730a3]";
  return "bg-[#ccfbf1] text-[#0f766e]";
}

function ModuloIcon({ id }: { id: ModuloSstId }) {
  const props = { size: 16 };
  if (id === "riscos") return <IconShield {...props} />;
  if (id === "faturas") return <IconReceipt {...props} />;
  if (id === "agendamentos") return <IconCalendar {...props} />;
  if (id === "laudos") return <IconFileText {...props} />;
  return <IconUsers {...props} />;
}
