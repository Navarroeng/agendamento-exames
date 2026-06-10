"use client";

import { AppShell } from "@/components/layout/AppShell";
import { IconBriefcase } from "@/components/ui/icons/OutlineIcons";
import { CargoFormActions } from "./CargoFormActions";
import { CargoForm } from "./CargoForm";
import { CargoTopActions } from "./CargoTopActions";
import { CargoViewModal } from "./CargoViewModal";
import { CargosTable } from "./CargosTable";
import { useCargosPage } from "@/hooks/useCargosPage";

export function CargosPage() {
  const {
    showForm,
    editingId,
    cargos,
    loading,
    error,
    exameCounts,
    viewCargo,
    viewLoading,
    catalogAtivos,
    catalogLoading,
    form,
    setField,
    toggleExame,
    setExameAlerta,
    saving,
    resetForm,
    closeForm,
    handleNovo,
    handleEditar,
    handleVisualizar,
    handleToggleAtivo,
    handleSave,
    closeView,
  } = useCargosPage();

  return (
    <AppShell
      title="Cargos"
      subtitle="Defina cargos e exames obrigatórios para agilizar o agendamento."
      icon={<IconBriefcase size={20} />}
    >
      <CargoTopActions onNovoCargo={handleNovo} />

      <CargosTable
        cargos={cargos}
        exameCounts={exameCounts}
        loading={loading}
        error={error}
        onEditar={handleEditar}
        onVisualizar={handleVisualizar}
        onToggleAtivo={handleToggleAtivo}
      />

      {showForm && (
        <>
          <CargoForm
            form={form}
            catalogExames={catalogAtivos}
            catalogLoading={catalogLoading}
            isEditing={!!editingId}
            onChange={setField}
            onToggleExame={toggleExame}
            onSetExameAlerta={setExameAlerta}
          />
          <CargoFormActions
            saving={saving}
            isEditing={!!editingId}
            onClear={resetForm}
            onCancel={closeForm}
            onSave={handleSave}
          />
        </>
      )}

      <CargoViewModal cargo={viewCargo} onClose={closeView} />

      {(saving || viewLoading) && (
        <div
          className="fixed inset-0 z-50 bg-black/10 backdrop-blur-[1px]"
          aria-hidden
        />
      )}
    </AppShell>
  );
}
