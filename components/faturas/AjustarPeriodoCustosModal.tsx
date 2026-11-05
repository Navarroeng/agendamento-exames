"use client";

import { useEffect, useState } from "react";
import { Field, RequiredMark } from "@/components/ui/Field";
import { rotuloMesFechamento } from "@/lib/clinica-fechamento";
import { formatDateBR } from "@/lib/format";

interface AjustarPeriodoCustosModalProps {
  open: boolean;
  clinicaNome: string;
  mesFechamento: string;
  inicioInicial: string;
  fimInicial: string;
  saving?: boolean;
  erro?: string | null;
  onClose: () => void;
  onSave: (params: { inicio: string; fim: string; motivo: string }) => void;
}

export function AjustarPeriodoCustosModal({
  open,
  clinicaNome,
  mesFechamento,
  inicioInicial,
  fimInicial,
  saving = false,
  erro,
  onClose,
  onSave,
}: AjustarPeriodoCustosModalProps) {
  const [inicio, setInicio] = useState(inicioInicial);
  const [fim, setFim] = useState(fimInicial);
  const [motivo, setMotivo] = useState("");
  const [localErro, setLocalErro] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setInicio(inicioInicial);
    setFim(fimInicial);
    setMotivo("");
    setLocalErro(null);
  }, [open, inicioInicial, fimInicial, clinicaNome]);

  if (!open) return null;

  function handleSave() {
    if (!inicio || !fim) {
      setLocalErro("Informe a data inicial e a data final.");
      return;
    }
    if (inicio > fim) {
      setLocalErro("A data inicial não pode ser posterior à data final.");
      return;
    }
    if (!motivo.trim()) {
      setLocalErro("Informe o motivo do ajuste.");
      return;
    }
    setLocalErro(null);
    onSave({ inicio, fim, motivo: motivo.trim() });
  }

  const mensagem = localErro || erro;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[#1a1333]/55"
        aria-label="Fechar"
        onClick={() => {
          if (!saving) onClose();
        }}
      />
      <div
        className="relative flex max-h-[92vh] w-full max-w-[520px] flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ajuste-periodo-titulo"
      >
        <div className="border-b border-[#e8edf5] px-6 py-4">
          <h2 id="ajuste-periodo-titulo" className="text-base font-extrabold text-navy">
            Ajustar período
          </h2>
          <p className="mt-1 text-xs text-[#64748b]">
            Vale somente para este fechamento. A configuração da clínica não muda.
          </p>
        </div>
        <div className="space-y-4 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Clínica">
              <input className="field-input" value={clinicaNome} readOnly />
            </Field>
            <Field label="Mês de fechamento">
              <input
                className="field-input"
                value={rotuloMesFechamento(mesFechamento)}
                readOnly
              />
            </Field>
            <Field label={<>Data inicial <RequiredMark /></>}>
              <input
                type="date"
                className="field-input"
                value={inicio}
                disabled={saving}
                onChange={(e) => setInicio(e.target.value)}
              />
            </Field>
            <Field label={<>Data final <RequiredMark /></>}>
              <input
                type="date"
                className="field-input"
                value={fim}
                disabled={saving}
                onChange={(e) => setFim(e.target.value)}
              />
            </Field>
          </div>
          <p className="text-[11px] text-[#64748b]">
            Período atual: {formatDateBR(inicioInicial)} a {formatDateBR(fimInicial)}.
          </p>
          <Field label={<>Motivo do ajuste <RequiredMark /></>}>
            <textarea
              className="field-input !h-[88px] w-full resize-none py-3"
              value={motivo}
              disabled={saving}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Por que este fechamento usa um período diferente do cadastro?"
            />
          </Field>
          {mensagem ? (
            <p className="text-xs font-medium text-brand-red">{mensagem}</p>
          ) : null}
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-[#e8edf5] bg-[#f8f9fc] px-6 py-4 sm:flex-row sm:justify-end">
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
            className="btn-primary justify-center sm:w-auto"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
