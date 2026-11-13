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
  situacao: string;
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
      <circle cx="60" cy="46" r="16" fill="#F3D5BE" />
      <path d="M38 52c2-16 10-26 22-26s20 10 22 26c-6 4-14 6-22 6s-16-2-22-6z" fill="#6B3F2A" />
      <path d="M28 108c6-20 18-30 32-30s26 10 32 30" fill="#7FAF6A" />
      <circle cx="54" cy="48" r="1.8" fill="#101D4A" />
      <circle cx="66" cy="48" r="1.8" fill="#101D4A" />
      <path d="M55 56c1.8 2 3.4 2.8 5 2.8s3.2-.8 5-2.8" fill="none" stroke="#101D4A" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconePessoa() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="3" />
      <path d="M5.5 19c1.2-3 3.5-4.5 6.5-4.5s5.3 1.5 6.5 4.5" strokeLinecap="round" />
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
    const estreito = window.matchMedia("(max-width: 849px)").matches;
    if (estreito) document.body.style.overflow = "hidden";
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
    setErro("");
    setFicha(null);
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

  const conteudo = (
    <>
      <img
        src="/portal-agrovias/cabecalho-agrovias.png"
        alt="AGROVIAS Meio Ambiente e Paisagem"
        className="block h-[140px] w-full object-cover object-left sidebar:h-auto sidebar:object-fill"
      />
      <div className="px-4 pb-8 pt-4 sidebar:px-6">
        {erro ? <p className="mb-3 text-sm text-rose-700">{erro}</p> : null}
        <div className={fichaId ? "sidebar:grid sidebar:grid-cols-[320px_minmax(0,1fr)] sidebar:items-start sidebar:gap-4" : ""}>
          <section className="rounded-2xl border border-[#E6EAF2] bg-white shadow-sm">
            <div className="border-b border-[#E6EAF2] px-4 py-4">
              <h1 className="text-lg font-bold text-[#101D4A]">Colaboradores</h1>
              <label className="mt-3 flex h-10 items-center gap-2 rounded-xl border border-[#E6EAF2] px-3 text-sm text-slate-400">
                <span aria-hidden>⌕</span>
                <input
                  className="w-full bg-transparent text-[#101D4A] outline-none placeholder:text-slate-400"
                  placeholder="Buscar por nome ou cargo"
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  aria-label="Buscar por nome ou cargo"
                />
              </label>
            </div>
            <div ref={listaRef} className="max-h-[calc(100vh-280px)] overflow-y-auto">
              {carregando ? <p className="px-4 py-6 text-sm text-slate-500">Carregando colaboradores…</p> : null}
              {visiveis.map((linha) => {
                const selecionado = linha.id === fichaId;
                return (
                  <button
                    key={linha.id}
                    type="button"
                    data-ficha-colaborador={linha.id}
                    className={
                      selecionado
                        ? "flex w-full items-center gap-3 border-l-4 border-[#C4A15A] bg-[#FBF6E8] px-3 py-3 text-left"
                        : "flex w-full items-center gap-3 border-l-4 border-transparent px-3 py-3 text-left hover:bg-[#F8FAFC]"
                    }
                    onClick={() => void abrir(linha.id)}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F3F6FD] text-[#101D4A]">
                      <IconePessoa />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-[#101D4A]">{linha.nome}</span>
                      <span className="block truncate text-sm text-slate-500">{linha.cargo || "Cargo não informado"}</span>
                    </span>
                    <span className="shrink-0 text-slate-300" aria-hidden>›</span>
                  </button>
                );
              })}
              {!carregando && visiveis.length === 0 ? (
                <p className="px-4 py-6 text-sm text-slate-500">Nenhum colaborador encontrado.</p>
              ) : null}
            </div>
          </section>

          {fichaId ? (
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby={tituloId}
              className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-[#F4F7FB] sidebar:static sidebar:z-auto sidebar:max-h-[calc(100vh-230px)] sidebar:rounded-2xl sidebar:border sidebar:border-[#E6EAF2]"
            >
              <header className="px-4 py-4 sm:px-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 id={tituloId} className="text-lg font-bold text-[#101D4A]">
                    Ficha do colaborador
                  </h2>
                  <button
                    ref={fecharRef}
                    type="button"
                    aria-label="Fechar ficha"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-2xl leading-none text-[#101D4A] hover:bg-white"
                    onClick={fechar}
                  >
                    ×
                  </button>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <span className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-white">
                    <RostoPadrao />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-bold text-[#101D4A]">{ficha?.colaborador.nome ?? "Carregando…"}</p>
                    <p className="truncate text-sm text-slate-500">{ficha?.colaborador.cargo || "Cargo não informado"}</p>
                  </div>
                </div>
              </header>
              <div className="flex-1 space-y-4 px-4 pb-6 sm:px-5">
                {!ficha ? <p className="text-sm text-slate-500">Carregando ficha…</p> : null}
                {ficha ? (
                  <>
                    <div role="tablist" aria-label="Seções da ficha" className="flex gap-2 overflow-x-auto pb-1">
                      {ABAS.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          role="tab"
                          aria-selected={aba === item.id}
                          className={
                            aba === item.id
                              ? "shrink-0 rounded-full bg-[#101D4A] px-4 py-2 text-sm font-bold text-white"
                              : "shrink-0 rounded-full border border-[#E6EAF2] bg-white px-4 py-2 text-sm font-medium text-[#101D4A]"
                          }
                          onClick={() => setAba(item.id)}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                    {aba === "obras" ? <PainelObras ficha={ficha} /> : null}
                    {aba === "agendamentos" ? (
                      <div className="space-y-3">
                        <ListaExames titulo="Próximos agendamentos" linhas={ficha.proximos} vazio="Nenhum agendamento futuro." />
                        <ListaExames titulo="Exames realizados" linhas={ficha.realizados} vazio="Nenhum exame realizado." />
                      </div>
                    ) : null}
                    {aba === "cursos" ? <PainelCursos ficha={ficha} /> : null}
                    {aba === "rh" ? (
                      <PainelRh
                        ficha={ficha}
                        enviando={enviando}
                        onAbrir={(id) => void abrirArquivo(id)}
                        onEnviar={(id, arquivo) => void enviar(id, arquivo)}
                      />
                    ) : null}
                  </>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </>
  );

  return (
    <AppShell semTitulo title="Colaboradores" subtitle="Consulta e envio de documentos da AGROVIAS.">
      {conteudo}
    </AppShell>
  );
}

function PainelObras({ ficha }: { ficha: Ficha }) {
  return (
    <section className="rounded-2xl border border-[#E6EAF2] bg-white p-4">
      <h3 className="font-semibold text-[#101D4A]">Obras vinculadas</h3>
      <ul className="mt-3 divide-y divide-[#E6EAF2]">
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
  );
}

function PainelCursos({ ficha }: { ficha: Ficha }) {
  return (
    <section className="rounded-2xl border border-[#E6EAF2] bg-white p-4">
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
  );
}

function PainelRh({
  ficha,
  enviando,
  onAbrir,
  onEnviar,
}: {
  ficha: Ficha;
  enviando: boolean;
  onAbrir: (id: string) => void;
  onEnviar: (id: string, arquivo: File) => void;
}) {
  return (
    <section className="rounded-2xl border border-[#E6EAF2] bg-white p-4">
      <h3 className="font-semibold text-[#101D4A]">Documentos solicitados</h3>
      <ul className="mt-3 space-y-2">
        {ficha.documentos.map((documento) => (
          <li key={documento.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-[#E6EAF2] px-3 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F3F6FD] text-[#101D4A]" aria-hidden>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M7 3.5h7l5 5V20a1.5 1.5 0 0 1-1.5 1.5h-10.5A1.5 1.5 0 0 1 5.5 20V5A1.5 1.5 0 0 1 7 3.5z" />
                <path d="M14 3.5V9h5" />
              </svg>
            </span>
            <span className="min-w-0 flex-1 font-medium text-[#101D4A]">{documento.identificacao}</span>
            <StatusDocumento situacao={documento.situacao} label={documento.situacaoLabel} />
            {documento.podeAbrir ? (
              <button type="button" className="text-xs font-semibold text-[#4945FF]" onClick={() => onAbrir(documento.id)}>
                Abrir arquivo
              </button>
            ) : null}
            {documento.podeEnviar ? (
              <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#E6EAF2] bg-white px-3 py-1.5 text-xs font-semibold text-[#101D4A] shadow-sm">
                <span aria-hidden>↑</span>
                {documento.situacao === "reenvio_solicitado" ? "Reenviar arquivo" : "Anexar arquivo"}
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={enviando}
                  aria-label={documento.situacao === "reenvio_solicitado" ? "Reenviar arquivo" : "Anexar arquivo"}
                  onChange={(event) => {
                    const arquivo = event.currentTarget.files?.[0];
                    if (arquivo) onEnviar(documento.id, arquivo);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            ) : null}
            {documento.observacao ? (
              <p className="w-full text-xs text-amber-800">{documento.observacao}</p>
            ) : null}
          </li>
        ))}
        {ficha.documentos.length === 0 ? <li className="text-sm text-slate-500">Nenhum documento solicitado.</li> : null}
      </ul>
    </section>
  );
}

function StatusDocumento({ situacao, label }: { situacao: string; label: string }) {
  const classe =
    situacao === "conferido"
      ? "bg-emerald-50 text-emerald-700"
      : situacao === "reenvio_solicitado"
        ? "bg-orange-50 text-orange-700"
        : situacao === "recebido"
          ? "bg-sky-50 text-sky-800"
          : "bg-amber-50 text-amber-800";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${classe}`}>{label}</span>;
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
    <section className="rounded-2xl border border-[#E6EAF2] bg-white p-4">
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
