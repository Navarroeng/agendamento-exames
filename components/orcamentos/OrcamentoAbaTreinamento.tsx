"use client";

import { RequiredMark } from "@/components/ui/Field";
import { formatDateIsoToBR, maskTime24 } from "@/lib/agendamento-datetime";
import { formatDateTimeBR } from "@/lib/format-datetime";
import {
  IMPLANTACAO_TREINAMENTO_MODALIDADE_LABELS,
  IMPLANTACAO_TREINAMENTO_STATUS_LABELS,
  IMPLANTACAO_TREINAMENTO_STATUS_OPTIONS,
  type ImplantacaoTreinamentoEventoRecord,
  type ImplantacaoTreinamentoModalidade,
  type ImplantacaoTreinamentoSavePayload,
  type ImplantacaoTreinamentoStatus,
} from "@/lib/implantacao-treinamento";

export type OrcamentoAbaTreinamentoForm = ImplantacaoTreinamentoSavePayload;

interface OrcamentoAbaTreinamentoProps {
  form: OrcamentoAbaTreinamentoForm;
  mensagem: string;
  saving: boolean;
  eventos: ImplantacaoTreinamentoEventoRecord[];
  onChange: (patch: Partial<OrcamentoAbaTreinamentoForm>) => void;
  onCopiarMensagem: () => void;
  onSalvar: () => void;
}

export function emptyTreinamentoForm(): OrcamentoAbaTreinamentoForm {
  return {
    data_treinamento: null,
    horario_inicio: null,
    horario_termino: null,
    modalidade: null,
    local_treinamento: null,
    endereco: null,
    link_reuniao: null,
    tipo_nome: null,
    quantidade_participantes: null,
    instrutor_responsavel: null,
    contato_empresa: null,
    observacoes: null,
    status: "a_definir",
    motivo_cancelamento: null,
    motivo_reagendamento: null,
  };
}

