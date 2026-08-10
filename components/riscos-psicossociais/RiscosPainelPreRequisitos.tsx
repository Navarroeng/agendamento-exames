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

export function RiscosPainelPreRequisitos({
  processo,
  savingLista,
  onSalvarSolicitacaoLista,
  onSalvarRecebimentoLista,
  onRemoverAnexoLista,
  onVisualizarAnexoLista,
}: RiscosPainelPreRequisitosProps) {
  const [listaExpandida, setListaExpandida] = useState(
    !processo.listaPresencaConcluida
  );
  const lista = processo.listaPresenca;

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <div
        className={`rounded-2xl border px-4 py-4 ${
          processo.laudosSstConcluido
            ? "border-[#bbf7d0] bg-[#f0fdf4]/50"
            : "border-[#fde68a] bg-[#fffbeb]/60"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
              Pré-requisito · Automático
            </p>
            <p className="mt-0.5 text-sm font-extrabold text-navy">
              Laudos SST
            </p>
          </div>
          {processo.laudosSstConcluido ? (
            <span className="inline-flex rounded-full bg-brand-green-soft px-2.5 py-0.5 text-[10px] font-extrabold text-brand-green">
              Concluído
            </span>
          ) : (
            <span className="inline-flex rounded-full bg-[#fef3c7] px-2.5 py-0.5 text-[10px] font-extrabold text-[#b45309]">
              Aguardando finalização
            </span>
          )}
        </div>
        <p className="mt-3 text-sm text-[#475569]">
          Dependência automática do módulo Laudos SST. O andamento aqui
          acompanha o status real daquele processo.
        </p>
        {/* TODO: Reativar dependência automática de Laudos SST quando o módulo estiver finalizado. */}
        <p className="mt-2 text-[11px] font-medium text-[#b45309]">
          Temporariamente não bloqueia o restante do fluxo (modo desenvolvimento).
        </p>
        <dl className="mt-3 grid gap-1 text-xs text-[#64748b]">
          <div className="flex justify-between gap-2">
            <dt>Status atual</dt>
            <dd className="font-semibold text-navy">
              {processo.laudosSstConcluido ? "Concluído" : "Em andamento"}
            </dd>
          </div>
        </dl>
      </div>

      <div
        className={`rounded-2xl border px-4 py-4 ${
          processo.listaPresencaConcluida
            ? "border-[#bbf7d0] bg-[#f0fdf4]/50"
            : "border-[#e8edf5] bg-white"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
              Pré-requisito
            </p>
            <p className="mt-0.5 text-sm font-extrabold text-navy">
              Lista de Presença
            </p>
          </div>
          {processo.listaPresencaConcluida ? (
            <span className="inline-flex rounded-full bg-brand-green-soft px-2.5 py-0.5 text-[10px] font-extrabold text-brand-green">
              Concluída
            </span>
          ) : (
            <span className="inline-flex rounded-full bg-[#fef3c7] px-2.5 py-0.5 text-[10px] font-extrabold text-[#b45309]">
              Pendente
            </span>
          )}
        </div>

        <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
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
          <div className="sm:col-span-2">
            <dt className="text-[#94a3b8]">E-mail utilizado</dt>
            <dd className="mt-0.5 break-all font-semibold text-navy">
              {lista.lista_solicitada_email?.trim() || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-[#94a3b8]">Recebida</dt>
            <dd className="mt-0.5 font-semibold text-navy">
              {lista.lista_recebida ? "Sim" : "Não"}
            </dd>
          </div>
          <div>
            <dt className="text-[#94a3b8]">Anexo</dt>
            <dd className="mt-0.5 font-semibold text-navy">
              {lista.lista_anexo_path
                ? lista.lista_anexo_nome?.trim() || "Arquivo anexado"
                : "—"}
            </dd>
          </div>
        </dl>

        <div className="mt-3 flex flex-wrap gap-2">
          {lista.lista_anexo_path ? (
            <button
              type="button"
              className="rounded-xl border border-[#e2e8f0] px-3 py-1.5 text-[11px] font-bold text-navy"
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
        </div>

        {listaExpandida ? (
          <div className="mt-4 border-t border-[#e8edf5] pt-4">
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
  );
}
