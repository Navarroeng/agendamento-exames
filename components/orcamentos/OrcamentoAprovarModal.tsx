"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { RequiredMark } from "@/components/ui/Field";
import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import { emptyToNull, formatCurrency, maskMoneyInput, parseMoney } from "@/lib/money";
import {
  ORCAMENTO_CONTRATO_ANDAMENTO_LABELS,
  buildAprovacaoDiffs,
  buildAprovacaoFormFromOrcamento,
  buildAprovacaoFormFromRecord,
  resolveContratoAndamento,
  type OrcamentoAprovacaoFormValues,
  type OrcamentoAprovacaoRecord,
  type OrcamentoContratoUpdatePayload,
} from "@/lib/orcamento-aprovacao";
import {
  ORCAMENTO_STATUS_BADGE,
  ORCAMENTO_STATUS_LABELS,
  type OrcamentoComItens,
  type ServicoSstRecord,
} from "@/lib/orcamento-types";
import { OrcamentoViewBody } from "./OrcamentoViewBody";

type TabId = "resumo" | "aprovado" | "contrato";

interface OrcamentoAprovarModalProps {
  open: boolean;
  mode?: "consulta" | "aprovacao";
  orcamento: OrcamentoComItens | null;
  aprovacao: OrcamentoAprovacaoRecord | null;
  servicos: ServicoSstRecord[];
  saving: boolean;
  usuarioNome: string;
  onClose: () => void;
  onSalvarAprovacao: (form: OrcamentoAprovacaoFormValues) => Promise<void>;
  onSalvarContrato: (
    aprovacaoId: string,
    payload: OrcamentoContratoUpdatePayload,
    file: File | null
  ) => Promise<void>;
  onVerComprovante: (path: string) => void;
}

const SIM_NAO = [
  { value: "nao", label: "Não" },
  { value: "sim", label: "Sim" },
] as const;

