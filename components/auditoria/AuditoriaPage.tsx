"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Panel } from "@/components/ui/Panel";
import { IconShield } from "@/components/ui/icons/OutlineIcons";
import { AuditoriaFiltersPanel } from "./AuditoriaFiltersPanel";
import { AuditoriaTable } from "./AuditoriaTable";
import { useAuditoriaPage } from "@/hooks/useAuditoriaPage";

export function AuditoriaPage() {
  const {
    records,
    loading,
    error,
    filters,
    page,
    totalPages,
    total,
    usuarios,
    moduloOptions,
    acaoOptions,
    setPage,
    handleFilterChange,
    handleClearFilters,
  } = useAuditoriaPage();

  return (
    <AppShell
      title="Auditoria"
      subtitle="Histórico geral de ações importantes realizadas no sistema."
      icon={<IconShield size={20} />}
    >
      <div className="space-y-5">
        <AuditoriaFiltersPanel
          filters={filters}
          usuarios={usuarios}
          moduloOptions={moduloOptions}
          acaoOptions={acaoOptions}
          total={total}
          loading={loading}
          onChange={handleFilterChange}
          onClear={handleClearFilters}
        />

        <Panel title="Registros de auditoria" icon={<IconShield size={16} />} iconTone="purple">
          <AuditoriaTable records={records} loading={loading} error={error} />

          {!loading && !error && totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#eef2f7] pt-4">
              <p className="text-[11px] text-[#64748b]">
                Página {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-lg bg-[#f4f6fb] px-3 py-1.5 text-[11px] font-bold text-[#52617a] disabled:opacity-40"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-brand-blue-soft px-3 py-1.5 text-[11px] font-bold text-brand-blue disabled:opacity-40"
                  disabled={page >= totalPages}
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
