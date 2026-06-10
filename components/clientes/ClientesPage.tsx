"use client";



import { toast } from "sonner";

import { AppShell } from "@/components/layout/AppShell";

import { ClienteViewModal } from "@/components/modals/ClienteViewModal";

import { IconUsers } from "@/components/ui/icons/OutlineIcons";

import { ClienteForm } from "./ClienteForm";

import { ClienteFormActions } from "./ClienteFormActions";

import { ClienteTopActions } from "./ClienteTopActions";

import { ClientesTable } from "./ClientesTable";

import { useClienteForm } from "@/hooks/useClienteForm";

import { useClientesList } from "@/hooks/useClientesList";

import { useClientesPage } from "@/hooks/useClientesPage";

import { salvarCliente } from "@/services/cliente.service";



const VALIDATION_MESSAGE =

  "Preencha Nome da empresa e CNPJ antes de salvar.";



export function ClientesPage() {

  const {

    form,

    setField,

    reset,

    buildPayload,

    validate,

    saving,

    setSaving,

  } = useClienteForm();



  const { clientes, loading, error, refresh } = useClientesList();

  const { viewCliente, viewLoading, handleAbrir, closeView } = useClientesPage();



  const resetForm = () => {

    reset();

  };



  const handleNovoCliente = () => {

    resetForm();

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

      await salvarCliente(buildPayload());

      toast.success("Cliente salvo com sucesso!");

      resetForm();

      refresh();

    } catch (err) {

      console.error("Erro completo ao salvar:", err);

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

      <ClienteForm form={form} onChange={setField} />

      <ClienteFormActions

        saving={saving}

        onClear={resetForm}

        onSave={handleSave}

      />

      <ClientesTable

        clientes={clientes}

        loading={loading || viewLoading}

        error={error}

        onAbrir={handleAbrir}

      />

      <ClienteViewModal cliente={viewCliente} onClose={closeView} />

      {saving && (

        <div

          className="fixed inset-0 z-50 bg-black/10 backdrop-blur-[1px]"

          aria-hidden

        />

      )}

    </AppShell>

  );

}

