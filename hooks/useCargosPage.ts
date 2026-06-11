"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuditoriaUsuario } from "@/contexts/AuthContext";
import { AUDITORIA_ACOES, AUDITORIA_MODULOS } from "@/lib/auditoria";
import { useCargoForm } from "@/hooks/useCargoForm";
import { useCargosList } from "@/hooks/useCargosList";
import { useExamesCatalogOptions } from "@/hooks/useExams";
import {
  atualizarCargoComExames,
  buscarCargoComExames,
  contarExamesPorCargo,
  criarCargoComExames,
  setCargoAtivo,
} from "@/services/cargo.service";
import { registrarAuditoria } from "@/services/auditoria.service";
import type { CargoComExames } from "@/lib/types";

export function useCargosPage() {
  const auditContext = useAuditoriaUsuario();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewCargo, setViewCargo] = useState<CargoComExames | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [exameCounts, setExameCounts] = useState<Record<string, number>>({});

  const { cargos, loading, error, refresh, getById } = useCargosList();
  const { exames: catalogExames, loading: catalogLoading } =
    useExamesCatalogOptions();

  const {
    form,
    setField,
    toggleExame,
    reset,
    loadForm,
    buildPayload,
    getValidationError,
    saving,
    setSaving,
  } = useCargoForm();

  useEffect(() => {
    if (cargos.length === 0) {
      setExameCounts({});
      return;
    }

    contarExamesPorCargo(cargos.map((cargo) => cargo.id))
      .then(setExameCounts)
      .catch((err) => {
        console.error("Erro ao contar exames por cargo:", err);
      });
  }, [cargos]);

  const resetForm = useCallback(() => {
    reset();
    setEditingId(null);
  }, [reset]);

  const closeForm = useCallback(() => {
    setShowForm(false);
    resetForm();
  }, [resetForm]);

  const handleNovo = useCallback(() => {
    resetForm();
    setShowForm(true);
    requestAnimationFrame(() => {
      document
        .getElementById("cadastrar-cargo")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [resetForm]);

  const handleEditar = useCallback(
    async (id: string) => {
      setViewLoading(true);
      try {
        const cargo = await buscarCargoComExames(id);
        if (!cargo) {
          toast.error("Cargo não encontrado.");
          return;
        }
        loadForm(cargo);
        setEditingId(id);
        setShowForm(true);
        requestAnimationFrame(() => {
          document
            .getElementById("cadastrar-cargo")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      } catch (err) {
        console.error(err);
        toast.error("Erro ao carregar cargo.");
      } finally {
        setViewLoading(false);
      }
    },
    [loadForm]
  );

  const handleVisualizar = useCallback(async (id: string) => {
    setViewLoading(true);
    try {
      const cargo = await buscarCargoComExames(id);
      if (!cargo) {
        toast.error("Cargo não encontrado.");
        return;
      }
      setViewCargo(cargo);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar exames do cargo.");
    } finally {
      setViewLoading(false);
    }
  }, []);

  const handleToggleAtivo = useCallback(
    async (id: string) => {
      const cargo = getById(id);
      if (!cargo) return;

      try {
        await setCargoAtivo(id, !cargo.ativo);
        await registrarAuditoria({
          usuarioId: auditContext.usuarioId,
          usuarioNome: auditContext.usuarioNome,
          usuarioEmail: auditContext.usuarioEmail,
          modulo: AUDITORIA_MODULOS.cargos,
          acao: cargo.ativo
            ? AUDITORIA_ACOES.desativacao
            : AUDITORIA_ACOES.ativacao,
          registroId: id,
          registroNome: cargo.nome,
          descricao: `${auditContext.usuarioNome} ${cargo.ativo ? "desativou" : "ativou"} o cargo ${cargo.nome}.`,
        });
        toast.success(cargo.ativo ? "Cargo desativado." : "Cargo ativado.");
        refresh();
      } catch {
        toast.error("Erro ao alterar status do cargo.");
      }
    },
    [getById, refresh, auditContext]
  );

  const handleSave = useCallback(async () => {
    const validationError = getValidationError();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const payload = buildPayload();
    setSaving(true);
    try {
      if (editingId) {
        await atualizarCargoComExames(
          editingId,
          payload,
          form.exameIds
        );
        await registrarAuditoria({
          usuarioId: auditContext.usuarioId,
          usuarioNome: auditContext.usuarioNome,
          usuarioEmail: auditContext.usuarioEmail,
          modulo: AUDITORIA_MODULOS.cargos,
          acao: AUDITORIA_ACOES.edicao,
          registroId: editingId,
          registroNome: payload.nome,
          descricao: `${auditContext.usuarioNome} editou o cargo ${payload.nome}.`,
        });
        toast.success("Cargo atualizado!");
      } else {
        const novoId = await criarCargoComExames(
          payload,
          form.exameIds
        );
        await registrarAuditoria({
          usuarioId: auditContext.usuarioId,
          usuarioNome: auditContext.usuarioNome,
          usuarioEmail: auditContext.usuarioEmail,
          modulo: AUDITORIA_MODULOS.cargos,
          acao: AUDITORIA_ACOES.criacao,
          registroId: novoId,
          registroNome: payload.nome,
          descricao: `${auditContext.usuarioNome} criou o cargo ${payload.nome}.`,
        });
        toast.success("Cargo cadastrado!");
      }
      closeForm();
      refresh();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "";
      toast.error(message || "Erro ao salvar cargo.");
    } finally {
      setSaving(false);
    }
  }, [
    getValidationError,
    buildPayload,
    editingId,
    form.exameIds,
    closeForm,
    refresh,
    setSaving,
    auditContext,
  ]);

  const catalogAtivos = useMemo(
    () => catalogExames.filter((exame) => exame.ativo),
    [catalogExames]
  );

  return {
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
    saving,
    resetForm,
    closeForm,
    handleNovo,
    handleEditar,
    handleVisualizar,
    handleToggleAtivo,
    handleSave,
    closeView: () => setViewCargo(null),
  };
}