export function OrcamentoAprovarModal({
  open,
  mode = "aprovacao",
  orcamento,
  aprovacao,
  servicos,
  saving,
  onClose,
  onSalvarAprovacao,
  onSalvarContrato,
  onVerComprovante,
}: OrcamentoAprovarModalProps) {
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<TabId>("resumo");
  const [form, setForm] = useState<OrcamentoAprovacaoFormValues | null>(null);
  const [showDiffConfirm, setShowDiffConfirm] = useState(false);

  const [contratoEnviado, setContratoEnviado] = useState(false);
  const [contratoEnviadoEm, setContratoEnviadoEm] = useState("");
  const [contratoAssinado, setContratoAssinado] = useState(false);
  const [contratoAssinadoEm, setContratoAssinadoEm] = useState("");
  const [observacaoContrato, setObservacaoContrato] = useState("");
  const [boletoVencimento, setBoletoVencimento] = useState("");
  const [boletoPago, setBoletoPago] = useState(false);
  const [boletoPagoEm, setBoletoPagoEm] = useState("");
  const [observacaoPagamento, setObservacaoPagamento] = useState("");
  const [comprovanteFile, setComprovanteFile] = useState<File | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !orcamento) return;
    setTab("resumo");
    setShowDiffConfirm(false);
    setForm(
      aprovacao
        ? buildAprovacaoFormFromRecord(aprovacao)
        : buildAprovacaoFormFromOrcamento(orcamento)
    );
    setContratoEnviado(Boolean(aprovacao?.contrato_enviado));
    setContratoEnviadoEm(aprovacao?.contrato_enviado_em ?? "");
    setContratoAssinado(Boolean(aprovacao?.contrato_assinado));
    setContratoAssinadoEm(aprovacao?.contrato_assinado_em ?? "");
    setObservacaoContrato(aprovacao?.observacao_contrato ?? "");
    setBoletoVencimento(aprovacao?.boleto_vencimento ?? "");
    setBoletoPago(Boolean(aprovacao?.boleto_pago));
    setBoletoPagoEm(aprovacao?.boleto_pago_em ?? "");
    setObservacaoPagamento(aprovacao?.observacao_pagamento ?? "");
    setComprovanteFile(null);
  }, [open, orcamento, aprovacao, mode]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, saving]);

  const diffs = useMemo(() => {
    if (!orcamento || !form) return [];
    return buildAprovacaoDiffs(orcamento, form, parseMoney);
  }, [orcamento, form]);

  const andamento = resolveContratoAndamento(aprovacao);
  const consultaMode = mode === "consulta";
  const aprovadoLocked = Boolean(aprovacao) || consultaMode;
  const camposSomenteLeitura = consultaMode || saving;

  const updateFormField = useCallback(
    (field: keyof Omit<OrcamentoAprovacaoFormValues, "itens">, value: string) => {
      setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
    },
    []
  );

  const updateItem = useCallback(
    (
      id: string,
      field: "servico_nome" | "quantidade" | "valor_unitario",
      value: string
    ) => {
      setForm((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          itens: prev.itens.map((item) =>
            item.id === id
              ? {
                  ...item,
                  [field]:
                    field === "valor_unitario" ? maskMoneyInput(value) : value,
                }
              : item
          ),
        };
      });
    },
    []
  );

  async function handleSalvarAprovacaoClick() {
    if (!form) return;
    if (!form.quantidade_colaboradores.trim() || Number(form.quantidade_colaboradores) < 1) {
      toast.error("Informe a quantidade de colaboradores.");
      return;
    }
    if (parseMoney(form.valor_final) <= 0) {
      toast.error("Informe o valor final fechado.");
      return;
    }
    const itensValidos = form.itens.filter((i) => i.servico_nome.trim());
    if (itensValidos.length === 0) {
      toast.error("Informe ao menos um serviço.");
      return;
    }
    if (!showDiffConfirm) {
      setShowDiffConfirm(true);
      return;
    }
    await onSalvarAprovacao(form);
    setShowDiffConfirm(false);
    setTab("contrato");
  }

  async function handleSalvarContratoClick() {
    if (!aprovacao) return;

    if (contratoEnviado && !contratoEnviadoEm) {
      toast.error("Informe a data de envio do contrato.");
      return;
    }
    if (contratoAssinado && !contratoAssinadoEm) {
      toast.error("Informe a data de assinatura do contrato.");
      return;
    }
    if (boletoPago) {
      if (!boletoPagoEm) {
        toast.error("Informe a data do pagamento.");
        return;
      }
      if (!comprovanteFile && !aprovacao.comprovante_path) {
        toast.error("Anexe o comprovante de pagamento.");
        return;
      }
    }

    const payload: OrcamentoContratoUpdatePayload = {
      contrato_enviado: contratoEnviado,
      contrato_enviado_em: contratoEnviado ? contratoEnviadoEm || null : null,
      contrato_assinado: contratoAssinado,
      contrato_assinado_em: contratoAssinado ? contratoAssinadoEm || null : null,
      observacao_contrato: emptyToNull(observacaoContrato),
      boleto_vencimento: contratoAssinado
        ? boletoVencimento || null
        : null,
      boleto_pago: contratoAssinado ? boletoPago : false,
      boleto_pago_em:
        contratoAssinado && boletoPago ? boletoPagoEm || null : null,
      comprovante_path: aprovacao.comprovante_path,
      comprovante_nome: aprovacao.comprovante_nome,
      comprovante_tipo: aprovacao.comprovante_tipo,
      comprovante_tamanho: aprovacao.comprovante_tamanho,
      observacao_pagamento:
        contratoAssinado ? emptyToNull(observacaoPagamento) : null,
    };

    await onSalvarContrato(aprovacao.id, payload, comprovanteFile);
    setComprovanteFile(null);
  }

  if (!open || !orcamento || !mounted || !form) return null;

  const badge = ORCAMENTO_STATUS_BADGE[orcamento.status];
  const tabs: Array<{ id: TabId; label: string; disabled?: boolean }> = [
    { id: "resumo", label: "Resumo" },
  ];
  if (consultaMode) {
    if (aprovacao) {
      tabs.push({ id: "aprovado", label: "Orçamento aprovado" });
      tabs.push({ id: "contrato", label: "Contrato" });
    }
  } else {
    tabs.push({ id: "aprovado", label: "Orçamento aprovado" });
    tabs.push({
      id: "contrato",
      label: "Contrato",
      disabled: !aprovacao,
    });
  }

  const tituloModal = consultaMode
    ? `Orçamento · ${orcamento.numero}`
    : `Aprovar · ${orcamento.numero}`;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
        onClick={() => {
          if (!saving) onClose();
        }}
        aria-label="Fechar"
      />
      <div
        className="relative z-10 flex max-h-[90vh] w-full max-w-[1200px] flex-col overflow-hidden rounded-2xl border border-[#dbe3ef] bg-white shadow-[0_28px_70px_rgba(8,43,99,0.22)]"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 bg-gradient-to-r from-[#082b63] via-[#0a3578] to-[#0c3f8c] px-5 py-4 text-white sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="text-lg font-extrabold sm:text-xl">
                  {tituloModal}
                </h3>
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${badge.className}`}
                >
                  {ORCAMENTO_STATUS_LABELS[orcamento.status]}
                </span>
                {aprovacao ? (
                  <span className="inline-flex rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-bold text-white">
                    {ORCAMENTO_CONTRATO_ANDAMENTO_LABELS[andamento]}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 truncate text-sm text-white/80">
                {orcamento.cliente_nome}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/20 bg-white/10 text-lg text-white hover:bg-white/20"
              aria-label="Fechar"
            >
              ×
            </button>
          </div>

          <div className="mt-4 flex gap-1 overflow-x-auto">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={item.disabled || saving}
                onClick={() => {
                  if (!item.disabled) setTab(item.id);
                }}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors ${
                  tab === item.id
                    ? "bg-white text-[#082b63]"
                    : item.disabled
                      ? "cursor-not-allowed text-white/35"
                      : "bg-white/10 text-white/85 hover:bg-white/20"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[#f7f9fc] p-4 sm:p-6">
          {tab === "resumo" ? (
            <OrcamentoViewBody orcamento={orcamento} servicos={servicos} />
          ) : null}

          {tab === "aprovado" ? (
            <div className="space-y-4">
              <p className="rounded-xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-[12px] text-[#92400e]">
                As condições aprovadas serão salvas separadamente. O orçamento
                original não será alterado.
              </p>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                <Field label="Quantidade de colaboradores" required>
                  <input
                    className="field-input"
                    value={form.quantidade_colaboradores}
                    disabled={aprovadoLocked || saving}
                    onChange={(e) =>
                      updateFormField(
                        "quantidade_colaboradores",
                        e.target.value.replace(/\D/g, "")
                      )
                    }
                  />
                </Field>
                <Field label="Valor final fechado" required>
                  <input
                    className="field-input"
                    value={form.valor_final}
                    disabled={aprovadoLocked || saving}
                    onChange={(e) =>
                      updateFormField(
                        "valor_final",
                        maskMoneyInput(e.target.value)
                      )
                    }
                  />
                </Field>
                <Field label="Desconto (%)">
                  <input
                    className="field-input"
                    value={form.desconto_percentual}
                    disabled={aprovadoLocked || saving}
                    onChange={(e) =>
                      updateFormField("desconto_percentual", e.target.value)
                    }
                  />
                </Field>
                <Field label="Qtd. de parcelas">
                  <input
                    className="field-input"
                    value={form.quantidade_parcelas}
                    disabled={aprovadoLocked || saving}
                    onChange={(e) =>
                      updateFormField(
                        "quantidade_parcelas",
                        e.target.value.replace(/\D/g, "")
                      )
                    }
                  />
                </Field>
                <Field label="Valor das parcelas">
                  <input
                    className="field-input"
                    value={form.valor_parcela}
                    disabled={aprovadoLocked || saving}
                    onChange={(e) =>
                      updateFormField(
                        "valor_parcela",
                        maskMoneyInput(e.target.value)
                      )
                    }
                  />
                </Field>
                <Field label="Valor à vista">
                  <input
                    className="field-input"
                    value={form.valor_avista}
                    disabled={aprovadoLocked || saving}
                    onChange={(e) =>
                      updateFormField(
                        "valor_avista",
                        maskMoneyInput(e.target.value)
                      )
                    }
                  />
                </Field>
                <div className="md:col-span-2 lg:col-span-3">
                  <Field label="Condição de pagamento">
                    <input
                      className="field-input"
                      value={form.condicao_pagamento}
                      disabled={aprovadoLocked || saving}
                      onChange={(e) =>
                        updateFormField("condicao_pagamento", e.target.value)
                      }
                    />
                  </Field>
                </div>
                <div className="md:col-span-2 lg:col-span-3">
                  <Field label="Observações da negociação">
                    <textarea
                      className="field-input min-h-[72px] resize-y"
                      value={form.observacoes}
                      disabled={aprovadoLocked || saving}
                      onChange={(e) =>
                        updateFormField("observacoes", e.target.value)
                      }
                    />
                  </Field>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-[#e4ebf4] bg-white">
                <div className="border-b border-[#eef2f7] px-4 py-3">
                  <p className="text-[11px] font-extrabold uppercase tracking-wide text-navy">
                    Serviços
                  </p>
                </div>
                <div className="space-y-3 p-4">
                  {form.itens.map((item) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_100px_140px]"
                    >
                      <input
                        className="field-input"
                        placeholder="Serviço"
                        value={item.servico_nome}
                        disabled={aprovadoLocked || saving}
                        onChange={(e) =>
                          updateItem(item.id, "servico_nome", e.target.value)
                        }
                      />
                      <input
                        className="field-input"
                        placeholder="Qtd"
                        value={item.quantidade}
                        disabled={aprovadoLocked || saving}
                        onChange={(e) =>
                          updateItem(
                            item.id,
                            "quantidade",
                            e.target.value.replace(/\D/g, "")
                          )
                        }
                      />
                      <input
                        className="field-input"
                        placeholder="Valor"
                        value={item.valor_unitario}
                        disabled={aprovadoLocked || saving}
                        onChange={(e) =>
                          updateItem(item.id, "valor_unitario", e.target.value)
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              {showDiffConfirm ? (
                <div className="rounded-2xl border border-[#bfdbfe] bg-[#eff6ff] p-4">
                  <p className="mb-3 text-sm font-bold text-navy">
                    Comparação entre original e aprovado
                  </p>
                  <div className="space-y-2">
                    {diffs.map((diff) => (
                      <div
                        key={diff.label}
                        className={`rounded-xl border px-3 py-2 text-[12px] ${
                          diff.changed
                            ? "border-[#fcd34d] bg-[#fffbeb]"
                            : "border-[#e2e8f0] bg-white"
                        }`}
                      >
                        <p className="font-semibold text-navy">{diff.label}</p>
                        <p className="text-[#64748b]">
                          Orçamento original: {diff.original}
                        </p>
                        <p className="text-[#64748b]">
                          Orçamento aprovado: {diff.aprovado}
                        </p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-[12px] text-[#1e3a8a]">
                    As condições aprovadas serão salvas separadamente. O
                    orçamento original não será alterado.
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {tab === "contrato" && aprovacao ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-[#e4ebf4] bg-white px-4 py-3 text-[12px] text-[#475569]">
                Andamento:{" "}
                <strong className="text-navy">
                  {ORCAMENTO_CONTRATO_ANDAMENTO_LABELS[andamento]}
                </strong>
                {aprovacao.aprovado_em ? (
                  <span>
                    {" "}
                    · Aprovado em{" "}
                    {formatDateIsoToBR(aprovacao.aprovado_em.split("T")[0])} por{" "}
                    {aprovacao.aprovado_por}
                  </span>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="Contrato enviado?">
                  <select
                    className="field-input"
                    value={contratoEnviado ? "sim" : "nao"}
                    disabled={camposSomenteLeitura}
                    onChange={(e) =>
                      setContratoEnviado(e.target.value === "sim")
                    }
                  >
                    {SIM_NAO.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Data de envio do contrato">
                  <input
                    type="date"
                    className="field-input"
                    value={contratoEnviadoEm}
                    disabled={camposSomenteLeitura || !contratoEnviado}
                    onChange={(e) => setContratoEnviadoEm(e.target.value)}
                  />
                </Field>
                <Field label="Contrato assinado?">
                  <select
                    className="field-input"
                    value={contratoAssinado ? "sim" : "nao"}
                    disabled={camposSomenteLeitura}
                    onChange={(e) => {
                      const sim = e.target.value === "sim";
                      setContratoAssinado(sim);
                      if (!sim) {
                        setBoletoPago(false);
                        setComprovanteFile(null);
                      }
                    }}
                  >
                    {SIM_NAO.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Data de assinatura">
                  <input
                    type="date"
                    className="field-input"
                    value={contratoAssinadoEm}
                    disabled={camposSomenteLeitura || !contratoAssinado}
                    onChange={(e) => setContratoAssinadoEm(e.target.value)}
                  />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Observação do contrato">
                    <textarea
                      className="field-input min-h-[72px] resize-y"
                      value={observacaoContrato}
                      disabled={camposSomenteLeitura}
                      onChange={(e) => setObservacaoContrato(e.target.value)}
                    />
                  </Field>
                </div>
              </div>

              {contratoAssinado ? (
                <section className="rounded-2xl border border-[#e8d7a8] bg-gradient-to-br from-[#fffbeb] to-white p-4 sm:p-5">
                  <p className="mb-3 text-[11px] font-extrabold uppercase tracking-wide text-navy">
                    Pagamento inicial
                  </p>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Field label="Data de vencimento do boleto">
                      <input
                        type="date"
                        className="field-input"
                        value={boletoVencimento}
                        disabled={camposSomenteLeitura}
                        onChange={(e) => setBoletoVencimento(e.target.value)}
                      />
                    </Field>
                    <Field label="Boleto pago?">
                      <select
                        className="field-input"
                        value={boletoPago ? "sim" : "nao"}
                        disabled={camposSomenteLeitura}
                        onChange={(e) =>
                          setBoletoPago(e.target.value === "sim")
                        }
                      >
                        {SIM_NAO.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    {boletoPago ? (
                      <>
                        <Field label="Data do pagamento" required>
                          <input
                            type="date"
                            className="field-input"
                            value={boletoPagoEm}
                            disabled={camposSomenteLeitura}
                            onChange={(e) => setBoletoPagoEm(e.target.value)}
                          />
                        </Field>
                        <Field label="Comprovante de pagamento" required>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                            className="field-input file:mr-3 file:rounded-md file:border-0 file:bg-[#eef2ff] file:px-2 file:py-1 file:text-[11px] file:font-semibold file:text-navy"
                            disabled={camposSomenteLeitura}
                            onChange={(e) =>
                              setComprovanteFile(e.target.files?.[0] ?? null)
                            }
                          />
                          {aprovacao.comprovante_nome ? (
                            <button
                              type="button"
                              className="mt-1 text-[11px] font-semibold text-brand-blue hover:underline"
                              onClick={() => {
                                if (aprovacao.comprovante_path) {
                                  onVerComprovante(aprovacao.comprovante_path);
                                }
                              }}
                            >
                              Ver comprovante atual ({aprovacao.comprovante_nome})
                            </button>
                          ) : null}
                          {comprovanteFile ? (
                            <p className="mt-1 text-[11px] text-[#64748b]">
                              Novo arquivo: {comprovanteFile.name}
                            </p>
                          ) : null}
                        </Field>
                      </>
                    ) : null}
                    <div className="md:col-span-2">
                      <Field label="Observação do pagamento">
                        <textarea
                          className="field-input min-h-[72px] resize-y"
                          value={observacaoPagamento}
                          disabled={camposSomenteLeitura}
                          onChange={(e) =>
                            setObservacaoPagamento(e.target.value)
                          }
                        />
                      </Field>
                    </div>
                  </div>
                </section>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-[#e4ebf4] bg-white px-4 py-3 sm:flex-row sm:justify-end sm:px-6 sm:py-4">
          <button
            type="button"
            className="btn justify-center sm:w-auto"
            onClick={onClose}
            disabled={saving}
          >
            Fechar
          </button>
          {tab === "aprovado" && !aprovadoLocked && !consultaMode ? (
            <button
              type="button"
              className="btn btn-primary justify-center sm:w-auto"
              onClick={() => void handleSalvarAprovacaoClick()}
              disabled={saving}
            >
              {saving
                ? "Salvando..."
                : showDiffConfirm
                  ? "Confirmar e salvar aprovação"
                  : "Salvar aprovação"}
            </button>
          ) : null}
          {tab === "aprovado" && showDiffConfirm && !aprovadoLocked && !consultaMode ? (
            <button
              type="button"
              className="btn justify-center sm:w-auto"
              onClick={() => setShowDiffConfirm(false)}
              disabled={saving}
            >
              Voltar à edição
            </button>
          ) : null}
          {tab === "contrato" && aprovacao && !consultaMode ? (
            <button
              type="button"
              className="btn btn-primary justify-center sm:w-auto"
              onClick={() => void handleSalvarContratoClick()}
              disabled={saving}
            >
              {saving ? "Salvando..." : "Salvar acompanhamento"}
            </button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-navy">
        {label}
        {required ? (
          <>
            {" "}
            <RequiredMark />
          </>
        ) : null}
      </label>
      {children}
    </div>
  );
}
