"use client";

import { AppShell } from "@/components/layout/AppShell";
import { IconFlask } from "@/components/ui/icons/OutlineIcons";
import { ExameCatalogForm } from "./ExameCatalogForm";
import { ExamesCatalogTable } from "./ExamesCatalogTable";
import { ClinicaFormActions } from "@/components/clinicas/ClinicaFormActions";
import { ExameTopActions } from "./ExameTopActions";
import { useExamesPage } from "@/hooks/useExamesPage";

export function ExamesPage() {
  const {
    showForm,
    editingId,
    exames,
    loading,
    error,
    form,
    setField,
    saving,
    resetForm,
    closeForm,
    handleNovo,
    handleEditar,
    handleToggleAtivo,
    handleSave,
  } = useExamesPage();

  return (
    <AppShell
      title="Exames"
      subtitle="Catálogo de exames e valores padrão Navarro."
      icon={<IconFlask size={20} />}
    >
      <ExameTopActions onNovoExame={handleNovo} />

      <ExamesCatalogTable
        exames={exames}
        loading={loading}
        error={error}
        onEditar={handleEditar}
        onToggleAtivo={handleToggleAtivo}
      />

      {showForm && (
        <>
          <ExameCatalogForm
            form={form}
            isEditing={!!editingId}
            onChange={setField}
          />
          <ClinicaFormActions
            saving={saving}
            isEditing={!!editingId}
            onClear={resetForm}
            onCancel={closeForm}
            onSave={handleSave}
          />
        </>
      )}

      {saving && (
        <div
          className="fixed inset-0 z-50 bg-black/10 backdrop-blur-[1px]"
          aria-hidden
        />
      )}
    </AppShell>
  );
}
