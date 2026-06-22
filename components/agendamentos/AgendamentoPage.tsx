"use client";

import { AppShell } from "@/components/layout/AppShell";
import { IconCalendar } from "@/components/ui/icons/OutlineIcons";
import { AgendamentoCancelarModal } from "@/components/modals/AgendamentoCancelarModal";
import { AgendamentoCargoChangeModal } from "@/components/modals/AgendamentoCargoChangeModal";
import { AgendamentoClienteProcuracaoModal } from "@/components/modals/AgendamentoClienteProcuracaoModal";
import { AgendamentoDuplicidade90DiasModal } from "@/components/modals/AgendamentoDuplicidade90DiasModal";
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
    cargoSemExames,
    duplicidade90DiasOpen,
    duplicidade90DiasInfo,
    closeDuplicidade90DiasModal,
    cargoChangeModalOpen,
    cargoChangeLoading,
    closeCargoChangeModal,
    handleConfirmCargoChange,
    contratoVigencia,
    contratoInvalido,
    showClienteProcuracaoAlert,
    clienteProcuracaoModalOpen,
    clienteProcuracaoConfirmLoading,
    closeClienteProcuracaoModal,
    handleConfirmClienteProcuracao,
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
            showClienteProcuracaoAlert={showClienteProcuracaoAlert}
            exams={exams}
          />
          <ExamSection
            exams={exams}
            aso={form.aso}
            totals={totals}
            clinicaNome={form.clinica_nome}
            cargoId={cargoId}
            cargoSemExames={cargoSemExames}
            catalogExames={catalogExames}
            pricingLoading={pricingLoading}
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
      <AgendamentoDuplicidade90DiasModal
        open={duplicidade90DiasOpen}
        agendamento={duplicidade90DiasInfo}
        onClose={closeDuplicidade90DiasModal}
      />
      <AgendamentoCargoChangeModal
        open={cargoChangeModalOpen}
        loading={cargoChangeLoading}
        onClose={closeCargoChangeModal}
        onConfirm={handleConfirmCargoChange}
      />
      <AgendamentoClienteProcuracaoModal
        open={clienteProcuracaoModalOpen}
        loading={clienteProcuracaoConfirmLoading}
        onClose={closeClienteProcuracaoModal}
        onConfirm={handleConfirmClienteProcuracao}
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
