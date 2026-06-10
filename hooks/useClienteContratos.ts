"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useClienteContratoForm } from "@/hooks/useClienteContratoForm";
import {
  getContratoAtual,
  getHistoricoContratos,
} from "@/lib/cliente-contrato-mappers";
import {
  atualizarContrato,
  criarContrato,
  encerrarContrato,
  listarContratosPorCliente,
} from "@/services/cliente-contrato.service";
import type { ClienteContratoRecord } from "@/lib/types";

const VALIDATION_MESSAGE = "Informe a data de início do contrato.";

function todayIsoDate(): string {
  return new Date().toISOString().split("T")[0];
}

export function useClienteContratos(clienteId: string | null) {
  const [contratos, setContratos] = useState<ClienteContratoRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [encerrarTarget, setEncerrarTarget] =
    useState<ClienteContratoRecord | null>(null);
  const [encerrarSaving, setEncerrarSaving] = useState(false);

  const {
    form,
    setField,
    reset,
    loadForm,
    buildPayload,
    validate,
    saving,
    setSaving,
  } = useClienteContratoForm();

  const refresh = useCallback(async () => {
    if (!clienteId) {
      setContratos([]);
      return;
    }

    setLoading(true);
    try {
      const data = await listarContratosPorCliente(clienteId);
      setContratos(data);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar contratos do cliente.");
    } finally {
      setLoading(false);
    }
  }, [clienteId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const contratoAtual = useMemo(() => getContratoAtual(contratos), [contratos]);

  const historico = useMemo(
    () => getHistoricoContratos(contratos, contratoAtual?.id),
    [contratos, contratoAtual?.id]
  );

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditingId(null);
    reset();
  }, [reset]);

  const handleNovoContrato = useCallback(() => {
    reset();
    setEditingId(null);
    setFormOpen(true);
  }, [reset]);

  const handleEditarContrato = useCallback(
    (contrato: ClienteContratoRecord) => {
      loadForm(contrato);
      setEditingId(contrato.id);
      setFormOpen(true);
    },
    [loadForm]
  );

  const handleSave = useCallback(async () => {
    if (!clienteId) return;

    if (!validate()) {
      toast.error(VALIDATION_MESSAGE);
      return;
    }

    const payload = buildPayload(clienteId);
    const hadAtivo = Boolean(contratoAtual);

    setSaving(true);
    try {
      if (editingId) {
        const { cliente_id: _clienteId, ...updatePayload } = payload;
        await atualizarContrato(editingId, updatePayload);
        toast.success("Contrato atualizado!");
      } else {
        await criarContrato(payload);
        if (hadAtivo && payload.status === "ativo") {
          toast.info("Contrato anterior encerrado automaticamente.");
        }
        toast.success("Contrato salvo!");
      }
      closeForm();
      await refresh();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "";
      toast.error(message || "Erro ao salvar contrato.");
    } finally {
      setSaving(false);
    }
  }, [
    clienteId,
    validate,
    buildPayload,
    contratoAtual,
    editingId,
    closeForm,
    refresh,
    setSaving,
  ]);

  const handleEncerrar = useCallback((contrato: ClienteContratoRecord) => {
    setEncerrarTarget(contrato);
  }, []);

  const confirmEncerrar = useCallback(async () => {
    if (!encerrarTarget) return;

    setEncerrarSaving(true);
    try {
      const dataFim = encerrarTarget.data_fim ?? todayIsoDate();
      await encerrarContrato(encerrarTarget.id, dataFim);
      toast.success("Contrato encerrado.");
      setEncerrarTarget(null);
      await refresh();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao encerrar contrato.");
    } finally {
      setEncerrarSaving(false);
    }
  }, [encerrarTarget, refresh]);

  return {
    contratos,
    contratoAtual,
    historico,
    loading,
    formOpen,
    editingId,
    form,
    setField,
    saving,
    encerrarTarget,
    encerrarSaving,
    handleNovoContrato,
    handleEditarContrato,
    handleSave,
    handleEncerrar,
    confirmEncerrar,
    closeForm,
    closeEncerrar: () => setEncerrarTarget(null),
    refresh,
  };
}
