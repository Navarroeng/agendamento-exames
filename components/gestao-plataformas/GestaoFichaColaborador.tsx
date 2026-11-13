"use client";

import { useEffect, useId, useRef, useState } from "react";
import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import {
  alocacaoAberta,
  cursoAtivo,
  plataformaDaObra,
  type AcaoGestaoPlataformas,
  type CertificadoRegistro,
  type CursoCatalogo,
  type DocumentoRhEvento,
  type DocumentoRhRegistro,
  SITUACAO_DOCUMENTO_RH_LABEL,
  type ObraRegistro,
  type PlataformaRegistro,
} from "@/lib/gestao-plataformas";
import type { ClienteColaboradorLinha } from "@/lib/portal-colaboradores";

const INPUT =
  "h-10 w-full rounded-xl border border-[#DCE5F4] bg-white px-3 text-sm text-[#101D4A] outline-none focus:border-[#4945FF]";

type AbaFicha = "obras" | "exames" | "cursos" | "rh";

type ExameLinha = {
  id: string;
  dataLabel: string;
  tipoExame: string;
  situacao: string;
};

type AlocacaoFicha = {
  id: string;
  obraId: string;
  colaboradorId: string;
  encerradaEm: string | null;
};

const ABAS: { id: AbaFicha; label: string }[] = [
  { id: "obras", label: "Obras e plataformas" },
  { id: "exames", label: "Exames" },
  { id: "cursos", label: "Cursos e certificados" },
  { id: "rh", label: "Documentos de RH" },
];

function textoOuNaoInformado(valor: string | null | undefined): string {
  const texto = String(valor ?? "").trim();
  if (!texto || texto === "—") return "Não informado";
  return texto;
}

function IconePessoa({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 19.2c1.2-2.8 3.4-4.2 6.5-4.2s5.3 1.4 6.5 4.2" strokeLinecap="round" />
    </svg>
  );
}

function RostoPadrao() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" className="h-full w-full">
      <circle cx="60" cy="60" r="60" fill="#E7EEFF" />
      <circle cx="60" cy="48" r="18" fill="#C9D7F8" />
      <path d="M28 104c6-18 18-28 32-28s26 10 32 28" fill="#C9D7F8" />
      <circle cx="53" cy="46" r="2.2" fill="#101D4A" />
      <circle cx="67" cy="46" r="2.2" fill="#101D4A" />
      <path d="M54 56c2.2 2.4 4.4 3.4 6 3.4s3.8-1 6-3.4" fill="none" stroke="#101D4A" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconeObra() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 20h16M6 20V9l6-4 6 4v11" strokeLinejoin="round" />
      <path d="M10 20v-5h4v5" />
    </svg>
  );
}

function IconeOk() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="8" cy="8" r="6" />
      <path d="M5.2 8.1 7.1 10l3.7-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconeRelogio() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.8V8l2.2 1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LinhaDado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="grid grid-cols-1 gap-0.5 border-b border-[#DCE5F4] py-2.5 last:border-b-0 sidebar:grid-cols-[11rem_1fr] sidebar:items-center sidebar:gap-3">
      <dt className="text-sm text-slate-500">{rotulo}</dt>
      <dd className="text-sm font-medium text-[#101D4A]">{valor}</dd>
    </div>
  );
}

