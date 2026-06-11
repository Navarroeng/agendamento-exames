import {
  formatValidadePeriodicoBadge,
  parseValidadePeriodicoMeses,
} from "@/lib/cargo-periodico";
import { Panel } from "@/components/ui/Panel";
import { IconClipboard } from "@/components/ui/icons/OutlineIcons";
import type { CargoRecord } from "@/lib/types";

interface CargosTableProps {
  cargos: CargoRecord[];
  exameCounts: Record<string, number>;
  loading: boolean;
  error: string | null;
  onEditar: (id: string) => void;
  onVisualizar: (id: string) => void;
  onToggleAtivo: (id: string) => void;
}

export function CargosTable({
  cargos,
  exameCounts,
  loading,
  error,
  onEditar,
  onVisualizar,
  onToggleAtivo,
}: CargosTableProps) {
  return (
    <Panel title="Cargos cadastrados" icon={<IconClipboard />} iconTone="purple">
      <div className="table-wrap -mx-6 overflow-x-auto px-6">
        {loading && (
          <p className="py-8 text-center text-sm text-app-muted">Carregando...</p>
        )}
        {!loading && error && (
          <p className="py-8 text-center text-sm text-brand-red">{error}</p>
        )}
        {!loading && !error && cargos.length === 0 && (
          <p className="py-8 text-center text-sm text-app-muted">
            Nenhum cargo cadastrado.
          </p>
        )}
        {!loading && !error && cargos.length > 0 && (
          <table className="table-premium w-full min-w-[720px]">
            <thead>
              <tr>
                {["Cargo", "Descrição", "Exames", "Periódico", "Status", "Ações"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cargos.map((cargo) => {
                const badge = formatValidadePeriodicoBadge(
                  parseValidadePeriodicoMeses(cargo.validade_periodico_meses)
                );

                return (
                  <tr key={cargo.id}>
                    <td className="font-bold text-navy">{cargo.nome}</td>
                    <td className="max-w-[240px] truncate text-[#52617a]">
                      {cargo.descricao?.trim() || "—"}
                    </td>
                    <td>
                      <span className="inline-flex min-w-[28px] items-center justify-center rounded-full bg-brand-blue-soft px-2 py-0.5 text-[10px] font-bold text-brand-blue">
                        {exameCounts[cargo.id] ?? 0}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                          cargo.ativo
                            ? "bg-brand-green-soft text-brand-green"
                            : "bg-brand-red-soft text-brand-red"
                        }`}
                      >
                        {cargo.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-lg bg-[#f4f6fb] px-2.5 py-1 text-[10px] font-bold text-[#52617a]"
                          onClick={() => onVisualizar(cargo.id)}
                        >
                          Visualizar
                        </button>
                        <button
                          type="button"
                          className="rounded-lg bg-brand-blue-soft px-2.5 py-1 text-[10px] font-bold text-brand-blue"
                          onClick={() => onEditar(cargo.id)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="rounded-lg bg-[#f4f6fb] px-2.5 py-1 text-[10px] font-bold text-[#52617a]"
                          onClick={() => onToggleAtivo(cargo.id)}
                        >
                          {cargo.ativo ? "Desativar" : "Ativar"}
                        </button>
                      </div>
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
