"use client";

import { useMemo, useState } from "react";
import { Field, RequiredMark } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { formatCNPJ } from "@/lib/cnpj";
import { formatClienteNomeDisplay } from "@/lib/cliente-display";
import {
  RISCOS_MOTIVOS_REMOCAO_PROCESSO,
  validateConfirmacaoExclusaoCampanha,
  validateMotivoRemocaoProcesso,
} from "@/lib/riscos-campanha";
import type { RiscosPsicossociaisProcesso } from "@/lib/riscos-psicossociais";

export type RemoverProcessoRiscosInput = {
  confirmacaoCodigo: string;
  motivoOpcao: string;
  motivoOutro?: string;
};

interface RiscosRemoverProcessoModalProps {
  open: boolean;
  processo: RiscosPsicossociaisProcesso | null;
  saving?: boolean;
  onClose: () => void;
  onConfirm: (input: RemoverProcessoRiscosInput) => Promise<void>;
}

export function RiscosRemoverProcessoModal({
  open,
  processo,
  saving = false,
  onClose,
  onConfirm,
}: RiscosRemoverProcessoModalProps) {
  const campanha = processo?.campanha ?? null;
  const [motivoOpcao, setMotivoOpcao] = useState("");
  const [motivoOutro, setMotivoOutro] = useState("");
  const [confirmacaoCodigo, setConfirmacaoCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const empresa = formatClienteNomeDisplay(
    processo?.implantacao.orcamento.cliente_nome || campanha?.empresa_nome || "—"
  );
  const cnpjRaw =
    processo?.implantacao.orcamento.cliente_cnpj || campanha?.cnpj || "";
  const cnpjDigits = cnpjRaw.replace(/\D/g, "");
  const cnpjDisplay =
    cnpjDigits.length === 14 ? formatCNPJ(cnpjRaw) : cnpjRaw.trim() || "—";

  const podeConfirmar = useMemo(() => {
    if (!campanha) return false;
    if (validateMotivoRemocaoProcesso(motivoOpcao, motivoOutro)) return false;
    if (
      validateConfirmacaoExclusaoCampanha(
        campanha.codigo_publico,
        confirmacaoCodigo
      )
    ) {
      return false;
    }
    return true;
  }, [campanha, motivoOpcao, motivoOutro, confirmacaoCodigo]);

  function resetAndClose() {
    if (saving) return;
    setMotivoOpcao("");
    setMotivoOutro("");
    setConfirmacaoCodigo("");
    setErro(null);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={resetAndClose}
      title="Remover processo"
      subtitle={
        campanha
          ? `${empresa} · ${campanha.codigo_publico}`
          : undefined
      }
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="rounded-xl border border-[#e2e8f0] px-3 py-2 text-xs font-bold text-navy disabled:opacity-40"
            disabled={saving}
            onClick={resetAndClose}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="rounded-xl bg-[#7f1d1d] px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
            disabled={saving || !podeConfirmar}
            onClick={() => {
              void (async () => {
                setErro(null);
                const motivoErr = validateMotivoRemocaoProcesso(
                  motivoOpcao,
                  motivoOutro
                );
                if (motivoErr) {
                  setErro(motivoErr);
                  return;
                }
                if (!campanha) return;
                const confErr = validateConfirmacaoExclusaoCampanha(
                  campanha.codigo_publico,
                  confirmacaoCodigo
                );
                if (confErr) {
                  setErro(confErr);
                  return;
                }
                try {
                  await onConfirm({
                    confirmacaoCodigo,
                    motivoOpcao,
                    motivoOutro:
                      motivoOpcao === "Outro" ? motivoOutro : undefined,
                  });
                  setMotivoOpcao("");
                  setMotivoOutro("");
                  setConfirmacaoCodigo("");
                } catch (err) {
                  setErro(
                    err instanceof Error
                      ? err.message
                      : "Não foi possível remover o processo."
                  );
                }
              })();
            }}
          >
            {saving ? "Removendo…" : "Remover definitivamente"}
          </button>
        </div>
      }
    >
      <div className="space-y-3 text-sm leading-relaxed text-[#475569]">
        <p className="font-semibold text-[#7f1d1d]">
          Remover processo de Riscos Psicossociais?
        </p>
        <p>
          Esta ação excluirá definitivamente esta campanha e todos os dados
          relacionados a ela.
        </p>
        <p>A empresa poderá iniciar um novo processo posteriormente.</p>
        <p>Esta ação não poderá ser desfeita.</p>

        <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2.5 text-xs">
          <p>
            <span className="font-bold text-navy">Empresa:</span> {empresa}
          </p>
          <p className="mt-1">
            <span className="font-bold text-navy">CNPJ:</span> {cnpjDisplay}
          </p>
          <p className="mt-1">
            <span className="font-bold text-navy">Código da campanha:</span>{" "}
            <span className="font-extrabold tracking-wide text-navy">
              {campanha?.codigo_publico ?? "—"}
            </span>
          </p>
        </div>

        <Field
          label={
            <>
              Motivo da remoção
              <RequiredMark />
            </>
          }
        >
          <select
            className="w-full rounded-xl border border-[#e2e8f0] px-3 py-2 text-sm text-navy outline-none focus:border-brand-blue"
            value={motivoOpcao}
            disabled={saving}
            onChange={(e) => setMotivoOpcao(e.target.value)}
          >
            <option value="">Selecione…</option>
            {RISCOS_MOTIVOS_REMOCAO_PROCESSO.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </Field>

        {motivoOpcao === "Outro" ? (
          <Field
            label={
              <>
                Descreva o motivo
                <RequiredMark />
              </>
            }
          >
            <textarea
              className="min-h-[80px] w-full rounded-xl border border-[#e2e8f0] px-3 py-2 text-sm text-navy outline-none focus:border-brand-blue"
              value={motivoOutro}
              disabled={saving}
              maxLength={2000}
              onChange={(e) => setMotivoOutro(e.target.value)}
              placeholder="Descreva o motivo da remoção"
            />
          </Field>
        ) : null}

        <Field
          label={
            <>
              Digite o código{" "}
              <span className="font-extrabold text-navy">
                {campanha?.codigo_publico}
              </span>{" "}
              para confirmar
              <RequiredMark />
            </>
          }
        >
          <input
            type="text"
            className="w-full rounded-xl border border-[#e2e8f0] px-3 py-2 text-sm uppercase tracking-wide text-navy outline-none focus:border-brand-blue"
            value={confirmacaoCodigo}
            disabled={saving}
            autoComplete="off"
            placeholder="Código da campanha"
            onChange={(e) => setConfirmacaoCodigo(e.target.value)}
          />
        </Field>

        {erro ? (
          <p className="text-xs font-semibold text-brand-red">{erro}</p>
        ) : null}
      </div>
    </Modal>
  );
}
