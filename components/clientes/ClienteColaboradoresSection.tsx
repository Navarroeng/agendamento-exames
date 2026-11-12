"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Field, RequiredMark } from "@/components/ui/Field";
import { IconUsers } from "@/components/ui/icons/OutlineIcons";
import {
  isDataCalendarioIso,
  podeDemitirColaborador,
  podeDesfazerDesligamentoAdmin,
} from "@/lib/colaborador-movimentacoes";
import { formatCPF, isValidCPF, maskCPFInput } from "@/lib/cpf";
import {
  apresentarCargoColaboradorPortal,
  apresentarNomeColaboradorPortal,
  calcPortalColaboradoresResumo,
  filtrarPortalColaboradores,
  type ClienteColaboradorLinha,
  type HistoricoExameColaborador,
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
  { key: "demitidos", label: "Desligados" },
  { key: "todos", label: "Todos" },
];

function hojeIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function rotuloResumoCompacto(ativos: number, desligados: number): string {
  const ativosLabel = ativos === 1 ? "1 ativo" : `${ativos} ativos`;
  const desligadosLabel =
    desligados === 1 ? "1 desligado" : `${desligados} desligados`;
  return `${ativosLabel} · ${desligadosLabel}`;
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
  const [historicoAlvo, setHistoricoAlvo] =
    useState<ClienteColaboradorLinha | null>(null);
  const [editarAlvo, setEditarAlvo] =
    useState<ClienteColaboradorLinha | null>(null);
  const [adicionarAberto, setAdicionarAberto] = useState(false);

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
        <div className="border-t border-[#eef2f7] px-5 py-6 text-center">
          <p className="text-sm text-[#dc2626]">{estado.mensagem}</p>
          <button
            type="button"
            className="btn mt-3"
            onClick={() => void carregar()}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {aberto && estado.fase === "ok" && (
        <div className="border-t border-[#eef2f7] px-5 pb-5 pt-4">
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              className="btn btn-primary text-xs"
              onClick={() => setAdicionarAberto(true)}
            >
              Adicionar colaborador
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Kpi label="Equipe atual" valor={String(estado.resumo.totalAtivos)} />
            <Kpi
              label="Desligados"
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
                        <col className="w-[20%]" />
                        <col className="w-[15%]" />
                        <col className="w-[15%]" />
                        <col className="w-[14%]" />
                        <col className="w-[10%]" />
                        <col className="w-[26%]" />
                      </colgroup>
                      <thead className="bg-[#f8fafc] text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94a3b8]">
                        <tr>
                          <th className="px-3 py-3">Nome</th>
                          <th className="px-3 py-3">CPF</th>
                          <th className="px-3 py-3">Cargo</th>
                          <th className="px-3 py-3">Admissão</th>
                          <th className="px-3 py-3">Situação</th>
                          <th className="px-3 py-3">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtrados.map((row) => (
                          <tr
                            key={row.id}
                            className="border-t border-[#eef2f7] odd:bg-white even:bg-[#fbfdff]"
                          >
                            <td className="px-3 py-3">
                              <button
                                type="button"
                                className="line-clamp-2 break-words text-left font-semibold text-[#0b1f4d] underline-offset-2 hover:underline"
                                onClick={() => setHistoricoAlvo(row)}
                              >
                                {apresentarNomeColaboradorPortal(row.nome)}
                              </button>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-[#475569]">
                              <CpfCelula
                                row={row}
                                onCadastrar={() => setEditarAlvo(row)}
                              />
                            </td>
                            <td className="px-3 py-3 text-[#475569]">
                              <span className="line-clamp-2">
                                {apresentarCargoColaboradorPortal(row.cargo)}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-[#64748b]">
                              <AdmissaoCelula
                                clienteId={clienteId}
                                row={row}
                                onAtualizado={aplicarLista}
                              />
                            </td>
                            <td className="px-3 py-3 font-semibold text-[#0b1f4d]">
                              {row.situacao === "demitido" ? "Desligado" : "Ativo"}
                            </td>
                            <td className="px-3 py-3">
                              <AcoesColuna
                                row={row}
                                onEditar={setEditarAlvo}
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
                        <button
                          type="button"
                          className="text-left text-[15px] font-semibold text-[#0b1f4d] underline-offset-2 hover:underline"
                          onClick={() => setHistoricoAlvo(row)}
                        >
                          {apresentarNomeColaboradorPortal(row.nome)}
                        </button>
                        <p className="mt-0.5 font-mono text-xs text-[#64748b]">
                          <CpfCelula
                            row={row}
                            onCadastrar={() => setEditarAlvo(row)}
                          />
                        </p>
                        <dl className="mt-3 space-y-1 text-sm">
                          <div className="flex justify-between gap-2">
                            <dt className="text-[#94a3b8]">Cargo</dt>
                            <dd className="text-right text-[#475569]">
                              {apresentarCargoColaboradorPortal(row.cargo)}
                            </dd>
                          </div>
                          <div className="flex items-start justify-between gap-2">
                            <dt className="pt-1 text-[#94a3b8]">Admissão</dt>
                            <dd className="text-right text-[#475569]">
                              <AdmissaoCelula
                                clienteId={clienteId}
                                row={row}
                                onAtualizado={aplicarLista}
                              />
                            </dd>
                          </div>
                          <div className="flex items-start justify-between gap-2">
                            <dt className="pt-1 text-[#94a3b8]">Situação</dt>
                            <dd className="text-right font-semibold text-[#0b1f4d]">
                              {row.situacao === "demitido" ? "Desligado" : "Ativo"}
                            </dd>
                          </div>
                          <div className="flex items-start justify-between gap-2">
                            <dt className="pt-1 text-[#94a3b8]">Ações</dt>
                            <dd className="text-right">
                              <AcoesColuna
                                row={row}
                                onEditar={setEditarAlvo}
                                onDemitir={setDemitirAlvo}
                                onDesfazer={setDesfazerAlvo}
                              />
                            </dd>
                          </div>
                        </dl>
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

      {adicionarAberto && estado.fase === "ok" ? (
        <AdicionarColaboradorDialog
          clienteId={clienteId}
          onClose={() => setAdicionarAberto(false)}
          onDone={(json) => {
            aplicarLista(json);
            setAdicionarAberto(false);
            setAberto(true);
          }}
        />
      ) : null}

      {editarAlvo ? (
        <EditarColaboradorDialog
          clienteId={clienteId}
          row={editarAlvo}
          onClose={() => setEditarAlvo(null)}
          onDone={(json) => {
            aplicarLista(json);
            setEditarAlvo(null);
          }}
        />
      ) : null}

      {historicoAlvo ? (
        <HistoricoExamesDialog
          clienteId={clienteId}
          row={historicoAlvo}
          onClose={() => setHistoricoAlvo(null)}
        />
      ) : null}
    </div>
  );
}

function IconeLapis() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function AdmissaoCelula({
  clienteId,
  row,
  onAtualizado,
}: {
  clienteId: string;
  row: ClienteColaboradorLinha;
  onAtualizado: (json: ListResponse) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [valor, setValor] = useState(row.dataAdmissaoIso ?? "");
  const [erro, setErro] = useState("");
  const [saving, setSaving] = useState(false);

  const abrir = () => {
    if (saving) return;
    setValor(row.dataAdmissaoIso ?? "");
    setErro("");
    setAberto(true);
  };

  const cancelar = () => {
    if (saving) return;
    setAberto(false);
    setErro("");
    setValor(row.dataAdmissaoIso ?? "");
  };

  const salvar = async () => {
    if (saving) return;
    if (!isDataCalendarioIso(valor)) {
      setErro("Informe uma data de admissão válida.");
      return;
    }
    setSaving(true);
    setErro("");
    try {
      const res = await fetch(
        `/api/clientes/${encodeURIComponent(clienteId)}/colaboradores/admissao`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cpf: row.cpfDigits,
            data_admissao: valor,
            movimentacao_id: row.admissaoMovimentacaoId,
          }),
        }
      );
      const json = (await res.json().catch(() => ({}))) as ListResponse;
      if (!res.ok) {
        const mensagem = json.error ?? "Não foi possível salvar a data de admissão.";
        setErro(mensagem);
        toast.error(mensagem);
        return;
      }
      onAtualizado(json);
      setAberto(false);
      toast.success("Data de admissão salva.");
    } catch {
      const mensagem = "Não foi possível salvar a data de admissão.";
      setErro(mensagem);
      toast.error(mensagem);
    } finally {
      setSaving(false);
    }
  };

  if (!isValidCPF(row.cpfDigits)) {
    return (
      <span className="whitespace-nowrap">{row.dataAdmissaoLabel ?? "—"}</span>
    );
  }

  if (!aberto) {
    return (
      <div className="flex items-center gap-1.5">
        {row.dataAdmissaoLabel ? (
          <>
            <span className="whitespace-nowrap">{row.dataAdmissaoLabel}</span>
            <button
              type="button"
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[#52617a] hover:bg-[#f4f6fb] hover:text-brand-blue"
              aria-label={`Editar data de admissão de ${apresentarNomeColaboradorPortal(row.nome)}`}
              onClick={abrir}
            >
              <IconeLapis />
            </button>
          </>
        ) : (
          <button
            type="button"
            className="text-[11px] font-bold text-brand-blue underline-offset-2 hover:underline"
            onClick={abrir}
          >
            Incluir data
          </button>
        )}
      </div>
    );
  }

  return (
    <form
      className="flex min-w-[9.5rem] flex-col gap-1.5"
      onSubmit={(event) => {
        event.preventDefault();
        void salvar();
      }}
    >
      <label className="text-[10px] font-bold uppercase tracking-wide text-[#8b95a8]">
        Data de admissão
      </label>
      <input
        type="date"
        className="h-9 rounded-lg border border-[#e2e8f0] bg-white px-2 text-xs text-[#0b1f4d] outline-none focus:border-[#0b1f4d]"
        value={valor}
        onChange={(event) => setValor(event.target.value)}
        disabled={saving}
        required
      />
      {erro ? <p className="text-[10px] font-semibold text-[#dc2626]">{erro}</p> : null}
      <div className="flex gap-1">
        <button
          type="submit"
          className="btn btn-primary !px-2 !py-1 text-[10px]"
          disabled={saving}
        >
          {saving ? "Salvando..." : "Salvar"}
        </button>
        <button
          type="button"
          className="btn !px-2 !py-1 text-[10px]"
          onClick={cancelar}
          disabled={saving}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function CpfCelula({
  row,
  onCadastrar,
}: {
  row: ClienteColaboradorLinha;
  onCadastrar: () => void;
}) {
  if (isValidCPF(row.cpfDigits)) {
    return <>{formatCPF(row.cpfDigits)}</>;
  }
  return (
    <button
      type="button"
      className="text-[11px] font-bold text-brand-blue underline-offset-2 hover:underline"
      onClick={onCadastrar}
    >
      Cadastrar
    </button>
  );
}

function IconLapis() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function AcoesColuna({
  row,
  onEditar,
  onDemitir,
  onDesfazer,
}: {
  row: ClienteColaboradorLinha;
  onEditar: (row: ClienteColaboradorLinha) => void;
  onDemitir: (row: ClienteColaboradorLinha) => void;
  onDesfazer: (row: ClienteColaboradorLinha) => void;
}) {
  return (
    <div className="flex flex-col items-end gap-1.5 md:flex-row md:flex-wrap md:items-center md:justify-start">
      <button
        type="button"
        className="btn btn-compact btn-secondary-blue"
        onClick={() => onEditar(row)}
      >
        <IconLapis />
        Editar
      </button>
      <AcoesColaborador
        row={row}
        onDemitir={onDemitir}
        onDesfazer={onDesfazer}
      />
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
        className="btn btn-compact btn-danger-quiet"
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
        className="btn btn-compact"
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
            agendamentoId: row.historicoAgendamentoId,
            vagaId: row.vinculoVagaId,
            cadastroId: row.cadastroId,
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

function HistoricoExamesDialog({
  clienteId,
  row,
  onClose,
}: {
  clienteId: string;
  row: ClienteColaboradorLinha;
  onClose: () => void;
}) {
  const [fase, setFase] = useState<"carregando" | "erro" | "ok">("carregando");
  const [mensagem, setMensagem] = useState("");
  const [exames, setExames] = useState<HistoricoExameColaborador[]>([]);

  const carregar = useCallback(async () => {
    setFase("carregando");
    setMensagem("");
    const params = new URLSearchParams();
    if (isValidCPF(row.cpfDigits)) params.set("cpf", row.cpfDigits);
    else if (row.historicoAgendamentoId) {
      params.set("agendamentoId", row.historicoAgendamentoId);
    }
    try {
      const res = await fetch(
        `/api/clientes/${encodeURIComponent(clienteId)}/colaboradores/historico?${params.toString()}`,
        { cache: "no-store" }
      );
      const json = (await res.json().catch(() => ({}))) as {
        exames?: HistoricoExameColaborador[];
        error?: string;
      };
      if (!res.ok) {
        setMensagem(json.error ?? "Não foi possível carregar o histórico.");
        setFase("erro");
        return;
      }
      setExames(json.exames ?? []);
      setFase("ok");
    } catch {
      setMensagem("Não foi possível carregar o histórico.");
      setFase("erro");
    }
  }, [clienteId, row.cpfDigits, row.historicoAgendamentoId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[#1a1333]/50 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Fechar histórico"
      />
      <div
        className="animate-modal-in relative flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-[24px] bg-white shadow-[0_24px_48px_rgba(45,35,95,0.25)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="historico-exames-titulo"
      >
        <div className="border-b border-[#e8edf5] px-6 py-5">
          <h3
            id="historico-exames-titulo"
            className="text-lg font-extrabold text-[#2d2a4a]"
          >
            Histórico de exames
          </h3>
          <p className="mt-1 text-sm text-[#8b95a8]">
            {apresentarNomeColaboradorPortal(row.nome)}
            {row.cpfMascarado !== "—" ? ` · ${row.cpfMascarado}` : ""}
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {fase === "carregando" ? (
            <p className="text-center text-sm text-[#64748b]">
              Carregando histórico...
            </p>
          ) : null}
          {fase === "erro" ? (
            <div className="text-center">
              <p className="text-sm text-[#dc2626]">{mensagem}</p>
              <button
                type="button"
                className="btn mt-3"
                onClick={() => void carregar()}
              >
                Tentar novamente
              </button>
            </div>
          ) : null}
          {fase === "ok" && exames.length === 0 ? (
            <p className="text-center text-sm text-[#64748b]">
              Nenhum exame encontrado.
            </p>
          ) : null}
          {fase === "ok" && exames.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94a3b8]">
                <tr>
                  <th className="pb-2 pr-3">Data</th>
                  <th className="pb-2 pr-3">Tipo de exame</th>
                  <th className="pb-2">Situação</th>
                </tr>
              </thead>
              <tbody>
                {exames.map((exame) => (
                  <tr key={exame.id} className="border-t border-[#eef2f7]">
                    <td className="whitespace-nowrap py-2.5 pr-3 text-[#475569]">
                      {exame.dataLabel}
                    </td>
                    <td className="py-2.5 pr-3 text-[#0b1f4d]">{exame.tipoExame}</td>
                    <td className="py-2.5 text-[#475569]">{exame.situacao}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
        <div className="flex justify-end border-t border-[#e8edf5] px-6 py-4">
          <button type="button" className="btn" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

function AdicionarColaboradorDialog({
  clienteId,
  onClose,
  onDone,
}: {
  clienteId: string;
  onClose: () => void;
  onDone: (json: ListResponse) => void;
}) {
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [cargo, setCargo] = useState("");
  const [admissao, setAdmissao] = useState("");
  const [saving, setSaving] = useState(false);

  const salvar = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/clientes/${encodeURIComponent(clienteId)}/colaboradores/inclusao`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome,
            cpf,
            cargo,
            dataAdmissao: admissao || null,
          }),
        }
      );
      const json = (await res.json().catch(() => ({}))) as ListResponse;
      if (!res.ok) {
        toast.error(json.error ?? "Não foi possível adicionar o colaborador.");
        return;
      }
      toast.success("Colaborador adicionado à lista da empresa.");
      onDone(json);
    } catch {
      toast.error("Não foi possível adicionar o colaborador.");
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
        aria-label="Fechar inclusão"
      />
      <div
        className="animate-modal-in relative w-full max-w-md overflow-hidden rounded-[24px] bg-white shadow-[0_24px_48px_rgba(45,35,95,0.25)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="adicionar-colaborador-titulo"
      >
        <div className="border-b border-[#e8edf5] px-6 py-5">
          <h3
            id="adicionar-colaborador-titulo"
            className="text-lg font-extrabold text-[#2d2a4a]"
          >
            Adicionar colaborador
          </h3>
          <p className="mt-1 text-sm text-[#8b95a8]">
            O cadastro entra na lista desta empresa. Não cria agendamento nem ocupa vaga de contrato.
          </p>
        </div>
        <form
          className="flex flex-col gap-3 px-6 py-5"
          onSubmit={(event) => {
            event.preventDefault();
            void salvar();
          }}
        >
          <Field label="Nome">
            <input
              className="h-10 rounded-lg border border-[#e2e8f0] px-3 text-sm text-[#0b1f4d] outline-none focus:border-[#0b1f4d]"
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              required
            />
          </Field>
          <Field label="CPF">
            <input
              className="h-10 rounded-lg border border-[#e2e8f0] px-3 text-sm text-[#0b1f4d] outline-none focus:border-[#0b1f4d]"
              value={cpf}
              onChange={(event) => setCpf(maskCPFInput(event.target.value))}
              inputMode="numeric"
              placeholder="000.000.000-00"
            />
          </Field>
          <Field label="Cargo">
            <input
              className="h-10 rounded-lg border border-[#e2e8f0] px-3 text-sm text-[#0b1f4d] outline-none focus:border-[#0b1f4d]"
              value={cargo}
              onChange={(event) => setCargo(event.target.value)}
            />
          </Field>
          <Field label="Data de admissão">
            <input
              type="date"
              className="h-10 rounded-lg border border-[#e2e8f0] px-3 text-sm text-[#0b1f4d] outline-none focus:border-[#0b1f4d]"
              value={admissao}
              onChange={(event) => setAdmissao(event.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Salvando..." : "Adicionar colaborador"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditarColaboradorDialog({
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
  const [nome, setNome] = useState(row.nome);
  const [cpf, setCpf] = useState(
    isValidCPF(row.cpfDigits) ? formatCPF(row.cpfDigits) : ""
  );
  const [cargo, setCargo] = useState(row.cargo === "—" ? "" : row.cargo);
  const [admissao, setAdmissao] = useState(row.dataAdmissaoIso ?? "");
  const [desligamento, setDesligamento] = useState(row.dataDesligamentoIso ?? "");
  const [saving, setSaving] = useState(false);
  const desligamentoEditavel =
    row.situacao === "demitido" && row.desligamentoOrigem === "admin";

  const salvar = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/clientes/${encodeURIComponent(clienteId)}/colaboradores/cadastro`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cpfAtual: row.cpfDigits,
            agendamentoId: row.historicoAgendamentoId,
            vagaId: row.vinculoVagaId,
            cadastroId: row.cadastroId,
            nome,
            cpf,
            cargo,
            dataAdmissao: admissao || null,
            dataDesligamento: desligamentoEditavel ? desligamento || null : null,
            desligamentoMovimentacaoId: desligamentoEditavel
              ? row.desligamentoMovimentacaoId
              : null,
          }),
        }
      );
      const json = (await res.json().catch(() => ({}))) as ListResponse;
      if (!res.ok) {
        toast.error(json.error ?? "Não foi possível salvar o colaborador.");
        return;
      }
      toast.success("Cadastro do colaborador salvo.");
      onDone(json);
    } catch {
      toast.error("Não foi possível salvar o colaborador.");
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
        aria-label="Fechar edição"
      />
      <div
        className="animate-modal-in relative w-full max-w-md overflow-hidden rounded-[24px] bg-white shadow-[0_24px_48px_rgba(45,35,95,0.25)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="editar-colaborador-titulo"
      >
        <div className="border-b border-[#e8edf5] px-6 py-5">
          <h3
            id="editar-colaborador-titulo"
            className="text-lg font-extrabold text-[#2d2a4a]"
          >
            Editar colaborador
          </h3>
          <p className="mt-1 text-sm text-[#8b95a8]">
            A alteração vale para esta empresa e para as listas em que ele já está vinculado.
          </p>
        </div>
        <form
          className="flex flex-col gap-3 px-6 py-5"
          onSubmit={(event) => {
            event.preventDefault();
            void salvar();
          }}
        >
          <Field label="Nome">
            <input
              className="h-10 rounded-lg border border-[#e2e8f0] px-3 text-sm text-[#0b1f4d] outline-none focus:border-[#0b1f4d]"
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              required
            />
          </Field>
          <Field label="CPF">
            <input
              className="h-10 rounded-lg border border-[#e2e8f0] px-3 text-sm text-[#0b1f4d] outline-none focus:border-[#0b1f4d]"
              value={cpf}
              onChange={(event) => setCpf(maskCPFInput(event.target.value))}
              inputMode="numeric"
              placeholder="000.000.000-00"
            />
          </Field>
          <Field label="Cargo">
            <input
              className="h-10 rounded-lg border border-[#e2e8f0] px-3 text-sm text-[#0b1f4d] outline-none focus:border-[#0b1f4d]"
              value={cargo}
              onChange={(event) => setCargo(event.target.value)}
            />
          </Field>
          <Field label="Data de admissão">
            <input
              type="date"
              className="h-10 rounded-lg border border-[#e2e8f0] px-3 text-sm text-[#0b1f4d] outline-none focus:border-[#0b1f4d]"
              value={admissao}
              onChange={(event) => setAdmissao(event.target.value)}
            />
          </Field>
          {desligamentoEditavel ? (
            <Field label="Data de desligamento">
              <input
                type="date"
                className="h-10 rounded-lg border border-[#e2e8f0] px-3 text-sm text-[#0b1f4d] outline-none focus:border-[#0b1f4d]"
                value={desligamento}
                onChange={(event) => setDesligamento(event.target.value)}
              />
            </Field>
          ) : row.dataDesligamentoLabel ? (
            <Field label="Data de desligamento">
              <input
                className="h-10 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-3 text-sm text-[#0b1f4d]"
                value={row.dataDesligamentoLabel}
                readOnly
              />
            </Field>
          ) : null}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
