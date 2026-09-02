"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { isEmailValido } from "@/lib/email-validacao";
import { faturaStatusPermiteEnvioEmail } from "@/lib/fatura-envio";
import { faturaComItensToPreview } from "@/lib/fatura-mappers";
import type { FaturaPreviewState } from "@/lib/types";
import {
  enviarFaturaClientePorEmail,
  prepararReenvioFaturaCliente,
  reenviarFaturaClientePorEmail,
} from "@/services/fatura-envio.service";
import type { AuditoriaUsuarioContext } from "@/lib/auditoria";

function formatEnvioDataHora(iso: string | null | undefined): {
  data: string;
  hora: string;
} | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return {
    data: d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    hora: d.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

interface FaturaEnvioEmailSectionProps {
  preview: FaturaPreviewState;
  saving: boolean;
  auditOptions?: { auditContext?: AuditoriaUsuarioContext };
  onFaturaAtualizada: (preview: FaturaPreviewState) => void;
}

export function FaturaEnvioEmailSection({
  preview,
  saving,
  auditOptions,
  onFaturaAtualizada,
}: FaturaEnvioEmailSectionProps) {
  const [emailEnvio, setEmailEnvio] = useState(
    preview.fatura_enviada_email?.trim() ||
      preview.emailEnvioSugerido?.trim() ||
      ""
  );
  const [savingEnvio, setSavingEnvio] = useState(false);
  const [savingReenvio, setSavingReenvio] = useState(false);

  useEffect(() => {
    setEmailEnvio(
      preview.fatura_enviada_email?.trim() ||
        preview.emailEnvioSugerido?.trim() ||
        ""
    );
  }, [
    preview.faturaId,
    preview.fatura_enviada_email,
    preview.emailEnvioSugerido,
  ]);

  const envioConfirmado = Boolean(preview.fatura_enviada_em?.trim());
  const temHistorico =
    Boolean(preview.emailEnvioSugerido?.trim()) || envioConfirmado;
  const envioDataHora = useMemo(
    () => formatEnvioDataHora(preview.fatura_enviada_em),
    [preview.fatura_enviada_em]
  );

  const podeEnviar =
    preview.tipo === "cliente" &&
    preview.readonly &&
    preview.faturaId &&
    faturaStatusPermiteEnvioEmail(preview.status ?? "rascunho");

  if (!podeEnviar) return null;

  async function handleEnviar() {
    if (!preview.faturaId) return;
    const email = emailEnvio.trim();
    if (!isEmailValido(email)) {
      toast.error("Informe um e-mail válido para o envio da fatura.");
      return;
    }

    setSavingEnvio(true);
    try {
      const fatura = await enviarFaturaClientePorEmail(
        preview.faturaId,
        email,
        auditOptions
      );
      onFaturaAtualizada({
        ...faturaComItensToPreview(fatura, true),
        emailEnvioSugerido: preview.emailEnvioSugerido,
        referencia_id: preview.referencia_id,
        faturaOrigemId: preview.faturaOrigemId,
        faturaOrigemNumero: preview.faturaOrigemNumero,
        faturaSubstitutaId: preview.faturaSubstitutaId,
        faturaSubstitutaNumero: preview.faturaSubstitutaNumero,
      });
      toast.success("Fatura enviada por e-mail com sucesso.");
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error
          ? err.message
          : "Não foi possível enviar a fatura. Tente novamente."
      );
    } finally {
      setSavingEnvio(false);
    }
  }

  async function handleReenviar() {
    if (!preview.faturaId) return;
    const email = emailEnvio.trim();
    if (!isEmailValido(email)) {
      toast.error("Informe um e-mail válido para o reenvio da fatura.");
      return;
    }

    setSavingReenvio(true);
    try {
      const { reenvioIntentToken } = await prepararReenvioFaturaCliente(
        preview.faturaId
      );
      const fatura = await reenviarFaturaClientePorEmail(
        preview.faturaId,
        email,
        reenvioIntentToken,
        auditOptions
      );
      onFaturaAtualizada({
        ...faturaComItensToPreview(fatura, true),
        emailEnvioSugerido: preview.emailEnvioSugerido,
        referencia_id: preview.referencia_id,
        faturaOrigemId: preview.faturaOrigemId,
        faturaOrigemNumero: preview.faturaOrigemNumero,
        faturaSubstitutaId: preview.faturaSubstitutaId,
        faturaSubstitutaNumero: preview.faturaSubstitutaNumero,
      });
      toast.success("Fatura reenviada por e-mail com sucesso.");
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error
          ? err.message
          : "Não foi possível enviar a fatura. Tente novamente."
      );
    } finally {
      setSavingReenvio(false);
    }
  }

  const enviando = savingEnvio || savingReenvio;
  const bloqueado = saving || enviando;

  return (
    <div className="border-t border-[#eef2f7] px-5 py-4">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
        Envio da fatura
      </p>

      {envioConfirmado ? (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-extrabold text-brand-green">
            Fatura enviada
          </p>
          <p className="text-xs text-navy">
            Enviada para:{" "}
            <span className="font-semibold">
              {preview.fatura_enviada_email || "—"}
            </span>
          </p>
          {envioDataHora ? (
            <p className="text-xs text-app-muted">
              Enviada em: {envioDataHora.data} às {envioDataHora.hora}
            </p>
          ) : null}
          <p className="text-xs text-app-muted">
            Enviado por: {preview.fatura_enviada_por || "—"}
          </p>

          <div className="mt-3 space-y-2 border-t border-[#e2e8f0] pt-3">
            <label className="block text-[11px] font-semibold text-navy">
              E-mail para envio
              <input
                type="email"
                className="field-input mt-1 w-full text-sm"
                value={emailEnvio}
                onChange={(e) => setEmailEnvio(e.target.value)}
                placeholder="cliente@empresa.com.br"
                disabled={bloqueado}
              />
            </label>
            {temHistorico ? (
              <p className="text-[11px] leading-relaxed text-app-muted">
                Último e-mail utilizado para faturamento deste cliente.
              </p>
            ) : null}
            <button
              type="button"
              className="rounded-xl border border-[#e2e8f0] px-3 py-2 text-xs font-bold text-navy disabled:opacity-40"
              disabled={bloqueado}
              onClick={() => void handleReenviar()}
            >
              {savingReenvio ? "Enviando fatura…" : "Reenviar fatura"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <label className="block text-[11px] font-semibold text-navy">
            E-mail para envio
            <input
              type="email"
              className="field-input mt-1 w-full text-sm"
              value={emailEnvio}
              onChange={(e) => setEmailEnvio(e.target.value)}
              placeholder="cliente@empresa.com.br"
              disabled={bloqueado}
            />
          </label>
          <p className="text-[11px] leading-relaxed text-app-muted">
            {temHistorico
              ? "Último e-mail utilizado para faturamento deste cliente."
              : "Informe o e-mail responsável pelo recebimento das faturas deste cliente."}
          </p>
          <button
            type="button"
            className="rounded-xl bg-brand-blue px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
            disabled={bloqueado}
            onClick={() => void handleEnviar()}
          >
            {savingEnvio ? "Enviando fatura…" : "Enviar fatura por e-mail"}
          </button>
        </div>
      )}
    </div>
  );
}
