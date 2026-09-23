"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Field, RequiredMark } from "@/components/ui/Field";
import { IconUsers } from "@/components/ui/icons/OutlineIcons";
import {
  podeDemitirColaborador,
  podeDesfazerDesligamentoAdmin,
} from "@/lib/colaborador-movimentacoes";
import { formatCPF } from "@/lib/cpf";
import {
  apresentarCargoColaboradorPortal,
  apresentarNomeColaboradorPortal,
  calcPortalColaboradoresResumo,
  filtrarPortalColaboradores,
  type ClienteColaboradorLinha,
  type PortalColaboradoresFiltro,
  type PortalColaboradoresResumo,
} from "@/lib/portal-colaboradores";

type Estado =
  | { fase: "carregando" }
  | { fase: "erro"; mensagem: string }
  | {
      fase: "ok";
      colaboradores: ClienteColaboradorLinha[];
      resumo: PortalColaboradoresResumo;
    };

type ListResponse = {
  ok?: boolean;
  colaboradores?: ClienteColaboradorLinha[];
  resumo?: PortalColaboradoresResumo;
  error?: string;
};

const FILTROS: { key: PortalColaboradoresFiltro; label: string }[] = [
  { key: "ativos", label: "Ativos" },
  { key: "demitidos", label: "Demitidos" },
  { key: "todos", label: "Todos" },
];

function hojeIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function rotuloResumoCompacto(ativos: number, demitidos: number): string {
  const ativosLabel = ativos === 1 ? "1 ativo" : `${ativos} ativos`;
  const demitidosLabel =
    demitidos === 1 ? "1 demitido" : `${demitidos} demitidos`;
  return `${ativosLabel} · ${demitidosLabel}`;
}

