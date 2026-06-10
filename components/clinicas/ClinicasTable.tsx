import { Panel } from "@/components/ui/Panel";
import { IconBuilding } from "@/components/ui/icons/OutlineIcons";
import { ClinicaRowActionsMenu } from "./ClinicaRowActionsMenu";
import type { ClinicaTableRow } from "@/lib/types";

const TH_BASE =
  "border-b border-[#e2e8f0] bg-gradient-to-b from-[#f8fafc] to-[#f1f5f9] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#64748b] whitespace-nowrap";
const TH = `${TH_BASE} text-left`;
const TH_CENTER = `${TH_BASE} text-center`;
const TH_RIGHT = `${TH_BASE} text-right`;

const TD_BASE =
  "border-b border-[#eef2f7]/80 px-3 py-1.5 text-xs text-[#334155] align-middle";
const TD = TD_BASE;
const TD_CENTER = `${TD_BASE} text-center`;
const TD_RIGHT = `${TD_BASE} text-right`;

function StatusBadge({ status }: { status: ClinicaTableRow["status"] }) {
  const isActive = status === "ativa";
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
        isActive
          ? "bg-brand-green-soft text-brand-green"
          : "bg-brand-red-soft text-brand-red"
      }`}
    >
      {isActive ? "Ativa" : "Inativa"}
    </span>
  );
}

interface ClinicasTableProps {
  rows: ClinicaTableRow[];
  loading: boolean;
  error: string | null;
  onVisualizar: (id: string) => void;
  onEditar: (id: string) => void;
  onDesativar: (id: string) => void;
  onHistorico: (id: string) => void;
}

export function ClinicasTable({
  rows,
  loading,
  error,
  onVisualizar,
  onEditar,
  onDesativar,
  onHistorico,
}: ClinicasTableProps) {
  return (
    <Panel
      title="Clínicas credenciadas"
      icon={<IconBuilding />}
      iconTone="purple"
    >
      <div className="table-wrap -mx-6 overflow-x-auto px-6">
        {loading && (
          <p className="py-8 text-center text-sm text-app-muted">
            Carregando clínicas...
          </p>
        )}

        {!loading && error && (
          <p className="py-8 text-center text-sm text-brand-red">{error}</p>
        )}

        {!loading && !error && rows.length === 0 && (
          <p className="py-8 text-center text-sm text-app-muted">
            Nenhuma clínica cadastrada. Clique em Nova Clínica para começar.
          </p>
        )}

        {!loading && !error && rows.length > 0 && (
          <table className="w-full table-fixed border-collapse">
            <colgroup>
              <col />
              <col className="w-[96px]" />
              <col className="w-[72px]" />
              <col className="w-[64px]" />
            </colgroup>
            <thead>
              <tr>
                <th className={TH}>Clínica</th>
                <th className={TH_CENTER}>Status</th>
                <th className={TH_CENTER}>Exames</th>
                <th className={TH_RIGHT}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="hover:bg-[#fafbff]">
                  <td className={`${TD} truncate font-bold`}>{row.nome}</td>
                  <td className={TD_CENTER}>
                    <StatusBadge status={row.status} />
                  </td>
                  <td className={`${TD_CENTER} tabular-nums font-semibold text-[#475569]`}>
                    {row.qtdExames}
                  </td>
                  <td className={TD_RIGHT}>
                    <ClinicaRowActionsMenu
                      clinicaId={row.clinicaId}
                      status={row.status}
                      onVisualizar={onVisualizar}
                      onEditar={onEditar}
                      onDesativar={onDesativar}
                      onHistorico={onHistorico}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Panel>
  );
}
