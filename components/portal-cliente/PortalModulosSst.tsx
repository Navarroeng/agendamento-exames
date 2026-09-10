"use client";

import type { ReactNode } from "react";
import {
  IconBriefcase,
  IconCalendar,
  IconFileText,
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
import type { PortalAgendamentosResumo } from "@/lib/portal-agendamentos";
import type { PortalLaudosSstResumo } from "@/lib/portal-laudos-sst";

type ModuloSstId =
  | "riscos"
  | "faturas"
  | "agendamentos"
  | "laudos"
  | "contrato";

function participacaoLabel(resumo: PortalResumo): string | null {
  if (resumo.participacaoPercentual == null) return null;
  return `${resumo.participacaoPercentual}% de participação`;
}

export function PortalModulosSst({
  resumo,
  faturasResumo,
  agendamentosResumo,
  laudosResumo,
  onVerAvaliacao,
  onVerFaturas,
  onVerAgendamentos,
  onVerLaudos,
}: {
  resumo: PortalResumo;
  faturasResumo: PortalFaturasResumo | null;
  agendamentosResumo: PortalAgendamentosResumo | null;
  laudosResumo: PortalLaudosSstResumo | null;
  onVerAvaliacao: () => void;
  onVerFaturas: () => void;
  onVerAgendamentos: () => void;
  onVerLaudos: () => void;
}) {
  const temAvaliacao = resumo.statusPortal !== "sem_avaliacao";
  const faturaModuloCarregado = faturasResumo !== null;
  const agendamentosModuloCarregado = agendamentosResumo !== null;
  const laudosModuloCarregado = laudosResumo !== null;
  const laudosDisponivel = Boolean(laudosResumo?.temDocumentos);

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-[#0b1f4d]">
          Serviços da sua empresa
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-[#64748b]">
          Acompanhe o andamento de cada módulo de SST.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
        <ModuloShell
          id="riscos"
          titulo="Riscos Psicossociais"
          disponivel={temAvaliacao}
          destaque={temAvaliacao}
          acao={
            temAvaliacao
              ? { label: "Ver avaliação", onClick: onVerAvaliacao }
              : null
          }
        >
          {temAvaliacao ? (
            <div className="space-y-2">
              {resumo.ciclo ? (
                <p className="text-sm text-[#64748b]">Ciclo {resumo.ciclo}</p>
              ) : null}
              {participacaoLabel(resumo) ? (
                <p className="text-[22px] font-bold leading-tight tracking-tight text-[#0b1f4d]">
                  {participacaoLabel(resumo)}
                </p>
              ) : (
                <p className="text-sm text-[#94a3b8]">Participação indisponível</p>
              )}
              <p className="text-sm font-medium text-[#475569]">
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
          id="faturas"
          titulo="Faturas"
          disponivel={faturaModuloCarregado}
          destaqueVencida={(faturasResumo?.totalVencidas ?? 0) > 0}
          acao={
            faturaModuloCarregado
              ? { label: "Ver faturas", onClick: onVerFaturas }
              : null
          }
        >
          <FaturasConteudo resumo={faturasResumo} />
        </ModuloShell>

        <ModuloShell
          id="agendamentos"
          titulo="Agendamentos"
          disponivel={agendamentosModuloCarregado}
          ocultarBadgeEmPreparacao
          acao={
            agendamentosModuloCarregado
              ? { label: "Ver agendamentos", onClick: onVerAgendamentos }
              : null
          }
        >
          <AgendamentosConteudo resumo={agendamentosResumo} />
        </ModuloShell>

        <ModuloShell
          id="laudos"
          titulo="Laudos SST"
          disponivel={laudosDisponivel}
          ocultarBadgeEmPreparacao={!laudosModuloCarregado}
          acao={
            laudosModuloCarregado
              ? { label: "Ver documentos", onClick: onVerLaudos }
              : null
          }
        >
          <LaudosConteudo resumo={laudosResumo} />
        </ModuloShell>
      </div>

      <ContratoCardHorizontal contrato={resumo.contrato} />
    </section>
  );
}

function FaturasConteudo({ resumo }: { resumo: PortalFaturasResumo | null }) {
  if (!resumo) {
    return (
      <p className="text-sm leading-relaxed text-[#94a3b8]">
        Acompanhe suas faturas, vencimentos e pagamentos.
      </p>
    );
  }
  if (!resumo.temFaturas) {
    return (
      <p className="text-sm leading-relaxed text-[#94a3b8]">
        Nenhuma fatura disponível no momento.
      </p>
    );
  }

  const temAberto = resumo.valorEmAberto > 0;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94a3b8]">
          {temAberto ? "Valor em aberto" : "Situação"}
        </p>
        <p
          className={`mt-1 text-[22px] font-bold leading-tight tracking-tight tabular-nums ${
            resumo.totalVencidas > 0 ? "text-[#b91c1c]" : "text-[#0b1f4d]"
          }`}
        >
          {temAberto ? resumo.valorEmAbertoFormatado : "Em dia"}
        </p>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-[#64748b]">
        {resumo.totalEmAberto > 0 ? (
          <span>
            {resumo.totalEmAberto} fatura
            {resumo.totalEmAberto !== 1 ? "s" : ""} em aberto
          </span>
        ) : temAberto ? null : (
          <span>Nenhuma fatura em aberto</span>
        )}
        {resumo.totalVencidas > 0 ? (
          <span className="font-medium text-[#b91c1c]">
            {resumo.totalVencidas} vencida
            {resumo.totalVencidas !== 1 ? "s" : ""}
          </span>
        ) : null}
      </div>
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
    return (
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94a3b8]">
          Próximo agendamento
        </p>
        <p className="text-[22px] font-bold leading-tight tracking-tight text-[#0b1f4d]">
          {resumo.proximoDataLabel}
        </p>
        {resumo.proximoHorarioLabel ? (
          <p className="text-base font-semibold text-[#334155]">
            {resumo.proximoHorarioLabel}
          </p>
        ) : null}
        {resumo.totalProximos > 1 ? (
          <p className="text-sm text-[#64748b]">
            +{resumo.totalProximos - 1} próximo
            {resumo.totalProximos - 1 !== 1 ? "s" : ""}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-[17px] font-semibold leading-snug text-[#0b1f4d]">
        Nenhum agendamento futuro
      </p>
      {!resumo.temAgendamentos ? (
        <p className="text-sm text-[#94a3b8]">
          Nenhum agendamento disponível no momento.
        </p>
      ) : null}
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
      <p className="text-[17px] font-semibold leading-snug text-[#0b1f4d]">
        Nenhum laudo disponível
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[22px] font-bold leading-tight tracking-tight text-[#0b1f4d]">
        {resumo.linhaResumo}
      </p>
      {resumo.tiposDisponiveis.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {resumo.tiposDisponiveis.map((tipo) => (
            <span
              key={tipo}
              className="inline-flex rounded-full border border-[#d7e0ee] bg-[#f8fafc] px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-[#334155]"
            >
              {tipo}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ContratoCardHorizontal({
  contrato,
}: {
  contrato: PortalContratoResumo;
}) {
  const campos: {
    label: string;
    valor: string;
    tone?: PortalContratoBadgeTone;
  }[] = [
    { label: "Vigência", valor: contrato.vigenciaLabel },
    {
      label: "Procuração",
      valor: contrato.procuracaoLabel,
      tone: contrato.procuracaoTone,
    },
    {
      label: "Disponível para agendamento",
      valor: contrato.disponivelAgendamentoLabel,
      tone: contrato.disponivelAgendamentoTone,
    },
    {
      label: "Agendamento liberado",
      valor: contrato.agendamentoLiberadoLabel,
      tone: contrato.agendamentoLiberadoTone,
    },
  ];

  return (
    <article className="overflow-hidden rounded-2xl border border-[#e8edf5] bg-white shadow-[0_8px_24px_rgba(11,31,77,0.04)] transition hover:border-[#d7e0ee] hover:shadow-[0_12px_28px_rgba(11,31,77,0.06)]">
      <div className="flex items-center gap-3 border-b border-[#eef2f7] bg-gradient-to-r from-[#f8fafc] to-white px-5 py-4 sm:px-6">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0b1f4d]/[0.06] text-[#0b1f4d]">
          <IconBriefcase size={18} />
        </span>
        <div className="min-w-0">
          <h3 className="text-[15px] font-bold tracking-tight text-[#0b1f4d] sm:text-base">
            Contrato e acesso aos serviços
          </h3>
          <p className="mt-0.5 text-sm text-[#64748b]">
            Situação contratual e liberações de agendamento.
          </p>
        </div>
      </div>
      <dl className="grid grid-cols-1 gap-px bg-[#eef2f7] sm:grid-cols-2 lg:grid-cols-4">
        {campos.map((campo) => (
          <div
            key={campo.label}
            className="flex flex-col justify-between gap-2 bg-white px-5 py-4 sm:px-5 sm:py-5"
          >
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94a3b8]">
              {campo.label}
            </dt>
            <dd className="mt-1">
              {campo.tone ? (
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${badgeClass(campo.tone)}`}
                >
                  {campo.valor}
                </span>
              ) : (
                <span className="text-sm font-semibold text-[#0b1f4d]">
                  {campo.valor}
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </article>
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

function ModuloShell({
  id,
  titulo,
  disponivel,
  children,
  acao,
  destaque,
  destaqueVencida,
  ocultarBadgeEmPreparacao,
}: {
  id: ModuloSstId;
  titulo: string;
  disponivel: boolean;
  children: ReactNode;
  acao?: { label: string; onClick: () => void } | null;
  destaque?: boolean;
  destaqueVencida?: boolean;
  ocultarBadgeEmPreparacao?: boolean;
}) {
  return (
    <article
      className={`group flex h-full min-h-[220px] flex-col rounded-2xl border bg-white p-5 shadow-[0_8px_24px_rgba(11,31,77,0.04)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(11,31,77,0.08)] sm:p-6 ${
        destaque && disponivel
          ? "border-[#d7e0ee]"
          : destaqueVencida && disponivel
            ? "border-[#fca5a5]"
            : disponivel
              ? "border-[#e8edf5]"
              : "border-[#eef2f7] bg-[#fafbfc]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition ${
              destaque && disponivel
                ? "bg-[#0b1f4d] text-white shadow-[0_8px_16px_rgba(11,31,77,0.18)]"
                : "bg-[#0b1f4d]/[0.06] text-[#0b1f4d]"
            }`}
          >
            <ModuloIcon id={id} />
          </span>
          <h3 className="text-[15px] font-bold tracking-tight text-[#0b1f4d] sm:text-base">
            {titulo}
          </h3>
        </div>
        {disponivel ? (
          <span className="shrink-0 rounded-full border border-[#d7e0ee] bg-[#f8fafc] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#334155]">
            Disponível
          </span>
        ) : ocultarBadgeEmPreparacao ? null : (
          <span className="shrink-0 rounded-full bg-[#f1f5f9] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#94a3b8]">
            {id === "laudos" ? "Em andamento" : "Em preparação"}
          </span>
        )}
      </div>

      <div className="mt-5 flex-1">{children}</div>

      {acao ? (
        <button
          type="button"
          className="mt-5 inline-flex w-fit items-center rounded-lg bg-[#0b1f4d] px-4 py-2 text-sm font-semibold text-white shadow-[0_6px_14px_rgba(11,31,77,0.16)] transition hover:bg-[#12316f] group-hover:shadow-[0_8px_18px_rgba(11,31,77,0.2)]"
          onClick={acao.onClick}
        >
          {acao.label}
        </button>
      ) : (
        <p className="mt-5 text-xs leading-relaxed text-[#94a3b8]">
          Este módulo será liberado quando o serviço estiver disponível para a
          sua empresa.
        </p>
      )}
    </article>
  );
}

function ModuloIcon({ id }: { id: ModuloSstId }) {
  const props = { size: 18 };
  if (id === "riscos") return <IconShield {...props} />;
  if (id === "faturas") return <IconReceipt {...props} />;
  if (id === "agendamentos") return <IconCalendar {...props} />;
  if (id === "laudos") return <IconFileText {...props} />;
  return <IconBriefcase {...props} />;
}
