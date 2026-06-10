"use client";

import { AppShell } from "@/components/layout/AppShell";
import { IconBuilding } from "@/components/ui/icons/OutlineIcons";
import { ClinicaDesativarModal } from "@/components/modals/ClinicaDesativarModal";
import { ClinicaExamesTab } from "./ClinicaExamesTab";
import { ClinicaForm } from "./ClinicaForm";
import { ClinicaFormTabs } from "./ClinicaFormTabs";
import { ClinicaFormActions } from "./ClinicaFormActions";
import { ClinicaHistoricoModal } from "@/components/modals/ClinicaHistoricoModal";
import { ClinicaTopActions } from "./ClinicaTopActions";
import { ClinicaViewModal } from "@/components/modals/ClinicaViewModal";
import { ClinicasTable } from "./ClinicasTable";
import { useClinicasPage } from "@/hooks/useClinicasPage";

export function ClinicasPage() {
  const {
    showForm,
    editingId,
    viewClinica,
    setViewClinica,
    historicoOpen,
    historicoClinicaId,
    desativarOpen,
    desativarClinicaNome,
    desativando,
    formTab,
    setFormTab,
    form,
    setField,
    saving,
    rows,
    loading,
    error,
    resetForm,
    closeForm,
    handleNovaClinica,
    handleVisualizar,
    handleEditar,
    handleHistorico,
    handleDesativar,
    closeHistoricoModal,
    closeDesativarModal,
    handleConfirmarDesativacao,
    handleSave,
  } = useClinicasPage();

  return (
    <AppShell
      title="Clínicas"
      subtitle="Gerencie clínicas credenciadas, contatos e valores de exames."
      icon={<IconBuilding size={20} />}
    >
      <ClinicaTopActions onNovaClinica={handleNovaClinica} />

      <ClinicasTable
        rows={rows}
        loading={loading}
        error={error}
        onVisualizar={handleVisualizar}
        onEditar={handleEditar}
        onDesativar={handleDesativar}
        onHistorico={handleHistorico}
      />

      {showForm && (
        <>
          <ClinicaFormTabs
            active={formTab}
            showExames={!!editingId}
            onChange={setFormTab}
          />
          {formTab === "dados" ? (
            <>
              <ClinicaForm
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
          ) : editingId ? (
            <div className="mb-[18px] overflow-hidden rounded-card border border-app-line bg-white/[0.88] p-6 shadow-card">
              <ClinicaExamesTab
                clinicaId={editingId}
                usuario={form.responsavel || "Sistema"}
              />
            </div>
          ) : null}
        </>
      )}

      <ClinicaViewModal
        clinica={viewClinica}
        onClose={() => setViewClinica(null)}
      />

      <ClinicaHistoricoModal
        open={historicoOpen}
        clinicaId={historicoClinicaId}
        onClose={closeHistoricoModal}
      />

      <ClinicaDesativarModal
        open={desativarOpen}
        nomeClinica={desativarClinicaNome}
        onClose={closeDesativarModal}
        onConfirm={handleConfirmarDesativacao}
        saving={desativando}
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
