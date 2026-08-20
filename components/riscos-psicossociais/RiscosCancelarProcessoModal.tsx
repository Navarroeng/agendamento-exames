"use client";

import { useState } from "react";
import { Field, RequiredMark } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { formatCNPJ } from "@/lib/cnpj";
import { formatClienteNomeDisplay } from "@/lib/cliente-display";
import { validateMotivoCancelamento } from "@/lib/riscos-campanha";
import type { RiscosPsicossociaisProcesso } from "@/lib/riscos-psicossociais";

interface RiscosCancelarProcessoModalProps {
  open: boolean;
  processo: RiscosPsicossociaisProcesso | null;
  saving?: boolean;
  onClose: () => void;
  onConfirm: (motivo: string) => Promise<void>;
}

export function RiscosCancelarProcessoModal({
  open,
  processo,
  saving = false,
  onClose,
  onConfirm,
}: RiscosCancelarProcessoModalProps) {
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const empresa = formatClienteNomeDisplay(
    processo?.implantacao.orcamento.cliente_nome || "—"
  );
  const cnpjRaw = processo?.implantacao.orcamento.cliente_cnpj || "";
  const cnpjDigits = cnpjRaw.replace(/\D/g, "");
  const cnpjDisplay =
    cnpjDigits.length === 14 ? formatCNPJ(cnpjRaw) : cnpjRaw.trim() || "—";

  function resetAndClose() {
    if (saving) return;
    setMotivo("");
    setErro(null);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={resetAndClose}
      title="Cancelar processo"
      subtitle={`${empresa} · CNPJ ${cnpjDisplay}`}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="rounded-xl border border-[#e2e8f0] px-3 py-2 text-xs font-bold text-navy disabled:opacity-40"
            disabled={saving}
            onClick={resetAndClose}
          >
            Voltar
          </button>
          <button
            type="button"
            className="rounded-xl bg-brand-red px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
            disabled={saving || !motivo.trim()}
            onClick={() => {
              void (async () => {
                setErro(null);
                const texto = motivo.trim();
                const validacao = validateMotivoCancelamento(texto);
                if (validacao) {
                  setErro(validacao);
                  return;
                }
                try {
                  await onConfirm(texto);
                  setMotivo("");
                  setErro(null);
                } catch (err) {
                  setErro(
                    err instanceof Error
                      ? err.message
                      : "Não foi possível cancelar o processo."
                  );
                }
              })();
            }}
          >
            {saving ? "Cancelando…" : "Confirmar cancelamento"}
          </button>
        </div>
      }
    >
      <div className="space-y-3 text-sm leading-relaxed text-[#475569]">
        <p>
          Este processo será cancelado e deixará de aparecer entre os processos
          em aberto. Os dados já registrados serão preservados.
        </p>
        <Field
          label={
            <>
              Motivo do cancelamento
              <RequiredMark />
            </>
          }
        >
          <textarea
            className="min-h-[96px] w-full rounded-xl border border-[#e2e8f0] px-3 py-2 text-sm text-navy outline-none focus:border-brand-blue"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex.: Cliente não deseja realizar a avaliação"
            disabled={saving}
            maxLength={2000}
          />
        </Field>
        {erro ? (
          <p className="text-xs font-semibold text-brand-red">{erro}</p>
        ) : null}
      </div>
    </Modal>
  );
}
