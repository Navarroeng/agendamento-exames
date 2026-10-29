"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { RequiredMark } from "@/components/ui/Field";
import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import { formatDateTimeBR } from "@/lib/format-datetime";
import {
  IMPLANTACAO_AET_ELABORACAO_STATUS_LABELS,
  IMPLANTACAO_AET_VISITA_STATUS_LABELS,
  isAetElaboracaoConcluida,
  isAetVisitaRealizada,
  type ImplantacaoAetElaboracaoStatus,
  type ImplantacaoAetRecord,
  type ImplantacaoAetVisitaStatus,
} from "@/lib/implantacao-aet";
import { AET_LAUDO_PDF_FORMATO_HINT } from "@/lib/orcamento-onboarding-files";
import {
  copiarTextoAreaTransferencia,
  MENSAGEM_CONFIRMACAO_VISITA_COPIADA,
  MENSAGEM_CONFIRMACAO_VISITA_SALVAR_ANTES,
  prepararCopiaConfirmacaoVisita,
  visitaSalvaDoOrcamento,
  visitaSalvaPermiteCopiarConfirmacao,
  type VisitaConfirmacaoForm,
} from "@/lib/orcamento-visita-confirmacao";
import type { LaudoPontualKind } from "@/lib/servico-laudo-pontual";
import { copyLaudoPontual } from "@/lib/servico-laudo-pontual";

const VISITA_STATUS_OPTIONS: ImplantacaoAetVisitaStatus[] = [
  "aguardando_agendamento",
  "agendada",
  "realizada",
];

const ELABORACAO_STATUS_OPTIONS: ImplantacaoAetElaboracaoStatus[] = [
  "aguardando",
  "em_elaboracao",
  "concluido",
];

type AetVisitaForm = VisitaConfirmacaoForm;

