"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { isEmailValido } from "@/lib/email-validacao";
import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import {
  FATURA_LEMBRETE_ENTREGA_NAO_CONFIRMADA,
  FATURA_LEMBRETE_SITUACAO_LABEL,
  buildLembreteFaturaTexto,
  emailOriginalLembrete,
  faturaPermiteLembrete,
  formatLembreteDataHoraSp,
  textoUltimoLembrete,
  type FaturaLembreteRegistro,
} from "@/lib/fatura-lembrete";
import { formatCurrency } from "@/lib/money";
import type { FaturaRecord } from "@/lib/types";
import {
  enviarLembreteFaturaCliente,
  listarLembretesFaturaCliente,
} from "@/services/fatura-lembrete.service";

interface FaturaLembreteModalProps {
  open: boolean;
  fatura: FaturaRecord | null;
  emailSugerido: string | null;
  historicoInicial?: boolean;
  onClose: () => void;
  onEnviado: (params: {
    faturaId: string;
    enviadoEm: string;
    email: string;
  }) => void;
}

export function FaturaLembreteModal({
  open,
  fatura,
  emailSugerido,
  historicoInicial = false,
  onClose,
  onEnviado,
}: FaturaLembreteModalProps) {
  const [email, setEmail] = useState("");
  const [assunto, setAssunto] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [historico, setHistorico] = useState<FaturaLembreteRegistro[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const enviandoRef = useRef(false);
  const requestIdRef = useRef<string | null>(null);
  const payloadKeyRef = useRef("");

  const podeEnviar = fatura ? faturaPermiteLembrete(fatura) : false;
  const emailCadastrado = fatura
    ? emailOriginalLembrete(fatura, emailSugerido)
    : "";

  useEffect(() => {
    if (!open || !fatura) return;

    const prefill = emailOriginalLembrete(fatura, emailSugerido);
    setEmail(prefill);
    try {
      const texto = buildLembreteFaturaTexto({
        numero: fatura.numero,
        clienteNome: fatura.referencia_nome,
        valor: Number(fatura.valor_total),
        dataVencimento: fatura.data_vencimento,
        mesReferencia: fatura.mes_referencia,
        periodoInicio: fatura.periodo_inicio,
        escopo: fatura.tipo === "cliente" ? "exames_ocupacionais" : "outro",
      });
      setAssunto(texto.assunto);
      setMensagem(texto.mensagem);
    } catch (err) {
      console.error(err);
      setAssunto("");
      setMensagem("");
      toast.error(
        err instanceof Error
          ? err.message
          : "Não foi possível preparar o texto do lembrete."
      );
    }
    setEnviando(false);
    enviandoRef.current = false;
    requestIdRef.current = null;
    payloadKeyRef.current = "";
    setHistoricoAberto(historicoInicial || !faturaPermiteLembrete(fatura));
    setHistorico([]);
  }, [open, fatura, emailSugerido, historicoInicial]);

  useEffect(() => {
    if (!open || !fatura || !historicoAberto) return;
    let ativo = true;
    setCarregandoHistorico(true);
    void listarLembretesFaturaCliente(fatura.id)
      .then((rows) => {
        if (ativo) setHistorico(rows);
      })
      .catch((err) => {
        console.error(err);
        if (ativo) {
          toast.error(
            err instanceof Error
              ? err.message
              : "Não foi possível carregar o histórico de lembretes."
          );
        }
      })
      .finally(() => {
        if (ativo) setCarregandoHistorico(false);
      });
    return () => {
      ativo = false;
    };
  }, [open, fatura, historicoAberto]);

  if (!open || !fatura) return null;

  const bloqueado = enviando;
  const emailValido = isEmailValido(email.trim());
  const semDestinatario = !emailCadastrado;
  const ultimo =
    textoUltimoLembrete(fatura.fatura_lembrete_ultimo_em) ??
    (historico[0] ? textoUltimoLembrete(historico[0].enviado_em) : null);
  const vencimento = formatDateIsoToBR(fatura.data_vencimento) || "—";

  async function handleEnviar() {
    if (!fatura || !podeEnviar) return;
    if (enviandoRef.current) return;

    const destino = email.trim();
    if (!isEmailValido(destino)) {
      toast.error(
        semDestinatario
          ? "Não há e-mail cadastrado. Informe um destinatário válido para enviar o lembrete."
          : "Informe um e-mail válido para o destinatário do lembrete."
      );
      return;
    }
    if (!assunto.trim() || !mensagem.trim()) {
      toast.error("Informe o assunto e a mensagem do lembrete.");
      return;
    }

    enviandoRef.current = true;
    setEnviando(true);
    const payloadKey = `${destino}\n${assunto}\n${mensagem}`;
    if (!requestIdRef.current || payloadKeyRef.current !== payloadKey) {
      payloadKeyRef.current = payloadKey;
      requestIdRef.current = crypto.randomUUID();
    }

    try {
      const result = await enviarLembreteFaturaCliente(fatura.id, {
        email: destino,
        assunto,
        mensagem,
        requestId: requestIdRef.current,
      });
      onEnviado({
        faturaId: fatura.id,
        enviadoEm: result.faturaLembreteUltimoEm,
        email: result.faturaLembreteUltimoEmail,
      });
      toast.success(
        "Lembrete aceito pelo Resend. A entrega ao destinatário não é confirmada por este registro."
      );
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error
          ? err.message
          : "Não foi possível enviar o lembrete. O envio não foi registrado."
      );
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  }

  const footer = podeEnviar ? (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <button
        type="button"
        className="btn btn-muted"
        disabled={bloqueado}
        onClick={onClose}
      >
        Cancelar
      </button>
      <button
        type="button"
        className="btn btn-primary"
        disabled={bloqueado || !emailValido || !assunto.trim() || !mensagem.trim()}
        onClick={() => void handleEnviar()}
      >
        {enviando ? "Enviando lembrete…" : "Enviar lembrete"}
      </button>
    </div>
  ) : (
    <div className="flex justify-end">
      <button type="button" className="btn btn-muted" onClick={onClose}>
        Fechar
      </button>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={podeEnviar ? "Enviar lembrete" : "Histórico de lembretes"}
      subtitle={
        podeEnviar
          ? "Revise o destinatário, o assunto e a mensagem antes de enviar. O lembrete não altera a fatura."
          : "Consultas dos lembretes aceitos pelo Resend para esta fatura."
      }
      footer={footer}
      closeOnOverlayClick={!bloqueado}
      size="wide"
    >
      <div className="space-y-5">
        {ultimo ? (
          <p className="text-xs font-semibold text-navy">{ultimo}</p>
        ) : (
          <p className="text-xs text-app-muted">Nenhum lembrete enviado ainda.</p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <ResumoCampo label="Fatura" value={fatura.numero || "—"} />
          <ResumoCampo label="Cliente" value={fatura.referencia_nome || "—"} />
          <ResumoCampo
            label="Valor"
            value={formatCurrency(Number(fatura.valor_total))}
          />
          <ResumoCampo label="Vencimento" value={vencimento} />
        </div>

        {podeEnviar ? (
          <>
            <div>
              <label className="field-label" htmlFor="fatura-lembrete-email">
                E-mail do cliente
              </label>
              <input
                id="fatura-lembrete-email"
                type="email"
                className="field-input mt-1.5 h-11 w-full text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@empresa.com.br"
                disabled={bloqueado}
                autoComplete="email"
              />
              {semDestinatario && !emailValido ? (
                <p className="mt-1.5 text-[11px] font-medium leading-relaxed text-brand-red">
                  Não há e-mail cadastrado para este cliente. Informe um
                  destinatário válido para enviar o lembrete.
                </p>
              ) : fatura.fatura_enviada_email?.trim() ? (
                <p className="mt-1.5 text-[11px] leading-relaxed text-app-muted">
                  Preenchido com o e-mail usado no envio desta fatura.
                </p>
              ) : emailSugerido?.trim() ? (
                <p className="mt-1.5 text-[11px] leading-relaxed text-app-muted">
                  Preenchido com o último e-mail usado no envio de faturas deste
                  cliente.
                </p>
              ) : (
                <p className="mt-1.5 text-[11px] leading-relaxed text-app-muted">
                  Destinatário informado para este envio.
                </p>
              )}
            </div>

            <div>
              <label className="field-label" htmlFor="fatura-lembrete-assunto">
                Assunto
              </label>
              <input
                id="fatura-lembrete-assunto"
                type="text"
                className="field-input mt-1.5 h-11 w-full text-sm"
                value={assunto}
                onChange={(e) => setAssunto(e.target.value)}
                disabled={bloqueado}
              />
            </div>

            <div>
              <label className="field-label" htmlFor="fatura-lembrete-mensagem">
                Mensagem
              </label>
              <textarea
                id="fatura-lembrete-mensagem"
                className="field-input mt-1.5 min-h-[220px] w-full resize-y px-3 py-2.5 text-sm leading-relaxed"
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                disabled={bloqueado}
              />
              <p className="mt-1.5 text-[11px] leading-relaxed text-app-muted">
                Os dados bancários e o PDF da própria fatura seguem no e-mail,
                sem nova emissão, juros ou multa.
              </p>
            </div>
          </>
        ) : null}

        <div className="border-t border-app-line pt-4">
          <button
            type="button"
            className="text-xs font-bold text-brand-blue hover:underline"
            onClick={() => setHistoricoAberto((prev) => !prev)}
            disabled={bloqueado}
          >
            {historicoAberto ? "Ocultar histórico" : "Consultar histórico"}
          </button>

          {historicoAberto ? (
            <div className="mt-3 space-y-3">
              {carregandoHistorico ? (
                <p className="text-xs text-app-muted">Carregando histórico…</p>
              ) : historico.length === 0 ? (
                <p className="text-xs text-app-muted">
                  Nenhum lembrete aceito pelo Resend para esta fatura.
                </p>
              ) : (
                historico.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-xl border border-app-line bg-[#f8fafc] px-3.5 py-3"
                  >
                    <p className="text-xs font-semibold text-navy">
                      {formatLembreteDataHoraSp(item.enviado_em) ?? "—"}
                    </p>
                    <p className="mt-1 text-[11px] text-[#475569]">
                      Para {item.destinatario} · {item.usuario_nome || "—"}
                    </p>
                    <p className="mt-2 text-xs font-medium text-navy">
                      {item.assunto}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-[11px] leading-relaxed text-[#475569]">
                      {item.mensagem}
                    </p>
                    <p className="mt-2 text-[11px] font-semibold text-brand-blue">
                      {FATURA_LEMBRETE_SITUACAO_LABEL[item.situacao]}
                      {item.resend_message_id
                        ? ` · ${item.resend_message_id}`
                        : ""}
                    </p>
                    <p className="mt-1 text-[11px] text-app-muted">
                      {FATURA_LEMBRETE_ENTREGA_NAO_CONFIRMADA}
                    </p>
                  </article>
                ))
              )}
            </div>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}

function ResumoCampo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-app-line bg-[#f8fafc] px-3.5 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-navy">{value}</p>
    </div>
  );
}
