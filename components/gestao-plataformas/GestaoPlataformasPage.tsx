"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AdicionarColaboradorDialog,
  EditarColaboradorDialog,
} from "@/components/clientes/ClienteColaboradoresSection";
import { GestaoCursosAba } from "@/components/gestao-plataformas/GestaoCursosAba";
import { GestaoFichaPainel } from "@/components/gestao-plataformas/GestaoFichaPainel";
import { AppShell } from "@/components/layout/AppShell";
import { IconChecklist } from "@/components/ui/icons/OutlineIcons";
import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import {
  ABRANGENCIA_REQUISITO_LABEL,
  FILTRO_GESTAO_VAZIO,
  LIMITE_PLATAFORMAS_ATIVAS,
  SITUACAO_REQUISITO_LABEL,
  SITUACOES_REQUISITO,
  TIPO_REQUISITO_LABEL,
  TIPOS_REQUISITO,
  alocacaoAberta,
  colaboradoresSemObra,
  contagemEquipeObra,
  contarPlataformasAtivas,
  estadoListaColaboradores,
  obrasEmAtencao,
  filtrarObras,
  filtrarRequisitos,
  liberacoesVigentes,
  obrasMobilizacaoProxima,
  pendenciasAbertasDaObra,
  plataformaAtiva,
  plataformaDaObra,
  requisitosRecusados,
  requisitosVencendo,
  requisitoVencido,
  type AcaoGestaoPlataformas,
  type AbrangenciaRequisito,
  type AlocacaoRegistro,
  type CertificadoRegistro,
  type ColaboradorGestao,
  type CursoCatalogo,
  type DocumentoRhRegistro,
  type FiltroGestaoPlataformas,
  type LiberacaoRegistro,
  type ObraRegistro,
  type PlataformaRegistro,
  type RequisitoRegistro,
  type SituacaoRequisito,
  type TipoRequisito,
} from "@/lib/gestao-plataformas";
import type { ClienteColaboradorLinha } from "@/lib/portal-colaboradores";

type Aba = "visao" | "plataformas" | "colaboradores" | "cursos";
type CardAtivo = "mobilizacao" | "recusados" | "vencimentos" | "liberados" | null;

type EventoRequisito = {
  id: string;
  requisitoId: string;
  situacao: SituacaoRequisito;
  motivoRecusa: string | null;
  postadoEm: string | null;
  responsavel: string | null;
  observacao: string | null;
  registradoEm: string;
};

type AgendamentoVinculavel = {
  id: string;
  colaborador: string;
  data: string;
  aso: string;
};

type Painel = {
  escopo: {
    clienteId: string;
    clienteNome: string;
    orcamentoNumero: string;
  };
  hoje: string;
  responsavelSessao: string;
  plataformas: PlataformaRegistro[];
  obras: ObraRegistro[];
  alocacoes: AlocacaoRegistro[];
  requisitos: RequisitoRegistro[];
  eventos: EventoRequisito[];
  liberacoes: LiberacaoRegistro[];
  colaboradores: ClienteColaboradorLinha[];
  cursos: CursoCatalogo[];
  certificados: CertificadoRegistro[];
  documentosRh: DocumentoRhRegistro[];
  agendamentos: AgendamentoVinculavel[];
};

type Selecao = { tipo: "obra" | "colaborador"; id: string } | null;

type Formulario =
  | {
      tipo: "plataforma";
      id?: string;
      nome: string;
      linkAcesso: string;
    }
  | {
      tipo: "obra";
      id?: string;
      plataformaId: string;
      nome: string;
      empresaResponsavel: string;
      inicioPrevisto: string;
      responsavelAcompanhamento: string;
    }
  | { tipo: "vincular"; colaboradorId: string; obraIds: string[] }
  | {
      tipo: "requisito";
      id?: string;
      obraId: string;
      abrangencia: AbrangenciaRequisito;
      cargo: string;
      colaboradorId: string;
      tipoItem: TipoRequisito;
      titulo: string;
      recorrente: boolean;
      competencia: string;
      responsavel: string;
      prazo: string;
      validade: string;
      postadoEm: string;
      situacao: SituacaoRequisito;
      motivoRecusa: string;
      agendamentoId: string;
      certificadoId: string;
    }
  | {
      tipo: "liberar";
      obraId: string;
      colaboradorId: string;
      liberadoEm: string;
      responsavel: string;
    };

const SEM_PLATAFORMAS: PlataformaRegistro[] = [];
const SEM_OBRAS: ObraRegistro[] = [];
const SEM_ALOCACOES: AlocacaoRegistro[] = [];
const SEM_REQUISITOS: RequisitoRegistro[] = [];
const SEM_LIBERACOES: LiberacaoRegistro[] = [];
const SEM_COLABORADORES: ClienteColaboradorLinha[] = [];
const SEM_EVENTOS: EventoRequisito[] = [];

const INPUT =
  "h-10 w-full rounded-xl border border-[#e8edf5] bg-white px-3 text-sm text-[#0b1f4d] outline-none focus:border-[#c9972b]";

const ABAS: { id: Aba; label: string }[] = [
  { id: "visao", label: "Visão geral" },
  { id: "plataformas", label: "Plataformas e obras" },
  { id: "colaboradores", label: "Colaboradores" },
  { id: "cursos", label: "Cursos" },
];

function classeSituacao(situacao: SituacaoRequisito, vencido: boolean): string {
  if (vencido) return "bg-orange-50 text-orange-800 ring-orange-200";
  if (situacao === "aprovado") return "bg-emerald-50 text-emerald-800 ring-emerald-200";
  if (situacao === "recusado") return "bg-rose-50 text-rose-800 ring-rose-200";
  if (situacao === "enviado") return "bg-indigo-50 text-indigo-800 ring-indigo-200";
  if (situacao === "pronto_para_postar") return "bg-sky-50 text-sky-800 ring-sky-200";
  return "bg-amber-50 text-amber-800 ring-amber-200";
}

