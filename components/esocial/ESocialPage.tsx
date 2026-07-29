"use client";

import { AppShell } from "@/components/layout/AppShell";
import { IconEsocial } from "@/components/ui/icons/OutlineIcons";
import { AgendamentoViewModal } from "@/components/modals/AgendamentoViewModal";
import { useESocialPage } from "@/hooks/useESocialPage";
import { ESocialCancelarEnvioModal } from "./ESocialCancelarEnvioModal";
import { ESocialFiltersPanel } from "./ESocialFilters";
import { ESocialMarcarEnviadoModal } from "./ESocialMarcarEnviadoModal";
import { ESocialSummaryCards } from "./ESocialSummaryCards";
import { ESocialTable } from "./ESocialTable";
import { ESocialVerCancelamentoModal } from "./ESocialVerCancelamentoModal";

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
    tableSort,
    handleSortColumn,
    handleFilterChange,
    handleClearFilters,
    toggleFilters,
    setPage,
    viewAgendamento,
    setViewAgendamento,
    viewFaturaBloqueio,
    handleVisualizar,
    openMarcarEnviado,
    closeMarcarEnviado,
    handleConfirmMarcarEnviado,
    handleMarcarPendente,
    openCancelarEnvio,
    closeCancelarEnvio,
    handleConfirmCancelarEnvio,
    cancelTarget,
    openVerCancelamento,
    closeVerCancelamento,
    verCancelamentoTarget,
    marcarEnviadoOpen,
    validatingRecibo,
    reciboError,
    reciboDuplicadoInfo,
    dataEnvioInput,
    setDataEnvioInput,
    reciboInput,
    handleReciboInputChange,
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
          sort={tableSort}
          onSortColumn={handleSortColumn}
          onPageChange={setPage}
          onVisualizar={handleVisualizar}
          onMarcarEnviado={openMarcarEnviado}
          onMarcarPendente={handleMarcarPendente}
          onCancelarEnvio={openCancelarEnvio}
          onVerCancelamento={openVerCancelamento}
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
        validatingRecibo={validatingRecibo}
        dataEnvio={dataEnvioInput}
        recibo={reciboInput}
        reciboError={reciboError}
        reciboDuplicadoInfo={reciboDuplicadoInfo}
        onChangeData={setDataEnvioInput}
        onChangeRecibo={handleReciboInputChange}
        onClose={closeMarcarEnviado}
        onConfirm={handleConfirmMarcarEnviado}
      />

      <ESocialCancelarEnvioModal
        open={Boolean(cancelTarget)}
        agendamento={cancelTarget}
        saving={saving}
        onClose={closeCancelarEnvio}
        onConfirm={(motivo) => {
          void handleConfirmCancelarEnvio(motivo);
        }}
      />

      <ESocialVerCancelamentoModal
        open={Boolean(verCancelamentoTarget)}
        agendamento={verCancelamentoTarget}
        onClose={closeVerCancelamento}
      />
    </AppShell>
  );
}
