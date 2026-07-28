"use client";

import { AppShell } from "@/components/layout/AppShell";
import { IconFileText } from "@/components/ui/icons/OutlineIcons";
import { OrcamentoAprovarModal } from "./OrcamentoAprovarModal";
import { OrcamentoCancelarModal } from "./OrcamentoCancelarModal";
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
    form,
    totals,
    formDirty,
    discardConfirmOpen,
    cancelTarget,
    cancelSaving,
    aprovarOpen,
    aprovarOrcamento,
    aprovarAprovacao,
    aprovarSaving,
    usuarioNome,
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
    handleGerarPdf,
    handleOpenCancelar,
    closeCancelar,
    handleConfirmCancelar,
    handleOpenAprovar,
    closeAprovar,
    handleSalvarAprovacao,
    handleSalvarContrato,
    handleVerComprovante,
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
        onVisualizar={handleVisualizar}
        onEditar={handleEditar}
        onGerarPdf={handleGerarPdf}
        onCancelar={handleOpenCancelar}
        onAprovar={handleOpenAprovar}
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
        onAprovar={
          viewOrcamento && viewOrcamento.status !== "cancelado"
            ? handleOpenAprovar
            : undefined
        }
      />

      <OrcamentoCancelarModal
        open={Boolean(cancelTarget)}
        numero={cancelTarget?.numero ?? ""}
        saving={cancelSaving}
        onClose={closeCancelar}
        onConfirm={(motivo, observacao) => {
          void handleConfirmCancelar(motivo, observacao);
        }}
      />

      <OrcamentoAprovarModal
        open={aprovarOpen}
        orcamento={aprovarOrcamento}
        aprovacao={aprovarAprovacao}
        servicos={servicos}
        saving={aprovarSaving}
        usuarioNome={usuarioNome}
        onClose={closeAprovar}
        onSalvarAprovacao={handleSalvarAprovacao}
        onSalvarContrato={handleSalvarContrato}
        onVerComprovante={(path) => {
          void handleVerComprovante(path);
        }}
      />

      {(saving || viewLoading || actionLoading || cancelSaving || aprovarSaving) && (
        <div
          className="fixed inset-0 z-[70] bg-black/10 backdrop-blur-[1px]"
          aria-hidden
        />
      )}
    </AppShell>
  );
}
