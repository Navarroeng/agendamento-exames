"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  PortalAgendamentoDetalhe,
  PortalAgendamentoStatusVisivel,
} from "@/lib/portal-agendamentos";
import type { AgendamentoStatus } from "@/lib/types";
import {
  DataRow,
  IconCalendar,
  IconClock,
  IconDoc,
  IconFlask,
  IconStethoscope,
  IconUser,
  PURPLE,
  PURPLE_DARK,
  SectionHeading,
  statusBadge,
} from "@/components/modals/agendamento-view/ViewModalUi";

type DetalheState =
  | { fase: "carregando" }
  | { fase: "erro"; mensagem: string }
  | { fase: "ok"; agendamento: PortalAgendamentoDetalhe };

function toAgendamentoStatus(
  status: PortalAgendamentoStatusVisivel | string
): AgendamentoStatus {
  const key = String(status ?? "").trim().toLowerCase();
  if (key === "aso_retido") return "aso_retido";
  if (key === "cancelado" || key === "cancelada") return "cancelado";
  return "agendado";
}

export function PortalAgendamentoDetalheModal({
  agendamentoId,
  clienteId,
  clienteNome,
  onFechar,
}: {
  agendamentoId: string;
  clienteId: string;
  clienteNome: string;
  onFechar: () => void;
}) {
  const [estado, setEstado] = useState<DetalheState>({ fase: "carregando" });

  const carregar = useCallback(async () => {
    setEstado({ fase: "carregando" });
    try {
      const res = await fetch(
        `/api/portal/agendamentos/${encodeURIComponent(agendamentoId)}?cliente_id=${encodeURIComponent(clienteId)}&cliente_nome=${encodeURIComponent(clienteNome)}`,
        { cache: "no-store" }
      );
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        agendamento?: PortalAgendamentoDetalhe;
        error?: string;
      };
      if (!res.ok || !json.agendamento) {
        setEstado({
          fase: "erro",
          mensagem: json.error ?? "Agendamento não encontrado.",
        });
        return;
      }
      setEstado({ fase: "ok", agendamento: json.agendamento });
    } catch {
      setEstado({ fase: "erro", mensagem: "Erro ao carregar o agendamento." });
    }
  }, [agendamentoId, clienteId, clienteNome]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onFechar]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-5">
      <button
        type="button"
        className="absolute inset-0 bg-[#1a1333]/55 backdrop-blur-md"
        onClick={onFechar}
        aria-label="Fechar"
      />

      <div
        className="animate-modal-in relative flex max-h-[96vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[24px] bg-white shadow-[0_40px_80px_-20px_rgba(45,35,95,0.35)] sm:rounded-[24px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="portal-agendamento-detalhe-title"
      >
        <PortalDetalheHeader estado={estado} onFechar={onFechar} />

        <div className="flex-1 overflow-y-auto bg-[#f8f9fc] px-5 py-5 sm:px-7 sm:py-6">
          {estado.fase === "carregando" ? (
            <p className="py-14 text-center text-sm text-[#8b95a8]">
              Carregando...
            </p>
          ) : null}

          {estado.fase === "erro" ? (
            <p className="py-14 text-center text-sm text-[#dc2626]">
              {estado.mensagem}
            </p>
          ) : null}

          {estado.fase === "ok" ? (
            <DetalheConteudo agendamento={estado.agendamento} />
          ) : null}
        </div>

        <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-[#e8edf5] bg-white px-5 py-4 sm:px-7">
          <button
            type="button"
            onClick={onFechar}
            className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(91,74,203,0.35)] transition hover:opacity-95"
            style={{ background: PURPLE }}
          >
            <span>✕</span>
            Fechar
          </button>
        </footer>
      </div>
    </div>
  );
}

