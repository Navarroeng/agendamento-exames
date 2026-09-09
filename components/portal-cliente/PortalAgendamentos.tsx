"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PortalEmpresaIdentidade } from "@/components/portal-cliente/PortalEmpresaIdentidade";
import { PortalAgendamentoDetalheModal } from "@/components/portal-cliente/PortalAgendamentoDetalheModal";
import {
  calcPortalAgendamentosResumo,
  filtrarPortalAgendamentos,
  type PortalAgendamentoLinha,
  type PortalAgendamentosFiltro,
  type PortalAgendamentosResumo,
} from "@/lib/portal-agendamentos";

type Estado =
  | { fase: "carregando" }
  | { fase: "erro"; mensagem: string }
  | {
      fase: "ok";
      agendamentos: PortalAgendamentoLinha[];
      resumo: PortalAgendamentosResumo;
    };

type ListResponse = {
  ok?: boolean;
  agendamentos?: PortalAgendamentoLinha[];
  resumo?: PortalAgendamentosResumo;
  error?: string;
};

const FILTROS: { key: PortalAgendamentosFiltro; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "proximos", label: "Próximos" },
  { key: "historico", label: "Histórico" },
];

function statusClass(status: PortalAgendamentoLinha["status"]): string {
  if (status === "aso_retido") {
    return "bg-[#fff7ed] text-[#c2410c] border border-[#fed7aa]";
  }
  return "bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe]";
}

