"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  PortalAgendamentoDetalhe,
  PortalAgendamentoStatusVisivel,
} from "@/lib/portal-agendamentos";

type DetalheState =
  | { fase: "carregando" }
  | { fase: "erro"; mensagem: string }
  | { fase: "ok"; agendamento: PortalAgendamentoDetalhe };

function statusBadgeClass(
  status: PortalAgendamentoStatusVisivel | string
): string {
  const key = String(status ?? "").trim().toLowerCase();
  if (key === "cancelado" || key === "cancelada") {
    return "border-[#fecaca]/80 bg-[#fef2f2] text-[#b91c1c]";
  }
  if (key === "aso_retido") {
    return "border-[#fde68a]/80 bg-[#fffbeb] text-[#b45309]";
  }
  if (key === "agendado") {
    return "border-[#bfdbfe]/80 bg-[#eff6ff] text-[#1d4ed8]";
  }
  return "border-[#e2e8f0] bg-[#f8fafc] text-[#64748b]";
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

  const colaborador =
    estado.fase === "ok" ? estado.agendamento.colaborador : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b1f4d]/45 p-3 sm:p-5">
      <div className="flex max-h-[min(92vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_64px_rgba(11,31,77,0.22)]">
        {/* Header */}
        <div className="relative shrink-0 border-b border-[#e8edf5]">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-[#0b1f4d]" />
          <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-5 sm:px-6">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#94a3b8]">
                Detalhe do agendamento
              </p>
              <h2
                className="mt-1 truncate text-base font-bold tracking-tight text-[#0b1f4d] sm:text-lg"
                title={colaborador ?? undefined}
              >
                {colaborador ?? "Carregando..."}
              </h2>
            </div>
            <button
              type="button"
              onClick={onFechar}
              className="shrink-0 rounded-lg p-1.5 text-[#94a3b8] transition hover:bg-[#f1f5f9] hover:text-[#0b1f4d]"
              aria-label="Fechar"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {estado.fase === "carregando" ? (
            <p className="py-12 text-center text-sm text-[#94a3b8]">
              Carregando...
            </p>
          ) : null}

          {estado.fase === "erro" ? (
            <p className="py-12 text-center text-sm text-[#b91c1c]">
              {estado.mensagem}
            </p>
          ) : null}

          {estado.fase === "ok" ? (
            <DetalheConteudo agendamento={estado.agendamento} />
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end border-t border-[#eef2f7] bg-[#fafbfc] px-5 py-3 sm:px-6">
          <button
            type="button"
            onClick={onFechar}
            className="rounded-lg border border-[#e2e8f0] bg-white px-4 py-2 text-sm font-semibold text-[#475569] shadow-sm transition hover:border-[#cbd5e1] hover:bg-[#f8fafc] hover:text-[#0b1f4d]"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

function DetalheConteudo({
  agendamento,
}: {
  agendamento: PortalAgendamentoDetalhe;
}) {
  const resumoCards: { label: string; valor: string; isStatus?: boolean }[] = [
    { label: "Data", valor: agendamento.dataLabel },
    { label: "Horário", valor: agendamento.horarioLabel },
    { label: "Tipo de ASO", valor: agendamento.tipoAso },
    {
      label: "Status",
      valor: agendamento.statusLabel,
      isStatus: true,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <section>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
          {resumoCards.map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-[#e8edf5] bg-[#f8fafc] px-3.5 py-3"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#94a3b8]">
                {card.label}
              </p>
              {card.isStatus ? (
                <span
                  className={`mt-2 inline-flex max-w-full items-center truncate rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusBadgeClass(agendamento.status)}`}
                  title={card.valor}
                >
                  {card.valor}
                </span>
              ) : (
                <p
                  className="mt-1.5 truncate text-sm font-bold tabular-nums text-[#0b1f4d]"
                  title={card.valor}
                >
                  {card.valor}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#e8edf5] bg-white">
        <div className="border-b border-[#eef2f7] bg-[#fafbfc] px-4 py-3.5">
          <h3 className="text-sm font-bold text-[#0b1f4d]">Exames</h3>
          <p className="mt-0.5 text-xs text-[#94a3b8]">
            {agendamento.exames.length === 0
              ? "Nenhum exame listado"
              : agendamento.exames.length === 1
                ? "1 exame"
                : `${agendamento.exames.length} exames`}
          </p>
        </div>

        <div className="px-4 py-4">
          {agendamento.exames.length === 0 ? (
            <p className="text-sm text-[#94a3b8]">Nenhum exame listado.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {agendamento.exames.map((ex) => (
                <li
                  key={ex.id}
                  className="rounded-lg border border-[#e8edf5] bg-[#f8fafc] px-3 py-1.5 text-sm font-medium text-[#0b1f4d]"
                >
                  {ex.nome}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
