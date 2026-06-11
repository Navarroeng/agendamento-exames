"use client";

import { maskMoneyInput } from "@/lib/money";
import type { AuditoriaUsuarioContext } from "@/lib/auditoria";
import { ClinicaExamesAddForm } from "./ClinicaExamesAddForm";
import { ClinicaExamesLinkedTable } from "./ClinicaExamesLinkedTable";
import { useClinicaExamesTab } from "@/hooks/useClinicaExamesTab";

interface ClinicaExamesTabProps {
  clinicaId: string;
  usuario: string;
  auditContext?: AuditoriaUsuarioContext;
  clinicaNome?: string | null;
}

export function ClinicaExamesTab({
  clinicaId,
  usuario,
  auditContext,
  clinicaNome,
}: ClinicaExamesTabProps) {
  const {
    loading,
    saving,
    search,
    setSearch,
    showAdd,
    setShowAdd,
    addExameId,
    setAddExameId,
    addCusto,
    setAddCusto,
    addPrazo,
    setAddPrazo,
    editingId,
    setEditingId,
    editCusto,
    setEditCusto,
    editValorNavarro,
    setEditValorNavarro,
    editPrazo,
    setEditPrazo,
    filtered,
    examesDisponiveis,
    handleAdd,
    startEdit,
    handleSaveEdit,
    handleToggleAtivo,
  } = useClinicaExamesTab({
    clinicaId,
    usuario,
    auditContext,
    clinicaNome,
  });

  if (loading) {
    return (
      <p className="py-10 text-center text-sm text-app-muted">
        Carregando exames da clínica...
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          className="field-input h-10 max-w-md text-sm"
          placeholder="Pesquisar exame..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-primary justify-center sm:w-auto"
          onClick={() => setShowAdd((v) => !v)}
        >
          + Adicionar exame
        </button>
      </div>

      {showAdd && (
        <ClinicaExamesAddForm
          examesDisponiveis={examesDisponiveis}
          addExameId={addExameId}
          addCusto={addCusto}
          addPrazo={addPrazo}
          saving={saving}
          onExameChange={setAddExameId}
          onCustoChange={setAddCusto}
          onPrazoChange={setAddPrazo}
          onSave={handleAdd}
        />
      )}

      <ClinicaExamesLinkedTable
        items={filtered}
        editingId={editingId}
        editCusto={editCusto}
        editValorNavarro={editValorNavarro}
        editPrazo={editPrazo}
        saving={saving}
        onEditCustoChange={(v) => setEditCusto(maskMoneyInput(v))}
        onEditValorNavarroChange={(v) => setEditValorNavarro(maskMoneyInput(v))}
        onEditPrazoChange={setEditPrazo}
        onStartEdit={startEdit}
        onCancelEdit={() => setEditingId(null)}
        onSaveEdit={handleSaveEdit}
        onToggleAtivo={handleToggleAtivo}
      />
    </div>
  );
}
