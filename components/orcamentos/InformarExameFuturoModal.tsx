"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { RequiredMark } from "@/components/ui/Field";
import {
  MOTIVOS_EXAME_FUTURO,
  TIPOS_ASO_EXAME_FUTURO,
  type ColaboradorSugestao,
  type MotivoExameFuturo,
} from "@/lib/contrato-programacao-futura";
import { formatCPF, maskCPFInput, normalizeCpfDigits } from "@/lib/cpf";
import { parseDateBRToIso, isValidDateBR } from "@/lib/agendamento-datetime";

export type InformarExameFuturoFormResult = {
  colaborador: string;
  colaboradorCpf: string | null;
  tipoAso: string;
  dataPrevistaIso: string;
  motivo: MotivoExameFuturo;
  motivoDetalhe: string | null;
  observacoes: string | null;
};

interface InformarExameFuturoModalProps {
  open: boolean;
  saving: boolean;
  numeroContrato: string | null;
  sugestoes: ColaboradorSugestao[];
  onClose: () => void;
  onConfirm: (data: InformarExameFuturoFormResult) => void;
}

function isoToBR(iso: string): string {
  const raw = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "";
  const [y, m, d] = raw.split("-");
  return `${d}/${m}/${y}`;
}

export function InformarExameFuturoModal({
  open,
  saving,
  numeroContrato,
  sugestoes,
  onClose,
  onConfirm,
}: InformarExameFuturoModalProps) {
  const [selecaoKey, setSelecaoKey] = useState("");
  const [colaborador, setColaborador] = useState("");
  const [cpf, setCpf] = useState("");
  const [tipoAso, setTipoAso] = useState<string>("Periódico");
  const [dataPrevista, setDataPrevista] = useState("");
  const [motivo, setMotivo] = useState<MotivoExameFuturo | "">("");
  const [motivoDetalhe, setMotivoDetalhe] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelecaoKey("");
    setColaborador("");
    setCpf("");
    setTipoAso("Periódico");
    setDataPrevista("");
    setMotivo("");
    setMotivoDetalhe("");
    setObservacoes("");
    setError(null);
  }, [open]);

  const sugestoesOptions = useMemo(
    () =>
      sugestoes.map((s, idx) => ({
        key: `${idx}|${s.colaborador}|${s.colaborador_cpf ?? ""}`,
        label: s.colaborador_cpf
          ? `${s.colaborador} — ${formatCPF(s.colaborador_cpf)}`
          : s.colaborador,
        ...s,
      })),
    [sugestoes]
  );

  function handleSelecao(key: string) {
    setSelecaoKey(key);
    setError(null);
    if (key === "__outro__") {
      setColaborador("");
      setCpf("");
      return;
    }
    const found = sugestoesOptions.find((s) => s.key === key);
    if (found) {
      setColaborador(found.colaborador);
      setCpf(found.colaborador_cpf ? maskCPFInput(found.colaborador_cpf) : "");
    }
  }

  function handleConfirm() {
    const nome = colaborador.trim();
    if (!nome) {
      setError("Selecione ou informe o colaborador.");
      return;
    }
    if (!tipoAso.trim()) {
      setError("Selecione o tipo de ASO.");
      return;
    }
    if (!dataPrevista.trim() || !isValidDateBR(dataPrevista)) {
      setError("Informe a data prevista (DD/MM/AAAA).");
      return;
    }
    const iso = parseDateBRToIso(dataPrevista);
    if (!iso) {
      setError("Data prevista inválida.");
      return;
    }
    if (!motivo) {
      setError("Selecione o motivo.");
      return;
    }
    if (motivo === "Outro" && !motivoDetalhe.trim()) {
      setError("Descreva o motivo (Outro).");
      return;
    }

    const digits = normalizeCpfDigits(cpf);
    onConfirm({
      colaborador: nome,
      colaboradorCpf: digits || null,
      tipoAso: tipoAso.trim(),
      dataPrevistaIso: iso,
      motivo,
      motivoDetalhe: motivo === "Outro" ? motivoDetalhe.trim() : null,
      observacoes: observacoes.trim() || null,
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Informar exame futuro"
      subtitle={numeroContrato ? `Contrato ${numeroContrato}` : undefined}
      closeOnOverlayClick={!saving}
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="btn justify-center sm:w-auto"
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary justify-center sm:w-auto"
            onClick={handleConfirm}
            disabled={saving}
          >
            {saving ? "Salvando..." : "Salvar programação"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-[#475569]">
          Registra um exame previsto do contrato para realização futura e cria o
          acompanhamento em Periódicos Futuros. A vaga disponível será
          consumida.
        </p>

        <div>
          <label className="mb-1.5 block text-xs font-bold text-navy">
            Colaborador <RequiredMark />
          </label>
          <select
            className="field-input"
            value={selecaoKey}
            disabled={saving}
            onChange={(e) => handleSelecao(e.target.value)}
          >
            <option value="">Selecione...</option>
            {sugestoesOptions.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
            <option value="__outro__">Outro (digitar)</option>
          </select>
          {(selecaoKey === "__outro__" ||
            (selecaoKey === "" && colaborador)) && (
            <input
              className="field-input mt-2"
              placeholder="Nome completo do colaborador"
              value={colaborador}
              disabled={saving}
              onChange={(e) => {
                setColaborador(e.target.value);
                setError(null);
              }}
            />
          )}
          {selecaoKey &&
          selecaoKey !== "__outro__" &&
          !sugestoesOptions.some((s) => s.key === selecaoKey) ? null : null}
          {selecaoKey && selecaoKey !== "__outro__" ? (
            <p className="mt-1.5 text-xs text-[#64748b]">{colaborador}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold text-navy">
            CPF
          </label>
          <input
            className="field-input"
            value={cpf}
            disabled={saving}
            placeholder="000.000.000-00"
            onChange={(e) => {
              setCpf(maskCPFInput(e.target.value));
              if (selecaoKey && selecaoKey !== "__outro__") {
                setSelecaoKey("__outro__");
              }
              setError(null);
            }}
          />
          <p className="mt-1 text-[11px] text-[#94a3b8]">
            Preenchido automaticamente quando o colaborador já possui
            agendamento.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-navy">
              Tipo de ASO <RequiredMark />
            </label>
            <select
              className="field-input"
              value={tipoAso}
              disabled={saving}
              onChange={(e) => {
                setTipoAso(e.target.value);
                setError(null);
              }}
            >
              {TIPOS_ASO_EXAME_FUTURO.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-navy">
              Data prevista <RequiredMark />
            </label>
            <input
              className="field-input"
              value={dataPrevista}
              disabled={saving}
              placeholder="DD/MM/AAAA"
              onChange={(e) => {
                setDataPrevista(e.target.value);
                setError(null);
              }}
              onBlur={() => {
                // Aceita ISO colado e normaliza
                if (/^\d{4}-\d{2}-\d{2}$/.test(dataPrevista.trim())) {
                  setDataPrevista(isoToBR(dataPrevista.trim()));
                }
              }}
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold text-navy">
            Motivo <RequiredMark />
          </label>
          <select
            className="field-input"
            value={motivo}
            disabled={saving}
            onChange={(e) => {
              setMotivo(e.target.value as MotivoExameFuturo | "");
              setError(null);
            }}
          >
            <option value="">Selecione...</option>
            {MOTIVOS_EXAME_FUTURO.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {motivo === "Outro" ? (
          <div>
            <label className="mb-1.5 block text-xs font-bold text-navy">
              Descreva o motivo <RequiredMark />
            </label>
            <input
              className="field-input"
              value={motivoDetalhe}
              disabled={saving}
              onChange={(e) => {
                setMotivoDetalhe(e.target.value);
                setError(null);
              }}
              placeholder="Descreva o motivo"
            />
          </div>
        ) : null}

        <div>
          <label className="mb-1.5 block text-xs font-bold text-navy">
            Observações
          </label>
          <textarea
            className="field-input min-h-[72px] resize-y"
            value={observacoes}
            disabled={saving}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Opcional"
          />
        </div>

        {error ? (
          <p className="text-[11px] font-medium text-brand-red">{error}</p>
        ) : null}
      </div>
    </Modal>
  );
}
