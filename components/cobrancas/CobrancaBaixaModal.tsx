"use client";

import { useEffect, useState } from "react";
import { Field, RequiredMark } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import {
  rotuloContratoCobranca,
  rotuloParcelaCobranca,
  validarBaixaParcela,
  type CobrancaParcela,
} from "@/lib/cobrancas-mensalidades";
import { todayIsoSaoPaulo } from "@/lib/agendamento-datetime";
import { formatCurrency, maskMoneyInput, parseMoney } from "@/lib/money";
import {
  COMPROVANTE_TIPO_INVALIDO_MSG,
  ComprovanteValidationError,
  validateComprovanteFile,
} from "@/lib/fatura-comprovante";

export function CobrancaBaixaModal({
  parcela,
  saving,
  onClose,
  onConfirm,
}: {
  parcela: CobrancaParcela | null;
  saving: boolean;
  onClose: () => void;
  onConfirm: (params: {
    pagoEmIso: string;
    valorRecebido: number;
    comprovante: File | null;
  }) => void;
}) {
  const [pagoEm, setPagoEm] = useState("");
  const [valorRecebido, setValorRecebido] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!parcela) return;
    setPagoEm(todayIsoSaoPaulo());
    setValorRecebido(formatCurrency(parcela.valor));
    setArquivo(null);
    setErro(null);
  }, [parcela]);

  return (
    <Modal
      open={parcela != null}
      onClose={() => {
        if (!saving) onClose();
      }}
      closeOnOverlayClick={!saving}
      title="Dar baixa"
      subtitle={
        parcela
          ? `${parcela.empresa} · ${rotuloContratoCobranca(parcela.numeroOrcamento, parcela.numeroContrato)} · ${rotuloParcelaCobranca(parcela.numero)}`
          : undefined
      }
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="btn justify-center sm:w-auto"
            disabled={saving}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary justify-center sm:w-auto"
            disabled={saving || !parcela}
            onClick={() => {
              if (!parcela || saving) return;
              if (arquivo) {
                try {
                  validateComprovanteFile(arquivo);
                } catch (err) {
                  setErro(
                    err instanceof ComprovanteValidationError
                      ? err.message
                      : COMPROVANTE_TIPO_INVALIDO_MSG
                  );
                  return;
                }
              }
              const recebido = parseMoney(valorRecebido);
              const validacao = validarBaixaParcela({
                pagoEmAtual: parcela.pagoEmIso,
                valorPrevisto: parcela.valor,
                valorRecebido: recebido,
                pagoEmIso: pagoEm,
              });
              if (!validacao.ok) {
                setErro(validacao.mensagem);
                return;
              }
              setErro(null);
              onConfirm({
                pagoEmIso: pagoEm,
                valorRecebido: recebido,
                comprovante: arquivo,
              });
            }}
          >
            {saving ? "Confirmando..." : "Confirmar baixa"}
          </button>
        </div>
      }
    >
      {parcela ? (
        <div className="space-y-3 text-[13px] text-[#334155]">
          <dl className="grid grid-cols-1 gap-2 rounded-xl border border-[#e8edf5] bg-[#f8fafc] px-3 py-2 sm:grid-cols-2">
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wide text-[#64748b]">
                Empresa
              </dt>
              <dd className="font-semibold text-navy">{parcela.empresa}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wide text-[#64748b]">
                Contrato
              </dt>
              <dd className="font-semibold text-navy">
                {rotuloContratoCobranca(
                  parcela.numeroOrcamento,
                  parcela.numeroContrato
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wide text-[#64748b]">
                Parcela
              </dt>
              <dd className="font-semibold text-navy">
                {rotuloParcelaCobranca(parcela.numero)}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wide text-[#64748b]">
                Valor previsto
              </dt>
              <dd className="font-semibold text-navy">
                {formatCurrency(parcela.valor)}
              </dd>
            </div>
          </dl>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label={
                <>
                  Data do pagamento <RequiredMark />
                </>
              }
            >
              <input
                type="date"
                className="field-input"
                value={pagoEm}
                disabled={saving}
                onChange={(event) => setPagoEm(event.target.value)}
              />
            </Field>
            <Field
              label={
                <>
                  Valor recebido <RequiredMark />
                </>
              }
            >
              <input
                className="field-input"
                inputMode="numeric"
                value={valorRecebido}
                disabled={saving}
                onChange={(event) =>
                  setValorRecebido(maskMoneyInput(event.target.value))
                }
              />
            </Field>
          </div>

          <Field label="Comprovante (opcional)">
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              className="field-input file:mr-3 file:rounded-md file:border-0 file:bg-[#eef2ff] file:px-2 file:py-1 file:text-[11px] file:font-semibold file:text-navy"
              disabled={saving}
              onChange={(event) => {
                setArquivo(event.target.files?.[0] ?? null);
                setErro(null);
              }}
            />
            {arquivo ? (
              <p className="text-[11px] text-[#64748b]">{arquivo.name}</p>
            ) : null}
          </Field>

          {erro ? (
            <p className="text-[12px] text-[#b91c1c]" role="alert">
              {erro}
            </p>
          ) : (
            <p className="text-[11px] leading-relaxed text-[#64748b]">
              A confirmação grava a mesma parcela do Financeiro do contrato. Um
              valor diferente do previsto não quita a parcela.
            </p>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
