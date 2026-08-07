"use client";

import { Modal } from "@/components/ui/Modal";
import { RiscosCampanhaTab } from "@/components/riscos-psicossociais/RiscosCampanhaTab";
import { RiscosListaPresencaTab } from "@/components/riscos-psicossociais/RiscosListaPresencaTab";
import { formatClienteNomeDisplay } from "@/lib/cliente-display";
import {
  RISCOS_PSICOSSOCIAIS_ETAPAS,
  isRiscosEtapaAutomatica,
  isRiscosEtapaLiberada,
  mensagemBloqueioEtapaRiscos,
  type RiscosPsicossociaisEtapaId,
  type RiscosPsicossociaisProcesso,
} from "@/lib/riscos-psicossociais";

interface RiscosPsicossociaisModalProps {
  open: boolean;
  processo: RiscosPsicossociaisProcesso | null;
  tab: RiscosPsicossociaisEtapaId;
  savingLista?: boolean;
  savingCampanha?: boolean;
  onTabChange: (tab: RiscosPsicossociaisEtapaId) => void;
  onClose: () => void;
  onSalvarSolicitacaoLista?: (input: {
    dataSolicitacaoIso: string;
    email: string;
  }) => Promise<void>;
  onSalvarRecebimentoLista?: (file: File) => Promise<void>;
  onRemoverAnexoLista?: () => Promise<void>;
  onVisualizarAnexoLista?: () => Promise<void>;
  onCriarCampanha?: (input: {
    dataInicioIso: string;
    dataEncerramentoIso: string;
    quantidadePrevista: number;
  }) => Promise<void>;
}

export function RiscosPsicossociaisModal({
  open,
  processo,
  tab,
  savingLista = false,
  savingCampanha = false,
  onTabChange,
  onClose,
  onSalvarSolicitacaoLista,
  onSalvarRecebimentoLista,
  onRemoverAnexoLista,
  onVisualizarAnexoLista,
  onCriarCampanha,
}: RiscosPsicossociaisModalProps) {
  if (!open || !processo) return null;

  const { orcamento, numeroContrato } = processo.implantacao;
  const etapaAtual = RISCOS_PSICOSSOCIAIS_ETAPAS.find((e) => e.id === tab);
  const tabLiberada = isRiscosEtapaLiberada(processo, tab);
  const bloqueioMsg = mensagemBloqueioEtapaRiscos(processo, tab);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Riscos Psicossociais · ${orcamento.numero}`}
      subtitle={`${formatClienteNomeDisplay(orcamento.cliente_nome)}${
        numeroContrato ? ` · Contrato ${numeroContrato}` : ""
      } · ${processo.progressoLabel} etapas`}
      size="xl"
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            className="btn justify-center sm:w-auto"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
          {RISCOS_PSICOSSOCIAIS_ETAPAS.map((etapa) => {
            const active = etapa.id === tab;
            const liberada = isRiscosEtapaLiberada(processo, etapa.id);
            const automatica = isRiscosEtapaAutomatica(etapa.id);
            const bloqueio = mensagemBloqueioEtapaRiscos(processo, etapa.id);
            return (
              <button
                key={etapa.id}
                type="button"
                disabled={!liberada}
                title={
                  bloqueio ??
                  (automatica
                    ? "Etapa automática (sincronizada com Laudos SST)"
                    : etapa.label)
                }
                onClick={() => {
                  if (!liberada) return;
                  onTabChange(etapa.id);
                }}
                className={`shrink-0 rounded-xl px-3 py-2 text-[11px] font-bold transition ${
                  active
                    ? automatica
                      ? "bg-[#0f766e] text-white shadow-sm"
                      : "bg-[#082b63] text-white shadow-sm"
                    : !liberada
                      ? "cursor-not-allowed bg-[#f1f5f9] text-[#94a3b8] opacity-70"
                      : automatica
                        ? "bg-[#ecfdf5] text-[#0f766e] hover:bg-[#d1fae5]"
                        : "bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0]"
                }`}
              >
                <span className="flex flex-col items-start gap-0.5">
                  <span>{etapa.label}</span>
                  {automatica ? (
                    <span
                      className={`text-[9px] font-semibold uppercase tracking-wide ${
                        active ? "text-white/80" : "text-[#0f766e]/80"
                      }`}
                    >
                      Automática
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>

        {tab === "laudos_sst" ? (
          <div
            className={`rounded-2xl border px-5 py-10 text-center ${
              processo.laudosSstConcluido
                ? "border-[#bbf7d0] bg-[#f0fdf4]"
                : "border-[#fde68a] bg-[#fffbeb]"
            }`}
          >
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#64748b]">
              Etapa automática · dependente de Laudos SST
            </p>
            <p className="mt-2 text-sm font-extrabold text-navy">Laudos SST</p>
            {processo.laudosSstConcluido ? (
              <>
                <p className="mt-3 inline-flex rounded-full bg-brand-green-soft px-3 py-1 text-[11px] font-extrabold text-brand-green">
                  Concluído
                </p>
                <p className="mt-3 text-sm text-app-muted">
                  O processo de Laudos SST foi concluído. As próximas etapas
                  estão liberadas.
                </p>
              </>
            ) : (
              <>
                <p className="mt-3 inline-flex rounded-full bg-[#fef3c7] px-3 py-1 text-[11px] font-extrabold text-[#b45309]">
                  Aguardando finalização
                </p>
                <p className="mt-3 text-sm text-app-muted">
                  Aguardando finalização do processo de Laudos SST.
                </p>
              </>
            )}
          </div>
        ) : tab === "lista_presenca" && tabLiberada ? (
          <RiscosListaPresencaTab
            processo={processo}
            saving={savingLista}
            onSalvarSolicitacao={async (input) => {
              await onSalvarSolicitacaoLista?.(input);
            }}
            onSalvarRecebimento={async (file) => {
              await onSalvarRecebimentoLista?.(file);
            }}
            onRemoverAnexo={async () => {
              await onRemoverAnexoLista?.();
            }}
            onVisualizarAnexo={async () => {
              await onVisualizarAnexoLista?.();
            }}
          />
        ) : tab === "pesquisa_psicossocial" && tabLiberada ? (
          <RiscosCampanhaTab
            processo={processo}
            saving={savingCampanha}
            onCriarCampanha={async (input) => {
              await onCriarCampanha?.(input);
            }}
          />
        ) : (
          <div className="rounded-2xl border border-[#e8edf5] bg-[#f8fafc] px-5 py-10 text-center">
            {!tabLiberada ? (
              <>
                <p className="text-sm font-extrabold text-navy">
                  {etapaAtual?.label ?? "Etapa"}
                </p>
                <p className="mt-2 text-sm text-app-muted">
                  {bloqueioMsg ??
                    "Aguardando finalização do processo de Laudos SST."}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-extrabold text-navy">
                  {etapaAtual?.label ?? "Etapa"}
                </p>
                <p className="mt-2 text-sm text-app-muted">
                  Conteúdo desta etapa será configurado posteriormente.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
