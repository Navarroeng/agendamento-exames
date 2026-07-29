"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AgendamentoViewModal } from "@/components/modals/AgendamentoViewModal";
import { IconEye } from "@/components/ui/icons/OutlineIcons";
import { formatDateIsoToBR, formatHorarioForForm } from "@/lib/agendamento-datetime";
import { statusAgendamentoLabel } from "@/lib/agendamentos-table";
import {
  buildContratoAgendamentoContagem,
  isAgendamentoSelecionavel,
  resolveClassificacaoAgendamento,
  type ContratoAgendamentoContagem,
} from "@/lib/contrato-agendamentos";
import type { OrcamentoAprovacaoRecord } from "@/lib/orcamento-aprovacao";
import type { AgendamentoWithExames, ClienteContratoRecord } from "@/lib/types";
import {
  buscarContratoPorOrcamentoId,
  carregarAgendamentosVigenciaContrato,
  salvarSelecaoAgendamentosContrato,
  type AgendamentoNaVigenciaItem,
} from "@/services/contrato-agendamentos.service";

interface OrcamentoAbaAgendamentosProps {
  orcamentoId: string;
  aprovacao: OrcamentoAprovacaoRecord;
  usuarioNome: string;
  onContagemChange?: (contagem: ContratoAgendamentoContagem) => void;
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#e4ebf4] bg-white px-3.5 py-3 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
        {label}
      </p>
      <p className="mt-1 text-xl font-extrabold tabular-nums text-navy">
        {value}
      </p>
    </div>
  );
}

function ClassificacaoBadge({
  tipo,
}: {
  tipo: "contrato" | "adicional" | "cancelado";
}) {
  const map = {
    contrato: {
      label: "Contrato",
      className: "bg-brand-green-soft text-brand-green",
    },
    adicional: {
      label: "Adicional",
      className: "bg-[#ffedd5] text-[#c2410c]",
    },
    cancelado: {
      label: "Cancelado",
      className: "bg-brand-red-soft text-brand-red",
    },
  } as const;
  const cfg = map[tipo];
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-extrabold ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}

/** Checkbox com aparência circular (multi-seleção). */
function SelecaoCircular({
  checked,
  disabled,
  title,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  title?: string;
  onChange: () => void;
}) {
  return (
    <label
      className={`inline-flex items-center justify-center ${
        disabled ? "cursor-not-allowed" : "cursor-pointer"
      }`}
      title={title}
    >
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <span
        aria-hidden
        className={`
          relative inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center
          rounded-full border transition-colors
          ${
            disabled
              ? "border-[#cbd5e1] bg-[#f1f5f9]"
              : checked
                ? "border-brand-blue bg-brand-blue"
                : "border-[#94a3b8] bg-white hover:border-brand-blue"
          }
          peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-blue
        `}
      >
        {checked && !disabled ? (
          <svg
            viewBox="0 0 12 12"
            className="h-2.5 w-2.5 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2.5 6.2 5 8.5 9.5 3.5" />
          </svg>
        ) : null}
        {checked && disabled ? (
          <span className="h-1.5 w-1.5 rounded-full bg-[#94a3b8]" />
        ) : null}
      </span>
    </label>
  );
}

