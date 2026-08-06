"use client";

import { AppShell } from "@/components/layout/AppShell";
import { IconCalendar } from "@/components/ui/icons/OutlineIcons";
import { AgendamentoAsoRetidoModal } from "@/components/modals/AgendamentoAsoRetidoModal";
import { AgendamentoLiberarAsoRetidoModal } from "@/components/modals/AgendamentoLiberarAsoRetidoModal";
import { AgendamentoCancelarModal } from "@/components/modals/AgendamentoCancelarModal";
import { AgendamentoCargoChangeModal } from "@/components/modals/AgendamentoCargoChangeModal";
import { AgendamentoClienteInadimplenciaModal } from "@/components/modals/AgendamentoClienteInadimplenciaModal";
import { AgendamentoClienteProcuracaoModal } from "@/components/modals/AgendamentoClienteProcuracaoModal";
import { AgendamentoDuplicidade90DiasModal } from "@/components/modals/AgendamentoDuplicidade90DiasModal";
import { AgendamentoExamesAdicionaisModal } from "@/components/modals/AgendamentoExamesAdicionaisModal";
import { PeriodicoFuturoVinculoModal } from "@/components/agendamentos/PeriodicoFuturoVinculoModal";
import { CreditoAsoDisponivelModal } from "@/components/agendamentos/CreditoAsoDisponivelModal";
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
import { AGENDAMENTO_FATURA_SOMENTE_DOCUMENTACAO_MSG } from "@/lib/agendamento-documentacao";
import { parseDateBRToIso } from "@/lib/agendamento-datetime";

