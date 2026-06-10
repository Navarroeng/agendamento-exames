"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useExameCatalogForm } from "@/hooks/useExameCatalogForm";
import { useExamesList } from "@/hooks/useExamesList";
import { formatMoney } from "@/lib/money";
import {
  atualizarExame,
  criarExame,
  setExameAtivo,
} from "@/services/exame.service";
import { registrarHistoricoExame } from "@/services/exame-historico.service";

const VALIDATION_MESSAGE =
  "Preencha nome e valor Navarro antes de salvar.";

export function useExamesPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { exames, loading, error, refresh, getById } = useExamesList();

  const {
    form,
    setField,
    reset,
    loadForm,
    buildPayload,
    validate,
    saving,
    setSaving,
  } = useExameCatalogForm();

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
        .getElementById("cadastrar-exame")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [resetForm]);

  const handleEditar = useCallback(
    (id: string) => {
      const exame = getById(id);
      if (!exame) {
        toast.error("Exame não encontrado.");
        return;
      }
      loadForm(exame);
      setEditingId(id);
      setShowForm(true);
      requestAnimationFrame(() => {
        document
          .getElementById("cadastrar-exame")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    },
    [getById, loadForm]
  );

  const handleToggleAtivo = useCallback(
    async (id: string) => {
      const exame = getById(id);
      if (!exame) return;

      try {
        await setExameAtivo(id, !exame.ativo);
        await registrarHistoricoExame(id, "Sistema", [
          {
            acao: exame.ativo ? "Desativação" : "Ativação",
            detalhes: `Exame ${exame.nome} ${exame.ativo ? "desativado" : "ativado"} no catálogo.`,
          },
        ]);
        toast.success(exame.ativo ? "Exame desativado." : "Exame ativado.");
        refresh();
      } catch {
        toast.error("Erro ao alterar status.");
      }
    },
    [getById, refresh]
  );

  const handleSave = useCallback(async () => {
    if (!validate()) {
      toast.error(VALIDATION_MESSAGE);
      return;
    }

    const payload = buildPayload();
    const usuario = "Sistema";

    setSaving(true);
    try {
      if (editingId) {
        const anterior = getById(editingId);
        if (!anterior) {
          toast.error("Exame não encontrado.");
          return;
        }

        await atualizarExame(editingId, payload);

        const entries = [];
        if (Number(anterior.valor_navarro) !== payload.valor_navarro) {
          entries.push({
            acao: "Alteração de valor",
            detalhes: `Valor Navarro de ${anterior.nome} alterado de ${formatMoney(Number(anterior.valor_navarro))} para ${formatMoney(payload.valor_navarro)}.`,
          });
        }
        if (anterior.nome !== payload.nome) {
          entries.push({
            acao: "Alteração",
            detalhes: `Nome alterado de ${anterior.nome} para ${payload.nome}.`,
          });
        }
        if (entries.length > 0) {
          await registrarHistoricoExame(editingId, usuario, entries);
        }

        toast.success("Exame atualizado!");
      } else {
        const novoId = await criarExame(payload);
        await registrarHistoricoExame(novoId, usuario, [
          {
            acao: "Criação",
            detalhes: `Exame ${payload.nome} cadastrado com valor Navarro ${formatMoney(payload.valor_navarro)}.`,
          },
        ]);
        toast.success("Exame cadastrado!");
      }

      closeForm();
      refresh();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "";
      toast.error(message || "Erro ao salvar exame");
    } finally {
      setSaving(false);
    }
  }, [
    validate,
    buildPayload,
    editingId,
    getById,
    closeForm,
    refresh,
    setSaving,
  ]);

  return {
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
  };
}
