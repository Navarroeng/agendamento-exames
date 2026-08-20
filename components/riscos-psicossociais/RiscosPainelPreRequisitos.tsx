"use client";

import { useState } from "react";
import { toast } from "sonner";
import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import { RiscosListaPresencaTab } from "@/components/riscos-psicossociais/RiscosListaPresencaTab";
import { RiscosCampanhaLogoCard } from "@/components/riscos-psicossociais/RiscosCampanhaLogoCard";
import type { RiscosCampanhaRecord } from "@/lib/riscos-campanha";
import { downloadModeloImportacaoParticipantesExcel } from "@/lib/riscos-participantes-excel";
import type { RiscosPsicossociaisProcesso } from "@/lib/riscos-psicossociais";

interface RiscosPainelPreRequisitosProps {
  processo: RiscosPsicossociaisProcesso;
  campanha?: RiscosCampanhaRecord | null;
  savingLista: boolean;
  savingLogo?: boolean;
  onSalvarSolicitacaoLista: (input: {
    dataSolicitacaoIso: string;
  }) => Promise<void>;
  onSalvarRecebimentoLista: (file: File) => Promise<void>;
  onRemoverAnexoLista: () => Promise<void>;
  onVisualizarAnexoLista: () => Promise<void>;
  onUploadLogoCampanha?: (file: File) => Promise<void>;
  onRemoverLogoCampanha?: () => Promise<void>;
  /** Quando true, não renderiza o container externo (usa o PanelCard pai). */
  embedded?: boolean;
}

function StatusPill({
  ok,
  okLabel,
  pendingLabel,
}: {
  ok: boolean;
  okLabel: string;
  pendingLabel: string;
}) {
  return ok ? (
    <span className="inline-flex rounded-full bg-brand-green-soft px-2 py-0.5 text-[10px] font-extrabold text-brand-green">
      {okLabel}
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-[#fef3c7] px-2 py-0.5 text-[10px] font-extrabold text-[#b45309]">
      {pendingLabel}
    </span>
  );
}

export function RiscosPainelPreRequisitos({
  processo,
  campanha = null,
  savingLista,
  savingLogo = false,
  onSalvarSolicitacaoLista,
  onSalvarRecebimentoLista,
  onRemoverAnexoLista,
  onVisualizarAnexoLista,
  onUploadLogoCampanha,
  onRemoverLogoCampanha,
  embedded = false,
}: RiscosPainelPreRequisitosProps) {
  const [listaExpandida, setListaExpandida] = useState(false);
  const lista = processo.listaPresenca;
  const laudosAtualizacao =
    processo.laudos.concluidoEm ?? processo.laudos.dataEntrada;

  const body = (
    <>
      <div
        className={`grid gap-2 ${
          processo.exigeLaudosSst ? "sm:grid-cols-2" : "sm:grid-cols-1"
        }`}
      >
        {processo.exigeLaudosSst ? (
          <div
            className={`rounded-xl border px-3 py-2.5 ${
              processo.laudosSstConcluido
                ? "border-[#bbf7d0] bg-[#f0fdf4]/50"
                : "border-[#fde68a] bg-[#fffbeb]/50"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-extrabold text-navy">Laudos SST</p>
              <StatusPill
                ok={processo.laudosSstConcluido}
                okLabel="Concluído"
                pendingLabel="Pendente"
              />
            </div>
            <p className="mt-1 text-[11px] text-[#64748b]">
              {laudosAtualizacao
                ? `Atualizado em ${formatDateIsoToBR(
                    laudosAtualizacao.slice(0, 10)
                  )}`
                : "Integração automática"}
            </p>
          </div>
        ) : null}

        {/*
          Lista de Presença: chrome visual fixo (igual nos fluxos normal e manual).
          Status fica só no badge — não alternar amarelo/verde pelo estado.
        */}
        <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4]/50 px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-extrabold text-navy">Lista de Presença</p>
            <StatusPill
              ok={processo.listaPresencaConcluida}
              okLabel="Concluída"
              pendingLabel="Pendente"
            />
          </div>

          <dl className="mt-2.5 grid gap-x-4 gap-y-2 text-[11px] sm:grid-cols-2">
            <div>
              <dt className="text-[#94a3b8]">Solicitada</dt>
              <dd className="mt-0.5 font-semibold text-navy">
                {lista.lista_solicitada ? "Sim" : "Não"}
              </dd>
            </div>
            <div>
              <dt className="text-[#94a3b8]">Data da solicitação</dt>
              <dd className="mt-0.5 font-semibold text-navy">
                {lista.lista_solicitada_em
                  ? formatDateIsoToBR(lista.lista_solicitada_em.slice(0, 10))
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[#94a3b8]">Anexo</dt>
              <dd className="mt-0.5 break-words font-semibold text-navy">
                {lista.lista_anexo_path
                  ? lista.lista_anexo_nome?.trim() || "Arquivo anexado"
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[#94a3b8]">Recebida</dt>
              <dd className="mt-0.5 font-semibold text-navy">
                {lista.lista_recebida ? "Sim" : "Não"}
              </dd>
            </div>
          </dl>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {lista.lista_anexo_path ? (
              <button
                type="button"
                className="rounded-xl border border-[#e2e8f0] bg-white/80 px-3 py-1.5 text-[11px] font-bold text-navy"
                onClick={() => void onVisualizarAnexoLista()}
              >
                Ver anexo
              </button>
            ) : null}
            <button
              type="button"
              className="rounded-xl bg-[#082b63] px-3 py-1.5 text-[11px] font-bold text-white"
              onClick={() => setListaExpandida((v) => !v)}
            >
              {listaExpandida ? "Ocultar gestão" : "Gerenciar lista"}
            </button>
            <button
              type="button"
              className="rounded-xl border border-[#cbd5e1] bg-white px-3 py-1.5 text-[11px] font-bold text-navy"
              title="Baixar modelo_importacao_participantes_riscos.xlsx"
              onClick={() => {
                try {
                  downloadModeloImportacaoParticipantesExcel();
                } catch {
                  toast.error("Não foi possível baixar o modelo.");
                }
              }}
            >
              Baixar modelo
            </button>
          </div>

          {listaExpandida ? (
            <div className="mt-3 border-t border-[#e8edf5]/80 pt-3">
              <RiscosListaPresencaTab
                processo={processo}
                saving={savingLista}
                onSalvarSolicitacao={onSalvarSolicitacaoLista}
                onSalvarRecebimento={onSalvarRecebimentoLista}
                onRemoverAnexo={onRemoverAnexoLista}
                onVisualizarAnexo={onVisualizarAnexoLista}
              />
            </div>
          ) : null}
        </div>
      </div>

      {onUploadLogoCampanha && onRemoverLogoCampanha ? (
        <RiscosCampanhaLogoCard
          campanha={campanha ?? processo.campanha ?? null}
          saving={savingLogo}
          somenteConsulta={
            processo.status === "cancelado" || processo.etapaAtual === "cancelado"
          }
          onUpload={onUploadLogoCampanha}
          onRemove={onRemoverLogoCampanha}
        />
      ) : null}
    </>
  );

  if (embedded) return body;

  return (
    <section className="flex h-full flex-col rounded-2xl border border-[#e8edf5] bg-white p-4 shadow-sm sm:p-5">
      <h3 className="mb-3 text-sm font-extrabold text-navy">Pré-requisitos</h3>
      {body}
    </section>
  );
}