export function AgendamentoPage() {
  const {
    showForm,
    editingId,
    editingSomenteDocumentacao,
    viewAgendamento,
    setViewAgendamento,
    viewFaturaBloqueio,
    historicoOpen,
    historicoAgendamentoId,
    cancelModalOpen,
    cancelModalVariant,
    saving,
    form,
    setField,
    dataFieldError,
    handleDataBlur,
    clinicasAtivas,
    clientes,
    clientesLoading,
    clienteId,
    handleClienteChange,
    creditoAsoModalOpen,
    creditosAsoDisponiveis,
    creditoAsoSelectedId,
    setCreditoAsoSelectedId,
    creditoAsoEmUsoId,
    creditoAsoNumeroContrato,
    handleCreditoAsoNaoUtilizar,
    handleCreditoAsoUtilizar,
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
    tableSort,
    handleSortColumn,
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
    asoRetidoModalOpen,
    closeAsoRetidoModal,
    handleAsoRetido,
    handleConfirmarAsoRetido,
    liberarAsoRetidoModalOpen,
    closeLiberarAsoRetidoModal,
    handleLiberarAsoRetido,
    handleConfirmarLiberarAsoRetido,
    bloquearCamposAsoDocumentacao,
    handleSave,
    handleCopyMensagemClinica,
    cargoSemExames,
    duplicidade90DiasOpen,
    duplicidade90DiasInfo,
    closeDuplicidade90DiasModal,
    periodicoVinculoOpen,
    periodicoVinculoList,
    periodicoContratoNumeros,
    handleCpfBlur,
    handleCancelarPeriodicoVinculo,
    handleContinuarComPeriodicoPendente,
    handleUtilizarPeriodicoPendente,
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
    examesAdicionaisModalOpen,
    examesAdicionaisLoading,
    examesDisponiveisParaAdicionar,
    handleOpenExamesAdicionais,
    closeExamesAdicionaisModal,
    handleConfirmExamesAdicionais,
    inadimplenciaModalOpen,
    inadimplenciaPendencias,
    inadimplenciaCliente,
    closeInadimplenciaModal,
    clienteValidacaoLoading,
    formularioClienteLiberado,
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
          {editingSomenteDocumentacao ? (
            <div className="mb-3 rounded-xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-sm font-semibold leading-relaxed text-[#92400e]">
              {AGENDAMENTO_FATURA_SOMENTE_DOCUMENTACAO_MSG}
            </div>
          ) : null}
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
            readOnly={editingSomenteDocumentacao}
            contratoVigencia={contratoVigencia}
            showClienteProcuracaoAlert={
              showClienteProcuracaoAlert && !editingSomenteDocumentacao
            }
            exams={exams}
            clienteValidacaoLoading={clienteValidacaoLoading}
            formularioClienteLiberado={formularioClienteLiberado}
            dataFieldError={dataFieldError}
            onDataBlur={handleDataBlur}
            onCpfBlur={handleCpfBlur}
          />
          {creditoAsoEmUsoId && creditoAsoNumeroContrato ? (
            <div className="mb-3 rounded-xl border border-brand-blue/30 bg-brand-blue-soft px-4 py-3 text-sm font-semibold leading-relaxed text-brand-blue">
              Este agendamento utilizará 1 ASO disponível do contrato{" "}
              {creditoAsoNumeroContrato}.
            </div>
          ) : null}
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
            onIncluirExamesAdicionais={handleOpenExamesAdicionais}
            readOnly={editingSomenteDocumentacao || !formularioClienteLiberado}
          />
          <StatusDocumentacao
            form={form}
            onChange={setField}
            bloquearCamposAso={bloquearCamposAsoDocumentacao}
          >
            <FormActions
              saving={saving}
              contratoInvalido={contratoInvalido}
              somenteDocumentacao={editingSomenteDocumentacao}
              formularioClienteLiberado={formularioClienteLiberado}
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
        sort={tableSort}
        onSortColumn={handleSortColumn}
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
        onAsoRetido={handleAsoRetido}
        onLiberarAsoRetido={handleLiberarAsoRetido}
      />

      <AgendamentoViewModal
        agendamento={viewAgendamento}
        faturaBloqueio={viewFaturaBloqueio}
        onClose={() => setViewAgendamento(null)}
      />
      <AgendamentoHistoricoModal
        open={historicoOpen}
        agendamentoId={historicoAgendamentoId}
        onClose={closeHistoricoModal}
      />
      <AgendamentoCancelarModal
        open={cancelModalOpen}
        variant={cancelModalVariant}
        saving={saving}
        onClose={closeCancelModal}
        onConfirm={handleConfirmarCancelamento}
      />
      <AgendamentoAsoRetidoModal
        open={asoRetidoModalOpen}
        saving={saving}
        onClose={closeAsoRetidoModal}
        onConfirm={handleConfirmarAsoRetido}
      />
      <AgendamentoLiberarAsoRetidoModal
        open={liberarAsoRetidoModalOpen}
        saving={saving}
        onClose={closeLiberarAsoRetidoModal}
        onConfirm={handleConfirmarLiberarAsoRetido}
      />
      <AgendamentoDuplicidade90DiasModal
        open={duplicidade90DiasOpen}
        agendamento={duplicidade90DiasInfo}
        onClose={closeDuplicidade90DiasModal}
      />
      <PeriodicoFuturoVinculoModal
        open={periodicoVinculoOpen}
        periodicos={periodicoVinculoList}
        colaboradorNome={form.colaborador}
        dataAgendamentoIso={
          form.data_agendamento.trim().length >= 10
            ? parseDateBRToIso(form.data_agendamento)
            : null
        }
        contratoNumeros={periodicoContratoNumeros}
        saving={saving}
        onCancelar={handleCancelarPeriodicoVinculo}
        onContinuarSemVincular={handleContinuarComPeriodicoPendente}
        onAnteciparEVincular={handleUtilizarPeriodicoPendente}
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
      <AgendamentoClienteInadimplenciaModal
        open={inadimplenciaModalOpen}
        pendencias={inadimplenciaPendencias}
        cliente={inadimplenciaCliente}
        onClose={closeInadimplenciaModal}
      />
      <AgendamentoExamesAdicionaisModal
        open={examesAdicionaisModalOpen}
        loading={examesAdicionaisLoading}
        catalogLoading={catalogLoading}
        exames={examesDisponiveisParaAdicionar}
        onClose={closeExamesAdicionaisModal}
        onConfirm={handleConfirmExamesAdicionais}
      />
      <CreditoAsoDisponivelModal
        open={creditoAsoModalOpen}
        clienteNome={form.cliente_nome}
        creditos={creditosAsoDisponiveis}
        selectedId={creditoAsoSelectedId}
        onSelectId={setCreditoAsoSelectedId}
        onNaoUtilizar={handleCreditoAsoNaoUtilizar}
        onUtilizar={handleCreditoAsoUtilizar}
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
