"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { formatClienteNomeDisplay } from "@/lib/cliente-display";
import {
  OrcamentoAbaAetElaboracao,
  OrcamentoAbaAetEnvio,
  OrcamentoResumoAetStatus,
} from "@/components/orcamentos/OrcamentoAbasAet";
import { useOrcamentoAetEtapas } from "@/hooks/useOrcamentoAetEtapas";
import {
  buildLaudosSstProcesso,
  labelEtapaAtualLaudosSst,
  type LaudosSstProcesso,
} from "@/lib/laudos-sst";
import {
  copyLaudoPontual,
  resolveLaudoPontualKindFromImplantacao,
  type LaudoPontualKind,
} from "@/lib/servico-laudo-pontual";

type LaudoPontualTab = "elaboracao" | "envio";

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

export function LaudosPontualModal({
  open,
  processo,
  onClose,
  onSaved,
}: LaudosPontualModalProps) {
  const kind = resolveKindDoProcesso(processo);
  const copy = copyLaudoPontual(kind);
  const initialTab: LaudoPontualTab =
    processo?.etapaAtualLabel === "Aguardando envio" ? "envio" : "elaboracao";
  const [tab, setTab] = useState<LaudoPontualTab>(initialTab);

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
  tab: LaudoPontualTab;
  onTabChange: (tab: LaudoPontualTab) => void;
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
  });

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
        <OrcamentoResumoAetStatus
          kind={kind}
          aet={aetEtapas.aet}
          visitaInformativa
        />

        <div className="flex gap-2 border-b border-[#e4ebf4] pb-2">
          <button
            type="button"
            className={`rounded-full px-3 py-1 text-[11px] font-extrabold ${
              tab === "elaboracao"
                ? "bg-brand-blue-soft text-brand-blue"
                : "bg-[#f8fafc] text-[#64748b]"
            }`}
            onClick={() => onTabChange("elaboracao")}
          >
            {copy.abaElaboracao}
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-1 text-[11px] font-extrabold ${
              tab === "envio"
                ? "bg-brand-blue-soft text-brand-blue"
                : "bg-[#f8fafc] text-[#64748b]"
            }`}
            onClick={() => onTabChange("envio")}
          >
            Envio ao cliente
          </button>
        </div>

        {tab === "elaboracao" ? (
          <OrcamentoAbaAetElaboracao
            kind={kind}
            aet={aetEtapas.aet}
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
        ) : (
          <OrcamentoAbaAetEnvio
            kind={kind}
            aet={aetEtapas.aet}
            form={aetEtapas.envioForm}
            saving={aetEtapas.saving}
            onChange={(patch) =>
              aetEtapas.setEnvioForm((prev) => ({ ...prev, ...patch }))
            }
            onSalvar={() => void aetEtapas.handleSalvarEnvio()}
          />
        )}
      </div>
    </Modal>
  );
}
