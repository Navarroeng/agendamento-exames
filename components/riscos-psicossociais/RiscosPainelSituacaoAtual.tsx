"use client";

import type { RiscosParticipantesResumo } from "@/lib/riscos-campanha-participantes";
import type { RiscosPsicossociaisProcesso } from "@/lib/riscos-psicossociais";

interface RiscosPainelSituacaoAtualProps {
  processo: RiscosPsicossociaisProcesso;
  resumo: RiscosParticipantesResumo;
  faltamCadastrar: number;
  participacaoPct: number;
}

function deriveProximaAcao(params: {
  processo: RiscosPsicossociaisProcesso;
  resumo: RiscosParticipantesResumo;
  faltamCadastrar: number;
}): string | null {
  const { processo, resumo, faltamCadastrar } = params;
  const campanha = processo.campanha;

  if (!processo.listaPresencaConcluida) {
    return "Concluir a lista de presença";
  }
  if (!campanha) {
    return "Criar a pesquisa psicossocial";
  }
  if (faltamCadastrar > 0) {
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
  faltamCadastrar,
  participacaoPct,
}: RiscosPainelSituacaoAtualProps) {
  const campanha = processo.campanha;
  const proximaAcao = deriveProximaAcao({
    processo,
    resumo,
    faltamCadastrar,
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
        resumo.previstos > 0 || resumo.cadastrados > 0
          ? ` (${participacaoPct}%)`
          : ""
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

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {itens.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-[#eef2f7] bg-[#f8fafc] px-3 py-2"
          >
            <p className="text-[9px] font-bold uppercase tracking-wide text-[#94a3b8]">
              {item.label}
            </p>
            <p className="mt-0.5 text-xs font-extrabold text-navy">{item.value}</p>
          </div>
        ))}
      </div>

      {proximaAcao ? (
        <p className="mt-3 rounded-xl border border-[#dbeafe] bg-[#f8fbff] px-3 py-2 text-xs font-semibold text-navy">
          <span className="text-[#64748b]">Próxima ação:</span>{" "}
          <span>➡ {proximaAcao}</span>
        </p>
      ) : (
        <p className="mt-3 text-[11px] text-[#94a3b8]">
          Status conhecido exibido acima. Sem próxima ação determinada pelos
          dados atuais.
        </p>
      )}
    </section>
  );
}
