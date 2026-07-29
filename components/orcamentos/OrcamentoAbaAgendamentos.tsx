"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

export function OrcamentoAbaAgendamentos({
  orcamentoId,
  aprovacao,
  usuarioNome,
  onContagemChange,
}: OrcamentoAbaAgendamentosProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contrato, setContrato] = useState<ClienteContratoRecord | null>(null);
  const [itens, setItens] = useState<AgendamentoNaVigenciaItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [contagem, setContagem] = useState<ContratoAgendamentoContagem>(() =>
    buildContratoAgendamentoContagem(
      Number(aprovacao.quantidade_colaboradores) || 0,
      0,
      0
    )
  );
  const [viewAgendamento, setViewAgendamento] =
    useState<AgendamentoWithExames | null>(null);

  const quantidadePrevista =
    Number(aprovacao.quantidade_colaboradores) ||
    Number(contrato?.quantidade_colaboradores) ||
    0;

  const load = useCallback(async () => {
    setLoading(true);
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
        setContagem(empty);
        onContagemChange?.(empty);
        return;
      }

      const resumo = await carregarAgendamentosVigenciaContrato({
        contrato: contratoRow,
        quantidadeContratada: qtd,
      });
      setItens(resumo.itens);
      setSelectedIds(
        new Set(
          resumo.itens.filter((i) => i.selecionado).map((i) => i.agendamento.id)
        )
      );
      setContagem(resumo.contagem);
      onContagemChange?.(resumo.contagem);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao carregar agendamentos do contrato."
      );
    } finally {
      setLoading(false);
    }
  }, [aprovacao.quantidade_colaboradores, onContagemChange, orcamentoId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    const id = window.setInterval(() => void load(), 10000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(id);
    };
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
        toast.error("Agendamento cancelado não pode ser contabilizado no contrato.");
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
      await load();
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
              const disabled = !item.selecionavel && !selecionado;
              return (
                <tr key={ag.id}>
                  <td className="text-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-brand-blue"
                      checked={selecionado}
                      disabled={disabled || saving}
                      title={
                        ag.status === "cancelado"
                          ? "Agendamento cancelado não pode ser contabilizado no contrato."
                          : item.bloqueadoOutroContrato
                            ? `Já contabilizado em ${item.outroContratoNumero}`
                            : "Selecionar para o contrato"
                      }
                      onChange={() => toggleSelecao(item)}
                    />
                  </td>
                  <td className="font-semibold text-navy">{ag.colaborador}</td>
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
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving || loading || !contrato}
            onClick={() => void handleSalvar()}
          >
            {saving ? "Salvando..." : "Salvar agendamentos do contrato"}
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#e4ebf4] bg-white">
        <div className="overflow-x-auto">
          {loading ? (
            <p className="px-4 py-8 text-center text-sm text-app-muted">
              Carregando...
            </p>
          ) : null}
          {!loading && error ? (
            <p className="px-4 py-8 text-center text-sm text-brand-red">{error}</p>
          ) : null}
          {!loading && !error && itens.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-app-muted">
              Nenhum agendamento encontrado na vigência deste contrato.
            </p>
          ) : null}
          {!loading && !error && itens.length > 0 ? (
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
        onClose={() => {
          setViewAgendamento(null);
          void load();
        }}
      />
    </div>
  );
}
