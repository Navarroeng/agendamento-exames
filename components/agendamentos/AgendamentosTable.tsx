import { Panel } from "@/components/ui/Panel";
import { IconClipboard } from "@/components/ui/icons/OutlineIcons";
import { RowActionsMenu } from "./RowActionsMenu";
import type { AgendamentoTableRow } from "@/lib/types";

const TH =
  "border-b border-[#e2e8f0] bg-gradient-to-b from-[#f8fafc] to-[#f1f5f9] px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.06em] text-[#64748b] whitespace-nowrap";
const TH_C = `${TH} text-center`;
const TD =
  "border-b border-[#eef2f7]/80 px-2 py-1.5 text-xs text-[#334155] align-middle";
const TD_C = `${TD} text-center`;

function StatusBadge({
  type,
  label,
}: {
  type: AgendamentoTableRow["statusType"];
  label: string;
}) {
  const classes = {
    draft: "bg-brand-purple-soft text-brand-purple",
    active: "bg-brand-green-soft text-brand-green",
    cancelled: "bg-brand-red-soft text-brand-red",
    pending: "bg-brand-orange-soft text-[#c96d00]",
  };

  return (
    <span
      className={`inline-block rounded-md px-1.5 py-px text-[9px] font-semibold leading-tight ${classes[type]}`}
    >
      {label}
    </span>
  );
}

function SimNaoBadge({ value }: { value: boolean }) {
  return value ? (
    <span className="inline-block rounded px-1.5 py-px text-[9px] font-bold leading-tight bg-brand-green-soft text-brand-green">
      Sim
    </span>
  ) : (
    <span className="inline-block rounded px-1.5 py-px text-[9px] font-bold leading-tight bg-brand-red-soft text-brand-red">
      Não
    </span>
  );
}

interface AgendamentosTableProps {
  rows: AgendamentoTableRow[];
  loading: boolean;
  error: string | null;
  paginationSlot?: React.ReactNode;
  onVisualizar: (agendamentoId: string) => void;
  onEditar: (agendamentoId: string) => void;
  onCancelar: (agendamentoId: string) => void;
  onHistorico: (agendamentoId: string) => void;
}

const HEADERS: { label: string; center?: boolean }[] = [
  { label: "Data agendada" },
  { label: "Cliente" },
  { label: "Colaborador" },
  { label: "ASO" },
  { label: "Exames" },
  { label: "Total Cliente" },
  { label: "Status" },
  { label: "ASO Clínica", center: true },
  { label: "ASO Assinado", center: true },
  { label: "ASO Cliente", center: true },
  { label: "Matrícula", center: true },
  { label: "e-Social", center: true },
  { label: "Ações", center: true },
];

export function AgendamentosTable({
  rows,
  loading,
  error,
  paginationSlot,
  onVisualizar,
  onEditar,
  onCancelar,
  onHistorico,
}: AgendamentosTableProps) {
  return (
    <Panel
      title="Últimos Agendamentos"
      icon={<IconClipboard />}
      iconTone="purple"
      clipContent={false}
      bodyClassName="overflow-visible"
    >
      <div className="w-full overflow-x-auto">
        {loading && (
          <p className="py-6 text-center text-sm text-app-muted">
            Carregando agendamentos...
          </p>
        )}

        {!loading && error && (
          <p className="py-6 text-center text-sm text-brand-red">{error}</p>
        )}

        {!loading && !error && rows.length === 0 && (
          <p className="py-6 text-center text-sm text-app-muted">
            Nenhum agendamento encontrado com os filtros aplicados.
          </p>
        )}

        {!loading && !error && rows.length > 0 && (
          <table className="w-full min-w-[1080px] border-collapse">
            <thead>
              <tr>
                {HEADERS.map((h) => (
                  <th
                    key={h.label}
                    className={h.center ? TH_C : TH}
                  >
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.key}
                  className="cursor-pointer transition-colors duration-150 hover:bg-[#f0f4ff]/55"
                >
                  <td className={`${TD} whitespace-nowrap font-medium text-navy`}>
                    {row.dataAgendada}
                  </td>
                  <td
                    className={`${TD} max-w-[140px] truncate`}
                    title={row.cliente}
                  >
                    {row.cliente}
                  </td>
                  <td
                    className={`${TD} max-w-[120px] truncate`}
                    title={row.colaborador}
                  >
                    {row.colaborador}
                  </td>
                  <td className={`${TD} whitespace-nowrap text-[#475569]`}>
                    {row.aso}
                  </td>
                  <td className={`${TD} max-w-[160px] truncate whitespace-nowrap text-[#64748b]`}>
                    {row.examesResumo}
                  </td>
                  <td className={`${TD} whitespace-nowrap font-medium`}>
                    {row.totalCliente}
                  </td>
                  <td className={TD}>
                    <StatusBadge
                      type={row.statusType}
                      label={row.statusLabel}
                    />
                  </td>
                  <td className={TD_C}>
                    <SimNaoBadge value={row.asoClinica} />
                  </td>
                  <td className={TD_C}>
                    <SimNaoBadge value={row.asoAssinado} />
                  </td>
                  <td className={TD_C}>
                    <SimNaoBadge value={row.asoCliente} />
                  </td>
                  <td
                    className={`${TD_C} max-w-[90px] truncate text-[11px]`}
                    title={row.matricula !== "—" ? row.matricula : undefined}
                  >
                    {row.matricula}
                  </td>
                  <td className={TD_C}>
                    <SimNaoBadge value={row.esocial} />
                  </td>
                  <td className={TD_C}>
                    <RowActionsMenu
                      agendamentoId={row.agendamentoId}
                      onVisualizar={onVisualizar}
                      onEditar={onEditar}
                      onCancelar={onCancelar}
                      onHistorico={onHistorico}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {paginationSlot && <div className="pt-4">{paginationSlot}</div>}
    </Panel>
  );
}
