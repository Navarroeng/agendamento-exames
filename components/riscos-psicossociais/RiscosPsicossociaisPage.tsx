"use client";

import { AppShell } from "@/components/layout/AppShell";
import { IconShield } from "@/components/ui/icons/OutlineIcons";
import { RiscosPsicossociaisModal } from "@/components/riscos-psicossociais/RiscosPsicossociaisModal";
import { RiscosPsicossociaisSearchPanel } from "@/components/riscos-psicossociais/RiscosPsicossociaisSearchPanel";
import { RiscosPsicossociaisTable } from "@/components/riscos-psicossociais/RiscosPsicossociaisTable";
import { RiscosRemoverProcessoModal } from "@/components/riscos-psicossociais/RiscosRemoverProcessoModal";
import { useRiscosPsicossociaisPage } from "@/hooks/useRiscosPsicossociaisPage";

export function RiscosPsicossociaisPage() {
  const {
    processos,
    loading,
    error,
    filters,
    mesSelecionado,
    responsaveis,
    modalProcesso,
    modalParticipantes,
    savingLista,
    savingCampanha,
    savingParticipante,
    handleFilterChange,
    clearFilters,
    handleMesChange,
    handleYearChange,
    openProcesso,
    closeModal,
    handleSalvarSolicitacaoLista,
    handleSalvarRecebimentoLista,
    handleRemoverAnexoLista,
    handleVisualizarAnexoLista,
    handleCriarCampanha,
    handleAbrirCampanha,
    handleEncerrarCampanha,
    handleCancelarProcesso,
    handleExcluirCampanha,
    exclusaoDefinitivaDisponivel,
    isAdmin,
    processoParaRemover,
    openRemoverProcesso,
    closeRemoverProcesso,
    handleRemoverProcesso,
    savingRemoverProcesso,
    handleGarantirCodigoAcesso,
    handleCriarParticipante,
    handleEditarParticipante,
    handlePrepararImportacaoParticipantesExcel,
    handleConfirmarImportacaoParticipantesExcel,
    handleRemoverParticipante,
    campanhaStatusSincronizado,
    auditContext,
    handleRelatorioAtualizado,
  } = useRiscosPsicossociaisPage();

  return (
    <AppShell
      title="Riscos Psicossociais"
      subtitle="Painel operacional das pesquisas psicossociais. Acompanhe pré-requisitos, participantes e andamento em uma única tela."
      icon={<IconShield size={20} />}
    >
      <div className="mb-[18px]">
        <RiscosPsicossociaisSearchPanel
          filters={filters}
          totalFiltrados={processos.length}
          responsaveis={responsaveis}
          onChange={handleFilterChange}
          onClear={clearFilters}
        />
      </div>

      <RiscosPsicossociaisTable
        processos={processos}
        loading={loading}
        error={error}
        mesSelecionado={mesSelecionado}
        onMesChange={handleMesChange}
        onYearChange={handleYearChange}
        onVisualizar={openProcesso}
        podeRemoverProcesso={isAdmin}
        onRemoverProcesso={openRemoverProcesso}
        savingRemover={savingRemoverProcesso}
      />

      <RiscosRemoverProcessoModal
        open={Boolean(processoParaRemover)}
        processo={processoParaRemover}
        saving={savingRemoverProcesso}
        onClose={closeRemoverProcesso}
        onConfirm={handleRemoverProcesso}
      />

      <RiscosPsicossociaisModal
        open={Boolean(modalProcesso)}
        processo={modalProcesso}
        savingLista={savingLista}
        savingCampanha={savingCampanha}
        participantes={modalParticipantes}
        savingParticipante={savingParticipante}
        onClose={closeModal}
        onSalvarSolicitacaoLista={handleSalvarSolicitacaoLista}
        onSalvarRecebimentoLista={handleSalvarRecebimentoLista}
        onRemoverAnexoLista={handleRemoverAnexoLista}
        onVisualizarAnexoLista={handleVisualizarAnexoLista}
        onCriarCampanha={handleCriarCampanha}
        onAbrirCampanha={handleAbrirCampanha}
        onEncerrarCampanha={handleEncerrarCampanha}
        onCancelarProcesso={handleCancelarProcesso}
        onExcluirCampanha={handleExcluirCampanha}
        exclusaoDefinitivaDisponivel={exclusaoDefinitivaDisponivel}
        onGarantirCodigoAcesso={handleGarantirCodigoAcesso}
        onCriarParticipante={handleCriarParticipante}
        onEditarParticipante={handleEditarParticipante}
        onPrepararImportacaoParticipantesExcel={
          handlePrepararImportacaoParticipantesExcel
        }
        onConfirmarImportacaoParticipantesExcel={
          handleConfirmarImportacaoParticipantesExcel
        }
        onRemoverParticipante={handleRemoverParticipante}
        podeGerenciarParticipante={isAdmin}
        campanhaStatusSincronizado={campanhaStatusSincronizado}
        auditContext={auditContext}
        onRelatorioAtualizado={handleRelatorioAtualizado}
      />
    </AppShell>
  );
}
