"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  nomeArquivoQrCodePesquisa,
  urlPublicaPesquisaCampanha,
} from "@/lib/riscos-campanha";
import {
  baixarDataUrlPng,
  gerarQrCodeArteIdentificacaoDataUrl,
  gerarQrCodeDataUrl,
} from "@/lib/riscos-qrcode";

type RiscosQrCodeModalProps = {
  open: boolean;
  onClose: () => void;
  empresaNome: string;
  codigoPublico: string;
  logoUrl?: string | null;
};

/**
 * Modal aninhado (z acima do modal da campanha) — QR da URL pública da pesquisa.
 */
export function RiscosQrCodeModal({
  open,
  onClose,
  empresaNome,
  codigoPublico,
  logoUrl = null,
}: RiscosQrCodeModalProps) {
  const [mounted, setMounted] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const codigo = codigoPublico.trim().toUpperCase();
  const url =
    typeof window !== "undefined"
      ? urlPublicaPesquisaCampanha(codigo)
      : urlPublicaPesquisaCampanha(codigo, "");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !codigo) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const dataUrl = await gerarQrCodeDataUrl(
          urlPublicaPesquisaCampanha(codigo),
          512
        );
        if (!cancelled) setQrDataUrl(dataUrl);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setQrDataUrl(null);
          toast.error("Não foi possível gerar o QR Code.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, codigo]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [open, onClose]);

  async function handleCopiarLink() {
    try {
      await navigator.clipboard.writeText(urlPublicaPesquisaCampanha(codigo));
      toast.success("Link da pesquisa copiado.");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  }

  async function handleBaixarQr() {
    setDownloading(true);
    try {
      const dataUrl = await gerarQrCodeDataUrl(
        urlPublicaPesquisaCampanha(codigo),
        1000
      );
      baixarDataUrlPng(
        dataUrl,
        nomeArquivoQrCodePesquisa(empresaNome, codigo)
      );
      toast.success("QR Code baixado.");
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível baixar o QR Code.");
    } finally {
      setDownloading(false);
    }
  }

  async function handleBaixarArte() {
    setDownloading(true);
    try {
      const dataUrl = await gerarQrCodeArteIdentificacaoDataUrl({
        url: urlPublicaPesquisaCampanha(codigo),
        empresaNome,
        codigoPublico: codigo,
      });
      const base = nomeArquivoQrCodePesquisa(empresaNome, codigo).replace(
        /\.png$/i,
        ""
      );
      baixarDataUrlPng(dataUrl, `${base}-IDENTIFICACAO.png`);
      toast.success("Arte do QR Code baixada.");
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível baixar a arte do QR Code.");
    } finally {
      setDownloading(false);
    }
  }

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        onClick={onClose}
        aria-label="Fechar"
      />
      <div
        className="relative z-10 flex w-full max-w-md max-h-[90vh] flex-col overflow-hidden rounded-2xl border border-app-line bg-white shadow-[0_24px_64px_rgba(15,23,42,0.22)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="riscos-qr-title"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-app-line bg-gradient-to-b from-white to-[#fbfcff] px-5 py-4">
          <div className="min-w-0">
            <h3
              id="riscos-qr-title"
              className="text-lg font-extrabold tracking-[-0.2px] text-navy"
            >
              QR Code da Pesquisa
            </h3>
            <div className="mt-2 flex items-center gap-2.5">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt=""
                  className="h-8 w-8 rounded-md border border-[#e8edf5] bg-white object-contain p-0.5"
                />
              ) : null}
              <p className="text-sm font-extrabold uppercase leading-snug text-navy">
                {empresaNome || "Empresa"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-app-line text-lg text-app-muted transition-colors hover:bg-brand-blue-soft hover:text-brand-blue"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div className="flex flex-col items-center text-center">
            <div className="rounded-2xl border border-[#e8edf5] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
              {loading || !qrDataUrl ? (
                <div className="grid h-[240px] w-[240px] place-items-center text-xs font-medium text-[#64748b]">
                  Gerando QR Code…
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt={`QR Code da campanha ${codigo}`}
                  className="h-[240px] w-[240px] bg-white sm:h-[280px] sm:w-[280px]"
                />
              )}
            </div>

            <div className="mt-5 w-full space-y-3 text-left">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
                  Código da campanha
                </p>
                <p className="mt-0.5 font-mono text-base font-extrabold text-navy">
                  {codigo}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
                  Link da pesquisa
                </p>
                <p className="mt-0.5 break-all font-mono text-[11px] font-semibold text-brand-blue">
                  {url}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="shrink-0 space-y-2 border-t border-app-line bg-white px-4 py-3 sm:px-5">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-xl bg-brand-blue px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
              disabled={loading || downloading || !qrDataUrl}
              onClick={() => void handleBaixarQr()}
            >
              Baixar QR Code
            </button>
            <button
              type="button"
              className="rounded-xl border border-[#e2e8f0] px-3 py-2 text-xs font-bold text-navy disabled:opacity-40"
              disabled={loading || downloading || !qrDataUrl}
              onClick={() => void handleBaixarArte()}
            >
              Baixar arte com identificação
            </button>
            <button
              type="button"
              className="rounded-xl border border-[#e2e8f0] px-3 py-2 text-xs font-bold text-navy"
              onClick={() => void handleCopiarLink()}
            >
              Copiar link
            </button>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              className="rounded-xl border border-[#e2e8f0] px-3 py-2 text-xs font-bold text-navy"
              onClick={onClose}
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