export function OrcamentoAbaAgendamentos({
  orcamentoId,
  aprovacao,
  usuarioNome,
  onContagemChange,
}: OrcamentoAbaAgendamentosProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contrato, setContrato] = useState<ClienteContratoRecord | null>(null);
  const [itens, setItens] = useState<AgendamentoNaVigenciaItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewAgendamento, setViewAgendamento] =
    useState<AgendamentoWithExames | null>(null);

  const onContagemChangeRef = useRef(onContagemChange);
  onContagemChangeRef.current = onContagemChange;

  const quantidadePrevista =
    Number(aprovacao.quantidade_colaboradores) ||
    Number(contrato?.quantidade_colaboradores) ||
    0;

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = Boolean(opts?.silent);
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const contratoRow = await buscarContratoPorOrcamentoId(orcamentoId);
        setContrato(contratoRow);
        const qtd =
          Number(aprovacao.quantidade_colaboradores) ||
          Number(contratoRow?.quantidade_colaboradores) ||
          0;

        if (!contratoRow) {
          const empty = buildContratoAgendamentoContagem(qtd, 0, 0);
          setItens([]);
          setSelectedIds(new Set());
          onContagemChangeRef.current?.(empty);
          return;
        }

        const resumo = await carregarAgendamentosVigenciaContrato({
          contrato: contratoRow,
          quantidadeContratada: qtd,
        });
        setItens(resumo.itens);
        setSelectedIds(
          new Set(
            resumo.itens
              .filter((i) => i.selecionado)
              .map((i) => i.agendamento.id)
          )
        );
        onContagemChangeRef.current?.(resumo.contagem);
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error
            ? err.message
            : "Erro ao carregar agendamentos do contrato."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [aprovacao.quantidade_colaboradores, orcamentoId]
  );

  // Carrega uma vez ao montar (abrir modal / entrar na aba). Sem polling.
  useEffect(() => {
    void load();
  }, [load]);

  const contagemPreview = useMemo(() => {
    const utilizados = itens.filter(
      (i) =>
        selectedIds.has(i.agendamento.id) &&
        isAgendamentoSelecionavel(i.agendamento.status)
    ).length;
    const adicionais = itens.filter(
      (i) =>
        !selectedIds.has(i.agendamento.id) &&
        isAgendamentoSelecionavel(i.agendamento.status)
    ).length;
    return buildContratoAgendamentoContagem(
      quantidadePrevista,
      utilizados,
      adicionais
    );
  }, [itens, selectedIds, quantidadePrevista]);

  function toggleSelecao(item: AgendamentoNaVigenciaItem) {
    if (!item.selecionavel) {
      if (item.bloqueadoOutroContrato) {
        toast.error(
          `Este agendamento já está contabilizado no contrato ${item.outroContratoNumero}.`
        );
      } else if (item.agendamento.status === "cancelado") {
        toast.error(
          "Agendamento cancelado não pode ser contabilizado no contrato."
        );
      }
      return;
    }

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.agendamento.id)) {
        next.delete(item.agendamento.id);
        return next;
      }
      if (next.size >= quantidadePrevista) {
        toast.error(
          `A quantidade prevista de ${quantidadePrevista} colaboradores para este contrato já foi atingida.`
        );
        return prev;
      }
      next.add(item.agendamento.id);
      return next;
    });
  }

  async function handleSalvar() {
    if (!contrato) {
      toast.error("Contrato não encontrado para este orçamento.");
      return;
    }
    setSaving(true);
    try {
      await salvarSelecaoAgendamentosContrato({
        contratoId: contrato.id,
        agendamentoIdsSelecionados: Array.from(selectedIds).filter((id) => {
          const item = itens.find((i) => i.agendamento.id === id);
          return item
            ? isAgendamentoSelecionavel(item.agendamento.status) &&
                !item.bloqueadoOutroContrato
            : false;
        }),
        usuarioNome,
        quantidadePrevista,
      });
      toast.success("Agendamentos do contrato salvos.");
      await load({ silent: true });
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Erro ao salvar seleção."
      );
    } finally {
      setSaving(false);
    }
  }

  const grupos = useMemo(() => {
    const doContrato: AgendamentoNaVigenciaItem[] = [];
    const demais: AgendamentoNaVigenciaItem[] = [];
    const cancelados: AgendamentoNaVigenciaItem[] = [];
    for (const item of itens) {
      const selecionado = selectedIds.has(item.agendamento.id);
      if (item.agendamento.status === "cancelado") {
        cancelados.push({ ...item, selecionado });
      } else if (selecionado) {
        doContrato.push({ ...item, selecionado: true });
      } else {
        demais.push({ ...item, selecionado: false });
      }
    }
    return { doContrato, demais, cancelados };
  }, [itens, selectedIds]);

  function renderTabela(
    titulo: string,
    rows: AgendamentoNaVigenciaItem[],
    atenuada?: boolean
  ) {
    if (rows.length === 0) return null;
    return (
      <div className={atenuada ? "opacity-70" : undefined}>
        <div className="border-b border-[#eef2f7] bg-[#f8fafc] px-4 py-2">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#64748b]">
            {titulo}
          </p>
        </div>
        <table className="table-premium w-full min-w-[860px]">
          <thead>
            <tr>
              <th className="w-[56px] text-center">Sel.</th>
              <th>Colaborador</th>
              <th>Data do exame</th>
              <th>Horário</th>
              <th>Tipo de ASO</th>
              <th>Clínica</th>
              <th>Status</th>
              <th>Classificação</th>
              <th className="w-[72px] text-center">Visualizar</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => {
              const ag = item.agendamento;
              const selecionado = selectedIds.has(ag.id);
              const classificacao = resolveClassificacaoAgendamento({
                status: ag.status,
                selecionado,
              });
              const disabled = (!item.selecionavel && !selecionado) || saving;
              const title =
                ag.status === "cancelado"
                  ? "Agendamento cancelado não pode ser contabilizado no contrato."
                  : item.bloqueadoOutroContrato
                    ? `Já contabilizado em ${item.outroContratoNumero}`
                    : "Selecionar para o contrato";
              return (
                <tr key={ag.id}>
                  <td className="align-middle text-center">
                    <SelecaoCircular
                      checked={selecionado}
                      disabled={disabled}
                      title={title}
                      onChange={() => toggleSelecao(item)}
                    />
                  </td>
                  <td className="align-middle font-semibold text-navy">
                    {ag.colaborador}
                  </td>
                  <td>{formatDateIsoToBR(ag.data_agendamento)}</td>
                  <td>{formatHorarioForForm(ag.horario) || "—"}</td>
                  <td>{ag.aso || "—"}</td>
                  <td>{ag.clinica_nome || "—"}</td>
                  <td>{statusAgendamentoLabel(ag.status)}</td>
                  <td>
                    <ClassificacaoBadge tipo={classificacao} />
                  </td>
                  <td className="text-center">
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#dbe3ef] text-brand-blue hover:bg-[#eff6ff]"
                      title="Visualizar agendamento"
                      onClick={() => setViewAgendamento(ag)}
                    >
                      <IconEye size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  const showInitialLoading = loading && itens.length === 0;

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-[#e4ebf4] bg-white">
        <div className="border-b border-[#eef2f7] px-4 py-3">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-navy">
            Agendamentos do contrato
          </p>
          <p className="mt-0.5 text-xs text-[#64748b]">
            Selecione até {quantidadePrevista || "—"} agendamentos para
            contabilizar na previsão inicial. Demais permanecem como adicionais.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-5">
          <Card label="Previstos" value={String(contagemPreview.previstos)} />
          <Card label="Utilizados" value={String(contagemPreview.utilizados)} />
          <Card
            label="Disponíveis"
            value={String(contagemPreview.disponiveis)}
          />
          <Card label="Adicionais" value={String(contagemPreview.adicionais)} />
          <Card label="Progresso" value={`${contagemPreview.percentual}%`} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eef2f7] px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-navy">
              {contagemPreview.mensagem}
            </p>
            {contrato?.numero ? (
              <p className="mt-1 text-xs text-[#64748b]">
                Contrato: {contrato.numero}
                {contrato.data_inicio && contrato.data_fim
                  ? ` · Vigência ${formatDateIsoToBR(contrato.data_inicio)} a ${formatDateIsoToBR(contrato.data_fim)}`
                  : ""}
              </p>
            ) : (
              <p className="mt-1 text-xs text-[#b45309]">
                Contrato ainda não vinculado a este orçamento.
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn btn-muted text-xs"
              disabled={saving || loading || refreshing}
              onClick={() => void load({ silent: true })}
            >
              {refreshing ? "Atualizando..." : "Atualizar lista"}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={saving || loading || !contrato}
              onClick={() => void handleSalvar()}
            >
              {saving ? "Salvando..." : "Salvar agendamentos do contrato"}
            </button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#e4ebf4] bg-white">
        <div className="overflow-x-auto">
          {showInitialLoading ? (
            <p className="px-4 py-8 text-center text-sm text-app-muted">
              Carregando...
            </p>
          ) : null}
          {!showInitialLoading && error && itens.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-brand-red">{error}</p>
          ) : null}
          {!showInitialLoading && !error && itens.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-app-muted">
              Nenhum agendamento encontrado na vigência deste contrato.
            </p>
          ) : null}
          {!showInitialLoading && itens.length > 0 ? (
            <>
              {renderTabela("Agendamentos do contrato", grupos.doContrato)}
              {renderTabela(
                "Demais agendamentos da vigência",
                grupos.demais
              )}
              {renderTabela("Cancelados", grupos.cancelados, true)}
            </>
          ) : null}
        </div>
      </section>

      <AgendamentoViewModal
        agendamento={viewAgendamento}
        onClose={() => setViewAgendamento(null)}
      />
    </div>
  );
}
