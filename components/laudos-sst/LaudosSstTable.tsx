"use client";

import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import { ListagemMesAnoTabs } from "@/components/ui/ListagemMesAnoTabs";
import { Panel } from "@/components/ui/Panel";
import { IconEye, IconFileText } from "@/components/ui/icons/OutlineIcons";
import { formatCNPJ } from "@/lib/cnpj";
import { formatClienteNomeDisplay } from "@/lib/cliente-display";
import {
  LAUDOS_SST_ETAPA_LABELS,
  LAUDOS_SST_ETAPAS,
  LAUDOS_SST_MES_VAZIO_MSG,
  type LaudosSstProcesso,
} from "@/lib/laudos-sst";
import type { YearMonth } from "@/lib/listagem-meses";
import { formatResponsavelOrcamentoDisplay } from "@/lib/orcamento-responsavel";

interface LaudosSstTableProps {
  processos: LaudosSstProcesso[];
  loading: boolean;
  error: string | null;
  mesSelecionado: YearMonth;
  onMesChange: (mes: YearMonth) => void;
  onYearChange: (year: number) => void;
  onVisualizar: (processo: LaudosSstProcesso) => void;
}

function ProgressoLaudos({ processo }: { processo: LaudosSstProcesso }) {
  return (
    <div className="min-w-[140px]">
      <p className="mb-1 text-[11px] font-semibold text-navy">
        {processo.progressoLabel} etapas
      </p>
      <div className="flex items-center gap-0.5">
        {LAUDOS_SST_ETAPAS.map((etapa, index) => {
          const concluida = index < processo.etapasConcluidas;
          const atual =
            !concluida &&
            etapa.id === processo.etapaAtual &&
            processo.etapasConcluidas < processo.totalEtapas;
          const tone = concluida
            ? "bg-brand-green"
            : atual
              ? "bg-brand-blue"
              : "bg-[#e2e8f0]";
          return (
            <span
              key={etapa.id}
              title={etapa.label}
              className={`h-1.5 flex-1 rounded-full ${tone}`}
            />
          );
        })}
      </div>
    </div>
  );
}

export function LaudosSstTable({
  processos,
  loading,
  error,
  mesSelecionado,
  onMesChange,
  onYearChange,
  onVisualizar,
}: LaudosSstTableProps) {
  return (
    <Panel title="Processos de Laudos SST" icon={<IconFileText />} iconTone="blue">
      <ListagemMesAnoTabs
        selected={mesSelecionado}
        onSelect={onMesChange}
        onYearChange={onYearChange}
        ariaLabel="Filtrar Laudos SST pelo mês de entrada na etapa"
        monthTitlePrefix="Entradas em Laudos SST de"
      />

      <div className="table-wrap -mx-6 overflow-x-auto px-6">
        {loading && (
          <p className="py-8 text-center text-sm text-app-muted">Carregando...</p>
        )}
        {!loading && error && (
          <p className="py-8 text-center text-sm text-brand-red">{error}</p>
        )}
        {!loading && !error && processos.length === 0 && (
          <p className="py-8 text-center text-sm text-app-muted">
            {LAUDOS_SST_MES_VAZIO_MSG}
          </p>
        )}
        {!loading && !error && processos.length > 0 && (
          <table className="table-premium w-full min-w-[980px]">
            <thead>
              <tr>
                <th>Data de entrada</th>
                <th>Orçamento</th>
                <th>Cliente</th>
                <th>CNPJ</th>
                <th>Responsável</th>
                <th>Etapa atual</th>
                <th>Progresso</th>
                <th className="w-[88px] text-center">Visualizar</th>
                <th className="w-[88px] text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {processos.map((processo) => {
                const { orcamento } = processo.implantacao;
                const cnpj = orcamento.cliente_cnpj;
                const dataEntrada = processo.dataEntrada
                  ? formatDateIsoToBR(processo.dataEntrada.slice(0, 10))
                  : "—";

                return (
                  <tr key={orcamento.id}>
                    <td className="whitespace-nowrap">{dataEntrada}</td>
                    <td className="font-bold text-navy">{orcamento.numero}</td>
                    <td className="max-w-[240px] truncate">
                      {formatClienteNomeDisplay(orcamento.cliente_nome)}
                    </td>
                    <td className="whitespace-nowrap text-[12px]">
                      {cnpj
                        ? cnpj.replace(/\D/g, "").length === 14
                          ? formatCNPJ(cnpj)
                          : cnpj
                        : "—"}
                    </td>
                    <td>
                      {formatResponsavelOrcamentoDisplay(orcamento.responsavel)}
                    </td>
                    <td>
                      {processo.status === "concluido" ? (
                        <span className="inline-flex rounded-full bg-brand-green-soft px-2.5 py-0.5 text-[10px] font-extrabold text-brand-green">
                          Concluído
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-[#eef2ff] px-2.5 py-0.5 text-[10px] font-extrabold text-[#4338ca]">
                          {LAUDOS_SST_ETAPA_LABELS[processo.etapaAtual]}
                        </span>
                      )}
                    </td>
                    <td>
                      <ProgressoLaudos processo={processo} />
                    </td>
                    <td className="text-center">
                      <button
                        type="button"
                        onClick={() => onVisualizar(processo)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-[8px] border border-[#e2e8f0] bg-white text-[#64748b] transition hover:border-brand-blue/30 hover:bg-brand-blue-soft hover:text-brand-blue"
                        aria-label={`Visualizar laudos ${orcamento.numero}`}
                        title="Visualizar"
                      >
                        <IconEye size={14} />
                      </button>
                    </td>
                    <td className="text-center">
                      <span className="text-[11px] text-[#94a3b8]">—</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </Panel>
  );
}