export function ClienteColaboradoresSection({
  clienteId,
}: {
  clienteId: string;
}) {
  const [estado, setEstado] = useState<Estado>({ fase: "carregando" });
  const [aberto, setAberto] = useState(false);
  const [filtro, setFiltro] = useState<PortalColaboradoresFiltro>("ativos");
  const [busca, setBusca] = useState("");
  const [demitirAlvo, setDemitirAlvo] = useState<ClienteColaboradorLinha | null>(
    null
  );
  const [desfazerAlvo, setDesfazerAlvo] =
    useState<ClienteColaboradorLinha | null>(null);

  const aplicarLista = useCallback((json: ListResponse) => {
    const colaboradores = json.colaboradores ?? [];
    const resumo = json.resumo ?? calcPortalColaboradoresResumo(colaboradores);
    setEstado({ fase: "ok", colaboradores, resumo });
  }, []);

  const carregar = useCallback(async () => {
    setEstado({ fase: "carregando" });
    try {
      const res = await fetch(
        `/api/clientes/${encodeURIComponent(clienteId)}/colaboradores`,
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
      aplicarLista(json);
    } catch {
      setEstado({
        fase: "erro",
        mensagem: "Erro ao carregar colaboradores.",
      });
    }
  }, [aplicarLista, clienteId]);

  useEffect(() => {
    setAberto(false);
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

  const exibirDesligamento = filtro !== "ativos";

  const resumoCompacto =
    estado.fase === "ok"
      ? rotuloResumoCompacto(
          estado.resumo.totalAtivos,
          estado.resumo.totalDemitidos
        )
      : estado.fase === "erro"
        ? "Não foi possível carregar"
        : "Carregando...";

  return (
    <div className="mt-5 overflow-hidden rounded-[20px] border border-[#e8edf5] bg-gradient-to-b from-white to-[#fbfdff] shadow-[0_6px_22px_rgba(15,23,42,0.04)]">
      <button
        type="button"
        className="flex min-h-[72px] w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-[#f8fafc]/80"
        onClick={() => setAberto((atual) => !atual)}
        aria-expanded={aberto}
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] border border-brand-blue/15 bg-gradient-to-br from-brand-blue-soft/90 to-white text-brand-blue shadow-[0_2px_10px_rgba(79,99,255,0.08)]">
          <IconUsers size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-extrabold text-[#2d2a4a]">
            Colaboradores
          </span>
          <span className="mt-0.5 block text-xs text-[#8b95a8]">
            Relação consolidada da empresa
          </span>
        </span>
        <span className="shrink-0 whitespace-nowrap text-xs font-semibold text-[#52617a]">
          {resumoCompacto}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 text-[#64748b] transition-transform ${aberto ? "rotate-180" : ""}`}
          aria-hidden
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {aberto && estado.fase === "carregando" && (
        <p className="border-t border-[#eef2f7] px-5 py-8 text-center text-sm text-[#64748b]">
          Carregando colaboradores...
        </p>
      )}

      {aberto && estado.fase === "erro" && (
        <p className="border-t border-[#eef2f7] px-5 py-6 text-center text-sm text-[#dc2626]">
          {estado.mensagem}
        </p>
      )}

      {aberto && estado.fase === "ok" && (
        <div className="border-t border-[#eef2f7] px-5 pb-5 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <Kpi label="Equipe atual" valor={String(estado.resumo.totalAtivos)} />
            <Kpi
              label="Demitidos"
              valor={String(estado.resumo.totalDemitidos)}
            />
          </div>

          {estado.colaboradores.length === 0 ? (
            <p className="mt-4 text-center text-sm text-[#64748b]">
              Nenhum colaborador encontrado.
            </p>
          ) : (
            <>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                <p className="mt-4 text-center text-sm text-[#64748b]">
                  Nenhum colaborador encontrado com os filtros atuais.
                </p>
              ) : (
                <>
                  <div className="mt-4 hidden overflow-hidden rounded-2xl border border-[#e8edf5] bg-white md:block">
                    <table className="w-full table-fixed text-left text-sm">
                      <colgroup>
                        {exibirDesligamento ? (
                          <>
                            <col className="w-[26%]" />
                            <col className="w-[14%]" />
                            <col className="w-[20%]" />
                            <col className="w-[12%]" />
                            <col className="w-[12%]" />
                            <col className="w-[16%]" />
                          </>
                        ) : (
                          <>
                            <col className="w-[32%]" />
                            <col className="w-[16%]" />
                            <col className="w-[24%]" />
                            <col className="w-[12%]" />
                            <col className="w-[16%]" />
                          </>
                        )}
                      </colgroup>
                      <thead className="bg-[#f8fafc] text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94a3b8]">
                        <tr>
                          <th className="px-3 py-3">Nome</th>
                          <th className="px-3 py-3">CPF</th>
                          <th className="px-3 py-3">Cargo</th>
                          <th className="px-3 py-3">Admissão</th>
                          {exibirDesligamento ? (
                            <th className="px-3 py-3">Desligamento</th>
                          ) : null}
                          <th className="px-3 py-3">Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtrados.map((row) => (
                          <tr
                            key={row.id}
                            className="border-t border-[#eef2f7] odd:bg-white even:bg-[#fbfdff]"
                          >
                            <td className="px-3 py-3 font-semibold text-[#0b1f4d]">
                              <span className="line-clamp-2 break-words">
                                {apresentarNomeColaboradorPortal(row.nome)}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-[#475569]">
                              {row.cpfMascarado}
                            </td>
                            <td className="px-3 py-3 text-[#475569]">
                              <span className="line-clamp-2">
                                {apresentarCargoColaboradorPortal(row.cargo)}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-[#64748b]">
                              {row.dataAdmissaoLabel ?? "—"}
                            </td>
                            {exibirDesligamento ? (
                              <td className="whitespace-nowrap px-3 py-3 text-[#64748b]">
                                {row.dataDesligamentoLabel ?? "—"}
                              </td>
                            ) : null}
                            <td className="px-3 py-3">
                              <AcoesColaborador
                                row={row}
                                onDemitir={setDemitirAlvo}
                                onDesfazer={setDesfazerAlvo}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-3 grid gap-3 md:hidden">
                    {filtrados.map((row) => (
                      <article
                        key={row.id}
                        className="rounded-2xl border border-[#e8edf5] bg-white px-4 py-3.5"
                      >
                        <p className="text-[15px] font-semibold text-[#0b1f4d]">
                          {apresentarNomeColaboradorPortal(row.nome)}
                        </p>
                        <p className="mt-0.5 font-mono text-xs text-[#64748b]">
                          {row.cpfMascarado}
                        </p>
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
                          {exibirDesligamento && row.dataDesligamentoLabel ? (
                            <div className="flex justify-between gap-2">
                              <dt className="text-[#94a3b8]">Desligamento</dt>
                              <dd className="text-right text-[#475569]">
                                {row.dataDesligamentoLabel}
                              </dd>
                            </div>
                          ) : null}
                        </dl>
                        <div className="mt-3">
                          <AcoesColaborador
                            row={row}
                            onDemitir={setDemitirAlvo}
                            onDesfazer={setDesfazerAlvo}
                          />
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {demitirAlvo ? (
        <DemitirModal
          clienteId={clienteId}
          row={demitirAlvo}
          onClose={() => setDemitirAlvo(null)}
          onDone={(json) => {
            aplicarLista(json);
            setDemitirAlvo(null);
          }}
        />
      ) : null}

      {desfazerAlvo ? (
        <DesfazerModal
          clienteId={clienteId}
          row={desfazerAlvo}
          onClose={() => setDesfazerAlvo(null)}
          onDone={(json) => {
            aplicarLista(json);
            setDesfazerAlvo(null);
          }}
        />
      ) : null}
    </div>
  );
}

function AcoesColaborador({
  row,
  onDemitir,
  onDesfazer,
}: {
  row: ClienteColaboradorLinha;
  onDemitir: (row: ClienteColaboradorLinha) => void;
  onDesfazer: (row: ClienteColaboradorLinha) => void;
}) {
  if (podeDemitirColaborador(row)) {
    return (
      <button
        type="button"
        className="text-[11px] font-bold text-[#b45309] underline-offset-2 hover:underline"
        onClick={() => onDemitir(row)}
      >
        Demitir
      </button>
    );
  }
  if (podeDesfazerDesligamentoAdmin(row)) {
    return (
      <button
        type="button"
        className="text-[11px] font-bold text-[#0b1f4d] underline-offset-2 hover:underline"
        onClick={() => onDesfazer(row)}
      >
        Desfazer desligamento
      </button>
    );
  }
  return <span className="text-[11px] text-[#94a3b8]">—</span>;
}

function Kpi({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-xl border border-[#e8edf5] bg-white px-3.5 py-3 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#8b95a8]">
        {label}
      </p>
      <p className="mt-1 text-xl font-extrabold tabular-nums text-[#1f2937]">
        {valor}
      </p>
    </div>
  );
}

function DemitirModal({
  clienteId,
  row,
  onClose,
  onDone,
}: {
  clienteId: string;
  row: ClienteColaboradorLinha;
  onClose: () => void;
  onDone: (json: ListResponse) => void;
}) {
  const [dataEvento, setDataEvento] = useState(hojeIso);
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);

  const confirmar = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/clientes/${encodeURIComponent(clienteId)}/colaboradores/desligamento`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cpf: row.cpfDigits,
            data_evento: dataEvento,
            motivo: motivo.trim() || undefined,
          }),
        }
      );
      const json = (await res.json().catch(() => ({}))) as ListResponse;
      if (!res.ok) {
        toast.error(json.error ?? "Não foi possível registrar o desligamento.");
        return;
      }
      toast.success("Desligamento administrativo registrado.");
      onDone(json);
    } catch {
      toast.error("Não foi possível registrar o desligamento.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[#1a1333]/50 backdrop-blur-sm"
        onClick={() => {
          if (!saving) onClose();
        }}
        aria-label="Fechar"
      />
      <div
        className="animate-modal-in relative w-full max-w-md overflow-hidden rounded-[24px] bg-white shadow-[0_24px_48px_rgba(45,35,95,0.25)]"
        role="dialog"
        aria-modal="true"
      >
        <div className="border-b border-[#e8edf5] px-6 py-5">
          <h3 className="text-lg font-extrabold text-[#2d2a4a]">
            Confirmar desligamento
          </h3>
          <p className="mt-1 text-sm text-[#8b95a8]">
            Este desligamento não gera exame demissional nem agendamento.
          </p>
        </div>
        <div className="flex flex-col gap-3 px-6 py-5">
          <Field label="Nome">
            <input
              className="h-10 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-3 text-sm text-[#0b1f4d]"
              value={apresentarNomeColaboradorPortal(row.nome)}
              readOnly
            />
          </Field>
          <Field label="CPF">
            <input
              className="h-10 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-3 text-sm text-[#0b1f4d]"
              value={formatCPF(row.cpfDigits)}
              readOnly
            />
          </Field>
          <Field
            label={
              <>
                Data do desligamento <RequiredMark />
              </>
            }
          >
            <input
              type="date"
              className="h-10 rounded-lg border border-[#e2e8f0] px-3 text-sm text-[#0b1f4d] outline-none focus:border-[#0b1f4d]"
              value={dataEvento}
              onChange={(e) => setDataEvento(e.target.value)}
              required
            />
          </Field>
          <Field label="Motivo/observação">
            <textarea
              className="min-h-[72px] rounded-lg border border-[#e2e8f0] px-3 py-2 text-sm text-[#0b1f4d] outline-none focus:border-[#0b1f4d]"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              maxLength={500}
            />
          </Field>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#e8edf5] px-6 py-4">
          <button
            type="button"
            className="btn"
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn bg-brand-red text-white hover:opacity-90"
            onClick={() => void confirmar()}
            disabled={saving || !dataEvento}
          >
            {saving ? "Registrando..." : "Confirmar desligamento"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DesfazerModal({
  clienteId,
  row,
  onClose,
  onDone,
}: {
  clienteId: string;
  row: ClienteColaboradorLinha;
  onClose: () => void;
  onDone: (json: ListResponse) => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);
  const movimentacaoId = row.desligamentoMovimentacaoId;

  const confirmar = async () => {
    if (saving || !movimentacaoId) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/clientes/${encodeURIComponent(clienteId)}/colaboradores/movimentacoes/${encodeURIComponent(movimentacaoId)}/desfazer`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            motivo: motivo.trim() || undefined,
          }),
        }
      );
      const json = (await res.json().catch(() => ({}))) as ListResponse;
      if (!res.ok) {
        toast.error(json.error ?? "Não foi possível desfazer o desligamento.");
        return;
      }
      toast.success("Desligamento administrativo desfeito.");
      onDone(json);
    } catch {
      toast.error("Não foi possível desfazer o desligamento.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[#1a1333]/50 backdrop-blur-sm"
        onClick={() => {
          if (!saving) onClose();
        }}
        aria-label="Fechar"
      />
      <div
        className="animate-modal-in relative w-full max-w-md overflow-hidden rounded-[24px] bg-white shadow-[0_24px_48px_rgba(45,35,95,0.25)]"
        role="dialog"
        aria-modal="true"
      >
        <div className="border-b border-[#e8edf5] px-6 py-5">
          <h3 className="text-lg font-extrabold text-[#2d2a4a]">
            Desfazer desligamento
          </h3>
          <p className="mt-1 text-sm text-[#8b95a8]">
            O lançamento administrativo de{" "}
            <strong>{apresentarNomeColaboradorPortal(row.nome)}</strong> será
            cancelado. A situação será recalculada com os fatos restantes.
          </p>
        </div>
        <div className="px-6 py-5">
          <Field label="Motivo (opcional)">
            <textarea
              className="min-h-[72px] rounded-lg border border-[#e2e8f0] px-3 py-2 text-sm text-[#0b1f4d] outline-none focus:border-[#0b1f4d]"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              maxLength={500}
            />
          </Field>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#e8edf5] px-6 py-4">
          <button
            type="button"
            className="btn"
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void confirmar()}
            disabled={saving}
          >
            {saving ? "Desfazendo..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
