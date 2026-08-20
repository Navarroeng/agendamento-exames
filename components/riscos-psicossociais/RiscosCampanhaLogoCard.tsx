"use client";

import { useEffect, useRef, useState } from "react";
import type { RiscosCampanhaRecord } from "@/lib/riscos-campanha";
import { RISCOS_CAMPANHA_LOGO_MAX_BYTES } from "@/lib/riscos-campanha-logo";
import { resolverUrlLogoCampanhaOuEmpresa } from "@/services/riscos-campanha-logo.service";

interface RiscosCampanhaLogoCardProps {
  campanha: RiscosCampanhaRecord | null;
  saving?: boolean;
  somenteConsulta?: boolean;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
}

export function RiscosCampanhaLogoCard({
  campanha,
  saving = false,
  somenteConsulta = false,
  onUpload,
  onRemove,
}: RiscosCampanhaLogoCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!campanha) {
      setPreviewUrl(null);
      return;
    }
    setLoadingPreview(true);
    void (async () => {
      try {
        const url = await resolverUrlLogoCampanhaOuEmpresa(campanha);
        if (!cancelled) setPreviewUrl(url);
      } catch {
        if (!cancelled) setPreviewUrl(null);
      } finally {
        if (!cancelled) setLoadingPreview(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [campanha]);

  if (!campanha) {
    return (
      <div className="mt-3 rounded-xl border border-dashed border-[#e2e8f0] bg-[#f8fafc] px-3 py-3">
        <p className="text-xs font-extrabold text-navy">Logo da Empresa</p>
        <p className="mt-1 text-[11px] text-[#64748b]">
          Disponível após criar a pesquisa. O logo fica vinculado apenas a esta
          campanha.
        </p>
      </div>
    );
  }

  const bloqueado = saving || somenteConsulta;
  const temLogoCampanha = Boolean(campanha.logo_storage_path);
  const origemLabel =
    campanha.logo_origem === "empresa"
      ? "Pré-carregado do cadastro"
      : campanha.logo_origem === "campanha"
        ? "Personalizado nesta campanha"
        : campanha.logo_origem === "manual"
          ? "Anexado nesta campanha"
          : previewUrl
            ? "Fallback do cadastro (ainda não salvo na campanha)"
            : null;

  async function handleFile(file: File | null) {
    if (!file || somenteConsulta) return;
    setLocalError(null);
    if (file.size > RISCOS_CAMPANHA_LOGO_MAX_BYTES) {
      setLocalError("O logo deve ter no máximo 5 MB.");
      return;
    }
    try {
      await onUpload(file);
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "Falha ao salvar o logo."
      );
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-[#e8edf5] bg-white px-3 py-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-extrabold text-navy">Logo da Empresa</p>
          <p className="mt-0.5 text-[11px] text-[#64748b]">
            Usado no relatório e no PDF desta campanha. Não altera o cadastro
            oficial.
          </p>
        </div>
        {origemLabel ? (
          <span className="shrink-0 rounded-full bg-[#f1f5f9] px-2 py-0.5 text-[10px] font-bold text-[#64748b]">
            {origemLabel}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {loadingPreview ? (
          <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-[#e2e8f0] bg-[#f8fafc] text-[10px] text-[#94a3b8]">
            …
          </div>
        ) : previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={`Logo ${campanha.empresa_nome}`}
            className="h-16 w-16 rounded-xl border border-[#e2e8f0] bg-white object-contain p-1"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] text-center text-[10px] font-semibold text-[#94a3b8]">
            Sem logo
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml"
            className="hidden"
            disabled={bloqueado}
            onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            className="rounded-xl bg-[#082b63] px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-40"
            disabled={bloqueado}
            onClick={() => inputRef.current?.click()}
          >
            {temLogoCampanha || previewUrl
              ? "Alterar logo"
              : "Adicionar logo da empresa"}
          </button>
          {temLogoCampanha ? (
            <button
              type="button"
              className="rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-1.5 text-[11px] font-bold text-[#b91c1c] disabled:opacity-40"
              disabled={bloqueado}
              onClick={() => void onRemove()}
            >
              Remover
            </button>
          ) : null}
        </div>
      </div>

      {campanha.logo_nome ? (
        <p className="mt-2 truncate text-[11px] text-[#64748b]">
          Arquivo: {campanha.logo_nome}
        </p>
      ) : null}
      {localError ? (
        <p className="mt-2 text-[11px] font-medium text-[#b91c1c]">{localError}</p>
      ) : null}
    </div>
  );
}