function PortalDetalheHeader({
  estado,
  onFechar,
}: {
  estado: DetalheState;
  onFechar: () => void;
}) {
  const agendamento = estado.fase === "ok" ? estado.agendamento : null;
  const status = agendamento
    ? statusBadge(toAgendamentoStatus(agendamento.status))
    : null;

  return (
    <header className="relative shrink-0 bg-white px-5 pb-0 pt-6 sm:px-7 sm:pt-7">
      <button
        type="button"
        onClick={onFechar}
        className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-full border border-[#e8edf5] bg-white text-lg text-[#8b95a8] shadow-sm transition hover:border-[#d4d9e8] hover:text-[#5b4acb]"
        aria-label="Fechar"
      >
        ×
      </button>

      <div className="flex gap-4 pr-12">
        <div
          className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-2xl text-white shadow-[0_10px_24px_rgba(91,74,203,0.4)]"
          style={{ background: `linear-gradient(145deg, ${PURPLE}, #7c6cf0)` }}
        >
          <IconCalendar />
        </div>
        <div className="min-w-0">
          <h2
            id="portal-agendamento-detalhe-title"
            className="text-[22px] font-extrabold leading-tight text-[#2d2a4a] sm:text-2xl"
          >
            Detalhes do agendamento
          </h2>
          <p className="mt-1 text-sm text-[#8b95a8]">
            Informações do seu agendamento de exames
          </p>
        </div>
      </div>

      {agendamento && status ? (
        <div
          className="mt-6 grid grid-cols-2 gap-4 rounded-2xl px-4 py-4 text-white sm:grid-cols-4 sm:gap-5 sm:px-5"
          style={{
            background: `linear-gradient(90deg, ${PURPLE_DARK}, ${PURPLE})`,
          }}
        >
          <div>
            <p className="text-[11px] font-medium text-white/70">Status</p>
            <span
              className={`mt-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold ${status.bg} ${status.text}`}
            >
              <span>{status.icon}</span>
              {agendamento.statusLabel}
            </span>
          </div>
          <div>
            <p className="text-[11px] font-medium text-white/70">Data</p>
            <div className="mt-2 flex items-center gap-2 text-sm font-bold">
              <span className="opacity-80">
                <IconCalendar />
              </span>
              {agendamento.dataLabel}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-medium text-white/70">Horário</p>
            <div className="mt-2 flex items-center gap-2 text-sm font-bold">
              <span className="opacity-80">
                <IconClock />
              </span>
              {agendamento.horarioLabel}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-medium text-white/70">Tipo de ASO</p>
            <div className="mt-2 flex items-center gap-2 text-sm font-bold">
              <span className="opacity-80">
                <IconStethoscope />
              </span>
              <span className="truncate" title={agendamento.tipoAso}>
                {agendamento.tipoAso}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="mt-6 h-[72px] rounded-2xl"
          style={{
            background: `linear-gradient(90deg, ${PURPLE_DARK}, ${PURPLE})`,
          }}
        />
      )}
    </header>
  );
}

function DetalheConteudo({
  agendamento,
}: {
  agendamento: PortalAgendamentoDetalhe;
}) {
  const TH =
    "border-b border-[#eef2f7] bg-[#f8fafc] px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-[#64748b]";
  const TD =
    "border-b border-[#eef2f7] px-3 py-2.5 align-middle text-xs text-[#1f2937]";

  return (
    <div className="space-y-8">
      <section>
        <SectionHeading
          icon={<IconDoc />}
          iconBg="bg-[#5b4acb]"
          title="Dados do agendamento"
        />
        <div className="rounded-2xl border border-[#e8edf5] bg-white px-2 sm:px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 lg:divide-x lg:divide-[#eef1f6]">
            <div className="divide-y divide-[#eef1f6] px-2">
              <DataRow
                icon={<IconUser />}
                label="Colaborador"
                value={agendamento.colaborador}
              />
              <DataRow
                icon={<IconStethoscope />}
                label="Tipo de ASO"
                value={agendamento.tipoAso}
              />
            </div>
            <div className="divide-y divide-[#eef1f6] px-2">
              <DataRow
                icon={<IconCalendar />}
                label="Data"
                value={agendamento.dataLabel}
              />
              <DataRow
                icon={<IconClock />}
                label="Horário"
                value={agendamento.horarioLabel}
              />
            </div>
          </div>
        </div>
      </section>

      <section>
        <SectionHeading
          icon={<IconFlask />}
          iconBg="bg-[#5b4acb]"
          title="Exames agendados"
        />

        {agendamento.exames.length === 0 ? (
          <p className="text-sm text-[#8b95a8]">Nenhum exame vinculado.</p>
        ) : (
          <div className="overflow-hidden rounded-[12px] border border-[#e8edf5] bg-white">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={`${TH} w-12 text-center`}>Nº</th>
                  <th className={TH}>Exame</th>
                </tr>
              </thead>
              <tbody>
                {agendamento.exames.map((exame, index) => (
                  <tr
                    key={exame.id}
                    className="transition-colors hover:bg-[#fafbff]"
                  >
                    <td
                      className={`${TD} text-center font-medium text-[#64748b]`}
                    >
                      {index + 1}
                    </td>
                    <td className={`${TD} font-semibold text-navy`}>
                      {exame.nome}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