export function PortalAgendamentos({
  clienteId,
  clienteNome,
  logoUrl,
  onVoltar,
}: {
  clienteId: string;
  clienteNome: string;
  logoUrl: string | null;
  onVoltar: () => void;
}) {
  const [estado, setEstado] = useState<Estado>({ fase: "carregando" });
  const [filtro, setFiltro] = useState<PortalAgendamentosFiltro>("todos");
  const [busca, setBusca] = useState("");
  const [detalheId, setDetalheId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setEstado({ fase: "carregando" });
    try {
      const res = await fetch(
        `/api/portal/agendamentos?cliente_id=${encodeURIComponent(clienteId)}&cliente_nome=${encodeURIComponent(clienteNome)}`,
        { cache: "no-store" }
      );
      const json = (await res.json().catch(() => ({}))) as ListResponse;
      if (!res.ok) {
        setEstado({
          fase: "erro",
          mensagem: json.error ?? "Erro ao carregar agendamentos.",
        });
        return;
      }
      const agendamentos = json.agendamentos ?? [];
      const resumo = json.resumo ?? calcPortalAgendamentosResumo([]);
      setEstado({ fase: "ok", agendamentos, resumo });
    } catch {
      setEstado({ fase: "erro", mensagem: "Erro ao carregar agendamentos." });
    }
  }, [clienteId, clienteNome]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const filtrados = useMemo(() => {
    if (estado.fase !== "ok") return [];
    return filtrarPortalAgendamentos(estado.agendamentos, {
      filtro,
      buscaColaborador: busca,
    });
  }, [estado, filtro, busca]);

  return (
    <div className="flex flex-col gap-5">
      <PortalEmpresaIdentidade
        nome={clienteNome}
        logoUrl={logoUrl}
        variante="sst"
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onVoltar}
          className="text-sm text-[#64748b] underline-offset-2 hover:underline"
        >
          ← Voltar
        </button>
      </div>

      <div>
        <h2 className="text-base font-semibold tracking-tight text-[#0b1f4d]">
          Agendamentos
        </h2>
        <p className="mt-1 text-sm text-[#64748b]">
          Acompanhe os agendamentos ocupacionais da sua empresa.
        </p>
      </div>

      {estado.fase === "carregando" && (
        <p className="py-12 text-center text-sm text-[#64748b]">
          Carregando agendamentos...
        </p>
      )}

      {estado.fase === "erro" && (
        <div className="rounded-2xl border border-[#e8edf5] bg-white px-8 py-14 text-center">
          <p className="text-sm text-[#dc2626]">{estado.mensagem}</p>
        </div>
      )}

      {estado.fase === "ok" && (
        <>
          {estado.agendamentos.length === 0 ? (
            <div className="rounded-2xl border border-[#e8edf5] bg-white px-8 py-14 text-center">
              <p className="text-sm text-[#64748b]">
                Nenhum agendamento disponível no momento.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  {FILTROS.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setFiltro(f.key)}
                      className={[
                        "rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors",
                        filtro === f.key
                          ? "bg-[#0b1f4d] text-white"
                          : "border border-[#dbe4f4] bg-white text-[#52617a] hover:bg-[#f8fafc]",
                      ].join(" ")}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <label className="flex min-w-[200px] flex-1 flex-col gap-1 sm:max-w-xs">
                  <span className="sr-only">Buscar colaborador</span>
                  <input
                    className="h-9 rounded-lg border border-[#e2e8f0] bg-white px-3 text-sm text-[#0b1f4d] outline-none focus:border-[#0b1f4d]"
                    placeholder="Buscar colaborador"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                  />
                </label>
              </div>

              {filtrados.length === 0 ? (
                <div className="rounded-2xl border border-[#e8edf5] bg-white px-8 py-10 text-center">
                  <p className="text-sm text-[#64748b]">
                    Nenhum agendamento encontrado com os filtros atuais.
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden overflow-hidden rounded-2xl border border-[#e8edf5] bg-white md:block">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead className="bg-[#f8fafc] text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94a3b8]">
                        <tr>
                          <th className="px-4 py-3">Data</th>
                          <th className="px-4 py-3">Horário</th>
                          <th className="px-4 py-3">Colaborador</th>
                          <th className="px-4 py-3">Clínica</th>
                          <th className="px-4 py-3">Tipo</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtrados.map((row) => (
                          <tr
                            key={row.id}
                            className="border-t border-[#eef2f7] odd:bg-white even:bg-[#fbfdff]"
                          >
                            <td className="px-4 py-3 font-medium text-[#0b1f4d]">
                              {row.dataLabel}
                            </td>
                            <td className="px-4 py-3 text-[#475569]">
                              {row.horarioLabel}
                            </td>
                            <td className="px-4 py-3 text-[#0b1f4d]">
                              {row.colaborador}
                            </td>
                            <td className="px-4 py-3 text-[#475569]">
                              {row.clinicaNome}
                            </td>
                            <td className="px-4 py-3 text-[#475569]">
                              {row.tipoAso}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusClass(row.status)}`}
                              >
                                {row.statusLabel}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                className="text-sm font-semibold text-[#0b1f4d] underline-offset-2 hover:underline"
                                onClick={() => setDetalheId(row.id)}
                              >
                                Ver detalhes
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="grid gap-3 md:hidden">
                    {filtrados.map((row) => (
                      <article
                        key={row.id}
                        className="rounded-2xl border border-[#e8edf5] bg-white px-4 py-3.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[15px] font-semibold text-[#0b1f4d]">
                              {row.colaborador}
                            </p>
                            <p className="mt-0.5 text-sm text-[#64748b]">
                              {row.dataLabel} · {row.horarioLabel}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusClass(row.status)}`}
                          >
                            {row.statusLabel}
                          </span>
                        </div>
                        <dl className="mt-3 space-y-1 text-sm">
                          <div className="flex justify-between gap-2">
                            <dt className="text-[#94a3b8]">Clínica</dt>
                            <dd className="text-right text-[#475569]">
                              {row.clinicaNome}
                            </dd>
                          </div>
                          <div className="flex justify-between gap-2">
                            <dt className="text-[#94a3b8]">Tipo</dt>
                            <dd className="text-right text-[#475569]">
                              {row.tipoAso}
                            </dd>
                          </div>
                        </dl>
                        <button
                          type="button"
                          className="mt-3 text-sm font-semibold text-[#0b1f4d] underline-offset-2 hover:underline"
                          onClick={() => setDetalheId(row.id)}
                        >
                          Ver detalhes
                        </button>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}

      {detalheId ? (
        <PortalAgendamentoDetalheModal
          agendamentoId={detalheId}
          clienteId={clienteId}
          clienteNome={clienteNome}
          onFechar={() => setDetalheId(null)}
        />
      ) : null}
    </div>
  );
}