export function OrcamentoAbaTreinamento({
  form,
  mensagem,
  saving,
  eventos,
  onChange,
  onCopiarMensagem,
  onSalvar,
}: OrcamentoAbaTreinamentoProps) {
  const modalidade = form.modalidade;
  const showLocal =
    modalidade === "presencial" || modalidade === "hibrido";
  const showLink = modalidade === "online" || modalidade === "hibrido";
  const showCancelMotivo = form.status === "cancelado";
  const showReagendaMotivo =
    form.status === "reagendado" ||
    Boolean(form.motivo_reagendamento?.trim());
  const canCopy =
    Boolean(form.data_treinamento) && Boolean(form.horario_inicio?.trim());

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#64748b]">
        Defina a data e as informações reais do treinamento contratado.
      </p>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-navy">
            Data do treinamento <RequiredMark />
          </span>
          <input
            type="date"
            className="field-input"
            value={form.data_treinamento ?? ""}
            disabled={saving}
            onChange={(e) =>
              onChange({ data_treinamento: e.target.value || null })
            }
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-navy">
            Horário de início <RequiredMark />
          </span>
          <input
            type="text"
            className="field-input"
            inputMode="numeric"
            autoComplete="off"
            placeholder="HH:mm"
            maxLength={5}
            value={form.horario_inicio ?? ""}
            disabled={saving}
            onChange={(e) =>
              onChange({ horario_inicio: maskTime24(e.target.value) || null })
            }
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-navy">
            Horário de término
          </span>
          <input
            type="text"
            className="field-input"
            inputMode="numeric"
            autoComplete="off"
            placeholder="HH:mm"
            maxLength={5}
            value={form.horario_termino ?? ""}
            disabled={saving}
            onChange={(e) =>
              onChange({ horario_termino: maskTime24(e.target.value) || null })
            }
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-navy">
            Modalidade <RequiredMark />
          </span>
          <select
            className="field-input"
            value={form.modalidade ?? ""}
            disabled={saving}
            onChange={(e) =>
              onChange({
                modalidade: (e.target.value ||
                  null) as ImplantacaoTreinamentoModalidade | null,
              })
            }
          >
            <option value="">Selecione</option>
            {(
              Object.keys(
                IMPLANTACAO_TREINAMENTO_MODALIDADE_LABELS
              ) as ImplantacaoTreinamentoModalidade[]
            ).map((key) => (
              <option key={key} value={key}>
                {IMPLANTACAO_TREINAMENTO_MODALIDADE_LABELS[key]}
              </option>
            ))}
          </select>
        </label>

        {showLocal ? (
          <>
            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-xs font-bold text-navy">
                Local do treinamento <RequiredMark />
              </span>
              <input
                type="text"
                className="field-input"
                value={form.local_treinamento ?? ""}
                disabled={saving}
                onChange={(e) =>
                  onChange({ local_treinamento: e.target.value || null })
                }
              />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-xs font-bold text-navy">
                Endereço <RequiredMark />
              </span>
              <input
                type="text"
                className="field-input"
                value={form.endereco ?? ""}
                disabled={saving}
                onChange={(e) => onChange({ endereco: e.target.value || null })}
              />
            </label>
          </>
        ) : null}

        {showLink ? (
          <label className="block md:col-span-2">
            <span className="mb-1.5 block text-xs font-bold text-navy">
              Link da reunião <RequiredMark />
            </span>
            <input
              type="url"
              className="field-input"
              placeholder="https://"
              value={form.link_reuniao ?? ""}
              disabled={saving}
              onChange={(e) =>
                onChange({ link_reuniao: e.target.value || null })
              }
            />
          </label>
        ) : null}

        <label className="block md:col-span-2">
          <span className="mb-1.5 block text-xs font-bold text-navy">
            Tipo/nome do treinamento <RequiredMark />
          </span>
          <input
            type="text"
            className="field-input"
            value={form.tipo_nome ?? ""}
            disabled={saving}
            onChange={(e) => onChange({ tipo_nome: e.target.value || null })}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-navy">
            Quantidade prevista de participantes
          </span>
          <input
            type="number"
            min={0}
            className="field-input"
            value={form.quantidade_participantes ?? ""}
            disabled={saving}
            onChange={(e) => {
              const raw = e.target.value;
              onChange({
                quantidade_participantes:
                  raw === "" ? null : Math.max(0, Number(raw) || 0),
              });
            }}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-navy">
            Instrutor responsável
          </span>
          <input
            type="text"
            className="field-input"
            value={form.instrutor_responsavel ?? ""}
            disabled={saving}
            onChange={(e) =>
              onChange({ instrutor_responsavel: e.target.value || null })
            }
          />
        </label>
        <label className="block md:col-span-2">
          <span className="mb-1.5 block text-xs font-bold text-navy">
            Contato da empresa
          </span>
          <input
            type="text"
            className="field-input"
            value={form.contato_empresa ?? ""}
            disabled={saving}
            onChange={(e) =>
              onChange({ contato_empresa: e.target.value || null })
            }
          />
        </label>
        <label className="block md:col-span-2">
          <span className="mb-1.5 block text-xs font-bold text-navy">
            Observações
          </span>
          <textarea
            className="field-input min-h-[80px] resize-y"
            value={form.observacoes ?? ""}
            disabled={saving}
            onChange={(e) => onChange({ observacoes: e.target.value || null })}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-navy">
            Status do treinamento <RequiredMark />
          </span>
          <select
            className="field-input"
            value={form.status}
            disabled={saving}
            onChange={(e) =>
              onChange({
                status: e.target.value as ImplantacaoTreinamentoStatus,
              })
            }
          >
            {IMPLANTACAO_TREINAMENTO_STATUS_OPTIONS.map((st) => (
              <option key={st} value={st}>
                {IMPLANTACAO_TREINAMENTO_STATUS_LABELS[st]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {showCancelMotivo ? (
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-navy">
            Motivo do cancelamento <RequiredMark />
          </span>
          <textarea
            className="field-input min-h-[72px] resize-y"
            value={form.motivo_cancelamento ?? ""}
            disabled={saving}
            onChange={(e) =>
              onChange({ motivo_cancelamento: e.target.value || null })
            }
          />
        </label>
      ) : null}

      {showReagendaMotivo || form.status === "reagendado" ? (
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-navy">
            Motivo do reagendamento{" "}
            {form.status === "reagendado" ? <RequiredMark /> : null}
          </span>
          <textarea
            className="field-input min-h-[72px] resize-y"
            value={form.motivo_reagendamento ?? ""}
            disabled={saving}
            onChange={(e) =>
              onChange({ motivo_reagendamento: e.target.value || null })
            }
          />
        </label>
      ) : null}

      {canCopy ? (
        <div className="rounded-2xl border border-[#dbeafe] bg-gradient-to-br from-[#eff6ff] to-white p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs font-extrabold uppercase tracking-wide text-navy">
              Confirmação de Treinamento
            </p>
            <button
              type="button"
              className="rounded-lg bg-brand-blue-soft px-2.5 py-1 text-[11px] font-bold text-brand-blue"
              onClick={onCopiarMensagem}
            >
              Copiar mensagem
            </button>
          </div>
          <pre className="whitespace-pre-wrap rounded-xl bg-white p-3 text-[13px] leading-relaxed text-[#334155]">
            {mensagem}
          </pre>
        </div>
      ) : null}

      {eventos.length > 0 ? (
        <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3">
          <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-navy">
            Histórico
          </p>
          <ul className="space-y-2">
            {eventos.map((ev) => (
              <li
                key={ev.id}
                className="rounded-lg bg-white px-3 py-2 text-[12px] text-[#334155]"
              >
                <span className="font-bold text-navy">{ev.tipo_evento}</span>
                {" · "}
                {ev.usuario_nome}
                {" · "}
                {formatDateTimeBR(ev.criado_em)}
                {ev.data_anterior || ev.data_nova ? (
                  <span className="mt-0.5 block text-[#64748b]">
                    {ev.data_anterior
                      ? formatDateIsoToBR(ev.data_anterior)
                      : "—"}
                    {ev.horario_inicio_anterior
                      ? ` ${ev.horario_inicio_anterior}`
                      : ""}
                    {" → "}
                    {ev.data_nova ? formatDateIsoToBR(ev.data_nova) : "—"}
                    {ev.horario_inicio_novo
                      ? ` ${ev.horario_inicio_novo}`
                      : ""}
                  </span>
                ) : null}
                {ev.motivo ? (
                  <span className="mt-0.5 block text-[#64748b]">
                    Motivo: {ev.motivo}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex justify-end">
        <button
          type="button"
          className="btn btn-primary"
          disabled={saving}
          onClick={onSalvar}
        >
          {saving ? "Salvando..." : "Salvar agendamento do treinamento"}
        </button>
      </div>
    </div>
  );
}
