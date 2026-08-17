"use client";

import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import { ListagemMesAnoTabs } from "@/components/ui/ListagemMesAnoTabs";
import { Panel } from "@/components/ui/Panel";
import { IconShield } from "@/components/ui/icons/OutlineIcons";
import { formatCNPJ } from "@/lib/cnpj";
import { formatClienteNomeDisplay } from "@/lib/cliente-display";
import {
  getEtapasRiscosPorOrigem,
  RISCOS_PSICOSSOCIAIS_ETAPA_LABELS,
  RISCOS_PSICOSSOCIAIS_MES_VAZIO_MSG,
  type RiscosPsicossociaisListagemStatus,
  type RiscosPsicossociaisProcesso,
} from "@/lib/riscos-psicossociais";
import { isOrigemManualCliente } from "@/lib/riscos-campanha-origem";
import type { YearMonth } from "@/lib/listagem-meses";
import { RiscosProcessoRowActionsMenu } from "@/components/riscos-psicossociais/RiscosProcessoRowActionsMenu";

interface RiscosPsicossociaisTableProps {
  processos: RiscosPsicossociaisProcesso[];
  loading: boolean;
  error: string | null;
  mesSelecionado: YearMonth;
  onMesChange: (mes: YearMonth) => void;
  onYearChange: (year: number) => void;
  statusListagem: RiscosPsicossociaisListagemStatus;
  onStatusListagemChange: (status: RiscosPsicossociaisListagemStatus) => void;
  onVisualizar: (processo: RiscosPsicossociaisProcesso) => void;
  onVisualizarRelatorio: (processo: RiscosPsicossociaisProcesso) => void;
  /** Admin only — remoção definitiva. */
  podeRemoverProcesso?: boolean;
  onRemoverProcesso?: (processo: RiscosPsicossociaisProcesso) => void;
  savingRemover?: boolean;
}

function ProgressoRiscos({
  processo,
}: {
  processo: RiscosPsicossociaisProcesso;
}) {
  const etapas = getEtapasRiscosPorOrigem(processo.origem);
  return (
    <div className="min-w-[180px]">
      <p className="mb-1 text-[11px] font-semibold text-navy">
        {processo.progressoLabel} etapas · {processo.progressoPercentual}%
      </p>
      <div className="flex items-center gap-0.5">
        {etapas.map((etapa, index) => {
          const concluida = index < processo.etapasConcluidas;
          const atual =
            !concluida &&
            etapa.id === processo.etapaAtual &&
            processo.etapasConcluidas < processo.totalEtapas;
          const automatica = etapa.id === "laudos_sst";
          const tone = concluida
            ? automatica
              ? "bg-[#0f766e]"
              : "bg-brand-green"
            : atual
              ? automatica
                ? "bg-[#14b8a6]"
                : "bg-brand-blue"
              : "bg-[#e2e8f0]";
          return (
            <span
              key={etapa.id}
              title={
                automatica
                  ? `${etapa.label} (automática)`
                  : etapa.label
              }
              className={`h-1.5 flex-1 rounded-full ${tone}`}
            />
          );
        })}
      </div>
    </div>
  );
}

export function RiscosPsicossociaisTable({
  processos,
  loading,
  error,
  mesSelecionado,
  onMesChange,
  onYearChange,
  statusListagem,
  onStatusListagemChange,
  onVisualizar,
  onVisualizarRelatorio,
  podeRemoverProcesso = false,
  onRemoverProcesso,
  savingRemover = false,
}: RiscosPsicossociaisTableProps) {
  return (
    <Panel
      title="Processos de Riscos Psicossociais"
      icon={<IconShield />}
      iconTone="blue"
    >
      <ListagemMesAnoTabs
        selected={mesSelecionado}
        onSelect={onMesChange}
        onYearChange={onYearChange}
        ariaLabel="Filtrar Riscos Psicossociais pelo mês de entrada na etapa"
        monthTitlePrefix="Entradas em Riscos Psicossociais de"
        yearRowExtra={
          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor="riscos-listagem-status"
              className="text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]"
            >
              Status
            </label>
            <select
              id="riscos-listagem-status"
              className="field-input field-input-compact w-[110px] text-sm"
              value={statusListagem}
              onChange={(e) =>
                onStatusListagemChange(
                  e.target.value as RiscosPsicossociaisListagemStatus
                )
              }
              aria-label="Filtrar por status"
            >
              <option value="aberto">Aberto</option>
              <option value="concluido">Concluído</option>
            </select>
          </div>
        }
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
            {RISCOS_PSICOSSOCIAIS_MES_VAZIO_MSG}
          </p>
        )}
        {!loading && !error && processos.length > 0 && (
          <table className="table-premium w-full min-w-[860px]">
            <thead>
              <tr>
                <th>Data de entrada</th>
                <th>Cliente</th>
                <th>CNPJ</th>
                <th>Etapa atual</th>
                <th>Progresso</th>
                <th className="w-[72px] text-center">Ações</th>
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
                  <tr key={processo.processoKey}>
                    <td className="whitespace-nowrap">{dataEntrada}</td>
                    <td className="max-w-[300px] truncate font-semibold text-navy">
                      {formatClienteNomeDisplay(orcamento.cliente_nome)}
                      {isOrigemManualCliente(processo.origem) ? (
                        <span className="mt-0.5 block text-[10px] font-semibold text-[#64748b]">
                          Inclusão manual
                        </span>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap text-[12px]">
                      {cnpj
                        ? cnpj.replace(/\D/g, "").length === 14
                          ? formatCNPJ(cnpj)
                          : cnpj
                        : "—"}
                    </td>
                    <td className="whitespace-nowrap">
                      {processo.status === "concluido" ||
                      processo.etapaAtual === "finalizado" ? (
                        <span className="inline-flex rounded-full bg-brand-green-soft px-2.5 py-0.5 text-[10px] font-extrabold text-brand-green">
                          {RISCOS_PSICOSSOCIAIS_ETAPA_LABELS.finalizado}
                        </span>
                      ) : (
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                            processo.etapaAtual === "laudos_sst"
                              ? "bg-[#fef3c7] text-[#b45309]"
                              : "bg-[#eef2ff] text-[#4338ca]"
                          }`}
                        >
                          {RISCOS_PSICOSSOCIAIS_ETAPA_LABELS[processo.etapaAtual]}
                        </span>
                      )}
                    </td>
                    <td>
                      <ProgressoRiscos processo={processo} />
                    </td>
                    <td className="text-center">
                      <RiscosProcessoRowActionsMenu
                        processo={processo}
                        isAdmin={podeRemoverProcesso}
                        savingRemover={savingRemover}
                        onAbrir={onVisualizar}
                        onVisualizarRelatorio={onVisualizarRelatorio}
                        onRemoverProcesso={onRemoverProcesso}
                      />
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
