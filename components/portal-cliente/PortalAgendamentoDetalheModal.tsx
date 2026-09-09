"use client";

import { useCallback, useEffect, useState } from "react";
import type { PortalAgendamentoDetalhe } from "@/lib/portal-agendamentos";

type DetalheState =
  | { fase: "carregando" }
  | { fase: "erro"; mensagem: string }
  | { fase: "ok"; agendamento: PortalAgendamentoDetalhe };

function CampoValor({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94a3b8]">
        {label}
      </span>
      <span className="mt-0.5 text-sm text-[#0b1f4d]">{valor}</span>
    </div>
  );
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#e8edf5] px-6 py-4">
          <h2 className="text-base font-semibold text-[#0b1f4d]">
            Detalhe do agendamento
          </h2>
          <button
            type="button"
            onClick={onFechar}
            className="rounded-lg px-2 py-1 text-sm text-[#64748b] hover:bg-[#f1f5f9]"
          >
            Fechar
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          {estado.fase === "carregando" ? (
            <p className="py-8 text-center text-sm text-[#64748b]">
              Carregando...
            </p>
          ) : null}

          {estado.fase === "erro" ? (
            <p className="py-8 text-center text-sm text-[#dc2626]">
              {estado.mensagem}
            </p>
          ) : null}

          {estado.fase === "ok" ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <CampoValor
                  label="Colaborador"
                  valor={estado.agendamento.colaborador}
                />
                <CampoValor
                  label="Status"
                  valor={estado.agendamento.statusLabel}
                />
                <CampoValor label="Data" valor={estado.agendamento.dataLabel} />
                <CampoValor
                  label="Horário"
                  valor={estado.agendamento.horarioLabel}
                />
                <CampoValor
                  label="Tipo"
                  valor={estado.agendamento.tipoAso}
                />
                <CampoValor
                  label="Clínica"
                  valor={estado.agendamento.clinicaNome}
                />
              </div>

              {estado.agendamento.enderecoClinica ? (
                <CampoValor
                  label="Endereço da clínica"
                  valor={estado.agendamento.enderecoClinica}
                />
              ) : null}

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94a3b8]">
                  Exames
                </p>
                {estado.agendamento.exames.length === 0 ? (
                  <p className="mt-1 text-sm text-[#64748b]">
                    Nenhum exame listado.
                  </p>
                ) : (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#0b1f4d]">
                    {estado.agendamento.exames.map((ex) => (
                      <li key={ex.id}>{ex.nome}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
