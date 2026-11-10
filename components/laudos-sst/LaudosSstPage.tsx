"use client";

import { useCallback, useEffect, useRef } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { IconFileText } from "@/components/ui/icons/OutlineIcons";
import { LaudosSstModal } from "@/components/laudos-sst/LaudosSstModal";
import { LaudosPontualModal } from "@/components/laudos-sst/LaudosPontualModal";
import { LaudosSstSearchPanel } from "@/components/laudos-sst/LaudosSstSearchPanel";
import { LaudosSstTable } from "@/components/laudos-sst/LaudosSstTable";
import { OrcamentoAprovarModal } from "@/components/orcamentos/OrcamentoAprovarModal";
import { useLaudosSstPage } from "@/hooks/useLaudosSstPage";
import { useOrcamentoProcessoModal } from "@/hooks/useOrcamentoProcessoModal";

function restaurarRolagem(y: number) {
  const apply = () => window.scrollTo(0, y);
  apply();
  requestAnimationFrame(apply);
  window.setTimeout(apply, 0);
}

export function LaudosSstPage() {
  const {
    processos,
    loading,
    error,
    filters,
    mesSelecionado,
    responsaveis,
    modalProcesso,
    modalTab,
    setModalTab,
    handleFilterChange,
    clearFilters,
    handleMesChange,
    handleYearChange,
    openProcesso,
    closeModal,
    handleModalSaved,
    refresh,
  } = useLaudosSstPage();

  const atualizarLista = useCallback(() => {
    void refresh({ silent: true });
  }, [refresh]);
  const financeiro = useOrcamentoProcessoModal({ onChanged: atualizarLista });
  const scrollYRef = useRef<number | null>(null);
  const orcamentoAbertoRef = useRef(false);

  const abrirOrcamento = useCallback(
    (orcamentoId: string) => {
      scrollYRef.current = window.scrollY;
      void financeiro.openProcesso(orcamentoId, "financeiro");
    },
    [financeiro.openProcesso]
  );

  const fecharOrcamento = useCallback(() => {
    financeiro.closeModal();
  }, [financeiro.closeModal]);

  useEffect(() => {
    if (financeiro.modalOpen) {
      orcamentoAbertoRef.current = true;
      return;
    }
    if (!orcamentoAbertoRef.current) return;
    orcamentoAbertoRef.current = false;
    const y = scrollYRef.current;
    scrollYRef.current = null;
    if (y == null) return;
    restaurarRolagem(y);
  }, [financeiro.modalOpen]);

  return (
    <AppShell
      title="Laudos SST"
      subtitle="Elaboração dos laudos após a visita técnica concluída, em paralelo com os agendamentos."
      icon={<IconFileText size={20} />}
    >
      <div className="mb-[18px]">
        <LaudosSstSearchPanel
          filters={filters}
          totalFiltrados={processos.length}
          responsaveis={responsaveis}
          onChange={handleFilterChange}
          onClear={clearFilters}
        />
      </div>

      <LaudosSstTable
        processos={processos}
        loading={loading}
        error={error}
        mesSelecionado={mesSelecionado}
        onMesChange={handleMesChange}
        onYearChange={handleYearChange}
        onVisualizar={openProcesso}
        onAbrirOrcamento={abrirOrcamento}
      />

      {modalProcesso?.laudoPontualKind ? (
        <LaudosPontualModal
          open={Boolean(modalProcesso)}
          processo={modalProcesso}
          onClose={closeModal}
          onSaved={handleModalSaved}
        />
      ) : (
        <LaudosSstModal
          open={Boolean(modalProcesso)}
          processo={modalProcesso}
          tab={modalTab}
          onTabChange={setModalTab}
          onClose={closeModal}
          onSaved={handleModalSaved}
        />
      )}

      <OrcamentoAprovarModal
        open={financeiro.modalOpen}
        mode="consulta"
        initialTab={financeiro.modalInitialTab}
        ancorarAba="financeiro"
        orcamento={financeiro.modalOrcamento}
        aprovacao={financeiro.modalAprovacao}
        servicos={financeiro.servicos}
        saving={financeiro.modalSaving}
        usuarioNome={financeiro.usuarioNome}
        funcionariosPreviewUrl={financeiro.funcionariosPreviewUrl}
        logoPreviewUrl={financeiro.logoPreviewUrl}
        onClose={fecharOrcamento}
        onSalvarAprovacao={financeiro.handleSalvarAprovacao}
        onAtualizarCondicoesAprovadas={financeiro.handleAtualizarCondicoesAprovadas}
        onListarHistoricoCondicoes={financeiro.handleListarHistoricoCondicoes}
        onSalvarContrato={financeiro.handleSalvarContrato}
        onSalvarFinanceiro={financeiro.handleSalvarFinanceiro}
        onSalvarProcuracao={financeiro.handleSalvarProcuracao}
        onSalvarFuncionarios={financeiro.handleSalvarFuncionarios}
        onSubstituirFuncionarios={financeiro.handleSubstituirFuncionarios}
        onRemoverFuncionarios={financeiro.handleRemoverFuncionarios}
        onAprovacaoAtualizada={financeiro.handleAprovacaoAtualizada}
        onSalvarLogo={financeiro.handleSalvarLogo}
        onSubstituirLogo={financeiro.handleSubstituirLogo}
        onRemoverLogo={financeiro.handleRemoverLogo}
        onSalvarVisita={financeiro.handleSalvarVisita}
        treinamento={financeiro.modalTreinamento}
        treinamentoEventos={financeiro.modalTreinamentoEventos}
        onSalvarTreinamento={financeiro.handleSalvarTreinamento}
        onVerComprovante={(path) => {
          void financeiro.handleVerComprovante(path);
        }}
      />
      {(financeiro.actionLoading || financeiro.modalSaving) && (
        <div
          className="fixed inset-0 z-[70] bg-black/10 backdrop-blur-[1px]"
          aria-hidden
        />
      )}
    </AppShell>
  );
}
