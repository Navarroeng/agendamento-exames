"use client";

import { AppShell } from "@/components/layout/AppShell";
import { IconCalendar } from "@/components/ui/icons/OutlineIcons";
import { AgendamentoCancelarModal } from "@/components/modals/AgendamentoCancelarModal";
import { AgendamentoDuplicidadeMesModal } from "@/components/modals/AgendamentoDuplicidadeMesModal";
import { AgendamentoForm } from "./AgendamentoForm";
import { AgendamentoHistoricoModal } from "@/components/modals/AgendamentoHistoricoModal";
import { AgendamentoViewModal } from "@/components/modals/AgendamentoViewModal";
import { AgendamentosFilters } from "./AgendamentosFilters";
import { AgendamentosPagination } from "./AgendamentosPagination";
import { AgendamentosTable } from "./AgendamentosTable";
import { ExamSection } from "./ExamSection";
import { FormActions } from "./FormActions";
import { StatusDocumentacao } from "./StatusDocumentacao";
import { TopActions } from "./TopActions";
import { useAgendamentosPage } from "@/hooks/useAgendamentosPage";
import { AGENDAMENTOS_PAGE_SIZE } from "@/lib/agendamento-filters";

export function AgendamentoPage() {
  const {
    showForm,
    editingId,
    viewAgendamento,
    setViewAgendamento,
    historicoOpen,
    historicoAgendamentoId,
    cancelModalOpen,
    saving,
    form,
    setField,
    clinicasAtivas,
    clientes,
    clientesLoading,
    clienteId,
    handleClienteChange,
    cargoId,
    cargosAtivos,
    cargosLoading,
    handleCargoChange,
    exams,
    totals,
    catalogExames,
    catalogLoading,
    pricingLoading,
    addExam,
    removeExam,
    updateExam,
    loading,
    error,
    filters,
    filterOptions,
    filtersExpanded,
    filteredAgendamentos,
    paginatedRows,
    page,
    totalPages,
    handleFilterChange,
    handleClearFilters,
    toggleFilters,
    closeForm,
    setPage,
    handleNovoAgendamento,
    handleClear,
    handleEditar,
    handleVisualizar,
    handleHistorico,
    handleCancelar,
    closeHistoricoModal,
    closeCancelModal,
    handleConfirmarCancelamento,
    handleSave,
    handleCopyMensagemClinica,
    duplicidadeMesOpen,
    duplicidadeMesInfo,
    closeDuplicidadeMesModal,
    handleConfirmSaveMesmoMes,
    contratoVigencia,
    contratoInvalido,
  } = useAgendamentosPage();

  return (
    <AppShell
      title="Agendamentos"
      subtitle="Cadastre e acompanhe exames ocupacionais, ASO, custos e faturamento."
      icon={<IconCalendar size={20} />}
    >
      <TopActions onNovoAgendamento={handleNovoAgendamento} />

      {showForm && (
        <>
          <AgendamentoForm
            form={form}
            clinicas={clinicasAtivas}
            clientes={clientes}
            clientesLoading={clientesLoading}
            clienteId={clienteId}
            onClienteChange={handleClienteChange}
            cargos={cargosAtivos}
            cargosLoading={cargosLoading}
            cargoId={cargoId}
            onCargoChange={handleCargoChange}
            onChange={setField}
            onClose={closeForm}
            isEditing={!!editingId}
            contratoVigencia={contratoVigencia}
          />
          <ExamSection
            exams={exams}
            totals={totals}
            clinicaNome={form.clinica_nome}
            catalogExames={catalogExames}
            catalogLoading={catalogLoading}
            pricingLoading={pricingLoading}
            onAdd={addExam}
            onRemove={removeExam}
            onUpdate={updateExam}
          />
          <StatusDocumentacao form={form} onChange={setField}>
            <FormActions
              saving={saving}
              contratoInvalido={contratoInvalido}
              onClear={handleClear}
              onSaveDraft={() => handleSave("rascunho")}
              onSave={() => handleSave("agendado")}
              onCopyClinicaMessage={handleCopyMensagemClinica}
            />
          </StatusDocumentacao>
        </>
      )}

      {!loading && !error && (
        <AgendamentosFilters
          filters={filters}
          options={filterOptions}
          totalFiltrados={filteredAgendamentos.length}
          expanded={filtersExpanded}
          onToggle={toggleFilters}
          onChange={handleFilterChange}
          onClear={handleClearFilters}
        />
      )}

      <AgendamentosTable
        rows={paginatedRows}
        loading={loading}
        error={error}
        paginationSlot={
          !loading && !error && filteredAgendamentos.length > 0 ? (
            <AgendamentosPagination
              page={page}
              totalPages={totalPages}
              totalItems={filteredAgendamentos.length}
              pageSize={AGENDAMENTOS_PAGE_SIZE}
              onPageChange={setPage}
            />
          ) : null
        }
        onVisualizar={handleVisualizar}
        onEditar={handleEditar}
        onCancelar={handleCancelar}
        onHistorico={handleHistorico}
      />

      <AgendamentoViewModal
        agendamento={viewAgendamento}
        onClose={() => setViewAgendamento(null)}
      />
      <AgendamentoHistoricoModal
        open={historicoOpen}
        agendamentoId={historicoAgendamentoId}
        onClose={closeHistoricoModal}
      />
      <AgendamentoCancelarModal
        open={cancelModalOpen}
        saving={saving}
        onClose={closeCancelModal}
        onConfirm={handleConfirmarCancelamento}
      />
      <AgendamentoDuplicidadeMesModal
        open={duplicidadeMesOpen}
        agendamento={duplicidadeMesInfo}
        saving={saving}
        onClose={closeDuplicidadeMesModal}
        onConfirm={handleConfirmSaveMesmoMes}
      />

      {saving && (
        <div
          className="fixed inset-0 z-50 bg-black/10 backdrop-blur-[1px]"
          aria-hidden
        />
      )}
    </AppShell>
  );
}
