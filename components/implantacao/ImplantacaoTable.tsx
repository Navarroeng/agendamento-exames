"use client";

import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import { Panel } from "@/components/ui/Panel";
import { IconChecklist, IconEye } from "@/components/ui/icons/OutlineIcons";
import { formatCNPJ } from "@/lib/cnpj";
import { formatClienteNomeDisplay } from "@/lib/cliente-display";
import {
  IMPLANTACAO_AGENDAMENTO_BADGE,
  resolveImplantacaoEtapaVisual,
  type ImplantacaoProcesso,
} from "@/lib/implantacao-clientes";
import {
  IMPLANTACAO_MES_VAZIO_MSG,
  type ImplantacaoYearMonth,
} from "@/lib/implantacao-meses";
import { EtapaAtualBadge } from "@/components/implantacao/EtapaAtualBadge";
import { ImplantacaoMesTabs } from "@/components/implantacao/ImplantacaoMesTabs";
import { formatResponsavelOrcamentoDisplay } from "@/lib/orcamento-responsavel";

interface ImplantacaoTableProps {
  processos: ImplantacaoProcesso[];
  loading: boolean;
  error: string | null;
  mesSelecionado: ImplantacaoYearMonth;
  onMesChange: (mes: ImplantacaoYearMonth) => void;
  onYearChange: (year: number) => void;
  onVisualizar: (orcamentoId: string) => void;
  onContinuar: (orcamentoId: string) => void;
}

const AGENDAMENTO_BADGE_BASE =
  "inline-flex h-6 min-w-[5.5rem] items-center justify-center rounded-full px-2.5 text-[10px] font-extrabold leading-none whitespace-nowrap";

function ProgressoEtapas({ processo }: { processo: ImplantacaoProcesso }) {
  return (
    <div className="min-w-[140px]">
      <p className="mb-1 text-[11px] font-semibold text-navy">
        {processo.progressoLabel} etapas
      </p>
      <div className="flex items-center gap-0.5">
        {processo.etapasOperacionais.map((etapa) => {
          const estado = resolveImplantacaoEtapaVisual(
            etapa.id,
            processo.etapaAtual,
            processo.aprovacao,
            {
              quantidadeContratada: processo.quantidadeContratada,
              agendamentosRealizados: processo.agendamentosRealizados,
              agendamentosDispensados: processo.agendamentosIniciaisDispensados,
              treinamento: processo.treinamento,
            }
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
  mesSelecionado,
  onMesChange,
  onYearChange,
  onVisualizar,
  onContinuar,
}: ImplantacaoTableProps) {
  return (
    <Panel
      title="Processos de implantação"
      icon={<IconChecklist />}
      iconTone="blue"
    >
      <ImplantacaoMesTabs
        selected={mesSelecionado}
        onSelect={onMesChange}
        onYearChange={onYearChange}
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
            {IMPLANTACAO_MES_VAZIO_MSG}
          </p>
        )}
        {!loading && !error && processos.length > 0 && (
          <table className="table-premium w-full min-w-[1080px]">
            <thead>
              <tr>
                <th>Data da aprovação</th>
                <th>Orçamento</th>
                <th>Cliente</th>
                <th>CNPJ</th>
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
                const agendamentoBadge =
                  IMPLANTACAO_AGENDAMENTO_BADGE[processo.agendamentoLabel];
                const cnpj = processo.orcamento.cliente_cnpj;
                const dataAprovacao = processo.dataAprovacao
                  ? formatDateIsoToBR(processo.dataAprovacao.slice(0, 10))
                  : "—";

                return (
                  <tr key={processo.orcamento.id}>
                    <td className="whitespace-nowrap">{dataAprovacao}</td>
                    <td className="font-bold text-navy">
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                        <span>{processo.orcamento.numero}</span>
                        {processo.orcamento.origem_cliente === "renovacao" && (
                          <span
                            className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border border-[#c2410c] bg-[#ffedd5] text-[11px] font-extrabold leading-none text-[#c2410c]"
                            title="Cliente em renovação de contrato"
                            aria-label="Cliente em renovação de contrato"
                          >
                            R
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="max-w-[200px] truncate">
                      {formatClienteNomeDisplay(processo.orcamento.cliente_nome)}
                    </td>
                    <td className="whitespace-nowrap text-[12px]">
                      {cnpj
                        ? cnpj.replace(/\D/g, "").length === 14
                          ? formatCNPJ(cnpj)
                          : cnpj
                        : "—"}
                    </td>
                    <td>
                      {formatResponsavelOrcamentoDisplay(
                        processo.orcamento.responsavel
                      )}
                    </td>
                    <td>
                      <EtapaAtualBadge
                        etapa={processo.etapaAtual}
                        alertaExamesFuturos={
                          processo.concluidoComExamesFuturos
                        }
                        observacao={
                          processo.agendamentosIniciaisDispensados &&
                          processo.etapaAtual === "concluido"
                            ? "Agendamentos iniciais dispensados"
                            : null
                        }
                      />
                    </td>
                    <td>
                      <ProgressoEtapas processo={processo} />
                    </td>
                    <td>
                      <span
                        className={`${AGENDAMENTO_BADGE_BASE} ${agendamentoBadge.className}`}
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
                      processo.etapaAtual !== "treinamento_agendado" &&
                      processo.etapaAtual !== "contrato_encerrado" &&
                      processo.etapaAtual !== "treinamento_cancelado" &&
                      processo.orcamento.status !== "cancelado" &&
                      processo.orcamento.status !== "contrato_encerrado" ? (
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
