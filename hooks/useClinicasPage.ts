"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuditoriaUsuario } from "@/contexts/AuthContext";
import {
  buildHistoricoAlteracoesClinica,
  buildHistoricoCriacaoClinica,
  buildHistoricoStatusClinica,
} from "@/lib/clinica-historico-diff";
import { mapClinicasToTableRows } from "@/lib/clinicas-table";
import { useClinicaForm } from "@/hooks/useClinicaForm";
import { useClinicasList } from "@/hooks/useClinicasList";
import {
  atualizarClinica,
  criarClinica,
  desativarClinica,
} from "@/services/clinica.service";
import { registrarHistoricoClinica } from "@/services/clinica-historico.service";
import type { ClinicaListItem } from "@/lib/types";

const VALIDATION_MESSAGE =
  "Preencha todos os campos obrigatórios antes de salvar.";

export function useClinicasPage() {
  const auditContext = useAuditoriaUsuario();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewClinica, setViewClinica] = useState<ClinicaListItem | null>(null);
  const [historicoOpen, setHistoricoOpen] = useState(false);
  const [historicoClinicaId, setHistoricoClinicaId] = useState<string | null>(
    null
  );
  const [desativarOpen, setDesativarOpen] = useState(false);
  const [desativarTargetId, setDesativarTargetId] = useState<string | null>(
    null
  );
  const [desativando, setDesativando] = useState(false);
  const [formTab, setFormTab] = useState<"dados" | "exames">("dados");

  const {
    form,
    setField,
    reset,
    loadForm,
    buildPayload,
    validate,
    saving,
    setSaving,
  } = useClinicaForm();

  const { clinicas, loading, error, refresh, getById } = useClinicasList();

  const rows = useMemo(() => mapClinicasToTableRows(clinicas), [clinicas]);

  const resetForm = useCallback(() => {
    reset();
    setEditingId(null);
  }, [reset]);

  const closeForm = useCallback(() => {
    setShowForm(false);
    resetForm();
  }, [resetForm]);

  const openFormForCreate = useCallback(() => {
    resetForm();
    setFormTab("dados");
    setShowForm(true);
    requestAnimationFrame(() => {
      document
        .getElementById("cadastrar-clinica")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [resetForm]);

  const handleNovaClinica = useCallback(() => {
    openFormForCreate();
  }, [openFormForCreate]);

  const handleVisualizar = useCallback(
    (id: string) => {
      const clinica = getById(id);
      if (!clinica) {
        toast.error("Clínica não encontrada.");
        return;
      }
      setViewClinica(clinica);
    },
    [getById]
  );

  const handleEditar = useCallback(
    (id: string) => {
      const clinica = getById(id);
      if (!clinica) {
        toast.error("Clínica não encontrada.");
        return;
      }
      loadForm(clinica);
      setEditingId(id);
      setFormTab("dados");
      setShowForm(true);
      requestAnimationFrame(() => {
        document
          .getElementById("cadastrar-clinica")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    },
    [getById, loadForm]
  );

  const handleHistorico = useCallback((id: string) => {
    setHistoricoClinicaId(id);
    setHistoricoOpen(true);
  }, []);

  const handleDesativar = useCallback(
    (id: string) => {
      const clinica = getById(id);
      if (!clinica) {
        toast.error("Clínica não encontrada.");
        return;
      }
      if (clinica.status === "inativa") {
        toast.error("Esta clínica já está inativa.");
        return;
      }
      setDesativarTargetId(id);
      setDesativarOpen(true);
    },
    [getById]
  );

  const closeHistoricoModal = useCallback(() => {
    setHistoricoOpen(false);
    setHistoricoClinicaId(null);
  }, []);

  const closeDesativarModal = useCallback(() => {
    if (desativando) return;
    setDesativarOpen(false);
    setDesativarTargetId(null);
  }, [desativando]);

  const handleConfirmarDesativacao = useCallback(async () => {
    if (!desativarTargetId) return;

    const clinica = getById(desativarTargetId);
    if (!clinica) {
      toast.error("Clínica não encontrada.");
      return;
    }

    setDesativando(true);
    try {
      await desativarClinica(desativarTargetId);
      await registrarHistoricoClinica(
        desativarTargetId,
        clinica.responsavel,
        buildHistoricoStatusClinica(clinica.responsavel, "inativa"),
        {
          auditContext,
          registroNome: clinica.nome_fantasia,
        }
      );
      toast.success("Clínica desativada com sucesso.");
      setDesativarOpen(false);
      setDesativarTargetId(null);
      refresh();
    } catch (err) {
      console.error("Erro ao desativar:", err);
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "";
      toast.error(message || "Erro ao desativar clínica");
    } finally {
      setDesativando(false);
    }
  }, [desativarTargetId, getById, refresh]);

  const handleSave = useCallback(async () => {
    if (!validate()) {
      toast.error(VALIDATION_MESSAGE);
      return;
    }

    const payload = buildPayload();
    const usuario = payload.responsavel;

    setSaving(true);
    try {
      if (editingId) {
        const anterior = getById(editingId);
        if (!anterior) {
          toast.error("Clínica não encontrada.");
          return;
        }

        await atualizarClinica(editingId, payload);
        const entries = buildHistoricoAlteracoesClinica(
          anterior,
          payload,
          usuario
        );
        if (entries.length > 0) {
          await registrarHistoricoClinica(editingId, usuario, entries, {
            auditContext,
            registroNome: payload.nome_fantasia,
          });
        }
        toast.success("Clínica atualizada com sucesso!");
      } else {
        const novoId = await criarClinica(payload);
        await registrarHistoricoClinica(
          novoId,
          usuario,
          buildHistoricoCriacaoClinica(usuario),
          {
            auditContext,
            registroNome: payload.nome_fantasia,
          }
        );
        toast.success("Clínica salva com sucesso!");
      }

      closeForm();
      refresh();
    } catch (err) {
      console.error("Erro completo ao salvar:", err);
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "";
      toast.error(message || "Erro ao salvar clínica");
    } finally {
      setSaving(false);
    }
  }, [
    validate,
    buildPayload,
    setSaving,
    editingId,
    getById,
    closeForm,
    refresh,
  ]);

  const desativarClinicaNome =
    (desativarTargetId && getById(desativarTargetId)?.nome_fantasia) || "";

  return {
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
  };
}
