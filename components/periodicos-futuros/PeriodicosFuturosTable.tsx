import {
  PERIODICO_MES_VAZIO_MSG,
  periodicoDisplayStatusClass,
  periodicoDisplayStatusLabel,
} from "@/lib/periodicos-futuro";
import {
  labelMotivoExameFuturo,
  labelOrigemPeriodico,
} from "@/lib/contrato-programacao-futura";
import { formatCPF } from "@/lib/cpf";
import { formatDateBR } from "@/lib/format";
import type { PeriodicoFuturoRow } from "@/lib/types";
import { ListagemMesAnoTabs } from "@/components/ui/ListagemMesAnoTabs";
import type { YearMonth } from "@/lib/listagem-meses";
import { PeriodicoRowActionsMenu } from "./PeriodicoRowActionsMenu";

interface PeriodicosFuturosTableProps {
  records: PeriodicoFuturoRow[];
  loading: boolean;
  error: string | null;
  saving: boolean;
  mesSelecionado: YearMonth;
  anosDisponiveis: number[];
  onMesChange: (mes: YearMonth) => void;
  onYearChange: (year: number) => void;
  canActOnRecord: (record: PeriodicoFuturoRow) => boolean;
  onCriarAgendamento: (record: PeriodicoFuturoRow) => void;
  onEditarProximaData: (record: PeriodicoFuturoRow) => void;
  onMarcarReagendado: (id: string) => void;
  onCancelarAcompanhamento: (id: string) => void;
  onVisualizarAgendamento?: (agendamentoId: string) => void;
}

export function PeriodicosFuturosTable({
  records,
  loading,
  error,
  saving,
  mesSelecionado,
  anosDisponiveis,
  onMesChange,
  onYearChange,
  canActOnRecord,
  onCriarAgendamento,
  onEditarProximaData,
  onMarcarReagendado,
  onCancelarAcompanhamento,
  onVisualizarAgendamento,
}: PeriodicosFuturosTableProps) {
  return (
    <div className="space-y-3">
      <ListagemMesAnoTabs
        selected={mesSelecionado}
        onSelect={onMesChange}
        onYearChange={onYearChange}
        years={anosDisponiveis}
        disableFutureMonths={false}
        ariaLabel="Filtrar periódicos pela próxima data"
        monthTitlePrefix="Periódicos com próxima data em"
      />

      {loading ? (
        <p className="py-10 text-center text-sm text-app-muted">
          Carregando periódicos futuros...
        </p>
      ) : error ? (
        <p className="py-10 text-center text-sm text-brand-red">{error}</p>
      ) : records.length === 0 ? (
        <p className="py-10 text-center text-sm text-app-muted">
          {PERIODICO_MES_VAZIO_MSG}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#e8edf5] bg-white">
          <table className="w-full min-w-[1180px] text-left text-xs">
            <thead>
              <tr className="border-b border-[#eef2f7] bg-[#f8fafc] text-[10px] font-bold uppercase tracking-wide text-[#64748b]">
                <th className="px-3 py-2.5">Empresa</th>
                <th className="px-3 py-2.5">Colaborador</th>
                <th className="px-3 py-2.5">CPF</th>
                <th className="px-3 py-2.5">Cargo</th>
                <th className="px-3 py-2.5">Exame / ASO</th>
                <th className="px-3 py-2.5">Realizado em</th>
                <th className="px-3 py-2.5">Próxima data</th>
                <th className="px-3 py-2.5">Origem</th>
                <th className="px-3 py-2.5">Motivo</th>
                <th className="px-3 py-2.5">Observações</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="w-[72px] px-3 py-2.5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const actionable = canActOnRecord(record);
                const dataOriginal =
                  record.data_prevista_original?.slice(0, 10) || null;
                const dataAtual = record.proxima_data?.slice(0, 10) || null;
                const mostrouOriginal =
                  Boolean(dataOriginal) &&
                  dataOriginal !== dataAtual &&
                  (record.status === "reagendado" || Boolean(record.antecipado));
                return (
                  <tr
                    key={record.id}
                    className="border-b border-[#f1f5f9] last:border-0 hover:bg-[#fafbfc]"
                  >
                    <td className="px-3 py-2.5 font-medium text-navy">
                      {record.cliente_nome}
                    </td>
                    <td className="px-3 py-2.5">{record.colaborador}</td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {formatCPF(record.colaborador_cpf)}
                    </td>
                    <td className="px-3 py-2.5">{record.cargo_nome ?? "—"}</td>
                    <td className="px-3 py-2.5">
                      {record.tipo_aso || record.exame_nome}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {record.dataRealizadaBR}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums font-bold">
                      <div>{record.proximaDataBR}</div>
                      {mostrouOriginal && dataOriginal ? (
                        <div className="mt-0.5 text-[10px] font-medium text-[#64748b]">
                          Previsto: {formatDateBR(dataOriginal)}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5">
                      {labelOrigemPeriodico(record.origem)}
                    </td>
                    <td className="max-w-[160px] px-3 py-2.5">
                      <span
                        className="line-clamp-2"
                        title={labelMotivoExameFuturo(
                          record.motivo,
                          record.motivo_detalhe
                        )}
                      >
                        {labelMotivoExameFuturo(
                          record.motivo,
                          record.motivo_detalhe
                        )}
                      </span>
                    </td>
                    <td className="max-w-[160px] px-3 py-2.5 text-[#64748b]">
                      <span
                        className="line-clamp-2"
                        title={record.observacoes ?? undefined}
                      >
                        {record.observacoes?.trim() || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`font-bold ${periodicoDisplayStatusClass(record.displayStatus)}`}
                        >
                          {record.status === "reagendado"
                            ? "Agendamento criado"
                            : periodicoDisplayStatusLabel(record.displayStatus)}
                        </span>
                        {record.antecipado ? (
                          <span className="w-fit rounded bg-[#fef3c7] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#92400e]">
                            Antecipado
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <PeriodicoRowActionsMenu
                        record={record}
                        canAct={actionable}
                        disabled={saving}
                        onCriarAgendamento={onCriarAgendamento}
                        onVisualizarAgendamento={onVisualizarAgendamento}
                        onEditarProximaData={onEditarProximaData}
                        onReagendar={onMarcarReagendado}
                        onCancelar={onCancelarAcompanhamento}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
