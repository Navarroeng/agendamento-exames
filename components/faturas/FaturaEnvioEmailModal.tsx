"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { isEmailValido } from "@/lib/email-validacao";
import { competenciaLabelBRUpperFromFatura } from "@/lib/fatura-reemissao";
import { isFaturaEnvioExplicitamenteConfirmado } from "@/lib/fatura-envio";
import { formatCurrency } from "@/lib/money";
import type { FaturaRecord } from "@/lib/types";
import type { AuditoriaUsuarioContext } from "@/lib/auditoria";
import {
  enviarFaturaClientePorEmail,
  prepararReenvioFaturaCliente,
  reenviarFaturaClientePorEmail,
} from "@/services/fatura-envio.service";

export type FaturaEnvioEmailModalOrigem = "pos-emissao" | "menu";

interface FaturaEnvioEmailModalProps {
  open: boolean;
  fatura: FaturaRecord | null;
  emailSugerido: string | null;
  origem: FaturaEnvioEmailModalOrigem;
  saving?: boolean;
  auditOptions?: { auditContext?: AuditoriaUsuarioContext };
  onClose: () => void;
  onEnviado: (fatura: FaturaRecord) => void;
}

export function FaturaEnvioEmailModal({
  open,
  fatura,
  emailSugerido,
  origem,
  saving = false,
  auditOptions,
  onClose,
  onEnviado,
}: FaturaEnvioEmailModalProps) {
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);

  const envioConfirmado = fatura
    ? isFaturaEnvioExplicitamenteConfirmado(fatura)
    : false;

  const temHistorico =
    Boolean(emailSugerido?.trim()) || envioConfirmado;

  useEffect(() => {
    if (!open || !fatura) return;

    const prefill =
      fatura.fatura_enviada_email?.trim() || emailSugerido?.trim() || "";
    setEmail(prefill);
    setEnviando(false);
  }, [open, fatura, emailSugerido]);

  const titulo = useMemo(() => {
    if (origem === "pos-emissao") return "Fatura emitida com sucesso";
    return envioConfirmado
      ? "Reenviar fatura por e-mail"
      : "Enviar fatura por e-mail";
  }, [origem, envioConfirmado]);

  const subtitulo = useMemo(() => {
    if (origem === "pos-emissao") {
      return "A fatura está pronta. Deseja enviá-la por e-mail ao cliente?";
    }
    return envioConfirmado
      ? "Confirme ou altere o e-mail de destino para reenviar a fatura."
      : "Informe o e-mail de destino para enviar a fatura ao cliente.";
  }, [origem, envioConfirmado]);

  if (!open || !fatura) return null;

  const competencia =
    competenciaLabelBRUpperFromFatura(fatura) ?? fatura.periodo_inicio ?? "—";
  const bloqueado = saving || enviando;

  async function handleEnviar() {
    if (!fatura) return;
    const destino = email.trim();
    if (!isEmailValido(destino)) {
      toast.error("Informe um e-mail válido para o envio da fatura.");
      return;
    }

    setEnviando(true);
    try {
      const atualizada = envioConfirmado
        ? await (async () => {
            const { reenvioIntentToken } = await prepararReenvioFaturaCliente(
              fatura.id
            );
            return reenviarFaturaClientePorEmail(
              fatura.id,
              destino,
              reenvioIntentToken,
              auditOptions
            );
          })()
        : await enviarFaturaClientePorEmail(
            fatura.id,
            destino,
            auditOptions
          );

      onEnviado(atualizada);
      toast.success(
        envioConfirmado
          ? "Fatura reenviada por e-mail com sucesso."
          : "Fatura enviada por e-mail com sucesso."
      );
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error
          ? err.message
          : "Não foi possível enviar a fatura. Tente novamente."
      );
    } finally {
      setEnviando(false);
    }
  }

  const footer = (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <button
        type="button"
        className="btn btn-muted"
        disabled={bloqueado}
        onClick={onClose}
      >
        Agora não
      </button>
      <button
        type="button"
        className="btn btn-primary"
        disabled={bloqueado}
        onClick={() => void handleEnviar()}
      >
        {enviando ? "Enviando fatura…" : "Enviar fatura por e-mail"}
      </button>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={titulo}
      subtitle={subtitulo}
      footer={footer}
      closeOnOverlayClick={!bloqueado}
    >
      <div className="space-y-5">
        <div>
          <label className="field-label" htmlFor="fatura-envio-email">
            E-mail para envio da fatura
          </label>
          <input
            id="fatura-envio-email"
            type="email"
            className="field-input mt-1.5 h-11 w-full text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="cliente@empresa.com.br"
            disabled={bloqueado}
            autoComplete="email"
          />
          <p className="mt-1.5 text-[11px] leading-relaxed text-app-muted">
            {temHistorico
              ? "Último e-mail utilizado para faturamento deste cliente."
              : "Informe o e-mail responsável pelo recebimento das faturas deste cliente."}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-app-line bg-[#f8fafc] px-3.5 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
              Fatura
            </p>
            <p className="mt-1 break-words text-sm font-semibold text-navy">
              {fatura.numero ?? "—"}
            </p>
          </div>
          <div className="rounded-xl border border-app-line bg-[#f8fafc] px-3.5 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
              Competência
            </p>
            <p className="mt-1 text-sm font-semibold text-navy">{competencia}</p>
          </div>
          <div className="col-span-2 rounded-xl border border-app-line bg-[#f8fafc] px-3.5 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
              Valor
            </p>
            <p className="mt-1 text-lg font-extrabold tabular-nums text-navy">
              {formatCurrency(fatura.valor_total)}
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
