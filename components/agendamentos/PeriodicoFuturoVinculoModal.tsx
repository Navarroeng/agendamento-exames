"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { formatDateBR } from "@/lib/format";
import {
  labelMotivoExameFuturo,
  labelOrigemPeriodico,
} from "@/lib/contrato-programacao-futura";
import { isAntecipacaoPeriodico } from "@/services/contrato-programacao-futura.service";
import type { PeriodicoFuturoRecord } from "@/lib/types";

interface PeriodicoFuturoVinculoModalProps {
  open: boolean;
  periodicos: PeriodicoFuturoRecord[];
  colaboradorNome: string;
  dataAgendamentoIso?: string | null;
  contratoNumeros?: Record<string, string>;
  saving?: boolean;
  onCancelar: () => void;
  onContinuarSemVincular: () => void;
  onAnteciparEVincular: (periodicoId: string) => void;
}

export function PeriodicoFuturoVinculoModal({
  open,
  periodicos,
  colaboradorNome,
  dataAgendamentoIso,
  contratoNumeros = {},
  saving = false,
  onCancelar,
  onContinuarSemVincular,
  onAnteciparEVincular,
}: PeriodicoFuturoVinculoModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmAntecipacao, setConfirmAntecipacao] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelectedId(null);
      setConfirmAntecipacao(false);
      return;
    }
    if (periodicos.length === 1) {
      setSelectedId(periodicos[0]?.id ?? null);
    } else {
      setSelectedId(null);
    }
    setConfirmAntecipacao(false);
  }, [open, periodicos]);

  const selected =
    periodicos.find((p) => p.id === selectedId) ??
    (periodicos.length === 1 ? periodicos[0] : null);

  const dataPrevista =
    selected?.data_prevista_original?.slice(0, 10) ||
    selected?.proxima_data?.slice(0, 10) ||
    "";
  const dataPrevistaLabel = dataPrevista ? formatDateBR(dataPrevista) : "—";
  const exameLabel =
    selected?.tipo_aso || selected?.exame_nome || selected?.tipo_exame || "Periódico";
  const isAntecipacao = isAntecipacaoPeriodico(dataAgendamentoIso, dataPrevista);
  const multiplo = periodicos.length > 1;

  const handleVincularClick = () => {
    if (!selected?.id) return;
    if (isAntecipacao && !confirmAntecipacao) {
      setConfirmAntecipacao(true);
      return;
    }
    onAnteciparEVincular(selected.id);
  };

  return (
    <Modal
      open={open}
      onClose={onCancelar}
      title="Exame futuro já programado"
      closeOnOverlayClick={!saving}
      footer={
        confirmAntecipacao ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <button
              type="button"
              className="btn justify-center sm:w-auto"
              onClick={() => setConfirmAntecipacao(false)}
              disabled={saving}
            >
              Voltar
            </button>
            <button
              type="button"
              className="btn btn-primary justify-center sm:w-auto"
              onClick={handleVincularClick}
              disabled={saving || !selected?.id}
            >
              {saving ? "Salvando..." : "Confirmar antecipação"}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <button
              type="button"
              className="btn justify-center sm:w-auto"
              onClick={onCancelar}
              disabled={saving}
            >
              Cancelar agendamento
            </button>
            <button
              type="button"
              className="btn btn-muted justify-center sm:w-auto"
              onClick={onContinuarSemVincular}
              disabled={saving}
            >
              Continuar sem vincular
            </button>
            <button
              type="button"
              className="btn btn-primary justify-center sm:w-auto"
              onClick={handleVincularClick}
              disabled={saving || !selected?.id}
            >
              {isAntecipacao
                ? "Antecipar e vincular ao Periódico Futuro"
                : "Vincular ao Periódico Futuro"}
            </button>
          </div>
        )
      }
    >
      <div className="space-y-3 text-sm text-[#334155]">
        {confirmAntecipacao && selected ? (
          <p className="font-semibold text-navy">
            Este exame estava previsto para {dataPrevistaLabel} e será antecipado
            para a nova data informada no agendamento.
            <br />
            Deseja confirmar a antecipação?
          </p>
        ) : (
          <>
            <p className="font-semibold text-navy">
              O colaborador {colaboradorNome || selected?.colaborador || "—"}{" "}
              possui{" "}
              {multiplo
                ? `${periodicos.length} exames futuros programados.`
                : `um exame ${exameLabel} programado para ${dataPrevistaLabel}.`}
            </p>

            {multiplo ? (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wide text-[#8b95a8]">
                  Selecione o registro
                </p>
                {periodicos.map((p) => {
                  const prev =
                    p.data_prevista_original?.slice(0, 10) ||
                    p.proxima_data?.slice(0, 10) ||
                    "";
                  const contrato =
                    (p.contrato_id && contratoNumeros[p.contrato_id]) ||
                    "—";
                  return (
                    <label
                      key={p.id}
                      className={`flex cursor-pointer gap-3 rounded-xl border px-3 py-2 ${
                        selectedId === p.id
                          ? "border-[#4354e8] bg-[#eef2ff]"
                          : "border-[#e2e8f0] bg-[#f8fafc]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="periodico-futuro"
                        className="mt-1"
                        checked={selectedId === p.id}
                        onChange={() => setSelectedId(p.id)}
                      />
                      <div className="text-xs text-[#475569]">
                        <p className="font-bold text-navy">
                          {p.tipo_aso || p.exame_nome || "Exame"} ·{" "}
                          {prev ? formatDateBR(prev) : "—"}
                        </p>
                        <p>{p.cliente_nome}</p>
                        <p>
                          Origem: {labelOrigemPeriodico(p.origem)} · Motivo:{" "}
                          {labelMotivoExameFuturo(p.motivo, p.motivo_detalhe)}
                        </p>
                        <p>Contrato: {contrato}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            ) : selected ? (
              <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-xs text-[#475569]">
                <p>
                  <span className="font-bold text-navy">Origem:</span>{" "}
                  {labelOrigemPeriodico(selected.origem)}
                </p>
                <p className="mt-1">
                  <span className="font-bold text-navy">Motivo:</span>{" "}
                  {labelMotivoExameFuturo(
                    selected.motivo,
                    selected.motivo_detalhe
                  )}
                </p>
                <p className="mt-1">
                  <span className="font-bold text-navy">Contrato:</span>{" "}
                  {(selected.contrato_id &&
                    contratoNumeros[selected.contrato_id]) ||
                    "—"}
                </p>
              </div>
            ) : null}

            <p className="text-[13px] leading-relaxed text-[#64748b]">
              Deseja realmente{" "}
              {isAntecipacao ? "antecipar" : "utilizar"} este exame?
            </p>
          </>
        )}
      </div>
    </Modal>
  );
}
