"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { formatClienteNomeDisplay } from "@/lib/cliente-display";
import { formatCreatedAtBR } from "@/lib/format-datetime";
import { useAuditoriaUsuario } from "@/contexts/AuthContext";
import {
  LAUDOS_SST_ETAPAS,
  buildLaudosSstProcesso,
  type LaudosSstEtapaId,
  type LaudosSstProcesso,
} from "@/lib/laudos-sst";
import {
  isEmailLaudosValido,
  isLaudosEtapaConcluida,
  isLaudosEtapaLiberada,
  isPgrPcmsoLtcatDocumentosProntos,
  LAUDOS_CRONOGRAMA_PERGUNTAS_EPI,
  type LaudosSstWorkflow,
} from "@/lib/laudos-sst-etapas";
import { salvarEtapaLaudosSst } from "@/services/laudos-sst.service";
import { LaudosSstSimNao } from "@/components/laudos-sst/LaudosSstSimNao";

interface LaudosSstModalProps {
  open: boolean;
  processo: LaudosSstProcesso | null;
  tab: LaudosSstEtapaId;
  onTabChange: (tab: LaudosSstEtapaId) => void;
  onClose: () => void;
  onSaved: (processoAtualizado: LaudosSstProcesso) => void;
}

function FieldDate({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
        {label}
      </label>
      <input
        type="date"
        className="field-input"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function EtapaBadge({
  concluida,
  bloqueada,
}: {
  concluida: boolean;
  bloqueada: boolean;
}) {
  if (bloqueada) {
    return (
      <span className="ml-1 text-[10px] font-extrabold text-[#94a3b8]" title="Bloqueada">
        🔒
      </span>
    );
  }
  if (concluida) {
    return (
      <span className="ml-1 text-[10px] font-extrabold text-brand-green" title="Concluída">
        ✓
      </span>
    );
  }
  return (
    <span className="ml-1 text-[11px] font-extrabold text-[#d97706]" title="Pendente">
      •
    </span>
  );
}

export function LaudosSstModal({
  open,
  processo,
  tab,
  onTabChange,
  onClose,
  onSaved,
}: LaudosSstModalProps) {
  const aprovador = useAuditoriaUsuario();
  const [draft, setDraft] = useState<LaudosSstWorkflow | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !processo) {
      setDraft(null);
      return;
    }
    setDraft({
      ...processo.workflow,
      cronogramaEpiRespostas: { ...processo.workflow.cronogramaEpiRespostas },
    });
  }, [open, processo]);

  const ordem = useMemo(() => LAUDOS_SST_ETAPAS.map((e) => e.id), []);
  const workflow = draft ?? processo?.workflow ?? null;

  if (!open || !processo || !workflow) return null;

  const { orcamento, numeroContrato } = processo.implantacao;
  const locked = !isLaudosEtapaLiberada(tab, processo.workflow, ordem);
  const etapaAtualMeta = LAUDOS_SST_ETAPAS.find((e) => e.id === tab);
  const disabled = locked || busy;
  const tabConcluida = isLaudosEtapaConcluida(tab, workflow);

  const patch = (partial: Partial<LaudosSstWorkflow>) => {
    setDraft((prev) => (prev ? { ...prev, ...partial } : prev));
  };

  const handleSalvar = async () => {
    if (locked) {
      toast.error("Conclua a etapa anterior para preencher esta.");
      return;
    }
    if (tab === "epis" && workflow.epiDisponibiliza === null) {
      toast.error("Selecione Sim ou Não.");
      return;
    }
    if (tab === "processo_inicial" && workflow.cadastroRealizado === null) {
      toast.error("Selecione Sim ou Não.");
      return;
    }
    if (tab === "cronograma_acoes" && workflow.cronogramaElaborado === null) {
      toast.error("Selecione Sim ou Não.");
      return;
    }
    if (tab === "envio_cliente" && workflow.enviadoCliente === null) {
      toast.error("Selecione Sim ou Não.");
      return;
    }
    if (
      tab === "envio_cliente" &&
      workflow.enviadoCliente === true &&
      workflow.enviadoClienteEmail?.trim() &&
      !isEmailLaudosValido(workflow.enviadoClienteEmail)
    ) {
      toast.error("Informe um e-mail válido.");
      return;
    }

    setBusy(true);
    try {
      const result = await salvarEtapaLaudosSst({
        orcamentoId: orcamento.id,
        etapa: tab,
        workflow,
        atual: processo.tracking,
        aprovador: {
          userId: aprovador.usuarioId,
          nome: aprovador.usuarioNome,
        },
      });
      const atualizado = buildLaudosSstProcesso(
        processo.implantacao,
        result.tracking
      );
      onSaved(atualizado);
      if (result.etapaConcluida) {
        toast.success("Etapa salva e concluída.");
        if (result.proximaEtapa) onTabChange(result.proximaEtapa);
      } else {
        toast.message(
          "Informações salvas. Esta etapa ainda possui pendências para ser concluída."
        );
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Não foi possível salvar a etapa."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Laudos SST · ${orcamento.numero}`}
      subtitle={`${formatClienteNomeDisplay(orcamento.cliente_nome)}${
        numeroContrato ? ` · Contrato ${numeroContrato}` : ""
      } · ${processo.progressoLabel} etapas`}
      size="xl"
      footer={
        <div className="flex justify-end">
          <button type="button" className="btn justify-center sm:w-auto" onClick={onClose}>
            Fechar
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
          {LAUDOS_SST_ETAPAS.map((etapa) => {
            const active = etapa.id === tab;
            const liberada = isLaudosEtapaLiberada(
              etapa.id,
              processo.workflow,
              ordem
            );
            const concluida =
              isLaudosEtapaConcluida(etapa.id, processo.workflow) && liberada;
            const bloqueada = !liberada;
            return (
              <button
                key={etapa.id}
                type="button"
                onClick={() => onTabChange(etapa.id)}
                className={`shrink-0 rounded-xl px-3 py-2 text-[11px] font-bold transition ${
                  active
                    ? "bg-[#082b63] text-white shadow-sm"
                    : bloqueada
                      ? "bg-[#f8fafc] text-[#94a3b8]"
                      : "bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0]"
                }`}
              >
                {etapa.label}
                <EtapaBadge concluida={concluida} bloqueada={bloqueada} />
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-[#e8edf5] bg-[#f8fafc] px-5 py-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-extrabold text-navy">
              {etapaAtualMeta?.label ?? "Etapa"}
            </p>
            {locked ? (
              <span className="rounded-full bg-[#f1f5f9] px-2.5 py-0.5 text-[10px] font-extrabold text-[#64748b]">
                Bloqueada
              </span>
            ) : tabConcluida ? (
              <span className="rounded-full bg-brand-green-soft px-2.5 py-0.5 text-[10px] font-extrabold text-brand-green">
                Concluída
              </span>
            ) : (
              <span className="rounded-full bg-[#fef3c7] px-2.5 py-0.5 text-[10px] font-extrabold text-[#b45309]">
                Pendente
              </span>
            )}
          </div>

          {tab === "epis" ? (
            <div className="rounded-2xl border border-[#e8edf5] bg-white px-4 py-4">
              <p className="mb-3 text-sm font-semibold text-navy">
                A empresa disponibiliza EPIs aos colaboradores?
              </p>
              <LaudosSstSimNao
                name="epi"
                value={workflow.epiDisponibiliza}
                disabled={disabled}
                onChange={(v) => patch({ epiDisponibiliza: v })}
              />
            </div>
          ) : null}

          {tab === "processo_inicial" ? (
            <div className="rounded-2xl border border-[#e8edf5] bg-white px-4 py-4">
              <p className="mb-3 text-sm font-semibold text-navy">
                O cadastro da empresa foi realizado?
              </p>
              <LaudosSstSimNao
                name="cadastro"
                value={workflow.cadastroRealizado}
                disabled={disabled}
                onChange={(v) => patch({ cadastroRealizado: v })}
              />
              {workflow.cadastroRealizado === true ? (
                <div className="mt-4 max-w-xs">
                  <FieldDate
                    label="Data de realização do cadastro"
                    value={workflow.cadastroData ?? ""}
                    disabled={disabled}
                    onChange={(v) => patch({ cadastroData: v || null })}
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {tab === "cronograma_acoes" ? (
            <div className="space-y-3">
              <div className="rounded-2xl border border-[#e8edf5] bg-white px-4 py-4">
                <p className="mb-3 text-sm font-semibold text-navy">
                  Cronograma de Ações elaborado?
                </p>
                <LaudosSstSimNao
                  name="cronograma"
                  value={workflow.cronogramaElaborado}
                  disabled={disabled}
                  onChange={(v) => patch({ cronogramaElaborado: v })}
                />
                {workflow.cronogramaElaborado === true ? (
                  <div className="mt-4 max-w-xs">
                    <FieldDate
                      label="Data de elaboração"
                      value={workflow.cronogramaData ?? ""}
                      disabled={disabled}
                      onChange={(v) => patch({ cronogramaData: v || null })}
                    />
                  </div>
                ) : null}
              </div>
              {workflow.epiDisponibiliza === true
                ? LAUDOS_CRONOGRAMA_PERGUNTAS_EPI.map((pergunta) => (
                    <div
                      key={pergunta.id}
                      className="rounded-2xl border border-[#e8edf5] bg-white px-4 py-4"
                    >
                      <p className="mb-3 text-sm font-semibold text-navy">
                        {pergunta.label}
                      </p>
                      <LaudosSstSimNao
                        name={pergunta.id}
                        value={
                          workflow.cronogramaEpiRespostas[pergunta.id] ?? null
                        }
                        disabled={disabled}
                        onChange={(v) =>
                          patch({
                            cronogramaEpiRespostas: {
                              ...workflow.cronogramaEpiRespostas,
                              [pergunta.id]: v,
                            },
                          })
                        }
                      />
                    </div>
                  ))
                : null}
            </div>
          ) : null}

          {tab === "pgr_pcmso_ltcat" ? (
            <div className="space-y-3">
              {(
                [
                  [
                    "pgr",
                    "PGR realizado?",
                    workflow.pgrRealizado,
                    workflow.pgrData,
                    "pgrRealizado",
                    "pgrData",
                  ],
                  [
                    "pcmso",
                    "PCMSO realizado?",
                    workflow.pcmsoRealizado,
                    workflow.pcmsoData,
                    "pcmsoRealizado",
                    "pcmsoData",
                  ],
                  [
                    "ltcat",
                    "LTCAT realizado?",
                    workflow.ltcatRealizado,
                    workflow.ltcatData,
                    "ltcatRealizado",
                    "ltcatData",
                  ],
                ] as const
              ).map(([id, pergunta, realizado, data, keySim, keyData]) => (
                <div
                  key={id}
                  className="rounded-2xl border border-[#e8edf5] bg-white px-4 py-4"
                >
                  <p className="mb-1 text-[10px] font-extrabold uppercase tracking-wide text-[#94a3b8]">
                    {id.toUpperCase()}
                  </p>
                  <p className="mb-3 text-sm font-semibold text-navy">{pergunta}</p>
                  <LaudosSstSimNao
                    name={id}
                    value={realizado}
                    disabled={disabled}
                    onChange={(v) =>
                      patch({ [keySim]: v } as Partial<LaudosSstWorkflow>)
                    }
                  />
                  {realizado === true ? (
                    <div className="mt-4 max-w-xs">
                      <FieldDate
                        label="Data de realização"
                        value={data ?? ""}
                        disabled={disabled}
                        onChange={(v) =>
                          patch({ [keyData]: v || null } as Partial<LaudosSstWorkflow>)
                        }
                      />
                    </div>
                  ) : null}
                </div>
              ))}
              {isPgrPcmsoLtcatDocumentosProntos(workflow) ? (
                <div className="rounded-2xl border border-[#dbeafe] bg-white px-4 py-4">
                  <p className="mb-3 text-sm font-semibold text-navy">
                    Documentos enviados para validação do Pedro?
                  </p>
                  <LaudosSstSimNao
                    name="enviado-pedro"
                    value={workflow.enviadoPedro}
                    disabled={disabled}
                    onChange={(v) => patch({ enviadoPedro: v })}
                  />
                </div>
              ) : (
                <p className="text-[12px] text-app-muted">
                  A confirmação de envio ao Pedro aparece quando PGR, PCMSO e LTCAT
                  estiverem com Sim e data.
                </p>
              )}
            </div>
          ) : null}

          {tab === "autorizacao_pedro" ? (
            <div className="rounded-2xl border border-[#e8edf5] bg-white px-4 py-4">
              <p className="mb-3 text-sm font-semibold text-navy">
                Documentos revisados e aprovados?
              </p>
              <LaudosSstSimNao
                name="aprovacao-pedro"
                value={workflow.aprovacaoPedro}
                disabled={disabled}
                simLabel="Aprovar"
                naoLabel="Pendente"
                onChange={(v) => patch({ aprovacaoPedro: v })}
              />
              {workflow.aprovacaoPedro === true && workflow.aprovacaoPedroEm ? (
                <p className="mt-3 text-[12px] text-[#334155]">
                  Aprovado {formatCreatedAtBR(workflow.aprovacaoPedroEm)}
                  {workflow.aprovacaoPedroPorNome
                    ? ` · ${workflow.aprovacaoPedroPorNome}`
                    : ""}
                </p>
              ) : null}
            </div>
          ) : null}

          {tab === "envio_cliente" ? (
            <div className="rounded-2xl border border-[#e8edf5] bg-white px-4 py-4">
              <p className="mb-3 text-sm font-semibold text-navy">
                Os laudos foram enviados ao cliente?
              </p>
              <LaudosSstSimNao
                name="envio-cliente"
                value={workflow.enviadoCliente}
                disabled={disabled}
                onChange={(v) => patch({ enviadoCliente: v })}
              />
              {workflow.enviadoCliente === true ? (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
                      E-mail utilizado para envio
                    </label>
                    <input
                      type="email"
                      className="field-input"
                      value={workflow.enviadoClienteEmail ?? ""}
                      disabled={disabled}
                      onChange={(e) =>
                        patch({ enviadoClienteEmail: e.target.value })
                      }
                    />
                  </div>
                  <FieldDate
                    label="Data do envio"
                    value={workflow.enviadoClienteData ?? ""}
                    disabled={disabled}
                    onChange={(v) => patch({ enviadoClienteData: v || null })}
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              className="btn btn-primary justify-center sm:w-auto"
              disabled={disabled}
              onClick={() => void handleSalvar()}
            >
              {busy ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
