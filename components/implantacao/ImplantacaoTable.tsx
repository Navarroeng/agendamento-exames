"use client";

import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import { Panel } from "@/components/ui/Panel";
import { IconChecklist, IconEye } from "@/components/ui/icons/OutlineIcons";
import {
  IMPLANTACAO_AGENDAMENTO_BADGE,
  IMPLANTACAO_ETAPA_BADGE,
  IMPLANTACAO_ETAPA_LABELS,
  IMPLANTACAO_ETAPAS_OPERACIONAIS,
  resolveImplantacaoEtapaVisual,
  type ImplantacaoProcesso,
} from "@/lib/implantacao-clientes";
import { formatCNPJ } from "@/lib/cnpj";

interface ImplantacaoTableProps {
  processos: ImplantacaoProcesso[];
  loading: boolean;
  error: string | null;
  onVisualizar: (orcamentoId: string) => void;
  onContinuar: (orcamentoId: string) => void;
}

function ProgressoEtapas({ processo }: { processo: ImplantacaoProcesso }) {
  return (
    <div className="min-w-[140px]">
      <p className="mb-1 text-[11px] font-semibold text-navy">
        {processo.progressoLabel} etapas
      </p>
      <div className="flex items-center gap-0.5">
        {IMPLANTACAO_ETAPAS_OPERACIONAIS.map((etapa) => {
          const estado = resolveImplantacaoEtapaVisual(
            etapa.id,
            processo.etapaAtual,
            processo.aprovacao
          );
          const tone =
            estado === "concluida"
              ? "bg-brand-green"
              : estado === "atual"
                ? "bg-brand-blue"
                : "bg-[#e2e8f0]";
          return (
            <span
              key={etapa.id}
              title={`${etapa.label}: ${estado}`}
              className={`h-1.5 flex-1 rounded-full ${tone}`}
            />
          );
        })}
      </div>
    </div>
  );
}

export function ImplantacaoTable({
  processos,
  loading,
  error,
  onVisualizar,
  onContinuar,
}: ImplantacaoTableProps) {
  return (
    <Panel
      title="Processos de implantação"
      icon={<IconChecklist />}
      iconTone="blue"
    >
      <div className="table-wrap -mx-6 overflow-x-auto px-6">
        {loading && (
          <p className="py-8 text-center text-sm text-app-muted">Carregando...</p>
        )}
        {!loading && error && (
          <p className="py-8 text-center text-sm text-brand-red">{error}</p>
        )}
        {!loading && !error && processos.length === 0 && (
          <p className="py-8 text-center text-sm text-app-muted">
            Nenhum processo de implantação encontrado.
          </p>
        )}
        {!loading && !error && processos.length > 0 && (
          <table className="table-premium w-full min-w-[1180px]">
            <thead>
              <tr>
                <th>Orçamento</th>
                <th>Contrato</th>
                <th>Cliente</th>
                <th>CNPJ</th>
                <th>Data da aprovação</th>
                <th>Responsável</th>
                <th>Etapa atual</th>
                <th>Progresso</th>
                <th>Agendamento</th>
                <th className="w-[88px] text-center">Visualizar</th>
                <th className="w-[120px] text-center">Ação</th>
              </tr>
            </thead>
            <tbody>
              {processos.map((processo) => {
                const etapaBadge = IMPLANTACAO_ETAPA_BADGE[processo.etapaAtual];
                const agendamentoBadge =
                  IMPLANTACAO_AGENDAMENTO_BADGE[processo.agendamentoLabel];
                const cnpj = processo.orcamento.cliente_cnpj;
                const dataAprovacao = processo.dataAprovacao
                  ? formatDateIsoToBR(processo.dataAprovacao.slice(0, 10))
                  : "—";

                return (
                  <tr key={processo.orcamento.id}>
                    <td className="font-bold text-navy">
                      {processo.orcamento.numero}
                    </td>
                    <td className="font-medium text-[#334155]">
                      {processo.numeroContrato || "—"}
                    </td>
                    <td className="max-w-[200px] truncate">
                      {processo.orcamento.cliente_nome}
                    </td>
                    <td className="whitespace-nowrap text-[12px]">
                      {cnpj
                        ? cnpj.replace(/\D/g, "").length === 14
                          ? formatCNPJ(cnpj)
                          : cnpj
                        : "—"}
                    </td>
                    <td>{dataAprovacao}</td>
                    <td>{processo.orcamento.responsavel}</td>
                    <td>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${etapaBadge.className}`}
                      >
                        {IMPLANTACAO_ETAPA_LABELS[processo.etapaAtual]}
                      </span>
                    </td>
                    <td>
                      <ProgressoEtapas processo={processo} />
                    </td>
                    <td>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${agendamentoBadge.className}`}
                      >
                        {processo.agendamentoLabel}
                      </span>
                    </td>
                    <td className="text-center">
                      <button
                        type="button"
                        onClick={() => onVisualizar(processo.orcamento.id)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-[8px] border border-[#e2e8f0] bg-white text-[#64748b] transition hover:border-brand-blue/30 hover:bg-brand-blue-soft hover:text-brand-blue"
                        aria-label={`Visualizar ${processo.orcamento.numero}`}
                        title="Visualizar"
                      >
                        <IconEye size={14} />
                      </button>
                    </td>
                    <td className="text-center">
                      {processo.etapaAtual !== "concluido" &&
                      processo.orcamento.status !== "cancelado" ? (
                        <button
                          type="button"
                          onClick={() => onContinuar(processo.orcamento.id)}
                          className="rounded-[8px] border border-brand-blue/20 bg-brand-blue-soft px-2 py-1 text-[10px] font-bold text-brand-blue transition hover:bg-brand-blue hover:text-white"
                        >
                          Continuar
                        </button>
                      ) : (
                        <span className="text-[11px] text-[#94a3b8]">—</span>
                      )}
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
