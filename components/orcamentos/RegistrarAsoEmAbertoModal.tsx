"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { RequiredMark } from "@/components/ui/Field";
import { formatDateIsoToBR } from "@/lib/agendamento-datetime";

export type RegistrarAsoEmAbertoFormResult = {
  quantidade: number;
  observacao: string | null;
};

interface RegistrarAsoEmAbertoModalProps {
  open: boolean;
  saving: boolean;
  numeroContrato: string | null;
  quantidadePrevista: number;
  quantidadeVinculada: number;
  quantidadeDisponivel: number;
  dataFim: string | null;
  onClose: () => void;
  onConfirm: (data: RegistrarAsoEmAbertoFormResult) => void;
}

export function RegistrarAsoEmAbertoModal({
  open,
  saving,
  numeroContrato,
  quantidadePrevista,
  quantidadeVinculada,
  quantidadeDisponivel,
  dataFim,
  onClose,
  onConfirm,
}: RegistrarAsoEmAbertoModalProps) {
  const [quantidade, setQuantidade] = useState("1");
  const [observacao, setObservacao] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuantidade(String(Math.max(1, Math.min(1, quantidadeDisponivel))));
    setObservacao("");
    setError(null);
  }, [open, quantidadeDisponivel]);

  function handleConfirm() {
    const qtd = Math.floor(Number(quantidade));
    if (!Number.isFinite(qtd) || qtd < 1) {
      setError("Informe a quantidade de ASOs (mínimo 1).");
      return;
    }
    if (qtd > quantidadeDisponivel) {
      setError(
        `Há apenas ${quantidadeDisponivel} vaga(s) disponível(is) neste contrato.`
      );
      return;
    }
    onConfirm({
      quantidade: qtd,
      observacao: observacao.trim() || null,
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar ASO contratual em aberto"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="btn btn-muted"
            disabled={saving}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving || quantidadeDisponivel <= 0}
            onClick={handleConfirm}
          >
            {saving ? "Salvando..." : "Confirmar ASO em aberto"}
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-sm">
        <div className="rounded-xl border border-[#e8edf5] bg-[#f8fafc] px-3 py-2.5 text-xs text-[#475569]">
          <p>
            <span className="font-bold text-navy">Contrato:</span>{" "}
            {numeroContrato || "—"}
          </p>
          <p className="mt-1">
            <span className="font-bold text-navy">Previstos:</span>{" "}
            {quantidadePrevista}
            {" · "}
            <span className="font-bold text-navy">Já vinculados:</span>{" "}
            {quantidadeVinculada}
            {" · "}
            <span className="font-bold text-navy">Disponíveis:</span>{" "}
            {quantidadeDisponivel}
          </p>
          <p className="mt-1">
            <span className="font-bold text-navy">Fim da vigência:</span>{" "}
            {dataFim ? formatDateIsoToBR(dataFim) : "—"}
          </p>
        </div>

        <p className="text-xs leading-relaxed text-[#64748b]">
          Esta vaga será considerada na conclusão da implantação, mas
          continuará disponível para utilização em um agendamento futuro
          durante a vigência do contrato.
        </p>

        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
            Quantidade de ASOs que permanecerão em aberto <RequiredMark />
          </label>
          <input
            type="number"
            min={1}
            max={Math.max(1, quantidadeDisponivel)}
            className="field-input w-full"
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
            Observação (opcional)
          </label>
          <textarea
            className="field-input min-h-[72px] w-full"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Ex.: Empresa ainda não definiu o terceiro colaborador."
          />
        </div>

        {error ? (
          <p className="text-xs font-semibold text-brand-red">{error}</p>
        ) : null}
      </div>
    </Modal>
  );
}
