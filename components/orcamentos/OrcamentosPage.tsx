"use client";

import { AppShell } from "@/components/layout/AppShell";
import { IconFileText } from "@/components/ui/icons/OutlineIcons";
import { OrcamentoFormModal } from "./OrcamentoFormModal";
import { OrcamentoSearchPanel } from "./OrcamentoSearchPanel";
import { OrcamentoTopActions } from "./OrcamentoTopActions";
import { OrcamentoViewModal } from "./OrcamentoViewModal";
import { OrcamentosTable } from "./OrcamentosTable";
import { useOrcamentosPage } from "@/hooks/useOrcamentosPage";

export function OrcamentosPage() {
  const {
    showForm,
    editingId,
    orcamentos,
    loading,
    error,
    filters,
    clientes,
    servicos,
    servicosLoading,
    servicosError,
    viewOrcamento,
    viewLoading,
    actionLoading,
    podeExcluir,
    form,
    totals,
    formDirty,
    discardConfirmOpen,
    setField,
    addItem,
    removeItem,
    updateItem,
    applyServicoSugerido,
    saving,
    resetForm,
    requestCloseForm,
    continueEditing,
    discardAndClose,
    handleNovo,
    handleEditar,
    handleVisualizar,
    handleSave,
    handleDuplicar,
    handleGerarPdf,
    handleExcluir,
    handleFilterChange,
    clearFilters,
    handleSelectCliente,
    closeView,
  } = useOrcamentosPage();

  return (
    <AppShell
      title="Orçamentos"
      subtitle="Centralize propostas comerciais de SST e acompanhe o histórico."
      icon={<IconFileText size={20} />}
    >
      <OrcamentoTopActions onNovoOrcamento={handleNovo} />

      <div className="mb-[18px]">
        <OrcamentoSearchPanel
          filters={filters}
          totalFiltrados={orcamentos.length}
          onChange={handleFilterChange}
          onClear={clearFilters}
        />
      </div>

      <OrcamentosTable
        orcamentos={orcamentos}
        loading={loading}
        error={error}
        podeExcluir={podeExcluir}
        onVisualizar={handleVisualizar}
        onEditar={handleEditar}
        onDuplicar={handleDuplicar}
        onGerarPdf={handleGerarPdf}
        onExcluir={handleExcluir}
      />

      <OrcamentoFormModal
        open={showForm}
        isEditing={!!editingId}
        form={form}
        clientes={clientes}
        servicos={servicos}
        servicosLoading={servicosLoading}
        servicosError={servicosError}
        subtotal={totals.subtotal}
        valorTotal={totals.valorTotal}
        validadeProposta={totals.validadeProposta}
        condicoesPagamento={totals.condicoesPagamento}
        saving={saving}
        discardConfirmOpen={discardConfirmOpen}
        closeOnOverlayClick={!formDirty}
        onChange={setField}
        onSelectCliente={handleSelectCliente}
        onAddItem={addItem}
        onRemoveItem={removeItem}
        onUpdateItem={updateItem}
        onApplyValorSugerido={applyServicoSugerido}
        onClear={resetForm}
        onRequestClose={requestCloseForm}
        onSave={handleSave}
        onContinueEditing={continueEditing}
        onDiscardAndClose={discardAndClose}
      />

      <OrcamentoViewModal
        orcamento={viewOrcamento}
        servicos={servicos}
        onClose={closeView}
        onEditar={handleEditar}
        onGerarPdf={handleGerarPdf}
      />

      {(saving || viewLoading || actionLoading) && (
        <div
          className="fixed inset-0 z-[70] bg-black/10 backdrop-blur-[1px]"
          aria-hidden
        />
      )}
    </AppShell>
  );
}
