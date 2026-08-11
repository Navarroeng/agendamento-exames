"use client";

import type { RiscosParticipantesResumo } from "@/lib/riscos-campanha-participantes";
import type { RiscosPsicossociaisProcesso } from "@/lib/riscos-psicossociais";

interface RiscosPainelSituacaoAtualProps {
  processo: RiscosPsicossociaisProcesso;
  resumo: RiscosParticipantesResumo;
  participacaoPct: number;
}

function deriveProximaAcao(params: {
  processo: RiscosPsicossociaisProcesso;
  resumo: RiscosParticipantesResumo;
}): string | null {
  const { processo, resumo } = params;
  const campanha = processo.campanha;

  if (!processo.listaPresencaConcluida) {
    return "Concluir a lista de presença";
  }
  if (!campanha) {
    return "Criar a pesquisa psicossocial";
  }
  if (resumo.cadastrados === 0) {
    return "Cadastrar os participantes da pesquisa";
  }
  if (resumo.cadastrados > 0 && resumo.respondidos === 0) {
    return "Preparar envio da pesquisa";
  }
  if (campanha.status === "encerrada") {
    return "Gerar relatório";
  }
  if (resumo.pendentes > 0) {
    return "Acompanhar respostas";
  }
  return null;
}

export function RiscosPainelSituacaoAtual({
  processo,
  resumo,
  participacaoPct,
}: RiscosPainelSituacaoAtualProps) {
  const campanha = processo.campanha;
  const proxima = deriveProximaAcao({
    processo,
    resumo,
  });

  const itens = [
    {
      label: "Lista de presença",
      value: processo.listaPresencaConcluida ? "Concluída" : "Pendente",
    },
    {
      label: "Participantes cadastrados",
      value: String(resumo.cadastrados),
    },
    {
      label: "Convites enviados",
      value: "—",
    },
    {
      label: "Questionários respondidos",
      value: `${resumo.respondidos}${
        resumo.cadastrados > 0 ? ` (${participacaoPct}%)` : ""
      }`,
    },
    {
      label: "Relatório",
      value:
        campanha?.status === "encerrada" ? "Pendente de geração" : "Não disponível",
    },
  ];

  return (
    <section className="rounded-2xl border border-[#e8edf5] bg-white px-4 py-3.5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
            Resumo operacional
          </p>
          <h3 className="text-sm font-extrabold text-navy">
            Situação atual da pesquisa
          </h3>
        </div>
      </div>

      <dl className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {itens.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-[#eef2f7] bg-[#f8fafc] px-3 py-2"
          >
            <dt className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
              {item.label}
            </dt>
            <dd className="mt-0.5 text-sm font-semibold text-navy">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>

      {proxima ? (
        <p className="mt-3 text-xs font-medium text-app-muted">
          Próxima ação:{" "}
          <span className="font-bold text-navy">{proxima}</span>
        </p>
      ) : null}
    </section>
  );
}
