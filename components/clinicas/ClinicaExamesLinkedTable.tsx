import { formatCurrency, parseMoney } from "@/lib/money";
import type { ClinicaExameWithExame } from "@/lib/types";

interface ClinicaExamesLinkedTableProps {
  items: ClinicaExameWithExame[];
  editingId: string | null;
  editCusto: string;
  editValorNavarro: string;
  editPrazo: string;
  saving: boolean;
  onEditCustoChange: (value: string) => void;
  onEditValorNavarroChange: (value: string) => void;
  onEditPrazoChange: (value: string) => void;
  onStartEdit: (item: ClinicaExameWithExame) => void;
  onCancelEdit: () => void;
  onSaveEdit: (item: ClinicaExameWithExame) => void;
  onToggleAtivo: (item: ClinicaExameWithExame) => void;
}

function lucroClass(lucro: number): string {
  if (lucro < 0) return "text-brand-red";
  return "text-brand-green";
}

export function ClinicaExamesLinkedTable({
  items,
  editingId,
  editCusto,
  editValorNavarro,
  editPrazo,
  saving,
  onEditCustoChange,
  onEditValorNavarroChange,
  onEditPrazoChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onToggleAtivo,
}: ClinicaExamesLinkedTableProps) {
  return (
    <div className="overflow-x-auto rounded-[20px] border border-app-line bg-white shadow-card">
      <table className="w-full min-w-[680px] border-collapse">
        <thead>
          <tr className="border-b border-app-line bg-[#f8faff]">
            {[
              "Exame",
              "Custo clínica",
              "Valor Navarro",
              "Lucro est.",
              "Prazo",
              "Status",
              "Ações",
            ].map((h) => (
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
          {items.length === 0 ? (
            <tr>
              <td
                colSpan={7}
                className="px-3 py-8 text-center text-sm text-app-muted"
              >
                Nenhum exame vinculado. Adicione exames do catálogo.
              </td>
            </tr>
          ) : (
            items.map((item) => {
              const isEditing = editingId === item.id;
              const valorNavarro = isEditing
                ? parseMoney(editValorNavarro)
                : Number(item.valor_navarro ?? item.exames.valor_navarro);
              const custo = isEditing
                ? parseMoney(editCusto)
                : Number(item.custo_clinica);
              const lucro = valorNavarro - custo;

              return (
                <tr
                  key={item.id}
                  className="border-b border-app-line transition-colors hover:bg-[#fafbff]"
                >
                  <td className="px-3 py-2.5 text-[13px] font-bold text-navy">
                    {item.exames.nome}
                  </td>
                  <td className="px-3 py-2.5">
                    {isEditing ? (
                      <input
                        className="field-input !h-9 w-full min-w-[100px] text-sm"
                        value={editCusto}
                        placeholder="R$ 0,00"
                        onChange={(e) => onEditCustoChange(e.target.value)}
                      />
                    ) : (
                      <span className="text-[13px] font-semibold text-[#ea580c]">
                        {formatCurrency(Number(item.custo_clinica))}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {isEditing ? (
                      <input
                        className="field-input !h-9 w-full min-w-[100px] text-sm"
                        value={editValorNavarro}
                        placeholder="R$ 0,00"
                        onChange={(e) =>
                          onEditValorNavarroChange(e.target.value)
                        }
                      />
                    ) : (
                      <span className="text-[13px] font-semibold text-navy">
                        {formatCurrency(valorNavarro)}
                      </span>
                    )}
                  </td>
                  <td
                    className={`px-3 py-2.5 text-[13px] font-bold ${lucroClass(lucro)}`}
                  >
                    {formatCurrency(lucro)}
                  </td>
                  <td className="px-3 py-2.5 text-[13px]">
                    {isEditing ? (
                      <input
                        className="field-input !h-9 w-full min-w-[88px] text-sm"
                        value={editPrazo}
                        onChange={(e) => onEditPrazoChange(e.target.value)}
                      />
                    ) : (
                      item.prazo_resultado ?? "—"
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                        item.ativo
                          ? "bg-brand-green-soft text-brand-green"
                          : "bg-brand-red-soft text-brand-red"
                      }`}
                    >
                      {item.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            className="rounded-lg bg-brand-blue-soft px-2 py-1 text-[10px] font-bold text-brand-blue"
                            disabled={saving}
                            onClick={() => onSaveEdit(item)}
                          >
                            Salvar
                          </button>
                          <button
                            type="button"
                            className="rounded-lg px-2 py-1 text-[10px] font-bold text-app-muted"
                            onClick={onCancelEdit}
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="rounded-lg bg-brand-blue-soft px-2 py-1 text-[10px] font-bold text-brand-blue hover:opacity-90"
                            onClick={() => onStartEdit(item)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="rounded-lg bg-[#f4f6fb] px-2 py-1 text-[10px] font-bold text-[#52617a] hover:opacity-90"
                            disabled={saving}
                            onClick={() => onToggleAtivo(item)}
                          >
                            {item.ativo ? "Desativar" : "Ativar"}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
