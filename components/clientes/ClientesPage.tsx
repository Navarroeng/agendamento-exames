"use client";

import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/AppShell";

import { ClienteViewModal } from "@/components/modals/ClienteViewModal";

import { IconUsers } from "@/components/ui/icons/OutlineIcons";

import { ClienteForm } from "./ClienteForm";

import { ClienteFormActions } from "./ClienteFormActions";

import { ClienteTopActions } from "./ClienteTopActions";

import { ClientesSearchPanel } from "./ClientesSearchPanel";

import { ClientesTable } from "./ClientesTable";

import { useClienteForm } from "@/hooks/useClienteForm";

import { useClientesPaginatedList } from "@/hooks/useClientesPaginatedList";

import { useClientesPage } from "@/hooks/useClientesPage";

import { useAuditoriaUsuario } from "@/contexts/AuthContext";
import { AUDITORIA_ACOES, AUDITORIA_MODULOS } from "@/lib/auditoria";
import { hasActiveClientesListFilters } from "@/lib/cliente-filters";
import { resolveClienteCnpjError } from "@/lib/cliente-cnpj";
import { salvarCliente } from "@/services/cliente.service";
import { registrarAuditoria } from "@/services/auditoria.service";

const VALIDATION_MESSAGE =
  "Preencha Nome da empresa e CNPJ antes de salvar.";

export function ClientesPage() {
  const auditContext = useAuditoriaUsuario();
  const [showForm, setShowForm] = useState(false);

  const {
    form,
    setField,
    reset,
    buildPayload,
    validate,
    saving,
    setSaving,
  } = useClienteForm();

  const {
    clientes,
    loading,
    error,
    page,
    total,
    totalPages,
    pageSize,
    filters,
    debouncedBusca,
    highlightClienteId,
    setPage,
    setFilter,
    clearFilters,
    showClienteAposCadastro,
    refresh,
  } = useClientesPaginatedList();

  const { viewCliente, viewLoading, handleAbrir, closeView, updateViewCliente } =
    useClientesPage();

  const resetForm = () => {
    reset();
  };

  const handleNovoCliente = () => {
    resetForm();
    setShowForm(true);

    requestAnimationFrame(() => {
      document
        .getElementById("cadastrar-cliente")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleSave = async () => {
    if (!validate()) {
      toast.error(VALIDATION_MESSAGE);
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload();
      const id = await salvarCliente(payload);
      await registrarAuditoria({
        usuarioId: auditContext.usuarioId,
        usuarioNome: auditContext.usuarioNome,
        usuarioEmail: auditContext.usuarioEmail,
        modulo: AUDITORIA_MODULOS.clientes,
        acao: AUDITORIA_ACOES.criacao,
        registroId: id,
        registroNome: payload.nome,
        descricao: `${auditContext.usuarioNome} criou o cliente ${payload.nome}.`,
      });
      toast.success("Cliente salvo com sucesso!");

      resetForm();
      setShowForm(false);
      await showClienteAposCadastro(id, payload.nome);

      requestAnimationFrame(() => {
        document
          .getElementById("clientes-cadastrados")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (err) {
      console.error("Erro completo ao salvar:", err);
      const cnpjMessage = resolveClienteCnpjError(err);
      if (cnpjMessage) {
        toast.error(cnpjMessage);
        return;
      }
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "";
      toast.error(message || "Erro ao salvar cliente");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell
      title="Clientes"
      subtitle="Cadastre e gerencie os clientes da Navarro Engenharia."
      icon={<IconUsers size={20} />}
    >
      <ClienteTopActions onNovoCliente={handleNovoCliente} />

      {showForm && (
        <>
          <ClienteForm form={form} onChange={setField} />

          <ClienteFormActions
            saving={saving}
            onClear={resetForm}
            onSave={handleSave}
          />
        </>
      )}

      <div className="mb-[18px]">
        <ClientesSearchPanel
          filters={filters}
          totalFiltrados={total}
          onChange={(value) => setFilter("busca", value)}
          onClear={clearFilters}
        />
      </div>

      <div id="clientes-cadastrados">
        <ClientesTable
          clientes={clientes}
          loading={loading || viewLoading}
          error={error}
          page={page}
          total={total}
          totalPages={totalPages}
          pageSize={pageSize}
          hasActiveSearch={hasActiveClientesListFilters({ busca: debouncedBusca })}
          highlightClienteId={highlightClienteId}
          onAbrir={handleAbrir}
          onPageChange={setPage}
        />
      </div>

      <ClienteViewModal
        cliente={viewCliente}
        onClose={closeView}
        onUpdated={(updated) => {
          updateViewCliente(updated);
          refresh();
        }}
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
