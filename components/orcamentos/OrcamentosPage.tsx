"use client";

import { AppShell } from "@/components/layout/AppShell";
import { IconFileText } from "@/components/ui/icons/OutlineIcons";
import { OrcamentoForm } from "./OrcamentoForm";
import { OrcamentoFormActions } from "./OrcamentoFormActions";
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
    setField,
    addItem,
    removeItem,
    updateItem,
    applyServicoSugerido,
    saving,
    resetForm,
    closeForm,
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

      {showForm && (
        <>
          <div className="mt-[18px]">
            <OrcamentoForm
              form={form}
              isEditing={!!editingId}
              clientes={clientes}
              servicos={servicos}
              servicosLoading={servicosLoading}
              servicosError={servicosError}
              subtotal={totals.subtotal}
              valorTotal={totals.valorTotal}
              validadeProposta={totals.validadeProposta}
              condicoesPagamento={totals.condicoesPagamento}
              onChange={setField}
              onSelectCliente={handleSelectCliente}
              onAddItem={addItem}
              onRemoveItem={removeItem}
              onUpdateItem={updateItem}
              onApplyValorSugerido={applyServicoSugerido}
            />
          </div>
          <OrcamentoFormActions
            saving={saving}
            isEditing={!!editingId}
            onClear={resetForm}
            onCancel={closeForm}
            onSave={handleSave}
          />
        </>
      )}

      <OrcamentoViewModal
        orcamento={viewOrcamento}
        servicos={servicos}
        onClose={closeView}
        onEditar={handleEditar}
        onGerarPdf={handleGerarPdf}
      />

      {(saving || viewLoading || actionLoading) && (
        <div
          className="fixed inset-0 z-50 bg-black/10 backdrop-blur-[1px]"
          aria-hidden
        />
      )}
    </AppShell>
  );
}
