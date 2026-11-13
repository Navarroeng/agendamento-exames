"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { formatDateIsoToBR } from "@/lib/agendamento-datetime";

type Colaborador = {
  id: string;
  nome: string;
  cargo: string;
  situacao: string;
  semObra: boolean;
};

type Documento = {
  id: string;
  identificacao: string;
  situacaoLabel: string;
  observacao: string | null;
  arquivoNome: string;
  podeEnviar: boolean;
  podeAbrir: boolean;
  historico: {
    id: string;
    situacao: string;
    observacao: string | null;
    responsavel: string | null;
    registradoEm: string;
  }[];
};

type Ficha = {
  colaborador: { id: string; nome: string; cargo: string };
  obras: { id: string; nome: string; plataforma: string; liberado: boolean }[];
  proximos: { id: string; dataLabel: string; horarioLabel: string; localLabel: string; tipoExame: string; situacao: string }[];
  realizados: { id: string; dataLabel: string; horarioLabel: string; localLabel: string; tipoExame: string; situacao: string }[];
  cursos: { id: string; nome: string; realizadoEm: string; validade: string | null }[];
  documentos: Documento[];
};

type Aba = "obras" | "agendamentos" | "cursos" | "rh";

const ABAS: { id: Aba; label: string }[] = [
  { id: "obras", label: "Obras e plataformas" },
  { id: "agendamentos", label: "Agendamentos" },
  { id: "cursos", label: "Cursos e certificados" },
  { id: "rh", label: "Documentos de RH" },
];

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

