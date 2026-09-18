"use client";

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

type AetVisitaForm = {
  visita_status: ImplantacaoAetVisitaStatus;
  visita_data: string;
  visita_horario: string;
  visita_responsavel: string;
  visita_observacao: string;
};

export function OrcamentoAbaAetVisita({
  aet,
  form,
  saving,
  onChange,
  onSalvar,
}: {
  aet: ImplantacaoAetRecord | null;
  form: {
    visita_status: ImplantacaoAetVisitaStatus;
    visita_data: string;
    visita_horario: string;
    visita_responsavel: string;
    visita_observacao: string;
  };
  saving: boolean;
  onChange: (patch: Partial<AetVisitaForm>) => void;
  onSalvar: () => void;
}) {
  const exigeData = form.visita_status !== "aguardando_agendamento";
  const exigeHorario = form.visita_status === "agendada";

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#64748b]">
        Agende e registre a visita técnica para avaliação das atividades e
        postos de trabalho.
      </p>
      {aet?.visita_status === "realizada" ? (
        <p className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-2 text-[12px] font-semibold text-[#166534]">
          Visita realizada
          {aet.visita_data
            ? ` em ${formatDateIsoToBR(aet.visita_data)}`
            : ""}
          .
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-navy">
            Status da visita
          </span>
          <select
            className="field-input"
            value={form.visita_status}
            disabled={saving}
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
            Data da visita {exigeData ? <RequiredMark /> : null}
          </span>
          <input
            type="date"
            className="field-input"
            value={form.visita_data}
            disabled={saving || !exigeData}
            onChange={(e) => onChange({ visita_data: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-navy">
            Horário {exigeHorario ? <RequiredMark /> : null}
          </span>
          <input
            type="time"
            className="field-input"
            value={form.visita_horario}
            disabled={saving || !exigeData}
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
            disabled={saving}
            onChange={(e) => onChange({ visita_responsavel: e.target.value })}
          />
        </label>
        <label className="block md:col-span-2">
          <span className="mb-1.5 block text-xs font-bold text-navy">
            Observação
          </span>
          <textarea
            className="field-input min-h-[72px] resize-y"
            value={form.visita_observacao}
            disabled={saving}
            onChange={(e) => onChange({ visita_observacao: e.target.value })}
          />
        </label>
      </div>

      <button
        type="button"
        className="btn btn-primary justify-center sm:w-auto"
        disabled={saving}
        onClick={onSalvar}
      >
        {saving ? "Salvando..." : "Salvar visita"}
      </button>
    </div>
  );
}

export function OrcamentoAbaAetElaboracao({
  aet,
  form,
  saving,
  onChange,
  onFileChange,
  onRemoverLaudo,
  onVisualizarLaudo,
  onSalvar,
}: {
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

  return (
    <div className="space-y-4">
      {!visitaOk ? (
        <p className="rounded-xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-sm font-semibold text-[#b45309]">
          Aguardando realização da visita
        </p>
      ) : (
        <p className="text-sm text-[#64748b]">
          Acompanhe a elaboração do Laudo AET após a visita. Anexe o PDF final
          antes de concluir.
        </p>
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
          Laudo AET final (PDF)
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
  aet,
  form,
  saving,
  onChange,
  onSalvar,
}: {
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

  return (
    <div className="space-y-4">
      {!podeEnviar ? (
        <p className="rounded-xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-sm font-semibold text-[#b45309]">
          Conclua a elaboração do AET e anexe o PDF final antes de registrar o
          envio.
        </p>
      ) : (
        <p className="text-sm text-[#64748b]">
          Registre o envio do Laudo AET ao cliente. O envio automático por
          e-mail não faz parte desta etapa.
        </p>
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
  aet,
}: {
  aet: ImplantacaoAetRecord | null;
}) {
  return (
    <section className="rounded-2xl border border-[#e4ebf4] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-5">
      <p className="mb-3 text-[11px] font-extrabold uppercase tracking-wide text-navy">
        Andamento do Laudo AET
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748b]">
            Visita
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
        </div>
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
