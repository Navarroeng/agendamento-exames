"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  laudoAnexoLabel,
  type LaudosSstAnexoMeta,
  type LaudosSstAnexoTipo,
} from "@/lib/laudos-sst-anexos";
import { mapLaudosWorkflowFromRecord } from "@/lib/laudos-sst";
import type { OrcamentoLaudosSstRecord } from "@/lib/laudos-sst";
import {
  removerAnexoLaudoSst,
  salvarAnexoLaudoSst,
} from "@/services/laudos-sst.service";
import { obterUrlLaudosSstAnexo } from "@/services/laudos-sst-anexos-storage.service";

interface LaudosSstAnexoFieldProps {
  orcamentoId: string;
  tipo: LaudosSstAnexoTipo;
  anexo: LaudosSstAnexoMeta | null;
  tracking: OrcamentoLaudosSstRecord | null;
  disabled?: boolean;
  onTrackingChange: (tracking: OrcamentoLaudosSstRecord) => void;
}

export function LaudosSstAnexoField({
  orcamentoId,
  tipo,
  anexo,
  tracking,
  disabled,
  onTrackingChange,
}: LaudosSstAnexoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const label = laudoAnexoLabel(tipo);

  const syncFromTracking = (next: OrcamentoLaudosSstRecord) => {
    onTrackingChange(next);
  };

  const handleSelect = async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    try {
      const next = await salvarAnexoLaudoSst({
        orcamentoId,
        tipo,
        file,
        trackingAtual: tracking,
      });
      syncFromTracking(next);
      toast.success(`Anexo do ${label} salvo.`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : `Falha ao anexar o ${label}.`
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleVisualizar = async () => {
    if (!anexo?.path) return;
    setBusy(true);
    try {
      const url = await obterUrlLaudosSstAnexo(anexo.path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Não foi possível abrir o arquivo."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleBaixar = async () => {
    if (!anexo?.path) return;
    setBusy(true);
    try {
      const url = await obterUrlLaudosSstAnexo(anexo.path);
      const a = document.createElement("a");
      a.href = url;
      a.download = anexo.nome || `${tipo}.pdf`;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Não foi possível baixar o arquivo."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleRemover = async () => {
    if (!anexo?.path) return;
    const ok = window.confirm(
      `Remover o anexo do ${label}?\n\n${anexo.nome}`
    );
    if (!ok) return;
    setBusy(true);
    try {
      const next = await removerAnexoLaudoSst({
        orcamentoId,
        tipo,
        trackingAtual: tracking,
      });
      syncFromTracking(next);
      toast.success(`Anexo do ${label} removido.`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : `Falha ao remover o ${label}.`
      );
    } finally {
      setBusy(false);
    }
  };

  const locked = disabled || busy;

  return (
    <div className="mt-4 rounded-xl border border-[#eef2f7] bg-[#f8fafc] px-3 py-3">
      <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wide text-[#94a3b8]">
        Anexo
      </p>

      {anexo ? (
        <div className="space-y-2">
          <p
            className="truncate text-sm font-semibold text-navy"
            title={anexo.nome}
          >
            {anexo.nome}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              className="rounded-lg border border-[#e2e8f0] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#475569] hover:bg-[#f1f5f9] disabled:opacity-50"
              disabled={locked}
              onClick={() => void handleVisualizar()}
            >
              Visualizar
            </button>
            <button
              type="button"
              className="rounded-lg border border-[#e2e8f0] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#475569] hover:bg-[#f1f5f9] disabled:opacity-50"
              disabled={locked}
              onClick={() => void handleBaixar()}
            >
              Baixar
            </button>
            <button
              type="button"
              className="rounded-lg border border-[#e2e8f0] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#475569] hover:bg-[#f1f5f9] disabled:opacity-50"
              disabled={locked}
              onClick={() => inputRef.current?.click()}
            >
              Substituir
            </button>
            <button
              type="button"
              className="rounded-lg border border-[#fecaca] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#b91c1c] hover:bg-[#fef2f2] disabled:opacity-50"
              disabled={locked}
              onClick={() => void handleRemover()}
            >
              Remover
            </button>
          </div>
        </div>
      ) : (
        <div>
          <button
            type="button"
            className="rounded-lg border border-dashed border-[#cbd5e1] bg-white px-3 py-2 text-[12px] font-semibold text-[#475569] hover:border-[#94a3b8] hover:bg-[#f8fafc] disabled:opacity-50"
            disabled={locked}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? "Enviando..." : "Selecionar arquivo"}
          </button>
          <p className="mt-1.5 text-[11px] text-[#94a3b8]">
            PDF, DOC ou DOCX · até 10 MB
          </p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        disabled={locked}
        onChange={(e) => {
          void handleSelect(e.target.files?.[0] ?? null);
        }}
      />
    </div>
  );
}

/** Atualiza draft do workflow a partir do tracking após mutação de anexo. */
export function workflowAnexosFromTracking(
  tracking: OrcamentoLaudosSstRecord
): Pick<
  ReturnType<typeof mapLaudosWorkflowFromRecord>,
  "pgrAnexo" | "pcmsoAnexo" | "ltcatAnexo"
> {
  const w = mapLaudosWorkflowFromRecord(tracking);
  return {
    pgrAnexo: w.pgrAnexo,
    pcmsoAnexo: w.pcmsoAnexo,
    ltcatAnexo: w.ltcatAnexo,
  };
}
