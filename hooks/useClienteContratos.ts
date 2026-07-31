"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuditoriaUsuario, useAuth } from "@/contexts/AuthContext";
import { AUDITORIA_ACOES, AUDITORIA_MODULOS } from "@/lib/auditoria";
import {
  CONTRATO_ENCERRAR_SEM_PERMISSAO_MSG,
  podeEncerrarContrato as usuarioPodeEncerrarContrato,
} from "@/lib/contrato-permissoes";
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
import { registrarAuditoria } from "@/services/auditoria.service";
import type { ClienteContratoRecord } from "@/lib/types";

const VALIDATION_MESSAGE = "Informe a data de início do contrato.";

export function useClienteContratos(
  clienteId: string | null,
  clienteNome?: string | null
) {
  const auditContext = useAuditoriaUsuario();
  const { profile } = useAuth();
  const podeEncerrarContrato = usuarioPodeEncerrarContrato(profile?.perfil);
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
        await registrarAuditoria({
          usuarioId: auditContext.usuarioId,
          usuarioNome: auditContext.usuarioNome,
          usuarioEmail: auditContext.usuarioEmail,
          modulo: AUDITORIA_MODULOS.clientes,
          acao: AUDITORIA_ACOES.edicao,
          registroId: clienteId,
          registroNome: clienteNome ?? undefined,
          descricao: `${auditContext.usuarioNome} editou contrato do cliente ${clienteNome ?? "—"}.`,
        });
        toast.success("Contrato atualizado!");
      } else {
        await criarContrato(payload);
        await registrarAuditoria({
          usuarioId: auditContext.usuarioId,
          usuarioNome: auditContext.usuarioNome,
          usuarioEmail: auditContext.usuarioEmail,
          modulo: AUDITORIA_MODULOS.clientes,
          acao: AUDITORIA_ACOES.criacao,
          registroId: clienteId,
          registroNome: clienteNome ?? undefined,
          descricao: `${auditContext.usuarioNome} criou contrato para o cliente ${clienteNome ?? "—"}.`,
        });
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
    auditContext,
    clienteNome,
  ]);

  const handleEncerrar = useCallback(
    async (contrato: ClienteContratoRecord) => {
      if (!podeEncerrarContrato) {
        toast.error(CONTRATO_ENCERRAR_SEM_PERMISSAO_MSG);
        await registrarAuditoria({
          usuarioId: auditContext.usuarioId,
          usuarioNome: auditContext.usuarioNome,
          usuarioEmail: auditContext.usuarioEmail,
          modulo: AUDITORIA_MODULOS.clientes,
          acao: AUDITORIA_ACOES.tentativa_encerrar_contrato_sem_permissao,
          registroId: clienteId,
          registroNome: clienteNome ?? contrato.numero ?? undefined,
          descricao: `Usuário ${auditContext.usuarioNome} tentou encerrar o contrato ${contrato.numero || contrato.id} sem permissão.`,
        });
        return;
      }
      setEncerrarTarget(contrato);
    },
    [auditContext, clienteId, clienteNome, podeEncerrarContrato]
  );

  const confirmEncerrar = useCallback(async () => {
    if (!encerrarTarget) return;
    if (!podeEncerrarContrato) {
      toast.error(CONTRATO_ENCERRAR_SEM_PERMISSAO_MSG);
      return;
    }

    setEncerrarSaving(true);
    try {
      await encerrarContrato(encerrarTarget.id, {
        motivo: "Encerrado manualmente no cadastro do cliente.",
        encerradoPor: auditContext.usuarioNome,
      });
      await registrarAuditoria({
        usuarioId: auditContext.usuarioId,
        usuarioNome: auditContext.usuarioNome,
        usuarioEmail: auditContext.usuarioEmail,
        modulo: AUDITORIA_MODULOS.clientes,
        acao: AUDITORIA_ACOES.cancelamento,
        registroId: clienteId,
        registroNome: clienteNome ?? undefined,
        descricao: `${auditContext.usuarioNome} encerrou contrato do cliente ${clienteNome ?? "—"}.`,
      });
      toast.success("Contrato encerrado.");
      setEncerrarTarget(null);
      await refresh();
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Erro ao encerrar contrato."
      );
    } finally {
      setEncerrarSaving(false);
    }
  }, [
    encerrarTarget,
    refresh,
    auditContext,
    clienteId,
    clienteNome,
    podeEncerrarContrato,
  ]);

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
    podeEncerrarContrato,
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
