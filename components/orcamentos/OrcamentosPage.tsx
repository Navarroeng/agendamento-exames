"use client";

import { AppShell } from "@/components/layout/AppShell";
import { IconFileText } from "@/components/ui/icons/OutlineIcons";
import { OrcamentoAprovarModal } from "./OrcamentoAprovarModal";
import { OrcamentoAlterarResponsavelModal } from "./OrcamentoAlterarResponsavelModal";
import { OrcamentoCancelarModal } from "./OrcamentoCancelarModal";
import { OrcamentoEncerrarContratoModal } from "./OrcamentoEncerrarContratoModal";
import { OrcamentoFormModal } from "./OrcamentoFormModal";
import { OrcamentoSearchPanel } from "./OrcamentoSearchPanel";
import { OrcamentoTopActions } from "./OrcamentoTopActions";
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
    viewLoading,
    actionLoading,
    form,
    totals,
    formDirty,
    discardConfirmOpen,
    cancelTarget,
    cancelSaving,
    encerrarContratoTarget,
    alterarResponsavelTarget,
    alterarResponsavelSaving,
    usuariosResponsavel,
    usuariosResponsavelLoading,
    aprovarOpen,
    aprovarMode,
    aprovarOrcamento,
    aprovarAprovacao,
    aprovarSaving,
    usuarioNome,
    podeEncerrarContrato,
    resolvePodeAlterarResponsavel,
    funcionariosPreviewUrl,
    logoPreviewUrl,
    aprovarTreinamento,
    aprovarTreinamentoEventos,
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
    closeEncerrarContrato,
    handleConfirmCancelar,
    handleConfirmEncerrarContrato,
    handleOpenAlterarResponsavel,
    closeAlterarResponsavel,
    handleConfirmAlterarResponsavel,
    handleOpenAprovar,
    closeAprovar,
    handleSalvarAprovacao,
    handleAtualizarCondicoesAprovadas,
    handleListarHistoricoCondicoes,
    handleSalvarContrato,
    handleSalvarFinanceiro,
    handleSalvarProcuracao,
    handleSalvarFuncionarios,
    handleSubstituirFuncionarios,
    handleRemoverFuncionarios,
    handleSalvarLogo,
    handleSubstituirLogo,
    handleRemoverLogo,
    handleSalvarVisita,
    handleSalvarTreinamento,
    handleVerComprovante,
    handleFilterChange,
    clearFilters,
    handleSelectCliente,
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
        podeEncerrarContrato={podeEncerrarContrato}
        resolvePodeAlterarResponsavel={resolvePodeAlterarResponsavel}
        onVisualizar={handleVisualizar}
        onEditar={handleEditar}
        onGerarPdf={handleGerarPdf}
        onCancelar={handleOpenCancelar}
        onAprovar={handleOpenAprovar}
        onAlterarResponsavel={handleOpenAlterarResponsavel}
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

      <OrcamentoCancelarModal
        open={Boolean(cancelTarget)}
        numero={cancelTarget?.numero ?? ""}
        saving={cancelSaving}
        onClose={closeCancelar}
        onConfirm={(motivo, observacao) => {
          void handleConfirmCancelar(motivo, observacao);
        }}
      />

      <OrcamentoEncerrarContratoModal
        open={Boolean(encerrarContratoTarget)}
        numeroOrcamento={encerrarContratoTarget?.orcamento.numero ?? ""}
        numeroContrato={encerrarContratoTarget?.contratoNumero ?? null}
        futurosCount={encerrarContratoTarget?.futurosCount ?? 0}
        saving={cancelSaving}
        onClose={closeEncerrarContrato}
        onConfirm={(params) => {
          void handleConfirmEncerrarContrato(params);
        }}
      />

      <OrcamentoAlterarResponsavelModal
        open={Boolean(alterarResponsavelTarget)}
        numero={alterarResponsavelTarget?.numero ?? ""}
        responsavelAtual={alterarResponsavelTarget?.responsavel ?? ""}
        usuarios={usuariosResponsavel}
        usuariosLoading={usuariosResponsavelLoading}
        saving={alterarResponsavelSaving}
        onClose={closeAlterarResponsavel}
        onConfirm={(params) => {
          void handleConfirmAlterarResponsavel(params);
        }}
      />

      <OrcamentoAprovarModal
        open={aprovarOpen}
        mode={aprovarMode}
        orcamento={aprovarOrcamento}
        aprovacao={aprovarAprovacao}
        servicos={servicos}
        saving={aprovarSaving}
        usuarioNome={usuarioNome}
        funcionariosPreviewUrl={funcionariosPreviewUrl}
        logoPreviewUrl={logoPreviewUrl}
        onClose={closeAprovar}
        onSalvarAprovacao={handleSalvarAprovacao}
        onAtualizarCondicoesAprovadas={handleAtualizarCondicoesAprovadas}
        onListarHistoricoCondicoes={handleListarHistoricoCondicoes}
        onSalvarContrato={handleSalvarContrato}
        onSalvarFinanceiro={handleSalvarFinanceiro}
        onSalvarProcuracao={handleSalvarProcuracao}
        onSalvarFuncionarios={handleSalvarFuncionarios}
        onSubstituirFuncionarios={handleSubstituirFuncionarios}
        onRemoverFuncionarios={handleRemoverFuncionarios}
        onSalvarLogo={handleSalvarLogo}
        onSubstituirLogo={handleSubstituirLogo}
        onRemoverLogo={handleRemoverLogo}
        onSalvarVisita={handleSalvarVisita}
        treinamento={aprovarTreinamento}
        treinamentoEventos={aprovarTreinamentoEventos}
        onSalvarTreinamento={handleSalvarTreinamento}
        onVerComprovante={(path) => {
          void handleVerComprovante(path);
        }}
      />

      {(saving || viewLoading || actionLoading || cancelSaving || aprovarSaving || alterarResponsavelSaving) && (
        <div
          className="fixed inset-0 z-[70] bg-black/10 backdrop-blur-[1px]"
          aria-hidden
        />
      )}
    </AppShell>
  );
}
