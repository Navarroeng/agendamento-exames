"use client";

import { AppShell } from "@/components/layout/AppShell";
import { IconShield } from "@/components/ui/icons/OutlineIcons";
import { RiscosPsicossociaisModal } from "@/components/riscos-psicossociais/RiscosPsicossociaisModal";
import { RiscosPsicossociaisSearchPanel } from "@/components/riscos-psicossociais/RiscosPsicossociaisSearchPanel";
import { RiscosPsicossociaisTable } from "@/components/riscos-psicossociais/RiscosPsicossociaisTable";
import { useRiscosPsicossociaisPage } from "@/hooks/useRiscosPsicossociaisPage";

export function RiscosPsicossociaisPage() {
  const {
    processos,
    loading,
    error,
    filters,
    responsaveis,
    modalProcesso,
    modalTab,
    setModalTab,
    handleFilterChange,
    clearFilters,
    openProcesso,
    closeModal,
  } = useRiscosPsicossociaisPage();

  return (
    <AppShell
      title="Riscos Psicossociais"
      subtitle="Continuidade operacional dos processos com Laudos SST concluídos."
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
        onVisualizar={openProcesso}
      />

      <RiscosPsicossociaisModal
        open={Boolean(modalProcesso)}
        processo={modalProcesso}
        tab={modalTab}
        onTabChange={setModalTab}
        onClose={closeModal}
      />
    </AppShell>
  );
}
