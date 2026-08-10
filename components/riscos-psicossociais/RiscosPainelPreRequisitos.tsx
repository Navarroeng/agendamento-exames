"use client";

import { useState } from "react";
import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import { RiscosListaPresencaTab } from "@/components/riscos-psicossociais/RiscosListaPresencaTab";
import type { RiscosPsicossociaisProcesso } from "@/lib/riscos-psicossociais";

interface RiscosPainelPreRequisitosProps {
  processo: RiscosPsicossociaisProcesso;
  savingLista: boolean;
  onSalvarSolicitacaoLista: (input: {
    dataSolicitacaoIso: string;
    email: string;
  }) => Promise<void>;
  onSalvarRecebimentoLista: (file: File) => Promise<void>;
  onRemoverAnexoLista: () => Promise<void>;
  onVisualizarAnexoLista: () => Promise<void>;
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
  savingLista,
  onSalvarSolicitacaoLista,
  onSalvarRecebimentoLista,
  onRemoverAnexoLista,
  onVisualizarAnexoLista,
}: RiscosPainelPreRequisitosProps) {
  const [listaExpandida, setListaExpandida] = useState(false);
  const lista = processo.listaPresenca;
  const laudosAtualizacao =
    processo.laudos.concluidoEm ?? processo.laudos.dataEntrada;

  return (
    <section className="rounded-2xl border border-[#e8edf5] bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
          Card 2
        </p>
        <h3 className="text-sm font-extrabold text-navy">Pré-requisitos</h3>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
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

        <div
          className={`rounded-xl border px-3 py-2.5 ${
            processo.listaPresencaConcluida
              ? "border-[#bbf7d0] bg-[#f0fdf4]/50"
              : "border-[#e8edf5] bg-[#f8fafc]"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-extrabold text-navy">Lista de Presença</p>
            <StatusPill
              ok={processo.listaPresencaConcluida}
              okLabel="Concluída"
              pendingLabel="Pendente"
            />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#64748b]">
            <span>
              Solicitada:{" "}
              <span className="font-semibold text-navy">
                {lista.lista_solicitada ? "Sim" : "Não"}
              </span>
            </span>
            <span>
              Recebida:{" "}
              <span className="font-semibold text-navy">
                {lista.lista_recebida ? "Sim" : "Não"}
              </span>
            </span>
            <button
              type="button"
              className="font-bold text-brand-blue hover:underline"
              onClick={() => setListaExpandida((v) => !v)}
            >
              {listaExpandida ? "Ocultar gestão" : "Gerenciar"}
            </button>
            {lista.lista_anexo_path ? (
              <button
                type="button"
                className="font-bold text-navy hover:underline"
                onClick={() => void onVisualizarAnexoLista()}
              >
                Ver anexo
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {listaExpandida ? (
        <div className="mt-3 border-t border-[#e8edf5] pt-3">
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
    </section>
  );
}
