"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { formatDateBR } from "@/lib/format";
import {
  labelMotivoExameFuturo,
  labelOrigemPeriodico,
} from "@/lib/contrato-programacao-futura";
import {
  labelExamesCicloVinculo,
  textoQuantidadePeriodicosFuturos,
  type PeriodicoFuturoGrupo,
} from "@/lib/periodico-agrupamento";
import { isAntecipacaoPeriodico } from "@/services/contrato-programacao-futura.service";

interface PeriodicoFuturoVinculoModalProps {
  open: boolean;
  grupos: PeriodicoFuturoGrupo[];
  colaboradorNome: string;
  dataAgendamentoIso?: string | null;
  contratoNumeros?: Record<string, string>;
  saving?: boolean;
  onCancelar: () => void;
  onContinuarSemVincular: () => void;
  onAnteciparEVincular: (grupoKey: string) => void;
}

export function PeriodicoFuturoVinculoModal({
  open,
  grupos,
  colaboradorNome,
  dataAgendamentoIso,
  contratoNumeros = {},
  saving = false,
  onCancelar,
  onContinuarSemVincular,
  onAnteciparEVincular,
}: PeriodicoFuturoVinculoModalProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [confirmAntecipacao, setConfirmAntecipacao] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelectedKey(null);
      setConfirmAntecipacao(false);
      return;
    }
    if (grupos.length === 1) {
      setSelectedKey(grupos[0]?.grupoKey ?? null);
    } else {
      setSelectedKey(null);
    }
    setConfirmAntecipacao(false);
  }, [open, grupos]);

  const selected =
    grupos.find((g) => g.grupoKey === selectedKey) ??
    (grupos.length === 1 ? grupos[0] : null);

  const dataPrevista =
    selected?.data_prevista_original?.slice(0, 10) ||
    selected?.proxima_data?.slice(0, 10) ||
    "";
  const dataPrevistaLabel = dataPrevista ? formatDateBR(dataPrevista) : "—";
  const isAntecipacao = isAntecipacaoPeriodico(dataAgendamentoIso, dataPrevista);
  const multiplo = grupos.length > 1;
  const examesCicloLabel = selected ? labelExamesCicloVinculo(selected) : "Periódico";

  const handleVincularClick = () => {
    if (!selected?.grupoKey) return;
    if (isAntecipacao && !confirmAntecipacao) {
      setConfirmAntecipacao(true);
      return;
    }
    onAnteciparEVincular(selected.grupoKey);
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
              disabled={saving || !selected?.grupoKey}
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
              Não antecipar
            </button>
            <button
              type="button"
              className="btn btn-primary justify-center sm:w-auto"
              onClick={handleVincularClick}
              disabled={saving || !selected?.grupoKey}
            >
              {isAntecipacao
                ? "Antecipar e vincular ao exame futuro"
                : "Vincular ao exame futuro"}
            </button>
          </div>
        )
      }
    >
      <div className="space-y-3 text-sm text-[#334155]">
        {confirmAntecipacao && selected ? (
          <p className="font-semibold text-navy">
            Este periódico ({examesCicloLabel}) estava previsto para{" "}
            {dataPrevistaLabel} e será antecipado para a nova data informada no
            agendamento.
            <br />
            Deseja confirmar a antecipação?
          </p>
        ) : (
          <>
            <p className="font-semibold text-navy">
              O colaborador {colaboradorNome || selected?.colaborador || "—"}{" "}
              possui {textoQuantidadePeriodicosFuturos(grupos.length)}.
            </p>

            {grupos.length > 0 ? (
              <div className="space-y-2">
                {multiplo ? (
                  <p className="text-xs font-bold uppercase tracking-wide text-[#8b95a8]">
                    Selecione o periódico
                  </p>
                ) : null}
                {grupos.map((grupo) => {
                  const prev =
                    grupo.data_prevista_original?.slice(0, 10) ||
                    grupo.proxima_data?.slice(0, 10) ||
                    "";
                  const contrato =
                    (grupo.contrato_id && contratoNumeros[grupo.contrato_id]) ||
                    "—";
                  const checked = selected?.grupoKey === grupo.grupoKey;
                  return (
                    <label
                      key={grupo.grupoKey}
                      className={`flex cursor-pointer gap-3 rounded-xl border px-3 py-2 ${
                        checked
                          ? "border-[#4354e8] bg-[#eef2ff]"
                          : "border-[#e2e8f0] bg-[#f8fafc]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="periodico-futuro-ciclo"
                        className="mt-1"
                        checked={checked}
                        onChange={() => setSelectedKey(grupo.grupoKey)}
                      />
                      <div className="text-xs text-[#475569]">
                        <p className="font-bold text-navy">
                          {labelExamesCicloVinculo(grupo)}
                        </p>
                        <p>{prev ? formatDateBR(prev) : "—"}</p>
                        <p>{grupo.cliente_nome}</p>
                        <p>
                          Origem: {labelOrigemPeriodico(grupo.origem)} · Motivo:{" "}
                          {labelMotivoExameFuturo(
                            grupo.motivo,
                            grupo.motivo_detalhe
                          )}
                        </p>
                        <p>Contrato: {contrato}</p>
                        {grupo.examesNomes.length > 1 ? (
                          <p className="mt-1 text-[#64748b]">
                            {grupo.examesNomes.join(" · ")}
                          </p>
                        ) : null}
                      </div>
                    </label>
                  );
                })}
              </div>
            ) : null}

            <p className="text-[13px] leading-relaxed text-[#64748b]">
              Deseja realmente{" "}
              {isAntecipacao ? "antecipar" : "utilizar"} este periódico?
            </p>
          </>
        )}
      </div>
    </Modal>
  );
}
