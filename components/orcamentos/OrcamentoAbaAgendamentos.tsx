"use client";

import { useCallback, useEffect, useState } from "react";
import { AgendamentoViewModal } from "@/components/modals/AgendamentoViewModal";
import { IconEye } from "@/components/ui/icons/OutlineIcons";
import { formatDateIsoToBR, formatHorarioForForm } from "@/lib/agendamento-datetime";
import { statusAgendamentoLabel } from "@/lib/agendamentos-table";
import {
  agendamentoConsomeSaldoContrato,
  buildContratoAgendamentoContagem,
  type ContratoAgendamentoContagem,
} from "@/lib/contrato-agendamentos";
import type { OrcamentoAprovacaoRecord } from "@/lib/orcamento-aprovacao";
import type { AgendamentoWithExames, ClienteContratoRecord } from "@/lib/types";
import {
  buscarContratoPorOrcamentoId,
  carregarResumoAgendamentosContrato,
} from "@/services/contrato-agendamentos.service";

interface OrcamentoAbaAgendamentosProps {
  orcamentoId: string;
  aprovacao: OrcamentoAprovacaoRecord;
  /** Chamado quando a contagem muda (para atualizar nav / implantação). */
  onContagemChange?: (contagem: ContratoAgendamentoContagem) => void;
}

function Card({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-[#e4ebf4] bg-white px-3.5 py-3 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
        {label}
      </p>
      <p className="mt-1 text-xl font-extrabold tabular-nums text-navy">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-[11px] font-medium text-[#64748b]">{hint}</p>
      ) : null}
    </div>
  );
}

export function OrcamentoAbaAgendamentos({
  orcamentoId,
  aprovacao,
  onContagemChange,
}: OrcamentoAbaAgendamentosProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contrato, setContrato] = useState<ClienteContratoRecord | null>(null);
  const [agendamentos, setAgendamentos] = useState<AgendamentoWithExames[]>(
    []
  );
  const [contagem, setContagem] = useState<ContratoAgendamentoContagem>(() =>
    buildContratoAgendamentoContagem(
      Number(aprovacao.quantidade_colaboradores) || 0,
      0
    )
  );
  const [viewAgendamento, setViewAgendamento] =
    useState<AgendamentoWithExames | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const contratoRow = await buscarContratoPorOrcamentoId(orcamentoId);
      setContrato(contratoRow);

      const quantidade =
        Number(aprovacao.quantidade_colaboradores) ||
        Number(contratoRow?.quantidade_colaboradores) ||
        0;

      if (!contratoRow) {
        const empty = buildContratoAgendamentoContagem(quantidade, 0);
        setAgendamentos([]);
        setContagem(empty);
        onContagemChange?.(empty);
        return;
      }

      const resumo = await carregarResumoAgendamentosContrato({
        contratoId: contratoRow.id,
        quantidadeContratada: quantidade,
      });
      setAgendamentos(resumo.agendamentos);
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
    const onFocus = () => {
      void load();
    };
    window.addEventListener("focus", onFocus);
    const id = window.setInterval(() => {
      void load();
    }, 8000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(id);
    };
  }, [load]);

  const quantidadeDisplay =
    Number(aprovacao.quantidade_colaboradores) ||
    Number(contrato?.quantidade_colaboradores) ||
    contagem.contratados;

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-[#e4ebf4] bg-white">
        <div className="border-b border-[#eef2f7] px-4 py-3">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-navy">
            Agendamentos do contrato
          </p>
          <p className="mt-0.5 text-xs text-[#64748b]">
            Quantidade prevista conforme condições aprovadas. Não é um limite
            técnico.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-5">
          <Card label="Previstos" value={String(quantidadeDisplay)} />
          <Card label="Utilizados" value={String(contagem.utilizados)} />
          <Card label="Disponíveis" value={String(contagem.disponiveis)} />
          <Card label="Adicionais" value={String(contagem.adicionais)} />
          <Card label="Progresso" value={`${contagem.percentual}%`} />
        </div>

        <div className="border-t border-[#eef2f7] px-4 py-3">
          <p className="text-sm font-semibold text-navy">{contagem.mensagem}</p>
          {contrato?.numero ? (
            <p className="mt-1 text-xs text-[#64748b]">
              Contrato: {contrato.numero}
              {contrato.numero_orcamento
                ? ` · Orçamento: ${contrato.numero_orcamento}`
                : ""}
            </p>
          ) : (
            <p className="mt-1 text-xs text-[#b45309]">
              Contrato ainda não vinculado a este orçamento. Os agendamentos
              só serão contabilizados após o vínculo explícito com o contrato.
            </p>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#e4ebf4] bg-white">
        <div className="border-b border-[#eef2f7] px-4 py-3">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-navy">
            Lista de agendamentos
          </p>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <p className="px-4 py-8 text-center text-sm text-app-muted">
              Carregando...
            </p>
          ) : null}
          {!loading && error ? (
            <p className="px-4 py-8 text-center text-sm text-brand-red">{error}</p>
          ) : null}
          {!loading && !error && agendamentos.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-app-muted">
              Nenhum agendamento vinculado a este contrato.
            </p>
          ) : null}
          {!loading && !error && agendamentos.length > 0 ? (
            <>
              {(["consumidores", "adicionais"] as const).map((grupo) => {
                const rows = agendamentos.filter((ag) => {
                  const consome = agendamentoConsomeSaldoContrato(ag);
                  return grupo === "consumidores" ? consome : !consome;
                });
                if (rows.length === 0) return null;
                return (
                  <div key={grupo}>
                    <div className="border-b border-[#eef2f7] bg-[#f8fafc] px-4 py-2">
                      <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#64748b]">
                        {grupo === "consumidores"
                          ? "Contabilizados na implantação"
                          : "Adicionais"}
                      </p>
                    </div>
                    <table className="table-premium w-full min-w-[720px]">
                      <thead>
                        <tr>
                          <th>Colaborador</th>
                          <th>Data do exame</th>
                          <th>Horário</th>
                          <th>Tipo de ASO</th>
                          <th>Clínica</th>
                          <th>Status</th>
                          <th className="w-[72px] text-center">Visualizar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((ag) => (
                          <tr key={ag.id}>
                            <td className="font-semibold text-navy">
                              {ag.colaborador}
                            </td>
                            <td>{formatDateIsoToBR(ag.data_agendamento)}</td>
                            <td>{formatHorarioForForm(ag.horario) || "—"}</td>
                            <td>{ag.aso || "—"}</td>
                            <td>{ag.clinica_nome || "—"}</td>
                            <td>{statusAgendamentoLabel(ag.status)}</td>
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
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
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
