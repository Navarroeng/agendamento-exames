"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { IconClipboard, IconShield } from "@/components/ui/icons/OutlineIcons";
import { RiscosPsicossociaisModal } from "@/components/riscos-psicossociais/RiscosPsicossociaisModal";
import { RiscosPsicossociaisSearchPanel } from "@/components/riscos-psicossociais/RiscosPsicossociaisSearchPanel";
import { RiscosPsicossociaisTable } from "@/components/riscos-psicossociais/RiscosPsicossociaisTable";
import { RiscosCancelarProcessoModal } from "@/components/riscos-psicossociais/RiscosCancelarProcessoModal";
import { RiscosRemoverProcessoModal } from "@/components/riscos-psicossociais/RiscosRemoverProcessoModal";
import { RiscosRelatorioViewerModal } from "@/components/riscos-psicossociais/RiscosRelatorioViewerModal";
import { RiscosMapaQuestionarioModal } from "@/components/riscos-psicossociais/RiscosMapaQuestionarioModal";
import { useRiscosPsicossociaisPage } from "@/hooks/useRiscosPsicossociaisPage";

export function RiscosPsicossociaisPage() {
  const {
    processos,
    loading,
    error,
    filters,
    mesSelecionado,
    statusListagem,
    responsaveis,
    modalProcesso,
    modalParticipantes,
    savingLista,
    savingLogo,
    savingCampanha,
    savingParticipante,
    handleFilterChange,
    clearFilters,
    handleMesChange,
    handleYearChange,
    handleStatusListagemChange,
    toggleStatusListagem,
    openProcesso,
    openVisualizarRelatorio,
    closeVisualizarRelatorio,
    relatorioViewerOpen,
    relatorioViewer,
    relatorioViewerLogoUrl,
    relatorioViewerCnpj,
    relatorioViewerCampanhaStatus,
    closeModal,
    handleSalvarSolicitacaoLista,
    handleSalvarRecebimentoLista,
    handleRemoverAnexoLista,
    handleVisualizarAnexoLista,
    handleUploadLogoCampanha,
    handleRemoverLogoCampanha,
    handleCriarCampanha,
    handleAbrirCampanha,
    handleEncerrarCampanha,
    handleProrrogarPrazo,
    handleReabrirCampanha,
    handleEditarPeriodo,
    handleCancelarProcesso,
    openCancelarProcesso,
    closeCancelarProcesso,
    processoParaCancelar,
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
  const [mapaQuestionarioAberto, setMapaQuestionarioAberto] = useState(false);

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

      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => setMapaQuestionarioAberto(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-[#e4ebf4] bg-white px-3 py-2 text-[13px] font-semibold text-[#64748b] shadow-[0_4px_12px_rgba(15,23,42,0.03)] transition-colors hover:border-brand-blue/30 hover:text-navy"
        >
          <IconClipboard size={15} />
          Ver perguntas por categoria
        </button>
      </div>

      <RiscosPsicossociaisTable
        processos={processos}
        loading={loading}
        error={error}
        mesSelecionado={mesSelecionado}
        onMesChange={handleMesChange}
        onYearChange={handleYearChange}
        statusListagem={statusListagem}
        onStatusListagemChange={handleStatusListagemChange}
        onToggleStatusListagem={toggleStatusListagem}
        onVisualizar={openProcesso}
        onVisualizarRelatorio={(p) => void openVisualizarRelatorio(p)}
        podeRemoverProcesso={isAdmin}
        onRemoverProcesso={openRemoverProcesso}
        savingRemover={savingRemoverProcesso}
        onCancelarProcesso={openCancelarProcesso}
        savingCancelar={savingCampanha}
      />

      <RiscosMapaQuestionarioModal
        open={mapaQuestionarioAberto}
        onClose={() => setMapaQuestionarioAberto(false)}
      />

      <RiscosCancelarProcessoModal
        open={Boolean(processoParaCancelar)}
        processo={processoParaCancelar}
        saving={savingCampanha}
        onClose={closeCancelarProcesso}
        onConfirm={(motivo) => handleCancelarProcesso(motivo)}
      />

      <RiscosRemoverProcessoModal
        open={Boolean(processoParaRemover)}
        processo={processoParaRemover}
        saving={savingRemoverProcesso}
        onClose={closeRemoverProcesso}
        onConfirm={handleRemoverProcesso}
      />

      <RiscosRelatorioViewerModal
        open={relatorioViewerOpen}
        relatorio={relatorioViewer}
        onClose={closeVisualizarRelatorio}
        logoUrl={relatorioViewerLogoUrl}
        empresaCnpj={relatorioViewerCnpj}
        campanhaStatus={relatorioViewerCampanhaStatus}
      />

      <RiscosPsicossociaisModal
        open={Boolean(modalProcesso)}
        processo={modalProcesso}
        savingLista={savingLista}
        savingLogo={savingLogo}
        savingCampanha={savingCampanha}
        participantes={modalParticipantes}
        savingParticipante={savingParticipante}
        onClose={closeModal}
        onSalvarSolicitacaoLista={handleSalvarSolicitacaoLista}
        onSalvarRecebimentoLista={handleSalvarRecebimentoLista}
        onRemoverAnexoLista={handleRemoverAnexoLista}
        onVisualizarAnexoLista={handleVisualizarAnexoLista}
        onUploadLogoCampanha={handleUploadLogoCampanha}
        onRemoverLogoCampanha={handleRemoverLogoCampanha}
        onCriarCampanha={handleCriarCampanha}
        onAbrirCampanha={handleAbrirCampanha}
        onEncerrarCampanha={handleEncerrarCampanha}
        onProrrogarPrazo={handleProrrogarPrazo}
        onReabrirCampanha={handleReabrirCampanha}
        onEditarPeriodo={handleEditarPeriodo}
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