function Selo({
  children,
  className,
}: {
  children: string;
  className: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${className}`}
    >
      {children}
    </span>
  );
}

function nomePlataforma(
  plataformas: readonly PlataformaRegistro[],
  id: string
): string {
  return plataformas.find((item) => item.id === id)?.nome ?? "Plataforma";
}

function nomeObra(obras: readonly ObraRegistro[], id: string): string {
  return obras.find((item) => item.id === id)?.nome ?? "Obra";
}

function nomeColaborador(
  colaboradores: readonly ColaboradorGestao[],
  id: string
): string {
  return colaboradores.find((item) => item.id === id)?.nome ?? "Colaborador";
}

export function GestaoPlataformasPage() {
  const [painel, setPainel] = useState<Painel | null>(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [aba, setAba] = useState<Aba>("visao");
  const [filtro, setFiltro] = useState<FiltroGestaoPlataformas>(FILTRO_GESTAO_VAZIO);
  const [card, setCard] = useState<CardAtivo>(null);
  const [selecionado, setSelecionado] = useState<Selecao>(null);
  const [formulario, setFormulario] = useState<Formulario | null>(null);
  const [incluirColaborador, setIncluirColaborador] = useState(false);
  const [editarColaborador, setEditarColaborador] = useState(false);

  const carregar = useCallback(async () => {
    const posicao = window.scrollY;
    setCarregando(true);
    setErro("");
    try {
      const resposta = await fetch("/api/gestao-plataformas", {
        cache: "no-store",
      });
      const json = (await resposta.json()) as Painel & { error?: string };
      if (!resposta.ok) {
        setErro(json.error || "Não foi possível carregar a página.");
        setPainel(null);
        return;
      }
      setPainel(json);
    } catch {
      setErro("Não foi possível carregar a página.");
    } finally {
      setCarregando(false);
      requestAnimationFrame(() => window.scrollTo(0, posicao));
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function enviar(acao: AcaoGestaoPlataformas) {
    setSalvando(true);
    setErro("");
    try {
      const resposta = await fetch("/api/gestao-plataformas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(acao),
      });
      const json = (await resposta.json()) as Painel & { error?: string };
      if (!resposta.ok) {
        setErro(json.error || "Não foi possível concluir a operação.");
        return;
      }
      if (json.escopo) setPainel(json);
      setFormulario(null);
    } catch {
      setErro("Não foi possível concluir a operação.");
    } finally {
      setSalvando(false);
    }
  }

  const hoje = painel?.hoje ?? "";
  const plataformas = painel?.plataformas ?? SEM_PLATAFORMAS;
  const obras = painel?.obras ?? SEM_OBRAS;
  const alocacoes = painel?.alocacoes ?? SEM_ALOCACOES;
  const requisitos = painel?.requisitos ?? SEM_REQUISITOS;
  const liberacoes = painel?.liberacoes ?? SEM_LIBERACOES;
  const colaboradores = painel?.colaboradores ?? SEM_COLABORADORES;
  const eventos = painel?.eventos ?? SEM_EVENTOS;

  const ativas = contarPlataformasAtivas(plataformas);
  const mobilizacoes = useMemo(
    () => (hoje ? obrasMobilizacaoProxima(obras, hoje) : []),
    [obras, hoje]
  );
  const recusados = useMemo(() => requisitosRecusados(requisitos), [requisitos]);
  const vencimentos = useMemo(
    () => (hoje ? requisitosVencendo(requisitos, hoje) : []),
    [requisitos, hoje]
  );
  const liberados = useMemo(
    () => liberacoesVigentes({ liberacoes, alocacoes }),
    [liberacoes, alocacoes]
  );
  const semObra = useMemo(
    () => colaboradoresSemObra({ colaboradores, alocacoes }),
    [colaboradores, alocacoes]
  );

  const obrasLista = useMemo(() => {
    if (!hoje) return [];
    return filtrarObras({
      obras,
      plataformas,
      filtro,
      hoje,
      somenteMobilizacao: card === "mobilizacao",
    });
  }, [obras, plataformas, filtro, hoje, card]);

  const requisitosLista = useMemo(() => {
    if (!hoje) return [];
    return filtrarRequisitos({
      requisitos,
      obras,
      filtro,
      hoje,
      somenteRecusados: card === "recusados",
      somenteVencendo: card === "vencimentos",
    });
  }, [requisitos, obras, filtro, hoje, card]);

  const colaboradoresLista = useMemo(() => {
    const busca = filtro.busca.trim().toLocaleLowerCase();
    return colaboradores.filter((colaborador) => {
      const abertas = alocacoes.filter(
        (alocacao) =>
          alocacao.colaboradorId === colaborador.id && alocacaoAberta(alocacao)
      );
      if (filtro.situacao === "sem_obra" && abertas.length > 0) return false;
      if (filtro.situacao === "liberado") {
        const liberado = liberados.some(
          (item) => item.colaboradorId === colaborador.id
        );
        if (!liberado) return false;
      }
      if (filtro.plataformaId) {
        const obrasDaPlataforma = new Set(
          obras
            .filter((obra) => obra.plataformaId === filtro.plataformaId)
            .map((obra) => obra.id)
        );
        if (!abertas.some((alocacao) => obrasDaPlataforma.has(alocacao.obraId))) {
          return false;
        }
      }
      if (
        filtro.obraId &&
        !abertas.some((alocacao) => alocacao.obraId === filtro.obraId)
      ) {
        return false;
      }
      if (filtro.colaboradorId && colaborador.id !== filtro.colaboradorId) {
        return false;
      }
      if (!busca) return true;
      return `${colaborador.nome} ${colaborador.cargo}`
        .toLocaleLowerCase()
        .includes(busca);
    });
  }, [colaboradores, alocacoes, filtro, obras, liberados]);

  const liberadosLista = useMemo(() => {
    return liberados.filter((liberacao) => {
      const obra = obras.find((item) => item.id === liberacao.obraId);
      if (filtro.plataformaId && obra?.plataformaId !== filtro.plataformaId) {
        return false;
      }
      if (filtro.obraId && liberacao.obraId !== filtro.obraId) return false;
      if (
        filtro.colaboradorId &&
        liberacao.colaboradorId !== filtro.colaboradorId
      ) {
        return false;
      }
      const nome = nomeColaborador(colaboradores, liberacao.colaboradorId);
      const busca = filtro.busca.trim().toLocaleLowerCase();
      if (!busca) return true;
      return `${nome} ${obra?.nome ?? ""}`.toLocaleLowerCase().includes(busca);
    });
  }, [liberados, obras, filtro, colaboradores]);

  function abrirCard(proximo: Exclude<CardAtivo, null>) {
    setCard(proximo);
    setSelecionado(null);
    setFormulario(null);
    if (proximo === "mobilizacao") {
      setAba("plataformas");
      setFiltro(FILTRO_GESTAO_VAZIO);
      return;
    }
    if (proximo === "recusados") {
      setAba("plataformas");
      setFiltro({ ...FILTRO_GESTAO_VAZIO, situacao: "recusado" });
      return;
    }
    if (proximo === "vencimentos") {
      setAba("plataformas");
      setFiltro({ ...FILTRO_GESTAO_VAZIO, vencimento: "30" });
      return;
    }
    setAba("colaboradores");
    setFiltro({ ...FILTRO_GESTAO_VAZIO, situacao: "liberado" });
  }

  function mudarFiltro(parcial: Partial<FiltroGestaoPlataformas>) {
    if (Object.keys(parcial).some((chave) => chave !== "busca")) {
      setCard(null);
    }
    setFiltro((atual) => ({ ...atual, ...parcial }));
  }

  const obraSelecionada =
    selecionado?.tipo === "obra"
      ? obras.find((obra) => obra.id === selecionado.id) ?? null
      : null;
  const colaboradorSelecionado =
    selecionado?.tipo === "colaborador"
      ? colaboradores.find((item) => item.id === selecionado.id) ?? null
      : null;

  return (
    <AppShell
      title="Gestão de Plataformas — AGROVIAS"
      subtitle={
        painel
          ? `${painel.escopo.clienteNome} · ${painel.escopo.orcamentoNumero}`
          : "Mobilização, documentos de SST e liberações por obra."
      }
      icon={<IconChecklist size={20} />}
    >
      <div className="space-y-4">
        {erro ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {erro}
          </p>
        ) : null}

        <div className="flex gap-2 overflow-x-auto pb-1">
          {ABAS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${
                aba === item.id
                  ? "bg-[#0b1f4d] text-white"
                  : "bg-white text-[#0b1f4d] ring-1 ring-[#e8edf5]"
              }`}
              onClick={() => setAba(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {carregando && !painel ? (
          <p className="text-sm text-slate-500">Carregando a AGROVIAS…</p>
        ) : null}

        {painel && aba === "visao" ? (
          <Visao
            ativas={ativas}
            mobilizacoes={mobilizacoes.length}
            recusados={recusados.length}
            vencimentos={vencimentos.length}
            liberados={liberados.length}
            obras={obras}
            plataformas={plataformas}
            alocacoes={alocacoes}
            liberacoes={liberacoes}
            requisitos={requisitos}
            hoje={hoje}
            onCard={abrirCard}
            onObra={(id) => setSelecionado({ tipo: "obra", id })}
          />
        ) : null}

        {painel && aba !== "visao" && aba !== "cursos" ? (
          <Filtros
            filtro={filtro}
            card={card}
            plataformas={plataformas}
            obras={obras}
            colaboradores={colaboradores}
            aba={aba}
            onChange={mudarFiltro}
            onLimparCard={() => {
              setCard(null);
              setFiltro(FILTRO_GESTAO_VAZIO);
            }}
          />
        ) : null}

        {painel && formulario ? (
          <FormularioPainel
            formulario={formulario}
            painel={painel}
            salvando={salvando}
            onChange={setFormulario}
            onCancelar={() => setFormulario(null)}
            onEnviar={(acao) => void enviar(acao)}
          />
        ) : null}

        {painel && aba === "plataformas" ? (
          <ListaPlataformas
            plataformas={plataformas}
            obras={obrasLista}
            alocacoes={alocacoes}
            liberacoes={liberacoes}
            requisitos={requisitos}
            hoje={hoje}
            salvando={salvando}
            somenteObras={card === "mobilizacao"}
            onNova={() =>
              setFormulario({ tipo: "plataforma", nome: "", linkAcesso: "" })
            }
            onNovaObra={() =>
              setFormulario({
                tipo: "obra",
                plataformaId: plataformas.find(plataformaAtiva)?.id ?? "",
                nome: "",
                empresaResponsavel: "",
                inicioPrevisto: hoje,
                responsavelAcompanhamento: painel.responsavelSessao,
              })
            }
            onEditar={(plataforma) =>
              setFormulario({
                tipo: "plataforma",
                id: plataforma.id,
                nome: plataforma.nome,
                linkAcesso: plataforma.linkAcesso,
              })
            }
            onArquivar={(plataforma) => {
              if (!plataforma.arquivadaEm && !window.confirm(`Arquivar ${plataforma.nome}? O histórico permanece.`)) {
                return;
              }
              void enviar(
                plataforma.arquivadaEm
                  ? { acao: "reativar_plataforma", id: plataforma.id }
                  : { acao: "arquivar_plataforma", id: plataforma.id }
              );
            }}
            onObra={(id) => setSelecionado({ tipo: "obra", id })}
            onEditarObra={(obra) =>
              setFormulario({
                tipo: "obra",
                id: obra.id,
                plataformaId: obra.plataformaId,
                nome: obra.nome,
                empresaResponsavel: obra.empresaResponsavel,
                inicioPrevisto: obra.inicioPrevisto ?? hoje,
                responsavelAcompanhamento: obra.responsavelAcompanhamento,
              })
            }
          />
        ) : null}

        {painel && aba === "colaboradores" ? (
          <ListaColaboradores
            pessoas={
              filtro.situacao === "liberado" ? [] : colaboradoresLista
            }
            liberacoes={filtro.situacao === "liberado" ? liberadosLista : []}
            modoLiberados={filtro.situacao === "liberado"}
            colaboradores={colaboradores}
            obras={obras}
            plataformas={plataformas}
            alocacoes={alocacoes}
            semObra={semObra}
            onPessoa={(id) => setSelecionado({ tipo: "colaborador", id })}
            onNovo={() => setIncluirColaborador(true)}
            estadoLista={estadoListaColaboradores({
              carregando: carregando && !painel,
              falha: Boolean(erro) && !painel,
              totalCadastro: colaboradores.length,
              totalFiltrado:
                filtro.situacao === "liberado"
                  ? liberadosLista.length
                  : colaboradoresLista.length,
            })}
            onVincular={() =>
              setFormulario({
                tipo: "vincular",
                colaboradorId: "",
                obraIds: [],
              })
            }
          />
        ) : null}

        {painel && aba === "plataformas" && (card === "recusados" || card === "vencimentos") ? (
          <ListaDocumentos
            requisitos={requisitosLista}
            obras={obras}
            colaboradores={colaboradores}
            hoje={hoje}
            onAbrirObra={(id) => setSelecionado({ tipo: "obra", id })}
            onNovo={() =>
              setFormulario({
                tipo: "requisito",
                obraId: filtro.obraId || obras[0]?.id || "",
                abrangencia: "equipe",
                cargo: "",
                colaboradorId: "",
                tipoItem: "documento_sst",
                titulo: "",
                recorrente: false,
                competencia: hoje.slice(0, 7),
                responsavel: painel.responsavelSessao,
                prazo: "",
                validade: "",
                postadoEm: "",
                situacao: "pendente",
                motivoRecusa: "",
                agendamentoId: "",
                certificadoId: "",
              })
            }
          />
        ) : null}

        {painel && aba === "cursos" ? (
          <GestaoCursosAba
            cursos={painel.cursos}
            salvando={salvando}
            onEnviar={(acao) => void enviar(acao)}
          />
        ) : null}
      </div>

      {painel && (obraSelecionada || colaboradorSelecionado) ? (
        <GestaoFichaPainel
          hoje={hoje}
          responsavelSessao={painel.responsavelSessao}
          obra={obraSelecionada}
          colaborador={colaboradorSelecionado}
          plataformas={plataformas}
          obras={obras}
          alocacoes={alocacoes}
          requisitos={requisitos}
          liberacoesAbertas={liberados.map((item) => ({
            obraId: item.obraId,
            colaboradorId: item.colaboradorId,
          }))}
          cursos={painel.cursos}
          certificados={painel.certificados}
          documentosRh={painel.documentosRh}
          eventos={eventos}
          colaboradores={colaboradores}
          salvando={salvando}
          escBloqueado={incluirColaborador || editarColaborador}
          onFechar={() => {
            const id = selecionado?.tipo === "colaborador" ? selecionado.id : null;
            setSelecionado(null);
            if (!id) return;
            requestAnimationFrame(() => {
              document
                .querySelector<HTMLElement>(`[data-ficha-colaborador="${CSS.escape(id)}"]`)
                ?.focus();
            });
          }}
          onEnviar={(acao) => void enviar(acao)}
          onRecarregar={(json) => {
            if (json.escopo) setPainel(json as Painel);
          }}
          onEditarCadastro={() => setEditarColaborador(true)}
          onNovoRequisito={(obraId) =>
            setFormulario({
              tipo: "requisito",
              obraId,
              abrangencia: "equipe",
              cargo: "",
              colaboradorId: "",
              tipoItem: "documento_sst",
              titulo: "",
              recorrente: false,
              competencia: hoje.slice(0, 7),
              responsavel: painel.responsavelSessao,
              prazo: "",
              validade: "",
              postadoEm: "",
              situacao: "pendente",
              motivoRecusa: "",
              agendamentoId: "",
              certificadoId: "",
            })
          }
        />
      ) : null}
      {painel && incluirColaborador ? (
        <AdicionarColaboradorDialog
          clienteId={painel.escopo.clienteId}
          empresaNome={painel.escopo.clienteNome}
          onClose={() => setIncluirColaborador(false)}
          onDone={() => {
            setIncluirColaborador(false);
            void carregar();
          }}
        />
      ) : null}
      {painel && editarColaborador && colaboradorSelecionado ? (
        <EditarColaboradorDialog
          clienteId={painel.escopo.clienteId}
          empresaNome={painel.escopo.clienteNome}
          row={colaboradorSelecionado}
          onClose={() => setEditarColaborador(false)}
          onDone={() => {
            setEditarColaborador(false);
            void carregar();
          }}
        />
      ) : null}
    </AppShell>
  );
}

function Visao({
  ativas,
  mobilizacoes,
  recusados,
  vencimentos,
  liberados,
  obras,
  plataformas,
  alocacoes,
  liberacoes,
  requisitos,
  hoje,
  onCard,
  onObra,
}: {
  ativas: number;
  mobilizacoes: number;
  recusados: number;
  vencimentos: number;
  liberados: number;
  obras: ObraRegistro[];
  plataformas: PlataformaRegistro[];
  alocacoes: AlocacaoRegistro[];
  liberacoes: LiberacaoRegistro[];
  requisitos: RequisitoRegistro[];
  hoje: string;
  onCard: (card: Exclude<CardAtivo, null>) => void;
  onObra: (id: string) => void;
}) {
  const ordenadas = obrasEmAtencao({ obras, requisitos, hoje });
  const cards: {
    id: Exclude<CardAtivo, null>;
    titulo: string;
    valor: string;
  }[] = [
    { id: "mobilizacao", titulo: "Mobilizações próximas", valor: String(mobilizacoes) },
    { id: "recusados", titulo: "Documentos recusados", valor: String(recusados) },
    {
      id: "vencimentos",
      titulo: "Vencimentos nos próximos 30 dias",
      valor: String(vencimentos),
    },
    {
      id: "liberados",
      titulo: "Colaboradores liberados por obra",
      valor: String(liberados),
    },
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[#e8edf5] border-t-2 border-t-[#c9972b] bg-white p-4">
        <p className="text-sm text-slate-500">Plataformas ativas</p>
        <p className="mt-1 text-3xl font-semibold text-[#0b1f4d]">
          {ativas} de {LIMITE_PLATAFORMAS_ATIVAS}
        </p>
      </section>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {cards.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onCard(item.id)}
            className="rounded-2xl border border-[#e8edf5] bg-white p-4 text-left shadow-sm transition hover:border-[#c9972b]"
          >
            <p className="text-sm text-slate-500">{item.titulo}</p>
            <p className="mt-1 text-xl font-semibold text-[#0b1f4d]">
              {item.valor}
            </p>
          </button>
        ))}
      </div>
      <section className="overflow-hidden rounded-2xl border border-[#e8edf5] bg-white">
        <header className="border-b border-[#e8edf5] px-4 py-3">
          <h2 className="text-sm font-semibold text-[#0b1f4d]">
            Obras que precisam de atenção
          </h2>
        </header>
        <ul className="divide-y divide-[#e8edf5]">
          {ordenadas.length === 0 ? (
            <li className="px-4 py-6 text-sm text-slate-500">
              Nenhuma obra com mobilização próxima ou pendência.
            </li>
          ) : (
            ordenadas.map((obra) => {
              const equipe = contagemEquipeObra(alocacoes, liberacoes, obra.id);
              const pendencias = pendenciasAbertasDaObra(requisitos, obra.id, hoje);
              return (
                <li key={obra.id}>
                  <button
                    type="button"
                    className="flex w-full flex-col gap-1 px-4 py-3 text-left hover:bg-[#f8f6f1] sm:flex-row sm:items-center sm:justify-between"
                    onClick={() => onObra(obra.id)}
                  >
                    <span>
                      <span className="block font-medium text-[#0b1f4d]">
                        {obra.nome}
                      </span>
                      <span className="text-xs text-slate-500">
                        {nomePlataforma(plataformas, obra.plataformaId)} ·{" "}
                        {formatDateIsoToBR(obra.inicioPrevisto)}
                      </span>
                    </span>
                    <span className="text-xs text-slate-600">
                      {equipe.liberados}/{equipe.vinculados} liberados · {pendencias} pendências
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </section>
    </div>
  );
}

function Filtros({
  filtro,
  card,
  plataformas,
  obras,
  colaboradores,
  aba,
  onChange,
  onLimparCard,
}: {
  filtro: FiltroGestaoPlataformas;
  card: CardAtivo;
  plataformas: PlataformaRegistro[];
  obras: ObraRegistro[];
  colaboradores: ColaboradorGestao[];
  aba: Aba;
  onChange: (parcial: Partial<FiltroGestaoPlataformas>) => void;
  onLimparCard: () => void;
}) {
  return (
    <div className="space-y-2 rounded-2xl border border-[#e8edf5] bg-white p-3">
      {card ? (
        <button
          type="button"
          className="rounded-full bg-[#0b1f4d] px-3 py-1 text-xs text-white"
          onClick={onLimparCard}
        >
          Filtro do card ativo · limpar
        </button>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <input
          className={INPUT}
          placeholder="Buscar"
          value={filtro.busca}
          onChange={(event) => onChange({ busca: event.target.value })}
        />
        <select
          className={INPUT}
          value={filtro.plataformaId}
          onChange={(event) => onChange({ plataformaId: event.target.value })}
        >
          <option value="">Todas as plataformas</option>
          {plataformas.map((plataforma) => (
            <option key={plataforma.id} value={plataforma.id}>
              {plataforma.nome}
            </option>
          ))}
        </select>
        <select
          className={INPUT}
          value={filtro.obraId}
          onChange={(event) => onChange({ obraId: event.target.value })}
        >
          <option value="">Todas as obras</option>
          {obras.map((obra) => (
            <option key={obra.id} value={obra.id}>
              {obra.nome}
            </option>
          ))}
        </select>
        {aba !== "plataformas" ? (
          <select
            className={INPUT}
            value={filtro.colaboradorId}
            onChange={(event) => onChange({ colaboradorId: event.target.value })}
          >
            <option value="">Todos os colaboradores</option>
            {colaboradores.map((colaborador) => (
              <option key={colaborador.id} value={colaborador.id}>
                {colaborador.nome}
              </option>
            ))}
          </select>
        ) : null}
        {aba === "colaboradores" ? (
          <select
            className={INPUT}
            value={filtro.situacao}
            onChange={(event) =>
              onChange({
                situacao: event.target.value as FiltroGestaoPlataformas["situacao"],
              })
            }
          >
            <option value="">Situação da alocação</option>
            <option value="sem_obra">Sem obra vinculada</option>
            <option value="liberado">Liberados</option>
          </select>
        ) : null}
        {aba === "plataformas" ? (
          <>
            <select
              className={INPUT}
              value={
                filtro.situacao === "sem_obra" || filtro.situacao === "liberado"
                  ? ""
                  : filtro.situacao
              }
              onChange={(event) =>
                onChange({
                  situacao: event.target.value as FiltroGestaoPlataformas["situacao"],
                })
              }
            >
              <option value="">Situação</option>
              {SITUACOES_REQUISITO.map((situacao) => (
                <option key={situacao} value={situacao}>
                  {SITUACAO_REQUISITO_LABEL[situacao]}
                </option>
              ))}
              <option value="vencido">Vencido</option>
            </select>
            <select
              className={INPUT}
              value={filtro.vencimento}
              onChange={(event) =>
                onChange({
                  vencimento: event.target.value as FiltroGestaoPlataformas["vencimento"],
                })
              }
            >
              <option value="">Vencimento</option>
              <option value="30">Próximos 30 dias</option>
              <option value="vencido">Vencidos</option>
            </select>
          </>
        ) : null}
      </div>
    </div>
  );
}

function ListaPlataformas({
  plataformas,
  obras,
  alocacoes,
  liberacoes,
  requisitos,
  hoje,
  salvando,
  somenteObras = false,
  onNova,
  onNovaObra,
  onEditar,
  onArquivar,
  onObra,
  onEditarObra,
}: {
  plataformas: PlataformaRegistro[];
  obras: ObraRegistro[];
  alocacoes: AlocacaoRegistro[];
  liberacoes: LiberacaoRegistro[];
  requisitos: RequisitoRegistro[];
  hoje: string;
  salvando: boolean;
  somenteObras?: boolean;
  onNova: () => void;
  onNovaObra: () => void;
  onEditar: (plataforma: PlataformaRegistro) => void;
  onArquivar: (plataforma: PlataformaRegistro) => void;
  onObra: (id: string) => void;
  onEditarObra: (obra: ObraRegistro) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary" onClick={onNova}>
          Nova plataforma
        </button>
        <button type="button" className="btn" onClick={onNovaObra}>
          Nova obra
        </button>
      </div>
      {somenteObras ? null : (
      <section className="overflow-hidden rounded-2xl border border-[#e8edf5] bg-white">
        <ul className="divide-y divide-[#e8edf5]">
          {plataformas.map((plataforma) => (
            <li key={plataforma.id} className="px-4 py-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-medium text-[#0b1f4d]">{plataforma.nome}</p>
                  <a
                    href={plataforma.linkAcesso}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-[#384393] underline"
                  >
                    {plataforma.linkAcesso}
                  </a>
                  <div className="mt-1">
                    {plataforma.arquivadaEm ? (
                      <Selo className="bg-slate-100 text-slate-600 ring-slate-200">
                        Arquivada
                      </Selo>
                    ) : (
                      <Selo className="bg-emerald-50 text-emerald-800 ring-emerald-200">
                        Ativa
                      </Selo>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" className="btn" onClick={() => onEditar(plataforma)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn"
                    disabled={salvando}
                    onClick={() => onArquivar(plataforma)}
                  >
                    {plataforma.arquivadaEm ? "Reativar" : "Arquivar"}
                  </button>
                </div>
              </div>
            </li>
          ))}
          {plataformas.length === 0 ? (
            <li className="px-4 py-6 text-sm text-slate-500">
              Nenhuma plataforma cadastrada. O limite é de {LIMITE_PLATAFORMAS_ATIVAS} ativas.
            </li>
          ) : null}
        </ul>
      </section>
      )}
      <section className="overflow-hidden rounded-2xl border border-[#e8edf5] bg-white">
        <ul className="divide-y divide-[#e8edf5]">
          {obras.map((obra) => {
            const equipe = contagemEquipeObra(alocacoes, liberacoes, obra.id);
            return (
              <li key={obra.id} className="px-4 py-3">
                <button
                  type="button"
                  className="text-left"
                  onClick={() => onObra(obra.id)}
                >
                  <p className="font-medium text-[#0b1f4d]">{obra.nome}</p>
                  <p className="text-xs text-slate-500">
                    {nomePlataforma(plataformas, obra.plataformaId)} ·{" "}
                    {obra.empresaResponsavel} · início{" "}
                    {formatDateIsoToBR(obra.inicioPrevisto)} · {equipe.vinculados}{" "}
                    vinculados · {equipe.liberados} liberados ·{" "}
                    {pendenciasAbertasDaObra(requisitos, obra.id, hoje)} pendências
                  </p>
                </button>
                <button
                  type="button"
                  className="btn mt-2"
                  onClick={() => onEditarObra(obra)}
                >
                  Editar obra
                </button>
              </li>
            );
          })}
          {obras.length === 0 ? (
            <li className="px-4 py-6 text-sm text-slate-500">
              Nenhuma obra neste filtro.
            </li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}

function ListaColaboradores({
  pessoas,
  liberacoes,
  modoLiberados,
  colaboradores,
  obras,
  plataformas,
  alocacoes,
  semObra,
  onPessoa,
  onNovo,
  estadoLista,
  onVincular,
}: {
  pessoas: ColaboradorGestao[];
  liberacoes: LiberacaoRegistro[];
  modoLiberados: boolean;
  colaboradores: ColaboradorGestao[];
  obras: ObraRegistro[];
  plataformas: PlataformaRegistro[];
  alocacoes: AlocacaoRegistro[];
  semObra: ColaboradorGestao[];
  onPessoa: (id: string) => void;
  onNovo: () => void;
  estadoLista: ReturnType<typeof estadoListaColaboradores>;
  onVincular: () => void;
}) {
  const semObraIds = new Set(semObra.map((item) => item.id));
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          A lista usa o mesmo cadastro de Clientes → Colaboradores.
        </p>
        <div className="flex shrink-0 gap-2">
          <button type="button" className="btn btn-primary" onClick={onNovo}>
            Novo colaborador
          </button>
          <button type="button" className="btn" onClick={onVincular}>
            Vincular a obras
          </button>
        </div>
      </div>
      <section className="overflow-hidden rounded-2xl border border-[#e8edf5] bg-white">
        <ul className="divide-y divide-[#e8edf5]">
          {modoLiberados
            ? liberacoes.map((liberacao) => {
                const obra = obras.find((item) => item.id === liberacao.obraId);
                return (
                  <li key={liberacao.id}>
                    <button
                      type="button"
                      data-ficha-colaborador={liberacao.colaboradorId}
                      className="w-full px-4 py-3 text-left hover:bg-[#f8f6f1]"
                      onClick={() => onPessoa(liberacao.colaboradorId)}
                    >
                      <p className="font-medium text-[#0b1f4d]">
                        {nomeColaborador(colaboradores, liberacao.colaboradorId)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {obra?.nome ?? "Obra"} ·{" "}
                        {obra
                          ? nomePlataforma(plataformas, obra.plataformaId)
                          : ""}{" "}
                        · liberado em {formatDateIsoToBR(liberacao.liberadoEm)} por{" "}
                        {liberacao.responsavel}
                      </p>
                    </button>
                  </li>
                );
              })
            : pessoas.map((pessoa) => {
                const abertas = alocacoes.filter(
                  (alocacao) =>
                    alocacao.colaboradorId === pessoa.id &&
                    alocacaoAberta(alocacao)
                );
                return (
                  <li key={pessoa.id}>
                    <button
                      type="button"
                      data-ficha-colaborador={pessoa.id}
                      className="w-full px-4 py-3 text-left hover:bg-[#f8f6f1]"
                      onClick={() => onPessoa(pessoa.id)}
                    >
                      <p className="font-medium text-[#0b1f4d]">{pessoa.nome}</p>
                      <p className="text-xs text-slate-500">
                        {pessoa.cargo || "Sem função"} · {pessoa.situacaoLabel}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {semObraIds.has(pessoa.id) ? (
                          <Selo className="bg-amber-50 text-amber-800 ring-amber-200">
                            Sem obra vinculada
                          </Selo>
                        ) : (
                          abertas.map((alocacao) => {
                            const obra = obras.find((item) => item.id === alocacao.obraId);
                            return (
                              <Selo
                                key={alocacao.id}
                                className="bg-[#f8f6f1] text-[#0b1f4d] ring-[#e6d7b0]"
                              >
                                {obra
                                  ? `${obra.nome} · ${nomePlataforma(plataformas, obra.plataformaId)}`
                                  : "Obra"}
                              </Selo>
                            );
                          })
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
          {estadoLista === "vazio" ? (
            <li className="px-4 py-6 text-sm text-slate-500">
              Nenhum colaborador cadastrado para a AGROVIAS.
            </li>
          ) : null}
          {estadoLista === "sem_resultado" ? (
            <li className="px-4 py-6 text-sm text-slate-500">
              Nenhum colaborador neste filtro.
            </li>
          ) : null}
          {estadoLista === "falha" ? (
            <li className="px-4 py-6 text-sm text-rose-700">
              Não foi possível carregar os colaboradores.
            </li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}

function ListaDocumentos({
  requisitos,
  obras,
  colaboradores,
  hoje,
  onAbrirObra,
  onNovo,
}: {
  requisitos: RequisitoRegistro[];
  obras: ObraRegistro[];
  colaboradores: ColaboradorGestao[];
  hoje: string;
  onAbrirObra: (id: string) => void;
  onNovo: () => void;
}) {
  return (
    <div className="space-y-3">
      <button type="button" className="btn btn-primary" onClick={onNovo}>
        Novo requisito
      </button>
      <section className="overflow-hidden rounded-2xl border border-[#e8edf5] bg-white">
        <ul className="divide-y divide-[#e8edf5]">
          {requisitos.map((requisito) => {
            const vencido = requisitoVencido(requisito, hoje);
            return (
              <li key={requisito.id}>
                <button
                  type="button"
                  className="w-full px-4 py-3 text-left hover:bg-[#f8f6f1]"
                  onClick={() => onAbrirObra(requisito.obraId)}
                >
                  <p className="font-medium text-[#0b1f4d]">{requisito.titulo}</p>
                  <p className="text-xs text-slate-500">
                    {TIPO_REQUISITO_LABEL[requisito.tipo]} ·{" "}
                    {ABRANGENCIA_REQUISITO_LABEL[requisito.abrangencia]} ·{" "}
                    {nomeObra(obras, requisito.obraId)}
                    {requisito.colaboradorId
                      ? ` · ${nomeColaborador(colaboradores, requisito.colaboradorId)}`
                      : ""}
                    {requisito.competencia ? ` · ${requisito.competencia}` : ""}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Selo className={classeSituacao(requisito.situacao, false)}>
                      {SITUACAO_REQUISITO_LABEL[requisito.situacao]}
                    </Selo>
                    {vencido ? (
                      <Selo className={classeSituacao(requisito.situacao, true)}>
                        Vencido
                      </Selo>
                    ) : null}
                  </div>
                </button>
              </li>
            );
          })}
          {requisitos.length === 0 ? (
            <li className="px-4 py-6 text-sm text-slate-500">
              Nenhum curso, exame ou documento de SST neste filtro.
            </li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}

function FormularioPainel({
  formulario,
  painel,
  salvando,
  onChange,
  onCancelar,
  onEnviar,
}: {
  formulario: Formulario;
  painel: Painel;
  salvando: boolean;
  onChange: (formulario: Formulario) => void;
  onCancelar: () => void;
  onEnviar: (acao: AcaoGestaoPlataformas) => void;
}) {
  return (
    <form
      className="space-y-3 rounded-2xl border border-[#e8edf5] border-t-2 border-t-[#c9972b] bg-white p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (formulario.tipo === "plataforma") {
          onEnviar({
            acao: "salvar_plataforma",
            id: formulario.id,
            nome: formulario.nome,
            linkAcesso: formulario.linkAcesso,
          });
        } else if (formulario.tipo === "obra") {
          onEnviar({
            acao: "salvar_obra",
            id: formulario.id,
            plataformaId: formulario.plataformaId,
            nome: formulario.nome,
            empresaResponsavel: formulario.empresaResponsavel,
            inicioPrevisto: formulario.inicioPrevisto,
            responsavelAcompanhamento: formulario.responsavelAcompanhamento,
          });
        } else if (formulario.tipo === "vincular") {
          onEnviar({
            acao: "vincular",
            colaboradorId: formulario.colaboradorId,
            obraIds: formulario.obraIds,
          });
        } else if (formulario.tipo === "requisito") {
          onEnviar({
            acao: "salvar_requisito",
            id: formulario.id,
            obraId: formulario.obraId,
            abrangencia: formulario.abrangencia,
            cargo: formulario.cargo || null,
            colaboradorId: formulario.colaboradorId || null,
            tipo: formulario.tipoItem,
            titulo: formulario.titulo,
            recorrente: formulario.recorrente,
            competencia: formulario.recorrente ? formulario.competencia : null,
            responsavel: formulario.responsavel || null,
            prazo: formulario.prazo || null,
            validade: formulario.validade || null,
            postadoEm: formulario.postadoEm || null,
            situacao: formulario.situacao,
            motivoRecusa: formulario.motivoRecusa || null,
            agendamentoId: formulario.agendamentoId || null,
            certificadoId: formulario.certificadoId || null,
          });
        } else {
          onEnviar({
            acao: "liberar",
            obraId: formulario.obraId,
            colaboradorId: formulario.colaboradorId,
            liberadoEm: formulario.liberadoEm,
            responsavel: formulario.responsavel,
          });
        }
      }}
    >
      <h2 className="text-sm font-semibold text-[#0b1f4d]">
        {formulario.tipo === "plataforma"
          ? formulario.id
            ? "Editar plataforma"
            : "Nova plataforma"
          : formulario.tipo === "obra"
            ? formulario.id
              ? "Editar obra"
              : "Nova obra"
            : formulario.tipo === "vincular"
              ? "Vincular colaborador às obras"
              : formulario.tipo === "liberar"
                ? "Registrar liberação"
                : "Requisito de SST"}
      </h2>
      {formulario.tipo === "plataforma" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            className={INPUT}
            placeholder="Nome"
            value={formulario.nome}
            onChange={(event) =>
              onChange({ ...formulario, nome: event.target.value })
            }
          />
          <input
            className={INPUT}
            placeholder="https://plataforma.exemplo"
            value={formulario.linkAcesso}
            onChange={(event) =>
              onChange({ ...formulario, linkAcesso: event.target.value })
            }
          />
        </div>
      ) : null}
      {formulario.tipo === "obra" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <select
            className={INPUT}
            value={formulario.plataformaId}
            onChange={(event) =>
              onChange({ ...formulario, plataformaId: event.target.value })
            }
          >
            <option value="">Plataforma</option>
            {painel.plataformas.map((plataforma) => (
              <option key={plataforma.id} value={plataforma.id}>
                {plataforma.nome}
                {plataforma.arquivadaEm ? " (arquivada)" : ""}
              </option>
            ))}
          </select>
          <input
            className={INPUT}
            placeholder="Nome da obra"
            value={formulario.nome}
            onChange={(event) =>
              onChange({ ...formulario, nome: event.target.value })
            }
          />
          <input
            className={INPUT}
            placeholder="Empresa responsável pela obra"
            value={formulario.empresaResponsavel}
            onChange={(event) =>
              onChange({ ...formulario, empresaResponsavel: event.target.value })
            }
          />
          <input
            className={INPUT}
            type="date"
            value={formulario.inicioPrevisto}
            onChange={(event) =>
              onChange({ ...formulario, inicioPrevisto: event.target.value })
            }
          />
          <input
            className={INPUT}
            placeholder="Responsável pelo acompanhamento"
            value={formulario.responsavelAcompanhamento}
            onChange={(event) =>
              onChange({
                ...formulario,
                responsavelAcompanhamento: event.target.value,
              })
            }
          />
        </div>
      ) : null}
      {formulario.tipo === "vincular" ? (
        <div className="space-y-2">
          <select
            className={INPUT}
            value={formulario.colaboradorId}
            onChange={(event) =>
              onChange({ ...formulario, colaboradorId: event.target.value })
            }
          >
            <option value="">Colaborador da AGROVIAS</option>
            {painel.colaboradores.map((colaborador) => (
              <option key={colaborador.id} value={colaborador.id}>
                {colaborador.nome} · {colaborador.situacaoLabel}
              </option>
            ))}
          </select>
          <div className="grid gap-2 sm:grid-cols-2">
            {painel.obras.map((obra) => {
              const marcada = formulario.obraIds.includes(obra.id);
              return (
                <label
                  key={obra.id}
                  className="flex items-start gap-2 rounded-xl border border-[#e8edf5] px-3 py-2 text-sm text-[#0b1f4d]"
                >
                  <input
                    type="checkbox"
                    checked={marcada}
                    onChange={() =>
                      onChange({
                        ...formulario,
                        obraIds: marcada
                          ? formulario.obraIds.filter((id) => id !== obra.id)
                          : [...formulario.obraIds, obra.id],
                      })
                    }
                  />
                  <span>
                    {obra.nome}
                    <span className="block text-xs text-slate-500">
                      {nomePlataforma(painel.plataformas, obra.plataformaId)}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ) : null}
      {formulario.tipo === "requisito" ? (
        <RequisitoCampos
          formulario={formulario}
          painel={painel}
          onChange={onChange}
        />
      ) : null}
      {formulario.tipo === "liberar" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            className={INPUT}
            type="date"
            value={formulario.liberadoEm}
            onChange={(event) =>
              onChange({ ...formulario, liberadoEm: event.target.value })
            }
          />
          <input
            className={INPUT}
            placeholder="Responsável"
            value={formulario.responsavel}
            onChange={(event) =>
              onChange({ ...formulario, responsavel: event.target.value })
            }
          />
        </div>
      ) : null}
      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary" disabled={salvando}>
          Salvar
        </button>
        <button type="button" className="btn" onClick={onCancelar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function RequisitoCampos({
  formulario,
  painel,
  onChange,
}: {
  formulario: Extract<Formulario, { tipo: "requisito" }>;
  painel: Painel;
  onChange: (formulario: Formulario) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <select
        className={INPUT}
        value={formulario.obraId}
        onChange={(event) =>
          onChange({ ...formulario, obraId: event.target.value })
        }
      >
        <option value="">Obra</option>
        {painel.obras.map((obra) => (
          <option key={obra.id} value={obra.id}>
            {obra.nome}
          </option>
        ))}
      </select>
      <select
        className={INPUT}
        value={formulario.abrangencia}
        onChange={(event) =>
          onChange({
            ...formulario,
            abrangencia: event.target.value as AbrangenciaRequisito,
          })
        }
      >
        {Object.entries(ABRANGENCIA_REQUISITO_LABEL).map(([valor, rotulo]) => (
          <option key={valor} value={valor}>
            {rotulo}
          </option>
        ))}
      </select>
      <select
        className={INPUT}
        value={formulario.tipoItem}
        onChange={(event) =>
          onChange({
            ...formulario,
            tipoItem: event.target.value as TipoRequisito,
          })
        }
      >
        {TIPOS_REQUISITO.map((tipo) => (
          <option key={tipo} value={tipo}>
            {TIPO_REQUISITO_LABEL[tipo]}
          </option>
        ))}
      </select>
      <input
        className={INPUT}
        placeholder="Título"
        value={formulario.titulo}
        onChange={(event) =>
          onChange({ ...formulario, titulo: event.target.value })
        }
      />
      {formulario.abrangencia === "funcao" ? (
        <input
          className={INPUT}
          placeholder="Função"
          value={formulario.cargo}
          onChange={(event) =>
            onChange({ ...formulario, cargo: event.target.value })
          }
        />
      ) : null}
      {formulario.abrangencia === "colaborador" ? (
        <select
          className={INPUT}
          value={formulario.colaboradorId}
          onChange={(event) =>
            onChange({ ...formulario, colaboradorId: event.target.value })
          }
        >
          <option value="">Colaborador</option>
          {painel.colaboradores.map((colaborador) => (
            <option key={colaborador.id} value={colaborador.id}>
              {colaborador.nome}
            </option>
          ))}
        </select>
      ) : null}
      <input
        className={INPUT}
        placeholder="Responsável"
        value={formulario.responsavel}
        onChange={(event) =>
          onChange({ ...formulario, responsavel: event.target.value })
        }
      />
      <label className="text-xs text-slate-500">
        Prazo
        <input
          className={INPUT}
          type="date"
          value={formulario.prazo}
          onChange={(event) =>
            onChange({ ...formulario, prazo: event.target.value })
          }
        />
      </label>
      <label className="text-xs text-slate-500">
        Validade
        <input
          className={INPUT}
          type="date"
          value={formulario.validade}
          onChange={(event) =>
            onChange({ ...formulario, validade: event.target.value })
          }
        />
      </label>
      <label className="text-xs text-slate-500">
        Data de postagem
        <input
          className={INPUT}
          type="date"
          value={formulario.postadoEm}
          onChange={(event) =>
            onChange({ ...formulario, postadoEm: event.target.value })
          }
        />
      </label>
      <select
        className={INPUT}
        value={formulario.situacao}
        onChange={(event) =>
          onChange({
            ...formulario,
            situacao: event.target.value as SituacaoRequisito,
          })
        }
      >
        {SITUACOES_REQUISITO.map((situacao) => (
          <option key={situacao} value={situacao}>
            {SITUACAO_REQUISITO_LABEL[situacao]}
          </option>
        ))}
      </select>
      {formulario.situacao === "recusado" ? (
        <input
          className={INPUT}
          placeholder="Motivo da recusa"
          value={formulario.motivoRecusa}
          onChange={(event) =>
            onChange({ ...formulario, motivoRecusa: event.target.value })
          }
        />
      ) : null}
      <label className="flex items-center gap-2 text-sm text-[#0b1f4d]">
        <input
          type="checkbox"
          checked={formulario.recorrente}
          onChange={(event) =>
            onChange({ ...formulario, recorrente: event.target.checked })
          }
        />
        Entrega recorrente
      </label>
      {formulario.recorrente ? (
        <input
          className={INPUT}
          placeholder="Competência AAAA-MM"
          value={formulario.competencia}
          onChange={(event) =>
            onChange({ ...formulario, competencia: event.target.value })
          }
        />
      ) : null}
      <select
        className={INPUT}
        value={formulario.agendamentoId}
        onChange={(event) =>
          onChange({ ...formulario, agendamentoId: event.target.value })
        }
      >
        <option value="">Sem exame vinculado</option>
        {painel.agendamentos.map((agendamento) => (
          <option key={agendamento.id} value={agendamento.id}>
            {formatDateIsoToBR(agendamento.data)} · {agendamento.colaborador} ·{" "}
            {agendamento.aso}
          </option>
        ))}
      </select>
    </div>
  );
}
