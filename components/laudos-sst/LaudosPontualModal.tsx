"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { formatClienteNomeDisplay } from "@/lib/cliente-display";
import {
  OrcamentoAbaAetElaboracao,
  OrcamentoAbaAetEnvio,
  OrcamentoAbaAetVisita,
} from "@/components/orcamentos/OrcamentoAbasAet";
import { useOrcamentoAetEtapas } from "@/hooks/useOrcamentoAetEtapas";
import {
  buildLaudosPontualEtapas,
  buildLaudosSstProcesso,
  isLaudosPontualEtapaConcluida,
  isLaudosPontualEtapaLiberada,
  labelEtapaAtualLaudosSst,
  resolveLaudosPontualTabInicial,
  type LaudosPontualTabId,
  type LaudosSstProcesso,
} from "@/lib/laudos-sst";
import {
  copyLaudoPontual,
  resolveLaudoPontualKindFromImplantacao,
  type LaudoPontualKind,
} from "@/lib/servico-laudo-pontual";

interface LaudosPontualModalProps {
  open: boolean;
  processo: LaudosSstProcesso | null;
  onClose: () => void;
  onSaved: (processoAtualizado: LaudosSstProcesso) => void;
}

function resolveKindDoProcesso(
  processo: LaudosSstProcesso | null
): LaudoPontualKind {
  if (!processo) return "aet";
  return (
    processo.laudoPontualKind ??
    resolveLaudoPontualKindFromImplantacao({
      fluxo: processo.implantacao.fluxoImplantacao,
      itens: processo.implantacao.aprovacao?.orcamento_aprovacao_itens,
    }) ??
    "aet"
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

export function LaudosPontualModal({
  open,
  processo,
  onClose,
  onSaved,
}: LaudosPontualModalProps) {
  const kind = resolveKindDoProcesso(processo);
  const copy = copyLaudoPontual(kind);
  const initialTab = resolveLaudosPontualTabInicial(
    processo?.implantacao.aet ?? null
  );
  const [tab, setTab] = useState<LaudosPontualTabId>(initialTab);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab, processo?.implantacao.orcamento.id]);

  if (!open || !processo) return null;

  return (
    <LaudosPontualModalBody
      key={`${processo.implantacao.orcamento.id}-${kind}`}
      processo={processo}
      kind={kind}
      copy={copy}
      tab={tab}
      onTabChange={setTab}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

function LaudosPontualModalBody({
  processo,
  kind,
  copy,
  tab,
  onTabChange,
  onClose,
  onSaved,
}: {
  processo: LaudosSstProcesso;
  kind: LaudoPontualKind;
  copy: ReturnType<typeof copyLaudoPontual>;
  tab: LaudosPontualTabId;
  onTabChange: (tab: LaudosPontualTabId) => void;
  onClose: () => void;
  onSaved: (processoAtualizado: LaudosSstProcesso) => void;
}) {
  const orcamento = processo.implantacao.orcamento;
  const aprovacao = processo.implantacao.aprovacao;
  const aetEtapas = useOrcamentoAetEtapas({
    enabled: true,
    orcamentoId: orcamento.id,
    aprovacaoId: aprovacao?.id ?? null,
    orcamentoNumero: orcamento.numero,
    kind,
    permitirElaboracaoEnvio: true,
  });
  const aet = aetEtapas.aet ?? processo.implantacao.aet ?? null;
  const etapas = buildLaudosPontualEtapas(kind);
  const etapaAtualMeta = etapas.find((etapa) => etapa.id === tab);
  const tabLiberada = isLaudosPontualEtapaLiberada(tab, aet);
  const tabConcluida = isLaudosPontualEtapaConcluida(tab, aet);

  useEffect(() => {
    if (!aetEtapas.aet) return;
    onSaved(
      buildLaudosSstProcesso(
        { ...processo.implantacao, aet: aetEtapas.aet },
        null
      )
    );
  }, [aetEtapas.aet]);

  const subtitle = useMemo(
    () =>
      [
        orcamento.numero,
        formatClienteNomeDisplay(orcamento.cliente_nome),
        labelEtapaAtualLaudosSst(processo),
      ]
        .filter(Boolean)
        .join(" · "),
    [orcamento.numero, orcamento.cliente_nome, processo]
  );

  return (
    <Modal
      open
      onClose={onClose}
      title={copy.titulo}
      subtitle={subtitle}
      size="xl"
    >
      <div className="space-y-4">
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
          {etapas.map((etapa) => {
            const active = etapa.id === tab;
            const liberada = isLaudosPontualEtapaLiberada(etapa.id, aet);
            const concluida = isLaudosPontualEtapaConcluida(etapa.id, aet);
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
            {!tabLiberada ? (
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

          {tab === "visita" ? (
            <OrcamentoAbaAetVisita
              kind={kind}
              aet={aet}
              form={{
                visita_status: aet?.visita_status ?? "aguardando_agendamento",
                visita_data: aet?.visita_data ?? "",
                visita_horario: aet?.visita_horario ?? "",
                visita_responsavel: aet?.visita_responsavel ?? "",
                visita_observacao: aet?.visita_observacao ?? "",
              }}
              saving={false}
              somenteLeitura
              onChange={() => {}}
              onSalvar={() => {}}
            />
          ) : null}

          {tab === "elaboracao" ? (
            <OrcamentoAbaAetElaboracao
              kind={kind}
              aet={aet}
              form={aetEtapas.elaboracaoForm}
              saving={aetEtapas.saving}
              onChange={(patch) =>
                aetEtapas.setElaboracaoForm((prev) => ({ ...prev, ...patch }))
              }
              onFileChange={(file) => void aetEtapas.handleUploadLaudo(file)}
              onRemoverLaudo={() => void aetEtapas.handleRemoverLaudo()}
              onVisualizarLaudo={() => {
                if (aetEtapas.aet?.laudo_path) {
                  void aetEtapas.abrirArquivo(aetEtapas.aet.laudo_path);
                }
              }}
              onSalvar={() => void aetEtapas.handleSalvarElaboracao()}
            />
          ) : null}

          {tab === "envio" ? (
            <OrcamentoAbaAetEnvio
              kind={kind}
              aet={aet}
              form={aetEtapas.envioForm}
              saving={aetEtapas.saving}
              onChange={(patch) =>
                aetEtapas.setEnvioForm((prev) => ({ ...prev, ...patch }))
              }
              onSalvar={() => void aetEtapas.handleSalvarEnvio()}
            />
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
