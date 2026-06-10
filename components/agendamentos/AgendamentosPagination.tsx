interface AgendamentosPaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function AgendamentosPagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: AgendamentosPaginationProps) {
  if (totalItems === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-app-line pt-4 sm:flex-row">
      <p className="text-xs font-semibold text-app-muted">
        Exibindo {start}–{end} de {totalItems}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn !px-3 !py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          ← Anterior
        </button>
        <span className="min-w-[80px] text-center text-xs font-bold text-navy">
          Página {page} / {totalPages}
        </span>
        <button
          type="button"
          className="btn !px-3 !py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Próxima →
        </button>
      </div>
    </div>
  );
}