export function PortalAgroviasPage() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [fichaId, setFichaId] = useState<string | null>(null);
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [aba, setAba] = useState<Aba>("obras");
  const [enviando, setEnviando] = useState(false);
  const listaRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef(0);
  const tituloId = useId();
  const fecharRef = useRef<HTMLButtonElement>(null);

  async function carregarLista() {
    const resposta = await fetch("/api/portal-agrovias", { cache: "no-store" });
    const json = (await resposta.json()) as { colaboradores?: Colaborador[]; error?: string };
    if (!resposta.ok) throw new Error(json.error || "Não foi possível abrir os colaboradores.");
    setColaboradores(json.colaboradores ?? []);
  }

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    void carregarLista()
      .catch((falha: unknown) => {
        if (ativo) setErro(falha instanceof Error ? falha.message : "Não foi possível abrir os colaboradores.");
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, []);

  const fechar = useCallback(() => {
    const id = fichaId;
    setFichaId(null);
    setFicha(null);
    setAba("obras");
    requestAnimationFrame(() => {
      if (listaRef.current) listaRef.current.scrollTop = scrollRef.current;
      if (!id) return;
      document.querySelector<HTMLElement>(`[data-ficha-colaborador="${CSS.escape(id)}"]`)?.focus();
    });
  }, [fichaId]);

  useEffect(() => {
    if (!fichaId) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    fecharRef.current?.focus();
    return () => {
      document.body.style.overflow = anterior;
    };
  }, [fichaId]);

  useEffect(() => {
    if (!fichaId) return;
    function aoTeclar(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      fechar();
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [fichaId, fechar]);

  async function abrir(id: string) {
    scrollRef.current = listaRef.current?.scrollTop ?? 0;
    setFichaId(id);
    setAba("obras");
    setFicha(null);
    setErro("");
    const resposta = await fetch(`/api/portal-agrovias/ficha?colaboradorId=${encodeURIComponent(id)}`, {
      cache: "no-store",
    });
    const json = (await resposta.json()) as { ficha?: Ficha; error?: string };
    if (!resposta.ok || !json.ficha) {
      setErro(json.error || "Não foi possível abrir a ficha.");
      setFichaId(null);
      return;
    }
    setFicha(json.ficha);
  }

  async function enviar(documentoId: string, arquivo: File) {
    setEnviando(true);
    setErro("");
    const dados = new FormData();
    dados.set("documentoId", documentoId);
    dados.set("arquivo", arquivo);
    const resposta = await fetch("/api/portal-agrovias/documento", { method: "POST", body: dados });
    const json = (await resposta.json()) as { error?: string };
    setEnviando(false);
    if (!resposta.ok) {
      setErro(json.error || "Não foi possível enviar o documento.");
      return;
    }
    if (fichaId) await abrir(fichaId);
  }

  async function abrirArquivo(id: string) {
    const resposta = await fetch(`/api/portal-agrovias/arquivo?id=${encodeURIComponent(id)}`);
    const json = (await resposta.json()) as { url?: string; error?: string };
    if (!resposta.ok || !json.url) {
      setErro(json.error || "Não foi possível abrir o arquivo.");
      return;
    }
    window.open(json.url, "_blank", "noopener");
  }

  const termo = busca.trim().toLowerCase();
  const visiveis = colaboradores.filter((linha) => {
    if (!termo) return true;
    return `${linha.nome} ${linha.cargo}`.toLowerCase().includes(termo);
  });

  return (
    <AppShell title="Colaboradores" subtitle="Consulta e envio de documentos da AGROVIAS.">
      <div className="mx-auto max-w-5xl">
        <input
          className="mb-4 h-11 w-full rounded-2xl border border-[#DCE5F4] bg-white px-4 text-sm text-[#101D4A] outline-none focus:border-[#4945FF]"
          placeholder="Buscar por nome ou cargo"
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
          aria-label="Buscar por nome ou cargo"
        />
        {erro ? <p className="mb-3 text-sm text-rose-700">{erro}</p> : null}
        {carregando ? <p className="text-sm text-slate-500">Carregando colaboradores…</p> : null}
        <div ref={listaRef} className="max-h-[70vh] overflow-y-auto rounded-2xl border border-[#DCE5F4] bg-white">
          {visiveis.map((linha) => (
            <div key={linha.id} className="flex items-center justify-between gap-3 border-b border-[#DCE5F4] px-4 py-3 last:border-b-0">
              <div className="min-w-0">
                <button
                  type="button"
                  data-ficha-colaborador={linha.id}
                  className="truncate text-left font-semibold text-[#101D4A]"
                  onClick={() => void abrir(linha.id)}
                >
                  {linha.nome}
                </button>
                <p className="truncate text-sm text-slate-500">{linha.cargo || "Cargo não informado"}</p>
              </div>
              <span className="shrink-0 text-xs text-slate-500">
                {linha.semObra ? "Sem obra vinculada" : linha.situacao}
              </span>
            </div>
          ))}
          {!carregando && visiveis.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-500">Nenhum colaborador encontrado.</p>
          ) : null}
        </div>
      </div>

      {fichaId ? (
        <div className="fixed inset-0 z-40 bg-[#101D4A]/40">
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby={tituloId}
            className="absolute inset-0 flex flex-col bg-[#F3F6FD] shadow-2xl sidebar:inset-y-0 sidebar:left-auto sidebar:right-0 sidebar:w-[62%]"
          >
            <header className="flex items-center gap-3 px-4 py-4 sm:px-6">
              <span className="h-14 w-14 shrink-0 overflow-hidden rounded-full">
                <RostoPadrao />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id={tituloId} className="truncate text-lg font-semibold text-[#101D4A]">
                  {ficha?.colaborador.nome ?? "Ficha do colaborador"}
                </h2>
                <p className="truncate text-sm text-slate-500">{ficha?.colaborador.cargo || "Cargo não informado"}</p>
              </div>
              <button
                ref={fecharRef}
                type="button"
                aria-label="Fechar ficha"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-2xl leading-none text-[#101D4A] hover:bg-white"
                onClick={fechar}
              >
                ×
              </button>
            </header>
            <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-6 sm:px-6">
              {!ficha ? <p className="text-sm text-slate-500">Carregando ficha…</p> : null}
              {ficha ? (
                <>
                  <div role="tablist" aria-label="Seções da ficha" className="flex gap-2 overflow-x-auto pb-1 sidebar:grid sidebar:grid-cols-4">
                    {ABAS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        role="tab"
                        aria-selected={aba === item.id}
                        className={
                          aba === item.id
                            ? "shrink-0 rounded-xl bg-[#101D4A] px-3 py-2 text-sm font-bold text-white"
                            : "shrink-0 rounded-xl bg-white px-3 py-2 text-sm font-medium text-[#101D4A]"
                        }
                        onClick={() => setAba(item.id)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                  {aba === "obras" ? (
                    <section className="rounded-2xl border border-[#DCE5F4] border-t-[3px] border-t-[#C89219] bg-white p-4">
                      <h3 className="font-semibold text-[#101D4A]">Obras vinculadas</h3>
                      <ul className="mt-3 divide-y divide-[#DCE5F4]">
                        {ficha.obras.map((obra) => (
                          <li key={obra.id} className="flex items-center justify-between gap-3 py-3">
                            <span>
                              <span className="block font-bold text-[#101D4A]">{obra.nome}</span>
                              <span className="block text-sm text-slate-500">{obra.plataforma}</span>
                            </span>
                            <span className={obra.liberado ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700" : "rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800"}>
                              {obra.liberado ? "Liberado" : "Pendente"}
                            </span>
                          </li>
                        ))}
                        {ficha.obras.length === 0 ? <li className="py-4 text-sm text-slate-500">Sem obra vinculada</li> : null}
                      </ul>
                    </section>
                  ) : null}
                  {aba === "agendamentos" ? (
                    <div className="space-y-3">
                      <ListaExames titulo="Próximos agendamentos" linhas={ficha.proximos} vazio="Nenhum agendamento futuro." />
                      <ListaExames titulo="Exames realizados" linhas={ficha.realizados} vazio="Nenhum exame realizado." />
                    </div>
                  ) : null}
                  {aba === "cursos" ? (
                    <section className="rounded-2xl border border-[#DCE5F4] bg-white p-4">
                      <ul className="space-y-2">
                        {ficha.cursos.map((curso) => (
                          <li key={curso.id} className="text-sm">
                            <p className="font-semibold text-[#101D4A]">{curso.nome}</p>
                            <p className="text-xs text-slate-500">
                              {formatDateIsoToBR(curso.realizadoEm)}
                              {curso.validade ? ` · validade ${formatDateIsoToBR(curso.validade)}` : " · validade não informada"}
                            </p>
                          </li>
                        ))}
                        {ficha.cursos.length === 0 ? <li className="text-sm text-slate-500">Nenhum curso registrado.</li> : null}
                      </ul>
                    </section>
                  ) : null}
                  {aba === "rh" ? (
                    <section className="space-y-3 rounded-2xl border border-[#DCE5F4] border-t-[3px] border-t-[#C89219] bg-white p-4">
                      <h3 className="font-semibold text-[#101D4A]">Documentos de RH</h3>
                      <ul className="space-y-3">
                        {ficha.documentos.map((documento) => (
                          <li key={documento.id} className="rounded-xl border border-[#DCE5F4] px-3 py-2 text-sm">
                            <p className="font-semibold text-[#101D4A]">{documento.identificacao}</p>
                            <p className="text-xs text-slate-500">{documento.situacaoLabel}</p>
                            {documento.observacao ? <p className="mt-1 text-xs text-amber-800">{documento.observacao}</p> : null}
                            {documento.podeAbrir ? (
                              <button type="button" className="mt-2 text-xs font-semibold text-[#4945FF]" onClick={() => void abrirArquivo(documento.id)}>
                                Abrir arquivo
                              </button>
                            ) : null}
                            {documento.podeEnviar ? (
                              <form
                                className="mt-2 grid gap-2"
                                onSubmit={(event) => {
                                  event.preventDefault();
                                  const arquivo = (event.currentTarget.elements.namedItem("arquivo") as HTMLInputElement).files?.[0];
                                  if (!arquivo) return;
                                  void enviar(documento.id, arquivo);
                                  event.currentTarget.reset();
                                }}
                              >
                                <input name="arquivo" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required aria-label="Arquivo de RH" />
                                <button type="submit" className="rounded-xl bg-[#4945FF] px-3 py-2 text-xs font-semibold text-white shadow-md disabled:opacity-60" disabled={enviando}>
                                  Enviar documento
                                </button>
                              </form>
                            ) : null}
                            {documento.historico.length > 0 ? (
                              <ul className="mt-2 space-y-1 text-xs text-slate-500">
                                {documento.historico.map((evento) => (
                                  <li key={evento.id}>
                                    {formatDateIsoToBR(evento.registradoEm.slice(0, 10))} · {evento.situacao}
                                    {evento.responsavel ? ` · ${evento.responsavel}` : ""}
                                    {evento.observacao ? ` · ${evento.observacao}` : ""}
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </li>
                        ))}
                        {ficha.documentos.length === 0 ? <li className="text-sm text-slate-500">Nenhum documento solicitado.</li> : null}
                      </ul>
                    </section>
                  ) : null}
                </>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}
    </AppShell>
  );
}

function ListaExames({
  titulo,
  linhas,
  vazio,
}: {
  titulo: string;
  linhas: Ficha["proximos"];
  vazio: string;
}) {
  return (
    <section className="rounded-2xl border border-[#DCE5F4] bg-white p-4">
      <h3 className="font-semibold text-[#101D4A]">{titulo}</h3>
      <ul className="mt-2 space-y-2">
        {linhas.map((linha) => (
          <li key={linha.id} className="text-sm text-[#101D4A]">
            <span className="font-medium">{linha.dataLabel}</span>
            <span className="text-slate-500"> · {linha.horarioLabel} · {linha.localLabel} · {linha.tipoExame} · {linha.situacao}</span>
          </li>
        ))}
        {linhas.length === 0 ? <li className="text-sm text-slate-500">{vazio}</li> : null}
      </ul>
    </section>
  );
}