export function GestaoFichaColaborador({
  colaborador,
  plataformas,
  obras,
  alocacoes,
  liberacoesAbertas,
  cursos,
  certificados,
  documentosRh,
  documentosRhEventos = [],
  salvando,
  escBloqueado = false,
  onFechar,
  onEnviar,
  onRecarregar,
  onEditarCadastro,
  examesIniciais,
}: {
  colaborador: ClienteColaboradorLinha;
  plataformas: PlataformaRegistro[];
  obras: ObraRegistro[];
  alocacoes: AlocacaoFicha[];
  liberacoesAbertas: { obraId: string; colaboradorId: string }[];
  cursos: CursoCatalogo[];
  certificados: CertificadoRegistro[];
  documentosRh: DocumentoRhRegistro[];
  documentosRhEventos?: DocumentoRhEvento[];
  salvando: boolean;
  escBloqueado?: boolean;
  onFechar: () => void;
  onEnviar: (acao: AcaoGestaoPlataformas) => void;
  onRecarregar: (painel: { escopo?: { clienteId: string } }) => void;
  onEditarCadastro: () => void;
  examesIniciais?: {
    proximos: ExameLinha[];
    realizados: ExameLinha[];
  };
}) {
  const tituloId = useId();
  const fecharRef = useRef<HTMLButtonElement>(null);
  const [aba, setAba] = useState<AbaFicha>("obras");
  const [escolhendoObras, setEscolhendoObras] = useState(false);
  const [obrasEscolhidas, setObrasEscolhidas] = useState<string[]>([]);
  const [cursoId, setCursoId] = useState("");
  const [realizadoEm, setRealizadoEm] = useState("");
  const [validade, setValidade] = useState("");
  const [identificacao, setIdentificacao] = useState("");
  const [pedido, setPedido] = useState("");
  const [reenvioId, setReenvioId] = useState<string | null>(null);
  const [reenvioTexto, setReenvioTexto] = useState("");
  const [proximos, setProximos] = useState<ExameLinha[]>(examesIniciais?.proximos ?? []);
  const [realizados, setRealizados] = useState<ExameLinha[]>(examesIniciais?.realizados ?? []);
  const [examesEstado, setExamesEstado] = useState<"carregando" | "ok" | "falha">(
    examesIniciais ? "ok" : "carregando"
  );
  const [examesErro, setExamesErro] = useState("");

  useEffect(() => {
    setAba("obras");
    setEscolhendoObras(false);
    setObrasEscolhidas([]);
    setCursoId("");
    setRealizadoEm("");
    setValidade("");
    setIdentificacao("");
    fecharRef.current?.focus();
  }, [colaborador.id]);

  useEffect(() => {
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = anterior;
    };
  }, []);

  useEffect(() => {
    function aoTeclar(event: KeyboardEvent) {
      if (event.key !== "Escape" || escBloqueado) return;
      event.preventDefault();
      onFechar();
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [escBloqueado, onFechar]);

  useEffect(() => {
    if (examesIniciais) return;
    let ativo = true;
    setExamesEstado("carregando");
    setExamesErro("");
    void fetch(
      `/api/gestao-plataformas/exames?colaboradorId=${encodeURIComponent(colaborador.id)}`,
      { cache: "no-store" }
    )
      .then(async (resposta) => {
        const json = (await resposta.json()) as {
          proximos?: ExameLinha[];
          realizados?: ExameLinha[];
          error?: string;
        };
        if (!ativo) return;
        if (!resposta.ok) {
          setExamesEstado("falha");
          setExamesErro(json.error || "Não foi possível carregar os exames.");
          return;
        }
        setProximos(json.proximos ?? []);
        setRealizados(json.realizados ?? []);
        setExamesEstado("ok");
      })
      .catch(() => {
        if (!ativo) return;
        setExamesEstado("falha");
        setExamesErro("Não foi possível carregar os exames.");
      });
    return () => {
      ativo = false;
    };
  }, [colaborador.id, examesIniciais]);

  const abertas = alocacoes.filter(
    (item) => item.colaboradorId === colaborador.id && alocacaoAberta(item)
  );
  const obrasDisponiveis = obras.filter(
    (obra) => !abertas.some((item) => item.obraId === obra.id)
  );
  const certificadosPessoa = certificados.filter(
    (item) => item.colaboradorId === colaborador.id
  );
  const documentosPessoa = documentosRh.filter(
    (item) => item.colaboradorId === colaborador.id
  );

  async function enviarArquivo(tipo: "certificado" | "rh", arquivo: File) {
    const dados = new FormData();
    dados.set("tipo", tipo);
    dados.set("colaboradorId", colaborador.id);
    dados.set("arquivo", arquivo);
    if (tipo === "certificado") {
      dados.set("cursoId", cursoId);
      dados.set("realizadoEm", realizadoEm);
      dados.set("validade", validade);
    } else {
      dados.set("identificacao", identificacao);
    }
    const resposta = await fetch("/api/gestao-plataformas/anexos", {
      method: "POST",
      body: dados,
    });
    const json = (await resposta.json()) as { error?: string; escopo?: { clienteId: string } };
    if (!resposta.ok) {
      window.alert(json.error || "Não foi possível guardar o arquivo.");
      return;
    }
    onRecarregar(json);
    if (tipo === "rh") setIdentificacao("");
  }

  async function abrirArquivo(tipo: "certificado" | "rh", id: string) {
    const resposta = await fetch(
      `/api/gestao-plataformas/anexos?tipo=${tipo}&id=${encodeURIComponent(id)}`
    );
    const json = (await resposta.json()) as { url?: string; error?: string };
    if (!resposta.ok || !json.url) {
      window.alert(json.error || "Não foi possível abrir o arquivo.");
      return;
    }
    window.open(json.url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-[#101D4A]/40" aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        className="absolute inset-0 flex flex-col bg-[#F3F6FD] shadow-2xl sidebar:inset-y-0 sidebar:left-auto sidebar:right-0 sidebar:w-[62%]"
      >
        <header className="flex items-center gap-3 px-4 py-4 sm:px-6">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#101D4A] shadow-sm">
            <IconePessoa className="h-6 w-6" />
          </span>
          <h2 id={tituloId} className="min-w-0 flex-1 text-lg font-semibold text-[#101D4A]">
            Ficha do colaborador
          </h2>
          <button
            ref={fecharRef}
            type="button"
            aria-label="Fechar ficha"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-2xl leading-none text-[#101D4A] hover:bg-white"
            onClick={onFechar}
          >
            ×
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-6 sm:px-6">
          <section className="overflow-hidden rounded-2xl border border-[#DCE5F4] border-t-[3px] border-t-[#C89219] bg-white shadow-sm">
            <div className="flex flex-col items-center sidebar:flex-row sidebar:items-stretch">
              <div className="flex w-full items-center justify-center px-4 py-5 sidebar:w-1/4 sidebar:border-r sidebar:border-[#DCE5F4]">
                <div className="h-28 w-28 overflow-hidden rounded-full sidebar:h-36 sidebar:w-36">
                  <RostoPadrao />
                </div>
              </div>
              <div className="w-full min-w-0 flex-1 px-4 pb-4 sidebar:px-6 sidebar:py-5">
                <p className="text-center text-xl font-bold text-[#101D4A] sidebar:text-left">
                  {colaborador.nome}
                </p>
                <dl className="mt-2">
                  <LinhaDado rotulo="CPF" valor={textoOuNaoInformado(colaborador.cpfMascarado)} />
                  <LinhaDado rotulo="Data de nascimento" valor="Não informado" />
                  <LinhaDado rotulo="Cargo" valor={textoOuNaoInformado(colaborador.cargo)} />
                </dl>
                <button type="button" className="btn mt-3" onClick={onEditarCadastro}>
                  Editar cadastro
                </button>
              </div>
            </div>
          </section>

          <div
            role="tablist"
            aria-label="Seções da ficha"
            className="flex gap-2 overflow-x-auto pb-1 sidebar:grid sidebar:grid-cols-4 sidebar:overflow-visible"
          >
            {ABAS.map((item) => {
              const ativa = aba === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  id={`ficha-aba-${item.id}`}
                  aria-selected={ativa}
                  aria-controls={`ficha-painel-${item.id}`}
                  className={`shrink-0 rounded-xl border px-3 py-2 text-sm sidebar:min-w-0 ${
                    ativa
                      ? "border-[#101D4A] bg-[#101D4A] font-bold text-white"
                      : "border-[#DCE5F4] bg-white font-medium text-[#101D4A]"
                  }`}
                  onClick={() => setAba(item.id)}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {aba === "obras" ? (
            <section
              role="tabpanel"
              id="ficha-painel-obras"
              aria-labelledby="ficha-aba-obras"
              className="rounded-2xl border border-[#DCE5F4] border-t-[3px] border-t-[#C89219] bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-[#101D4A]">Obras vinculadas</h3>
                <button
                  type="button"
                  className="rounded-xl bg-[#4945FF] px-4 py-2 text-sm font-semibold text-white shadow-md"
                  onClick={() => setEscolhendoObras((atual) => !atual)}
                >
                  Vincular a obras
                </button>
              </div>
              {escolhendoObras ? (
                <form
                  className="mt-3 space-y-2 rounded-xl border border-[#DCE5F4] p-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (obrasEscolhidas.length === 0) return;
                    onEnviar({
                      acao: "vincular",
                      colaboradorId: colaborador.id,
                      obraIds: obrasEscolhidas,
                    });
                    setObrasEscolhidas([]);
                    setEscolhendoObras(false);
                  }}
                >
                  {obrasDisponiveis.length === 0 ? (
                    <p className="text-sm text-slate-500">Não há outras obras para vincular.</p>
                  ) : (
                    obrasDisponiveis.map((obra) => (
                      <label key={obra.id} className="flex items-center gap-2 text-sm text-[#101D4A]">
                        <input
                          type="checkbox"
                          checked={obrasEscolhidas.includes(obra.id)}
                          onChange={() =>
                            setObrasEscolhidas((atual) =>
                              atual.includes(obra.id)
                                ? atual.filter((id) => id !== obra.id)
                                : [...atual, obra.id]
                            )
                          }
                        />
                        {obra.nome}
                        <span className="text-slate-500">
                          · {plataformas.find((item) => item.id === obra.plataformaId)?.nome ?? "Plataforma"}
                        </span>
                      </label>
                    ))
                  )}
                  <button
                    type="submit"
                    className="rounded-xl bg-[#4945FF] px-4 py-2 text-sm font-semibold text-white shadow-md disabled:opacity-60"
                    disabled={salvando || obrasEscolhidas.length === 0}
                  >
                    Confirmar vínculo
                  </button>
                </form>
              ) : null}
              <ul className="mt-3 divide-y divide-[#DCE5F4]">
                {abertas.map((alocacao) => {
                  const obra = obras.find((item) => item.id === alocacao.obraId);
                  const liberado = liberacoesAbertas.some(
                    (item) =>
                      item.obraId === alocacao.obraId && item.colaboradorId === colaborador.id
                  );
                  const plataformaId = plataformaDaObra(obras, alocacao.obraId);
                  return (
                    <li key={alocacao.id} className="flex items-center gap-3 py-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F3F6FD] text-[#101D4A]">
                        <IconeObra />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold text-[#101D4A]">
                          {obra?.nome ?? "Obra"}
                        </span>
                        <span className="block truncate text-sm text-slate-500">
                          {plataformas.find((item) => item.id === plataformaId)?.nome ?? "Plataforma"}
                        </span>
                      </span>
                      {liberado ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          <IconeOk />
                          Liberado
                        </span>
                      ) : (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                          <IconeRelogio />
                          Pendente
                        </span>
                      )}
                    </li>
                  );
                })}
                {abertas.length === 0 ? (
                  <li className="py-4 text-sm text-slate-500">Sem obra vinculada</li>
                ) : null}
              </ul>
            </section>
          ) : null}

          {aba === "exames" ? (
            <div role="tabpanel" id="ficha-painel-exames" aria-labelledby="ficha-aba-exames" className="space-y-3">
              {examesEstado === "carregando" ? (
                <p className="text-sm text-slate-500">Carregando exames…</p>
              ) : null}
              {examesEstado === "falha" ? (
                <p className="text-sm text-rose-700">{examesErro}</p>
              ) : null}
              <section className="rounded-2xl border border-[#DCE5F4] border-t-[3px] border-t-[#C89219] bg-white p-4 shadow-sm">
                <h3 className="font-semibold text-[#101D4A]">Próximos agendamentos</h3>
                {examesEstado === "ok" && proximos.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">Nenhum agendamento futuro para este colaborador.</p>
                ) : null}
                <ul className="mt-2 space-y-2">
                  {proximos.map((exame) => (
                    <li key={exame.id} className="text-sm text-[#101D4A]">
                      {exame.dataLabel} · {exame.tipoExame} · {exame.situacao}
                    </li>
                  ))}
                </ul>
              </section>
              <section className="rounded-2xl border border-[#DCE5F4] border-t-[3px] border-t-[#C89219] bg-white p-4 shadow-sm">
                <h3 className="font-semibold text-[#101D4A]">Exames realizados</h3>
                {examesEstado === "ok" && realizados.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">Nenhum exame realizado para este colaborador.</p>
                ) : null}
                <ul className="mt-2 space-y-2">
                  {realizados.map((exame) => (
                    <li key={exame.id} className="text-sm text-[#101D4A]">
                      {exame.dataLabel} · {exame.tipoExame} · {exame.situacao}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          ) : null}

          {aba === "cursos" ? (
            <section
              role="tabpanel"
              id="ficha-painel-cursos"
              aria-labelledby="ficha-aba-cursos"
              className="space-y-3 rounded-2xl border border-[#DCE5F4] border-t-[3px] border-t-[#C89219] bg-white p-4 shadow-sm"
            >
              <h3 className="font-semibold text-[#101D4A]">Cursos e certificados</h3>
              <form
                className="grid gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const arquivo = (event.currentTarget.elements.namedItem("certificado") as HTMLInputElement)
                    .files?.[0];
                  if (!arquivo) return;
                  void enviarArquivo("certificado", arquivo);
                  event.currentTarget.reset();
                  setCursoId("");
                  setRealizadoEm("");
                  setValidade("");
                }}
              >
                <select className={INPUT} value={cursoId} onChange={(event) => setCursoId(event.target.value)} required>
                  <option value="">Curso do catálogo</option>
                  {cursos.filter(cursoAtivo).map((curso) => (
                    <option key={curso.id} value={curso.id}>
                      {curso.nome}
                    </option>
                  ))}
                </select>
                <input className={INPUT} type="date" value={realizadoEm} onChange={(event) => setRealizadoEm(event.target.value)} required aria-label="Data de realização" />
                <input className={INPUT} type="date" value={validade} onChange={(event) => setValidade(event.target.value)} aria-label="Validade" />
                <input className={INPUT} name="certificado" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required aria-label="Certificado" />
                <button type="submit" className="rounded-xl bg-[#4945FF] px-4 py-2 text-sm font-semibold text-white shadow-md disabled:opacity-60" disabled={salvando}>
                  Registrar treinamento
                </button>
              </form>
              <ul className="space-y-2">
                {certificadosPessoa.map((item) => {
                  const curso = cursos.find((cursoItem) => cursoItem.id === item.cursoId);
                  return (
                    <li key={item.id} className="rounded-xl border border-[#DCE5F4] px-3 py-2 text-sm">
                      <p className="font-semibold text-[#101D4A]">{curso?.nome ?? "Curso"}</p>
                      <p className="text-xs text-slate-500">
                        {formatDateIsoToBR(item.realizadoEm)}
                        {item.validade ? ` · validade ${formatDateIsoToBR(item.validade)}` : " · validade não informada"}
                      </p>
                      {item.arquivoPath ? (
                        <button type="button" className="btn mt-2" onClick={() => void abrirArquivo("certificado", item.id)}>
                          Abrir certificado
                        </button>
                      ) : null}
                    </li>
                  );
                })}
                {certificadosPessoa.length === 0 ? (
                  <li className="text-sm text-slate-500">Nenhum curso registrado nesta ficha.</li>
                ) : null}
              </ul>
            </section>
          ) : null}

          {aba === "rh" ? (
            <section
              role="tabpanel"
              id="ficha-painel-rh"
              aria-labelledby="ficha-aba-rh"
              className="space-y-3 rounded-2xl border border-[#DCE5F4] border-t-[3px] border-t-[#C89219] bg-white p-4 shadow-sm"
            >
              <h3 className="font-semibold text-[#101D4A]">Documentos de RH</h3>
              <form
                className="grid gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const arquivo = (event.currentTarget.elements.namedItem("rh") as HTMLInputElement).files?.[0];
                  if (!arquivo) return;
                  void enviarArquivo("rh", arquivo);
                  event.currentTarget.reset();
                }}
              >
                <input className={INPUT} placeholder="Identificação do documento" value={identificacao} onChange={(event) => setIdentificacao(event.target.value)} required />
                <input className={INPUT} name="rh" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required aria-label="Arquivo de RH" />
                <button type="submit" className="rounded-xl bg-[#4945FF] px-4 py-2 text-sm font-semibold text-white shadow-md disabled:opacity-60" disabled={salvando}>
                  Anexar
                </button>
              </form>
              <form
                className="grid gap-2 border-t border-[#DCE5F4] pt-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  const identificacaoPedido = pedido.trim();
                  if (identificacaoPedido.length < 2) return;
                  onEnviar({
                    acao: "solicitar_documento",
                    colaboradorId: colaborador.id,
                    identificacao: identificacaoPedido,
                  });
                  setPedido("");
                }}
              >
                <input className={INPUT} placeholder="Documento a solicitar" value={pedido} onChange={(event) => setPedido(event.target.value)} required />
                <button type="submit" className="rounded-xl border border-[#DCE5F4] px-4 py-2 text-sm font-semibold text-[#101D4A] disabled:opacity-60" disabled={salvando}>
                  Solicitar documento
                </button>
              </form>
              <ul className="space-y-3">
                {documentosPessoa.map((item) => {
                  const historico = documentosRhEventos.filter((evento) => evento.documentoId === item.id);
                  const situacao = item.situacao || "recebido";
                  return (
                    <li key={item.id} className="rounded-xl border border-[#DCE5F4] px-3 py-2 text-sm">
                      <p className="font-semibold text-[#101D4A]">{item.identificacao}</p>
                      <p className="text-xs text-slate-500">
                        {SITUACAO_DOCUMENTO_RH_LABEL[situacao]}
                        {item.arquivoNome ? ` · ${item.arquivoNome}` : ""}
                      </p>
                      {item.observacao ? (
                        <p className="mt-1 text-xs text-amber-800">{item.observacao}</p>
                      ) : null}
                      {item.arquivoPath ? (
                        <button type="button" className="btn mt-2" onClick={() => void abrirArquivo("rh", item.id)}>
                          Abrir arquivo
                        </button>
                      ) : null}
                      {situacao === "recebido" ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="rounded-xl bg-[#101D4A] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                            disabled={salvando}
                            onClick={() => onEnviar({ acao: "conferir_documento", id: item.id })}
                          >
                            Conferir
                          </button>
                          <button
                            type="button"
                            className="rounded-xl border border-[#DCE5F4] px-3 py-1.5 text-xs font-semibold text-[#101D4A]"
                            onClick={() => {
                              setReenvioId(item.id);
                              setReenvioTexto("");
                            }}
                          >
                            Pedir reenvio
                          </button>
                        </div>
                      ) : null}
                      {reenvioId === item.id ? (
                        <form
                          className="mt-2 grid gap-2"
                          onSubmit={(event) => {
                            event.preventDefault();
                            onEnviar({
                              acao: "solicitar_reenvio",
                              id: item.id,
                              observacao: reenvioTexto,
                            });
                            setReenvioId(null);
                            setReenvioTexto("");
                          }}
                        >
                          <textarea
                            className="min-h-16 w-full rounded-xl border border-[#DCE5F4] px-3 py-2 text-sm"
                            value={reenvioTexto}
                            onChange={(event) => setReenvioTexto(event.target.value)}
                            placeholder="Observação visível para a AGROVIAS"
                            required
                          />
                          <button type="submit" className="rounded-xl bg-[#4945FF] px-3 py-1.5 text-xs font-semibold text-white" disabled={salvando}>
                            Enviar pedido de reenvio
                          </button>
                        </form>
                      ) : null}
                      {historico.length > 0 ? (
                        <ul className="mt-2 space-y-1 text-xs text-slate-500">
                          {historico.map((evento) => (
                            <li key={evento.id}>
                              {formatDateIsoToBR(evento.registradoEm.slice(0, 10))} · {SITUACAO_DOCUMENTO_RH_LABEL[evento.situacao]}
                              {evento.responsavel ? ` · ${evento.responsavel}` : ""}
                              {evento.observacao ? ` · ${evento.observacao}` : ""}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  );
                })}
                {documentosPessoa.length === 0 ? (
                  <li className="text-sm text-slate-500">Nenhum documento de RH nesta ficha.</li>
                ) : null}
              </ul>
            </section>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
