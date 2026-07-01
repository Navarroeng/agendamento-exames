"use client";

import { AgendamentosPagination } from "@/components/agendamentos/AgendamentosPagination";
import { PanelIcon } from "@/components/ui/IconBox";
import { IconEsocial } from "@/components/ui/icons/OutlineIcons";
import { formatDateBR } from "@/lib/format";
import {
  ESOCIAL_PAGE_SIZE,
  getESocialVisualStatus,
  isEnvioEsocialConcluido,
  type ESocialVisualStatus,
} from "@/lib/esocial-filters";
import { formatEsocialReciboForDisplay } from "@/lib/esocial-recibo";
import type { AgendamentoFaturaBloqueio } from "@/lib/agendamento-fatura-bloqueio";
import type { AgendamentoWithExames } from "@/lib/types";
import { ESocialRowActionsMenu } from "./ESocialRowActionsMenu";

const TH =
  "border-b border-[#e2e8f0] bg-gradient-to-b from-[#f8fafc] to-[#f1f5f9] px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-[#64748b] whitespace-nowrap";
const TD =
  "border-b border-[#eef2f7]/80 px-2.5 py-2 text-xs text-[#334155] align-middle";

function EsocialStatusBadge({ status }: { status: ESocialVisualStatus }) {
  if (status === "enviado") {
    return (
      <span className="inline-block rounded-md bg-brand-green-soft px-2 py-0.5 text-[10px] font-bold text-brand-green">
        Enviado
      </span>
    );
  }
  if (status === "urgente") {
    return (
      <span className="inline-block rounded-md bg-[#fef2f2] px-2 py-0.5 text-[10px] font-bold text-brand-red ring-1 ring-[#fecaca]">
        Enviar urgente
      </span>
    );
  }
  return (
    <span className="inline-block rounded-md bg-brand-orange-soft px-2 py-0.5 text-[10px] font-bold text-[#c96d00]">
      Pendente
    </span>
  );
}

interface ESocialTableProps {
  agendamentos: AgendamentoWithExames[];
  totalFiltrados: number;
  loading: boolean;
  error: string | null;
  saving: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onVisualizar: (id: string) => void;
  onMarcarEnviado: (id: string) => void;
  onMarcarPendente: (id: string) => void;
  bloqueioPorAgendamento?: Map<string, AgendamentoFaturaBloqueio>;
}

export function ESocialTable({
  agendamentos,
  totalFiltrados,
  loading,
  error,
  saving,
  page,
  totalPages,
  onPageChange,
  onVisualizar,
  onMarcarEnviado,
  onMarcarPendente,
  bloqueioPorAgendamento,
}: ESocialTableProps) {
  return (
    <section className="panel-card mb-4 scroll-mt-6">
      <div className="flex items-center justify-between border-b border-[#eef2f7]/80 bg-gradient-to-b from-white to-[#fafbff] px-5 py-3.5">
        <div className="flex items-center gap-2.5 text-[15px] font-semibold tracking-[-0.2px] text-navy">
          <PanelIcon tone="blue">
            <IconEsocial />
          </PanelIcon>
          Controle de envio ao e-Social
        </div>
      </div>

      <div className="p-5">
        {loading && (
          <p className="py-6 text-center text-sm text-app-muted">
            Carregando agendamentos...
          </p>
        )}

        {!loading && error && (
          <p className="py-6 text-center text-sm text-brand-red">{error}</p>
        )}

        {!loading && !error && totalFiltrados === 0 && (
          <p className="py-6 text-center text-sm text-app-muted">
            Nenhum ASO pendente de ação com os filtros aplicados.
          </p>
        )}

        {!loading && !error && agendamentos.length > 0 && (
          <>
            <div className="w-full overflow-x-auto [overflow-y:visible]">
              <table className="w-full min-w-[860px] border-collapse">
                <thead>
                  <tr>
                    {[
                      "Data do exame",
                      "Empresa / Cliente",
                      "Colaborador",
                      "Tipo de ASO",
                      "Status e-Social",
                      "Data envio e-Social",
                      "Nº Recibo",
                      "Ações",
                    ].map((h) => (
                      <th key={h} className={TH}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {agendamentos.map((ag) => {
                    const visualStatus = getESocialVisualStatus(ag);
                    const isUrgente = visualStatus === "urgente";

                    return (
                      <tr
                        key={ag.id}
                        className={`transition-colors hover:bg-[#f0f4ff]/40 ${
                          isUrgente ? "bg-[#fff5f5]/60" : ""
                        }`}
                      >
                        <td className={`${TD} whitespace-nowrap`}>
                          {formatDateBR(ag.data_agendamento)}
                          {ag.horario ? (
                            <span className="ml-1 text-[10px] text-[#94a3b8]">
                              {ag.horario}
                            </span>
                          ) : null}
                        </td>
                        <td
                          className={`${TD} max-w-[140px] truncate`}
                          title={ag.cliente_nome}
                        >
                          {ag.cliente_nome}
                        </td>
                        <td
                          className={`${TD} max-w-[120px] truncate`}
                          title={ag.colaborador}
                        >
                          {ag.colaborador}
                        </td>
                        <td className={TD}>{ag.aso}</td>
                        <td className={TD}>
                          <EsocialStatusBadge status={visualStatus} />
                        </td>
                        <td className={`${TD} whitespace-nowrap`}>
                          {isEnvioEsocialConcluido(ag.envio_esocial) &&
                          ag.data_envio_esocial
                            ? formatDateBR(ag.data_envio_esocial)
                            : "—"}
                        </td>
                        <td
                          className={`${TD} max-w-[200px] truncate font-mono text-[11px]`}
                          title={
                            formatEsocialReciboForDisplay(ag.esocial_recibo) ||
                            undefined
                          }
                        >
                          {formatEsocialReciboForDisplay(ag.esocial_recibo) ||
                            "—"}
                        </td>
                        <td className={TD}>
                          <ESocialRowActionsMenu
                            agendamento={ag}
                            bloqueadoPorFatura={
                              bloqueioPorAgendamento?.get(ag.id)?.bloqueado ??
                              false
                            }
                            disabled={saving}
                            onVisualizar={onVisualizar}
                            onMarcarEnviado={onMarcarEnviado}
                            onMarcarPendente={onMarcarPendente}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <AgendamentosPagination
              page={page}
              totalPages={totalPages}
              totalItems={totalFiltrados}
              pageSize={ESOCIAL_PAGE_SIZE}
              onPageChange={onPageChange}
            />
          </>
        )}
      </div>
    </section>
  );
}
