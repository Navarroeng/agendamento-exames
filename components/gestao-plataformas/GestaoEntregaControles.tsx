"use client";

import { useState } from "react";
import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import {
  csvControlesAgrovias,
  TIPOS_DOCUMENTO_SST_PORTAL,
  TIPO_DOCUMENTO_SST_LABEL,
  type TipoDocumentoSstPortal,
} from "@/lib/portal-agrovias-consulta";
import type {
  ObraRegistro,
  PlataformaRegistro,
  RequisitoRegistro,
} from "@/lib/gestao-plataformas";

type Documento = {
  id: string;
  tipo: string;
  tipoLabel: string;
  arquivoNome: string;
  publicadoEm: string;
  vigente: boolean;
};

type Aso = {
  id: string;
  agendamentoId: string;
  arquivoNome: string;
  publicadoEm: string;
};

type Agendamento = {
  id: string;
  colaborador: string;
  data: string;
  aso: string;
};

type Colaborador = { id: string; nome: string };

function dataVersao(valor: string): string {
  const dia = valor.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(dia) ? formatDateIsoToBR(dia) : "Data não informada";
}

export function GestaoEntregaControles(props: {
  podePublicar: boolean;
  hoje: string;
  plataformas: PlataformaRegistro[];
  obras: ObraRegistro[];
  requisitos: RequisitoRegistro[];
  colaboradores: Colaborador[];
  agendamentos: Agendamento[];
  documentosSst: Documento[];
  asosPublicados: Aso[];
  onPainel: (painel: unknown) => void;
  onErro: (mensagem: string) => void;
}) {
  const [enviando, setEnviando] = useState(false);
  const [agendamentoId, setAgendamentoId] = useState("");

  async function publicar(url: string, dados: FormData) {
    setEnviando(true);
    props.onErro("");
    try {
      const resposta = await fetch(url, { method: "POST", body: dados });
      const json = (await resposta.json()) as { error?: string; escopo?: unknown };
      if (!resposta.ok) {
        props.onErro(json.error || "Não foi possível publicar.");
        return;
      }
      if (json.escopo) props.onPainel(json);
    } catch {
      props.onErro("Não foi possível publicar.");
    } finally {
      setEnviando(false);
    }
  }

  async function abrir(id: string, origem: "sst" | "aso") {
    const resposta = await fetch(
      `/api/gestao-plataformas/publicacao?id=${encodeURIComponent(id)}&origem=${origem}`
    );
    const json = (await resposta.json()) as { url?: string; error?: string };
    if (!resposta.ok || !json.url) {
      props.onErro(json.error || "Não foi possível abrir o arquivo.");
      return;
    }
    window.open(json.url, "_blank", "noopener");
  }

  function exportar() {
    const nomes = new Map(props.colaboradores.map((item) => [item.id, item.nome]));
    const extraidoEm = new Date().toISOString();
    const csv = csvControlesAgrovias({
      extraidoEm,
      plataformas: props.plataformas,
      obras: props.obras,
      requisitos: props.requisitos,
      nomeColaborador: (id) => nomes.get(id) ?? "",
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `controles-agrovias-${props.hoje || extraidoEm.slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <section className="space-y-4 rounded-2xl border border-[#e8edf5] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#0b1f4d]">Entrega ao cliente</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Publique a versão final de cada PDF quando ela estiver pronta. O encerramento continua manual: reúna os documentos, os ASOs, os recibos do eSocial e o controle exportado para entregar à AGROVIAS.
          </p>
        </div>
        <button
          type="button"
          className="rounded-full border border-[#c5cedd] bg-white px-4 py-2 text-sm font-semibold text-[#0b1f4d]"
          onClick={exportar}
        >
          Exportar controles
        </button>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-[#0b1f4d]">Documentos de SST</h3>
        {TIPOS_DOCUMENTO_SST_PORTAL.map((tipo) => {
          const versoes = props.documentosSst.filter((item) => item.tipo === tipo);
          const vigente = versoes.find((item) => item.vigente);
          const historico = versoes.filter((item) => !item.vigente);
          return (
            <article key={tipo} className="rounded-xl border border-[#e8edf5] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-[#0b1f4d]">{TIPO_DOCUMENTO_SST_LABEL[tipo]}</p>
                  <p className="text-xs text-slate-500">
                    {vigente
                      ? `Versão vigente em ${dataVersao(vigente.publicadoEm)}`
                      : "Nenhuma versão publicada"}
                  </p>
                </div>
                {props.podePublicar ? (
                  <label className="inline-flex cursor-pointer items-center rounded-lg border border-[#e8edf5] px-3 py-1.5 text-xs font-semibold text-[#0b1f4d]">
                    Publicar PDF
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      className="sr-only"
                      disabled={enviando}
                      aria-label={`Publicar ${TIPO_DOCUMENTO_SST_LABEL[tipo]}`}
                      onChange={(event) => {
                        const arquivo = event.currentTarget.files?.[0];
                        if (!arquivo) return;
                        const dados = new FormData();
                        dados.set("tipo", tipo satisfies TipoDocumentoSstPortal);
                        dados.set("arquivo", arquivo);
                        void publicar("/api/gestao-plataformas/sst", dados);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                ) : null}
              </div>
              {vigente ? (
                <button type="button" className="mt-2 text-xs font-semibold text-[#4945FF]" onClick={() => void abrir(vigente.id, "sst")}>
                  Abrir vigente
                </button>
              ) : null}
              {historico.length > 0 ? (
                <ul className="mt-2 space-y-1 text-xs text-slate-500">
                  {historico.map((item) => (
                    <li key={item.id} className="flex flex-wrap items-center gap-2">
                      <span>Histórico · {dataVersao(item.publicadoEm)} · {item.arquivoNome}</span>
                      <button type="button" className="font-semibold text-[#4945FF]" onClick={() => void abrir(item.id, "sst")}>
                        Abrir
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          );
        })}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-[#0b1f4d]">ASOs finais para o cliente</h3>
        <p className="text-xs text-slate-500">
          O ASO publicado fica ligado ao agendamento já lançado. Prontuário e resultado clínico não entram no portal.
        </p>
        {props.podePublicar ? (
          <div className="flex flex-col gap-2 sidebar:flex-row sidebar:items-center">
            <select
              className="h-10 min-w-0 flex-1 rounded-xl border border-[#e8edf5] px-3 text-sm"
              value={agendamentoId}
              onChange={(event) => setAgendamentoId(event.target.value)}
              aria-label="Agendamento do ASO"
            >
              <option value="">Selecione o agendamento</option>
              {props.agendamentos.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.colaborador} · {item.data ? formatDateIsoToBR(item.data) : "sem data"} · {item.aso || "Exame"}
                </option>
              ))}
            </select>
            <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-[#e8edf5] px-3 py-2 text-xs font-semibold text-[#0b1f4d]">
              Publicar ASO
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="sr-only"
                disabled={enviando || !agendamentoId}
                aria-label="Publicar ASO"
                onChange={(event) => {
                  const arquivo = event.currentTarget.files?.[0];
                  if (!arquivo || !agendamentoId) return;
                  const dados = new FormData();
                  dados.set("agendamentoId", agendamentoId);
                  dados.set("arquivo", arquivo);
                  void publicar("/api/gestao-plataformas/aso", dados);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          </div>
        ) : null}
        <ul className="space-y-1 text-sm text-[#0b1f4d]">
          {props.asosPublicados.map((item) => {
            const agendamento = props.agendamentos.find((linha) => linha.id === item.agendamentoId);
            return (
              <li key={item.id} className="flex flex-wrap items-center gap-2">
                <span>
                  {agendamento?.colaborador ?? "Colaborador"} · {dataVersao(item.publicadoEm)} · {item.arquivoNome}
                </span>
                <button type="button" className="text-xs font-semibold text-[#4945FF]" onClick={() => void abrir(item.id, "aso")}>
                  Abrir
                </button>
              </li>
            );
          })}
          {props.asosPublicados.length === 0 ? (
            <li className="text-sm text-slate-500">Nenhum ASO publicado para o cliente.</li>
          ) : null}
        </ul>
      </div>
    </section>
  );
}
