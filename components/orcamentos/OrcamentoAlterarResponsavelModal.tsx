"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { RequiredMark } from "@/components/ui/Field";
import type { PerfilUsuario } from "@/lib/types";

interface OrcamentoAlterarResponsavelModalProps {
  open: boolean;
  numero: string;
  responsavelAtual: string;
  usuarios: PerfilUsuario[];
  usuariosLoading?: boolean;
  saving: boolean;
  onClose: () => void;
  onConfirm: (params: {
    novoResponsavelUserId: string;
    novoResponsavelNome: string;
    motivo: string;
  }) => void;
}

export function OrcamentoAlterarResponsavelModal({
  open,
  numero,
  responsavelAtual,
  usuarios,
  usuariosLoading = false,
  saving,
  onClose,
  onConfirm,
}: OrcamentoAlterarResponsavelModalProps) {
  const [novoUserId, setNovoUserId] = useState("");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const opcoes = useMemo(() => {
    const atualNorm = responsavelAtual.trim().toLowerCase();
    return usuarios.filter(
      (u) => u.nome.trim().toLowerCase() !== atualNorm
    );
  }, [usuarios, responsavelAtual]);

  useEffect(() => {
    if (!open) return;
    setNovoUserId("");
    setMotivo("");
    setError(null);
  }, [open]);

  function handleConfirm() {
    const selecionado = opcoes.find((u) => u.user_id === novoUserId);
    if (!selecionado) {
      setError("Selecione o novo responsável.");
      return;
    }
    if (!motivo.trim()) {
      setError("Informe o motivo da alteração.");
      return;
    }
    onConfirm({
      novoResponsavelUserId: selecionado.user_id,
      novoResponsavelNome: selecionado.nome,
      motivo: motivo.trim(),
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Alterar responsável pelo processo"
      subtitle={`Orçamento ${numero}`}
      closeOnOverlayClick={!saving}
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="btn justify-center sm:w-auto"
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary justify-center sm:w-auto"
            onClick={handleConfirm}
            disabled={saving || usuariosLoading}
          >
            {saving ? "Salvando..." : "Confirmar alteração"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="mb-1.5 text-xs font-bold text-navy">Responsável atual</p>
          <p className="rounded-xl border border-[#e4ebf4] bg-[#f8fafc] px-3 py-2 text-sm font-semibold text-[#334155]">
            {responsavelAtual || "—"}
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold text-navy">
            Novo responsável <RequiredMark />
          </label>
          <select
            className="field-input"
            value={novoUserId}
            disabled={saving || usuariosLoading}
            onChange={(e) => {
              setNovoUserId(e.target.value);
              setError(null);
            }}
          >
            <option value="">
              {usuariosLoading ? "Carregando..." : "Selecione..."}
            </option>
            {opcoes.map((u) => (
              <option key={u.user_id} value={u.user_id}>
                {u.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold text-navy">
            Motivo da alteração <RequiredMark />
          </label>
          <textarea
            className="field-input min-h-[88px] resize-y"
            value={motivo}
            disabled={saving}
            onChange={(e) => {
              setMotivo(e.target.value);
              setError(null);
            }}
            placeholder="Ex.: Rafaela dará continuidade ao atendimento do cliente."
          />
        </div>

        {error ? (
          <p className="text-[12px] font-medium text-brand-red">{error}</p>
        ) : null}
      </div>
    </Modal>
  );
}