function JanelaCopiaManual({
  mensagem,
  onClose,
}: {
  mensagem: string;
  onClose: () => void;
}) {
  const campoRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const campo = campoRef.current;
    if (!campo) return;
    campo.focus();
    campo.select();
  }, [mensagem]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-3 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="copia-manual-titulo"
        className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[#e8edf5] bg-white shadow-[0_24px_64px_rgba(15,23,42,0.18)]"
      >
        <div className="border-b border-[#e8edf5] px-4 py-4 sm:px-5">
          <h3
            id="copia-manual-titulo"
            className="text-base font-extrabold text-navy"
          >
            Confirmação da visita
          </h3>
          <p className="mt-1 text-sm text-[#64748b]">
            Não foi possível copiar automaticamente. Selecione a mensagem e
            copie manualmente.
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5">
          <textarea
            ref={campoRef}
            readOnly
            value={mensagem}
            aria-label="Mensagem de confirmação"
            className="field-input h-auto min-h-[220px] w-full resize-y whitespace-pre-wrap py-3 leading-relaxed"
          />
        </div>
        <div className="border-t border-[#e8edf5] px-4 py-3 sm:px-5">
          <button
            type="button"
            className="btn w-full justify-center sm:w-auto"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function OrcamentoAbaAetVisita({
  kind = "aet",
  aet,
  form,
  empresaNome,
  orcamentoId,
  saving,
  somenteLeitura = false,
  onChange,
  onSalvar,
}: {
  kind?: LaudoPontualKind;
  aet: ImplantacaoAetRecord | null;
  form: AetVisitaForm;
  empresaNome: string;
  orcamentoId: string;
  saving: boolean;
  somenteLeitura?: boolean;
  onChange: (patch: Partial<AetVisitaForm>) => void;
  onSalvar: () => void;
}) {
  const copy = copyLaudoPontual(kind);
  const exigeData = form.visita_status !== "aguardando_agendamento";
  const exigeHorario = form.visita_status === "agendada";
  const locked = saving || somenteLeitura;
  const visitaDesteOrcamento = visitaSalvaDoOrcamento(aet, orcamentoId);
  const podeCopiar = visitaSalvaPermiteCopiarConfirmacao(visitaDesteOrcamento);
  const [mensagemManual, setMensagemManual] = useState<string | null>(null);

  useEffect(() => {
    setMensagemManual(null);
  }, [orcamentoId]);

  async function handleCopiarConfirmacao() {
    const preparo = prepararCopiaConfirmacaoVisita({
      form,
      salvo: visitaDesteOrcamento,
      empresa: empresaNome,
    });
    if (!preparo.ok) {
      if (preparo.motivo === "alteracoes_nao_salvas") {
        toast.error(MENSAGEM_CONFIRMACAO_VISITA_SALVAR_ANTES);
      }
      return;
    }
    const copiou = await copiarTextoAreaTransferencia(preparo.mensagem);
    if (copiou) {
      toast.success(MENSAGEM_CONFIRMACAO_VISITA_COPIADA);
      return;
    }
    setMensagemManual(preparo.mensagem);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#64748b]">
        {somenteLeitura ? copy.textoVisitaConsulta : copy.textoVisitaEdicao}
      </p>
      {aet?.visita_status === "realizada" ? (
        <p className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-2 text-[12px] font-semibold text-[#166534]">
          {copy.bannerRealizada}
          {aet.visita_data
            ? ` em ${formatDateIsoToBR(aet.visita_data)}`
            : ""}
          .
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-navy">
            {copy.rotuloStatus}
          </span>
          <select
            className="field-input"
            value={form.visita_status}
            disabled={locked}
            onChange={(e) =>
              onChange({
                visita_status: e.target.value as ImplantacaoAetVisitaStatus,
              })
            }
          >
            {VISITA_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {IMPLANTACAO_AET_VISITA_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-navy">
            {copy.rotuloData} {exigeData && !somenteLeitura ? <RequiredMark /> : null}
          </span>
          <input
            type="date"
            className="field-input"
            value={form.visita_data}
            disabled={locked || !exigeData}
            onChange={(e) => onChange({ visita_data: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-navy">
            Horário {exigeHorario && !somenteLeitura ? <RequiredMark /> : null}
          </span>
          <input
            type="time"
            className="field-input"
            value={form.visita_horario}
            disabled={locked || !exigeData}
            onChange={(e) => onChange({ visita_horario: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-navy">
            Responsável Navarro
          </span>
          <input
            className="field-input"
            value={form.visita_responsavel}
            disabled={locked}
            onChange={(e) => onChange({ visita_responsavel: e.target.value })}
          />
        </label>
        <label className="block md:col-span-2">
          <span className="mb-1.5 block text-xs font-bold text-navy">
            Endereço da visita
          </span>
          <input
            type="text"
            className="field-input"
            value={form.visita_endereco}
            disabled={locked}
            onChange={(e) => onChange({ visita_endereco: e.target.value })}
          />
        </label>
        <label className="block md:col-span-2">
          <span className="mb-1.5 block text-xs font-bold text-navy">
            Observação
          </span>
          <textarea
            className="field-input min-h-[72px] resize-y"
            value={form.visita_observacao}
            disabled={locked}
            onChange={(e) => onChange({ visita_observacao: e.target.value })}
          />
        </label>
      </div>

      {podeCopiar || !somenteLeitura ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {podeCopiar ? (
            <button
              type="button"
              className="btn w-full justify-center sm:w-auto"
              disabled={saving}
              onClick={() => void handleCopiarConfirmacao()}
            >
              <Copy className="h-4 w-4 shrink-0" aria-hidden />
              Copiar confirmação
            </button>
          ) : null}
          {somenteLeitura ? null : (
            <button
              type="button"
              className="btn btn-primary w-full justify-center sm:w-auto"
              disabled={saving}
              onClick={onSalvar}
            >
              {saving ? "Salvando..." : "Salvar visita"}
            </button>
          )}
        </div>
      ) : null}
      {mensagemManual ? (
        <JanelaCopiaManual
          mensagem={mensagemManual}
          onClose={() => setMensagemManual(null)}
        />
      ) : null}
    </div>
  );
}

export function OrcamentoAbaAetElaboracao({
  kind = "aet",
  aet,
  form,
  saving,
  onChange,
  onFileChange,
  onRemoverLaudo,
  onVisualizarLaudo,
  onSalvar,
}: {
  kind?: LaudoPontualKind;
  aet: ImplantacaoAetRecord | null;
  form: {
    elaboracao_status: ImplantacaoAetElaboracaoStatus;
    elaboracao_observacao: string;
  };
  saving: boolean;
  onChange: (patch: {
    elaboracao_status?: ImplantacaoAetElaboracaoStatus;
    elaboracao_observacao?: string;
  }) => void;
  onFileChange: (file: File | null) => void;
  onRemoverLaudo: () => void;
  onVisualizarLaudo: () => void;
  onSalvar: () => void;
}) {
  const visitaOk = isAetVisitaRealizada(aet);
  const laudoAnexado = Boolean(aet?.laudo_path?.trim());
  const copy = copyLaudoPontual(kind);

  return (
    <div className="space-y-4">
      {!visitaOk ? (
        <p className="rounded-xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-sm font-semibold text-[#b45309]">
          Aguardando realização da visita
        </p>
      ) : (
        <p className="text-sm text-[#64748b]">{copy.textoElaboracao}</p>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-navy">
            Status da elaboração
          </span>
          <select
            className="field-input"
            value={form.elaboracao_status}
            disabled={saving || !visitaOk}
            onChange={(e) =>
              onChange({
                elaboracao_status: e.target
                  .value as ImplantacaoAetElaboracaoStatus,
              })
            }
          >
            {ELABORACAO_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {IMPLANTACAO_AET_ELABORACAO_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
        <label className="block md:col-span-2">
          <span className="mb-1.5 block text-xs font-bold text-navy">
            Observação
          </span>
          <textarea
            className="field-input min-h-[72px] resize-y"
            value={form.elaboracao_observacao}
            disabled={saving || !visitaOk}
            onChange={(e) =>
              onChange({ elaboracao_observacao: e.target.value })
            }
          />
        </label>
      </div>

      <div className="rounded-xl border border-[#e4ebf4] bg-white p-4">
        <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-navy">
          {copy.upload}
        </p>
        {laudoAnexado ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-navy">
              {aet?.laudo_nome}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn justify-center text-[12px]"
                disabled={saving}
                onClick={onVisualizarLaudo}
              >
                Visualizar
              </button>
              <button
                type="button"
                className="btn justify-center text-[12px] text-brand-red"
                disabled={saving}
                onClick={onRemoverLaudo}
              >
                Remover
              </button>
            </div>
          </div>
        ) : (
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="field-input"
            disabled={saving || !visitaOk}
            onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
          />
        )}
        {kind === "aet" ? (
          <p className="mt-2 text-[12px] text-[#64748b]">
            {AET_LAUDO_PDF_FORMATO_HINT}
          </p>
        ) : null}
      </div>

      {isAetElaboracaoConcluida(aet) ? (
        <p className="text-[12px] font-semibold text-[#166534]">
          Elaboração concluída
          {aet?.elaboracao_concluida_em
            ? ` em ${formatDateTimeBR(aet.elaboracao_concluida_em)}`
            : ""}
          .
        </p>
      ) : null}

      <button
        type="button"
        className="btn btn-primary justify-center sm:w-auto"
        disabled={saving || !visitaOk}
        onClick={onSalvar}
      >
        {saving ? "Salvando..." : "Salvar elaboração"}
      </button>
    </div>
  );
}

export function OrcamentoAbaAetEnvio({
  kind = "aet",
  aet,
  form,
  saving,
  onChange,
  onSalvar,
}: {
  kind?: LaudoPontualKind;
  aet: ImplantacaoAetRecord | null;
  form: {
    enviado_cliente: boolean;
    enviado_em: string;
    envio_observacao: string;
  };
  saving: boolean;
  onChange: (patch: {
    enviado_cliente?: boolean;
    enviado_em?: string;
    envio_observacao?: string;
  }) => void;
  onSalvar: () => void;
}) {
  const podeEnviar = isAetElaboracaoConcluida(aet);
  const copy = copyLaudoPontual(kind);

  return (
    <div className="space-y-4">
      {!podeEnviar ? (
        <p className="rounded-xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-sm font-semibold text-[#b45309]">
          {copy.concluaAntesEnvio}
        </p>
      ) : (
        <p className="text-sm text-[#64748b]">{copy.textoEnvio}</p>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-navy">
            Enviado ao cliente?
          </span>
          <select
            className="field-input"
            value={form.enviado_cliente ? "sim" : "nao"}
            disabled={saving || !podeEnviar}
            onChange={(e) =>
              onChange({ enviado_cliente: e.target.value === "sim" })
            }
          >
            <option value="nao">Não</option>
            <option value="sim">Sim</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-navy">
            Data de envio {form.enviado_cliente ? <RequiredMark /> : null}
          </span>
          <input
            type="date"
            className="field-input"
            value={form.enviado_em}
            disabled={saving || !podeEnviar || !form.enviado_cliente}
            onChange={(e) => onChange({ enviado_em: e.target.value })}
          />
        </label>
        <label className="block md:col-span-2">
          <span className="mb-1.5 block text-xs font-bold text-navy">
            Observação
          </span>
          <textarea
            className="field-input min-h-[72px] resize-y"
            value={form.envio_observacao}
            disabled={saving || !podeEnviar}
            onChange={(e) => onChange({ envio_observacao: e.target.value })}
          />
        </label>
      </div>

      <button
        type="button"
        className="btn btn-primary justify-center sm:w-auto"
        disabled={saving || !podeEnviar}
        onClick={onSalvar}
      >
        {saving ? "Salvando..." : "Salvar envio"}
      </button>
    </div>
  );
}

export function OrcamentoResumoAetStatus({
  kind = "aet",
  aet,
  visitaInformativa = false,
}: {
  kind?: LaudoPontualKind;
  aet: ImplantacaoAetRecord | null;
  visitaInformativa?: boolean;
}) {
  const copy = copyLaudoPontual(kind);
  const visitaOk = isAetVisitaRealizada(aet);

  return (
    <section className="rounded-2xl border border-[#e4ebf4] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-5">
      <p className="mb-3 text-[11px] font-extrabold uppercase tracking-wide text-navy">
        {copy.andamento}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-start">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748b]">
            {copy.rotuloColunaVisita}
          </p>
          <p className="mt-1 text-sm font-bold text-navy">
            {aet
              ? IMPLANTACAO_AET_VISITA_STATUS_LABELS[aet.visita_status]
              : "Aguardando agendamento"}
          </p>
          {aet?.visita_data ? (
            <p className="text-[11px] text-[#64748b]">
              {formatDateIsoToBR(aet.visita_data)}
              {aet.visita_horario ? ` · ${aet.visita_horario}` : ""}
            </p>
          ) : null}
          {visitaInformativa ? (
            <p className="mt-1 text-[11px] font-medium text-[#64748b]">
              {visitaOk
                ? "Concluída na Implantação"
                : "Registrada na Implantação"}
            </p>
          ) : null}
        </div>
        <p
          className="hidden self-center text-lg font-extrabold text-[#cbd5e1] sm:block"
          aria-hidden
        >
          →
        </p>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748b]">
            Elaboração
          </p>
          <p className="mt-1 text-sm font-bold text-navy">
            {aet
              ? IMPLANTACAO_AET_ELABORACAO_STATUS_LABELS[aet.elaboracao_status]
              : "Aguardando"}
          </p>
        </div>
        <p
          className="hidden self-center text-lg font-extrabold text-[#cbd5e1] sm:block"
          aria-hidden
        >
          →
        </p>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748b]">
            Envio
          </p>
          <p className="mt-1 text-sm font-bold text-navy">
            {aet?.enviado_cliente ? "Enviado ao cliente" : "Pendente"}
          </p>
          {aet?.enviado_em ? (
            <p className="text-[11px] text-[#64748b]">
              {formatDateIsoToBR(aet.enviado_em)}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
