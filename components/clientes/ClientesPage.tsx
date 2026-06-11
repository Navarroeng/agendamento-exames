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

import { useAuditoriaUsuario } from "@/contexts/AuthContext";
import { AUDITORIA_ACOES, AUDITORIA_MODULOS } from "@/lib/auditoria";
import { salvarCliente } from "@/services/cliente.service";
import { registrarAuditoria } from "@/services/auditoria.service";



const VALIDATION_MESSAGE =

  "Preencha Nome da empresa e CNPJ antes de salvar.";



export function ClientesPage() {

  const auditContext = useAuditoriaUsuario();

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

