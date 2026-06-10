import { ReactNode } from "react";

interface RelatoriosDataTableProps {
  headers: string[];
  rows: ReactNode[][];
  emptyMessage?: string;
  maxHeight?: string;
}

export function RelatoriosDataTable({
  headers,
  rows,
  emptyMessage = "Nenhum registro encontrado.",
  maxHeight = "320px",
}: RelatoriosDataTableProps) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-app-muted">{emptyMessage}</p>
    );
  }

  return (
    <div
      className="table-wrap overflow-auto rounded-xl border border-[#e8edf5]"
      style={{ maxHeight }}
    >
      <table className="table-premium w-full min-w-[640px]">
        <thead className="sticky top-0 z-[1]">
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx}>
              {row.map((cell, cellIdx) => (
                <td key={cellIdx} className="text-[12px]">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
