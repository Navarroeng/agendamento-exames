"use client";

import { AppShell } from "@/components/layout/AppShell";
import { IconClock } from "@/components/ui/icons/OutlineIcons";
import { usePeriodicosFuturosPage } from "@/hooks/usePeriodicosFuturosPage";
import { PeriodicoAdicionarCpfModal } from "./PeriodicoAdicionarCpfModal";
import { PeriodicoCancelarModal } from "./PeriodicoCancelarModal";
import { PeriodicoEditarProximaDataModal } from "./PeriodicoEditarProximaDataModal";
import { PeriodicosFuturosCards } from "./PeriodicosFuturosCards";
import { PeriodicosFuturosFilters } from "./PeriodicosFuturosFilters";
import { PeriodicosFuturosTable } from "./PeriodicosFuturosTable";

export function PeriodicosFuturosPage() {
  const {
    loading,
    saving,
    error,
    filters,
    mesSelecionado,
    anosDisponiveis,
    filterOptions,
    filteredRecords,
    paginatedRecords,
    counts,
    page,
    totalPages,
    activeCard,
    editProximaDataRecord,
    adicionarCpfGrupo,
    adicionarCpfError,
    handleFilterChange,
    handleClearFilters,
    handleMesChange,
    handleYearChange,
    handleCardClick,
    setPage,
    handleCriarAgendamento,
    handleVisualizarAgendamento,
    handleMarcarReagendado,
    handleAbrirCancelarPeriodico,
    handleAbrirEditarProximaData,
    handleFecharEditarProximaData,
    handleSalvarProximaData,
    handleAbrirAdicionarCpf,
    handleFecharAdicionarCpf,
    handleSalvarCpf,
    canActOnRecord,
    canCancelarPeriodico,
    cancelarGrupo,
    cancelarError,
    cancelarTemAgendamentoAtivo,
    handleFecharCancelarPeriodico,
    handleConfirmarCancelarPeriodico,
  } = usePeriodicosFuturosPage();

  return (
    <AppShell
      title="Periódicos Futuros"
      subtitle="Acompanhe exames periódicos gerados pelos agendamentos e programações da Implantação."
      icon={<IconClock size={20} />}
    >
      <PeriodicosFuturosCards
        counts={counts}
        activeCard={activeCard}
        onCardClick={handleCardClick}
      />

      <div className="mt-4">
        <PeriodicosFuturosFilters
          filters={filters}
          options={filterOptions}
          totalFiltrados={filteredRecords.length}
          loading={loading}
          onChange={handleFilterChange}
          onClear={handleClearFilters}
        />
      </div>

      <div className="mt-4">
        <PeriodicosFuturosTable
          records={paginatedRecords}
          loading={loading}
          error={error}
          saving={saving}
          mesSelecionado={mesSelecionado}
          anosDisponiveis={anosDisponiveis}
          onMesChange={handleMesChange}
          onYearChange={handleYearChange}
          canActOnRecord={canActOnRecord}
          onCriarAgendamento={handleCriarAgendamento}
          onEditarProximaData={handleAbrirEditarProximaData}
          onMarcarReagendado={handleMarcarReagendado}
          onCancelarPeriodico={handleAbrirCancelarPeriodico}
          canCancelarPeriodico={canCancelarPeriodico}
          onVisualizarAgendamento={handleVisualizarAgendamento}
          onAdicionarCpf={handleAbrirAdicionarCpf}
        />
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            className="rounded-lg border border-[#e2e8f0] px-3 py-1.5 text-xs font-bold text-navy disabled:opacity-40"
            disabled={page <= 1 || loading}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            Anterior
          </button>
          <span className="text-xs text-[#64748b]">
            Página {page} de {totalPages}
          </span>
          <button
            type="button"
            className="rounded-lg border border-[#e2e8f0] px-3 py-1.5 text-xs font-bold text-navy disabled:opacity-40"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          >
            Próxima
          </button>
        </div>
      )}

      <PeriodicoEditarProximaDataModal
        open={Boolean(editProximaDataRecord)}
        record={editProximaDataRecord}
        saving={saving}
        onClose={handleFecharEditarProximaData}
        onSave={handleSalvarProximaData}
      />
      <PeriodicoAdicionarCpfModal
        open={Boolean(adicionarCpfGrupo)}
        grupo={adicionarCpfGrupo}
        saving={saving}
        error={adicionarCpfError}
        onClose={handleFecharAdicionarCpf}
        onSave={handleSalvarCpf}
      />
      <PeriodicoCancelarModal
        open={Boolean(cancelarGrupo)}
        grupo={cancelarGrupo}
        temAgendamentoAtivoVinculado={cancelarTemAgendamentoAtivo}
        saving={saving}
        error={cancelarError}
        onClose={handleFecharCancelarPeriodico}
        onConfirm={handleConfirmarCancelarPeriodico}
      />
    </AppShell>
  );
}
