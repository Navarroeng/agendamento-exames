import { Panel } from "@/components/ui/Panel";

import { IconClipboard } from "@/components/ui/icons/OutlineIcons";

import { formatCNPJ } from "@/lib/cnpj";
import type { ClienteRecord } from "@/lib/types";

import { ClientesPagination } from "./ClientesPagination";

interface ClientesTableProps {
  clientes: ClienteRecord[];
  loading: boolean;
  error: string | null;
  page: number;
  total: number;
  totalPages: number;
  pageSize: number;
  hasActiveSearch: boolean;
  highlightClienteId?: string | null;
  onAbrir: (id: string) => void;
  onPageChange: (page: number) => void;
}

export function ClientesTable({
  clientes,
  loading,
  error,
  page,
  total,
  totalPages,
  pageSize,
  hasActiveSearch,
  highlightClienteId,
  onAbrir,
  onPageChange,
}: ClientesTableProps) {
  return (
    <Panel
      title="Clientes cadastrados"
      icon={<IconClipboard />}
      iconTone="purple"
    >
      <div className="table-wrap -mx-6 overflow-auto px-6">
        {loading && (
          <p className="py-8 text-center text-sm text-app-muted">
            Carregando clientes...
          </p>
        )}

        {!loading && error && (
          <p className="py-8 text-center text-sm text-brand-red">{error}</p>
        )}

        {!loading && !error && clientes.length === 0 && (
          <p className="py-8 text-center text-sm text-app-muted">
            {hasActiveSearch
              ? "Nenhum cliente encontrado com os termos informados."
              : "Nenhum cliente cadastrado."}
          </p>
        )}

        {!loading && !error && clientes.length > 0 && (
          <table className="table-premium w-full min-w-[520px]">
            <thead>
              <tr>
                {["Nome", "CNPJ", "Ações"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {clientes.map((cliente) => (
                <tr
                  key={cliente.id}
                  className={
                    highlightClienteId === cliente.id
                      ? "bg-brand-green-soft/60 ring-1 ring-brand-green/30"
                      : undefined
                  }
                >
                  <td className="font-bold text-navy">{cliente.nome}</td>

                  <td>{formatCNPJ(cliente.cnpj)}</td>

                  <td>
                    <button
                      type="button"
                      className="rounded-lg bg-brand-blue-soft px-2.5 py-1 text-[10px] font-bold text-brand-blue"
                      onClick={() => onAbrir(cliente.id)}
                    >
                      Abrir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ClientesPagination
        page={page}
        totalPages={totalPages}
        totalItems={total}
        pageSize={pageSize}
        onPageChange={onPageChange}
      />
    </Panel>
  );
}
