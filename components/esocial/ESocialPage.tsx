"use client";

import { AppShell } from "@/components/layout/AppShell";
import { IconEsocial } from "@/components/ui/icons/OutlineIcons";
import { AgendamentoViewModal } from "@/components/modals/AgendamentoViewModal";
import { useESocialPage } from "@/hooks/useESocialPage";
import { ESocialFiltersPanel } from "./ESocialFilters";
import { ESocialMarcarEnviadoModal } from "./ESocialMarcarEnviadoModal";
import { ESocialSummaryCards } from "./ESocialSummaryCards";
import { ESocialTable } from "./ESocialTable";

export function ESocialPage() {
  const {
    loading,
    error,
    saving,
    filters,
    filtersExpanded,
    filterOptions,
    filteredAgendamentos,
    paginatedAgendamentos,
    summary,
    page,
    totalPages,
    handleFilterChange,
    handleClearFilters,
    toggleFilters,
    setPage,
    viewAgendamento,
    setViewAgendamento,
    viewFaturaBloqueio,
    bloqueioPorAgendamento,
    handleVisualizar,
    openMarcarEnviado,
    closeMarcarEnviado,
    handleConfirmMarcarEnviado,
    handleMarcarPendente,
    marcarEnviadoOpen,
    dataEnvioInput,
    setDataEnvioInput,
    reciboInput,
    setReciboInput,
  } = useESocialPage();

  return (
    <AppShell
      title="e-Social"
      subtitle="ASOs que precisam de ação no e-Social — pendentes, urgentes e envio."
      icon={<IconEsocial size={20} />}
    >
      <div className="space-y-5">
        <ESocialSummaryCards stats={summary} />

        <ESocialFiltersPanel
          filters={filters}
          options={filterOptions}
          totalFiltrados={filteredAgendamentos.length}
          expanded={filtersExpanded}
          onToggle={toggleFilters}
          onChange={handleFilterChange}
          onClear={handleClearFilters}
        />

        <ESocialTable
          agendamentos={paginatedAgendamentos}
          totalFiltrados={filteredAgendamentos.length}
          loading={loading}
          error={error}
          saving={saving}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          onVisualizar={handleVisualizar}
          onMarcarEnviado={openMarcarEnviado}
          onMarcarPendente={handleMarcarPendente}
          bloqueioPorAgendamento={bloqueioPorAgendamento}
        />
      </div>

      <AgendamentoViewModal
        agendamento={viewAgendamento}
        faturaBloqueio={viewFaturaBloqueio}
        onClose={() => setViewAgendamento(null)}
      />

      <ESocialMarcarEnviadoModal
        open={marcarEnviadoOpen}
        saving={saving}
        dataEnvio={dataEnvioInput}
        recibo={reciboInput}
        onChangeData={setDataEnvioInput}
        onChangeRecibo={setReciboInput}
        onClose={closeMarcarEnviado}
        onConfirm={handleConfirmMarcarEnviado}
      />
    </AppShell>
  );
}
