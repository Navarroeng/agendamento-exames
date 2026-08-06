"use client";

import { AppShell } from "@/components/layout/AppShell";
import { IconChecklist } from "@/components/ui/icons/OutlineIcons";
import { OrcamentoAprovarModal } from "@/components/orcamentos/OrcamentoAprovarModal";
import { ImplantacaoSearchPanel } from "@/components/implantacao/ImplantacaoSearchPanel";
import { ImplantacaoSummaryCards } from "@/components/implantacao/ImplantacaoSummaryCards";
import { ImplantacaoTable } from "@/components/implantacao/ImplantacaoTable";
import { useImplantacaoClientesPage } from "@/hooks/useImplantacaoClientesPage";

export function ImplantacaoClientesPage() {
  const {
    processos,
    loading,
    error,
    filters,
    mesSelecionado,
    summary,
    responsaveis,
    actionLoading,
    modalOpen,
    modalOrcamento,
    modalAprovacao,
    modalInitialTab,
    modalSaving,
    servicos,
    usuarioNome,
    funcionariosPreviewUrl,
    logoPreviewUrl,
    modalTreinamento,
    modalTreinamentoEventos,
    handleFilterChange,
    clearFilters,
    handleMesChange,
    handleVisualizar,
    handleContinuar,
    closeModal,
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
  } = useImplantacaoClientesPage();

  return (
    <AppShell
      title="Implantação de Clientes"
      subtitle="Acompanhe as etapas necessárias após a aprovação do orçamento."
      icon={<IconChecklist size={20} />}
    >
      <div className="mb-[18px]">
        <ImplantacaoSummaryCards stats={summary} />
      </div>

      <div className="mb-[18px]">
        <ImplantacaoSearchPanel
          filters={filters}
          totalFiltrados={processos.length}
          responsaveis={responsaveis}
          onChange={handleFilterChange}
          onClear={clearFilters}
        />
      </div>

      <ImplantacaoTable
        processos={processos}
        loading={loading}
        error={error}
        mesSelecionado={mesSelecionado}
        onMesChange={handleMesChange}
        onVisualizar={(id) => {
          void handleVisualizar(id);
        }}
        onContinuar={(id) => {
          void handleContinuar(id);
        }}
      />

      <OrcamentoAprovarModal
        open={modalOpen}
        mode="consulta"
        initialTab={modalInitialTab}
        orcamento={modalOrcamento}
        aprovacao={modalAprovacao}
        servicos={servicos}
        saving={modalSaving}
        usuarioNome={usuarioNome}
        funcionariosPreviewUrl={funcionariosPreviewUrl}
        logoPreviewUrl={logoPreviewUrl}
        onClose={closeModal}
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
        treinamento={modalTreinamento}
        treinamentoEventos={modalTreinamentoEventos}
        onSalvarTreinamento={handleSalvarTreinamento}
        onVerComprovante={(path) => {
          void handleVerComprovante(path);
        }}
      />

      {(actionLoading || modalSaving) && (
        <div
          className="fixed inset-0 z-[70] bg-black/10 backdrop-blur-[1px]"
          aria-hidden
        />
      )}
    </AppShell>
  );
}
