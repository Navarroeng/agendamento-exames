"use client";

import { useEffect, useState } from "react";
import { Field } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { formatCNPJ } from "@/lib/cnpj";
import { formatClienteNomeDisplay } from "@/lib/cliente-display";
import { formatCreatedAtBR } from "@/lib/format-datetime";
import {
  MSG_PAUSA_CONTROLE_ADMINISTRATIVO,
  RISCOS_PAUSA_SITUACAO_LABELS,
  type RiscosPausaSituacao,
} from "@/lib/riscos-processo-pausa";
import type { RiscosPsicossociaisProcesso } from "@/lib/riscos-psicossociais";

interface RiscosPausaProcessoModalProps {
  open: boolean;
  situacao: RiscosPausaSituacao | null;
  processo: RiscosPsicossociaisProcesso | null;
  saving?: boolean;
  onClose: () => void;
  onConfirm: (observacao: string) => Promise<void>;
}

export function RiscosPausaProcessoModal({
  open,
  situacao,
  processo,
  saving = false,
  onClose,
  onConfirm,
}: RiscosPausaProcessoModalProps) {
  const [observacao, setObservacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [registradoEm, setRegistradoEm] = useState(() =>
    new Date().toISOString()
  );

  useEffect(() => {
    if (open) {
      setRegistradoEm(new Date().toISOString());
      return;
    }
    setObservacao("");
    setErro(null);
  }, [open]);

  const empresa = formatClienteNomeDisplay(
    processo?.implantacao.orcamento.cliente_nome || "—"
  );
  const cnpjRaw = processo?.implantacao.orcamento.cliente_cnpj || "";
  const cnpjDigits = cnpjRaw.replace(/\D/g, "");
  const cnpjDisplay =
    cnpjDigits.length === 14 ? formatCNPJ(cnpjRaw) : cnpjRaw.trim() || "—";
  const situacaoLabel = situacao
    ? RISCOS_PAUSA_SITUACAO_LABELS[situacao]
    : "—";

  function resetAndClose() {
    if (saving) return;
    setObservacao("");
    setErro(null);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={resetAndClose}
      title={situacaoLabel}
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
            className="rounded-xl bg-brand-blue px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
            disabled={saving || !situacao}
            onClick={() => {
              void (async () => {
                setErro(null);
                try {
                  await onConfirm(observacao.trim());
                  setObservacao("");
                  setErro(null);
                } catch (err) {
                  setErro(
                    err instanceof Error
                      ? err.message
                      : "Não foi possível registrar a situação."
                  );
                }
              })();
            }}
          >
            {saving ? "Confirmando…" : "Confirmar"}
          </button>
        </div>
      }
    >
      <div className="space-y-3 text-sm leading-relaxed text-[#475569]">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
              Situação
            </dt>
            <dd className="font-semibold text-navy">{situacaoLabel}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
              Data do registro
            </dt>
            <dd className="font-semibold text-navy">
              {formatCreatedAtBR(registradoEm)}
            </dd>
          </div>
        </dl>
        <Field label="Observação (opcional)">
          <textarea
            className="min-h-[72px] w-full rounded-xl border border-[#e2e8f0] px-3 py-2 text-sm text-navy outline-none focus:border-brand-blue"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Ex.: Cliente não retornou às ligações desta semana"
            disabled={saving}
            maxLength={2000}
          />
        </Field>
        <p className="text-[11px] leading-snug text-[#94a3b8]">
          {MSG_PAUSA_CONTROLE_ADMINISTRATIVO}
        </p>
        {erro ? (
          <p className="text-xs font-semibold text-brand-red">{erro}</p>
        ) : null}
      </div>
    </Modal>
  );
}
