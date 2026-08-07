"use client";

import { AppShell } from "@/components/layout/AppShell";
import { IconFileText } from "@/components/ui/icons/OutlineIcons";
import { LaudosSstModal } from "@/components/laudos-sst/LaudosSstModal";
import { LaudosSstSearchPanel } from "@/components/laudos-sst/LaudosSstSearchPanel";
import { LaudosSstTable } from "@/components/laudos-sst/LaudosSstTable";
import { useLaudosSstPage } from "@/hooks/useLaudosSstPage";

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
  } = useLaudosSstPage();

  return (
    <AppShell
      title="Laudos SST"
      subtitle="Continuidade operacional dos processos com implantação concluída."
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
      />

      <LaudosSstModal
        open={Boolean(modalProcesso)}
        processo={modalProcesso}
        tab={modalTab}
        onTabChange={setModalTab}
        onClose={closeModal}
      />
    </AppShell>
  );
}
