import { Panel } from "@/components/ui/Panel";
import { IconClipboard } from "@/components/ui/icons/OutlineIcons";
import { formatCurrency } from "@/lib/money";
import type { ExameRecord } from "@/lib/types";

interface ExamesCatalogTableProps {
  exames: ExameRecord[];
  loading: boolean;
  error: string | null;
  onEditar: (id: string) => void;
  onToggleAtivo: (id: string) => void;
}

export function ExamesCatalogTable({
  exames,
  loading,
  error,
  onEditar,
  onToggleAtivo,
}: ExamesCatalogTableProps) {
  return (
    <Panel
      title="Catálogo de exames"
      icon={<IconClipboard />}
      iconTone="green"
    >
      <div className="table-wrap -mx-6 overflow-x-auto px-6">
        {loading && (
          <p className="py-8 text-center text-sm text-app-muted">Carregando...</p>
        )}
        {!loading && error && (
          <p className="py-8 text-center text-sm text-brand-red">{error}</p>
        )}
        {!loading && !error && exames.length === 0 && (
          <p className="py-8 text-center text-sm text-app-muted">
            Nenhum exame cadastrado.
          </p>
        )}
        {!loading && !error && exames.length > 0 && (
          <table className="w-full min-w-[520px] border-collapse">
            <thead>
              <tr className="border-b border-app-line bg-[#f8faff]">
                {["Exame", "Valor Navarro", "Status", "Ações"].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2.5 text-left text-[11px] font-bold text-[#23345d]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {exames.map((exame) => (
                <tr
                  key={exame.id}
                  className="border-b border-app-line transition-colors hover:bg-[#fafbff]"
                >
                  <td className="px-3 py-2.5 text-[13px] font-bold text-navy">
                    {exame.nome}
                  </td>
                  <td className="px-3 py-2.5 text-[13px] font-semibold text-[#16a34a]">
                    {formatCurrency(Number(exame.valor_navarro))}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                        exame.ativo
                          ? "bg-brand-green-soft text-brand-green"
                          : "bg-brand-red-soft text-brand-red"
                      }`}
                    >
                      {exame.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded-lg bg-brand-blue-soft px-2.5 py-1 text-[10px] font-bold text-brand-blue"
                        onClick={() => onEditar(exame.id)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="rounded-lg bg-[#f4f6fb] px-2.5 py-1 text-[10px] font-bold text-[#52617a]"
                        onClick={() => onToggleAtivo(exame.id)}
                      >
                        {exame.ativo ? "Desativar" : "Ativar"}
                      </button>
                    </div>
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
