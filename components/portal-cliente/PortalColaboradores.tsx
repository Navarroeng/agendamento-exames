"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PortalEmpresaIdentidade } from "@/components/portal-cliente/PortalEmpresaIdentidade";
import { IconUsers } from "@/components/ui/icons/OutlineIcons";
import {
  apresentarCargoColaboradorPortal,
  apresentarNomeColaboradorPortal,
  calcPortalColaboradoresResumo,
  filtrarPortalColaboradores,
  type PortalColaboradorLinha,
  type PortalColaboradoresFiltro,
  type PortalColaboradoresResumo,
} from "@/lib/portal-colaboradores";

type Estado =
  | { fase: "carregando" }
  | { fase: "erro"; mensagem: string }
  | {
      fase: "ok";
      colaboradores: PortalColaboradorLinha[];
      resumo: PortalColaboradoresResumo;
    };

type ListResponse = {
  ok?: boolean;
  colaboradores?: PortalColaboradorLinha[];
  resumo?: PortalColaboradoresResumo;
  error?: string;
};

const FILTROS: { key: PortalColaboradoresFiltro; label: string }[] = [
  { key: "ativos", label: "Ativos" },
  { key: "demitidos", label: "Demitidos" },
  { key: "todos", label: "Todos" },
];

export function PortalColaboradores({
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
  const [filtro, setFiltro] = useState<PortalColaboradoresFiltro>("ativos");
  const [busca, setBusca] = useState("");

  const carregar = useCallback(async () => {
    setEstado({ fase: "carregando" });
    try {
      const res = await fetch(
        `/api/portal/colaboradores?cliente_id=${encodeURIComponent(clienteId)}`,
        { cache: "no-store" }
      );
      const json = (await res.json().catch(() => ({}))) as ListResponse;
      if (!res.ok) {
        setEstado({
          fase: "erro",
          mensagem: json.error ?? "Erro ao carregar colaboradores.",
        });
        return;
      }
      const colaboradores = json.colaboradores ?? [];
      const resumo =
        json.resumo ?? calcPortalColaboradoresResumo(colaboradores);
      setEstado({ fase: "ok", colaboradores, resumo });
    } catch {
      setEstado({
        fase: "erro",
        mensagem: "Erro ao carregar colaboradores.",
      });
    }
  }, [clienteId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const filtrados = useMemo(() => {
    if (estado.fase !== "ok") return [];
    return filtrarPortalColaboradores(estado.colaboradores, {
      filtro,
      buscaNome: busca,
    });
  }, [estado, filtro, busca]);

  return (
    <div className="flex flex-col gap-5">
      <PortalEmpresaIdentidade
        nome={clienteNome}
        logoUrl={logoUrl}
        variante="sst"
      />

      <button
        type="button"
        onClick={onVoltar}
        className="w-fit text-sm text-[#64748b] underline-offset-2 hover:underline"
      >
        ← Voltar
      </button>

      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0b1f4d] text-white">
          <IconUsers size={18} />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-[#0b1f4d]">Colaboradores</h2>
          <p className="mt-0.5 text-sm text-[#64748b]">
            Relação atualizada a partir da lista do contrato e dos exames
            ocupacionais.
          </p>
        </div>
      </div>

      {estado.fase === "carregando" && (
        <p className="py-12 text-center text-sm text-[#64748b]">
          Carregando colaboradores...
        </p>
      )}

      {estado.fase === "erro" && (
        <div className="rounded-2xl border border-[#e8edf5] bg-white px-8 py-14 text-center">
          <p className="text-sm text-[#dc2626]">{estado.mensagem}</p>
        </div>
      )}

      {estado.fase === "ok" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Kpi label="Equipe atual" valor={String(estado.resumo.totalAtivos)} />
            <Kpi
              label="Demitidos"
              valor={String(estado.resumo.totalDemitidos)}
            />
          </div>

          {estado.colaboradores.length === 0 ? (
            <div className="rounded-2xl border border-[#e8edf5] bg-white px-8 py-14 text-center">
              <p className="text-sm font-semibold text-[#0b1f4d]">
                Nenhum colaborador encontrado
              </p>
              <p className="mt-1.5 text-sm text-[#64748b]">
                A relação será montada a partir da lista de funcionários do
                contrato e dos admissionais da empresa.
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
                  <span className="sr-only">Buscar por nome</span>
                  <input
                    className="h-9 rounded-lg border border-[#e2e8f0] bg-white px-3 text-sm text-[#0b1f4d] outline-none focus:border-[#0b1f4d]"
                    placeholder="Buscar por nome"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                  />
                </label>
              </div>

              {filtrados.length === 0 ? (
                <div className="rounded-2xl border border-[#e8edf5] bg-white px-8 py-10 text-center">
                  <p className="text-sm text-[#64748b]">
                    Nenhum colaborador encontrado com os filtros atuais.
                  </p>
                </div>
              ) : (
                <>
                  <div className="hidden overflow-hidden rounded-2xl border border-[#e8edf5] bg-white md:block">
                    <table className="w-full table-fixed text-left text-sm">
                      <colgroup>
                        <col className="w-[34%]" />
                        <col className="w-[16%]" />
                        <col className="w-[28%]" />
                        <col className="w-[11%]" />
                        <col className="w-[11%]" />
                      </colgroup>
                      <thead className="bg-[#f8fafc] text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94a3b8]">
                        <tr>
                          <th className="px-4 py-3">Nome</th>
                          <th className="px-4 py-3">CPF</th>
                          <th className="px-4 py-3">Cargo</th>
                          <th className="px-4 py-3">Admissão</th>
                          <th className="px-4 py-3">Desligamento</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtrados.map((row) => (
                          <tr
                            key={row.id}
                            className="border-t border-[#eef2f7] odd:bg-white even:bg-[#fbfdff]"
                          >
                            <td className="px-4 py-3 font-semibold text-[#0b1f4d]">
                              <span className="line-clamp-2 break-words">
                                {apresentarNomeColaboradorPortal(row.nome)}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-[#475569]">
                              {row.cpfMascarado}
                            </td>
                            <td className="px-4 py-3 text-[#475569]">
                              <span className="line-clamp-2">
                                {apresentarCargoColaboradorPortal(row.cargo)}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-[#64748b]">
                              {row.dataAdmissaoLabel ?? "—"}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-[#64748b]">
                              {row.dataDesligamentoLabel ?? "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid gap-3 md:hidden">
                    {filtrados.map((row) => (
                      <article
                        key={row.id}
                        className="rounded-2xl border border-[#e8edf5] bg-white px-4 py-3.5"
                      >
                        <div className="min-w-0">
                          <p className="text-[15px] font-semibold text-[#0b1f4d]">
                            {apresentarNomeColaboradorPortal(row.nome)}
                          </p>
                          <p className="mt-0.5 font-mono text-xs text-[#64748b]">
                            {row.cpfMascarado}
                          </p>
                        </div>
                        <dl className="mt-3 space-y-1 text-sm">
                          <div className="flex justify-between gap-2">
                            <dt className="text-[#94a3b8]">Cargo</dt>
                            <dd className="text-right text-[#475569]">
                              {apresentarCargoColaboradorPortal(row.cargo)}
                            </dd>
                          </div>
                          {row.dataAdmissaoLabel ? (
                            <div className="flex justify-between gap-2">
                              <dt className="text-[#94a3b8]">Admissão</dt>
                              <dd className="text-right text-[#475569]">
                                {row.dataAdmissaoLabel}
                              </dd>
                            </div>
                          ) : null}
                          {row.dataDesligamentoLabel ? (
                            <div className="flex justify-between gap-2">
                              <dt className="text-[#94a3b8]">Desligamento</dt>
                              <dd className="text-right text-[#475569]">
                                {row.dataDesligamentoLabel}
                              </dd>
                            </div>
                          ) : null}
                        </dl>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function Kpi({
  label,
  valor,
  className = "",
}: {
  label: string;
  valor: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-[#e8edf5] bg-white px-4 py-3.5 shadow-[0_6px_16px_rgba(11,31,77,0.04)] ${className}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94a3b8]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-[#0b1f4d]">
        {valor}
      </p>
    </div>
  );
}
