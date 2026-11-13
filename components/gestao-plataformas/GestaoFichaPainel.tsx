"use client";

import { useEffect, useState } from "react";
import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import {
  ABRANGENCIA_REQUISITO_LABEL,
  SITUACAO_REQUISITO_LABEL,
  SITUACOES_REQUISITO,
  TIPO_REQUISITO_LABEL,
  alocacaoAberta,
  cursoAtivo,
  plataformaDaObra,
  requisitoVencido,
  type AcaoGestaoPlataformas,
  type CertificadoRegistro,
  type CursoCatalogo,
  type DocumentoRhEvento,
  type DocumentoRhRegistro,
  type ObraRegistro,
  type PlataformaRegistro,
  type RequisitoRegistro,
  type SituacaoRequisito,
} from "@/lib/gestao-plataformas";
import type { ClienteColaboradorLinha } from "@/lib/portal-colaboradores";
import { GestaoFichaColaborador } from "@/components/gestao-plataformas/GestaoFichaColaborador";

const INPUT =
  "h-10 w-full rounded-xl border border-[#e8edf5] bg-white px-3 text-sm text-[#0b1f4d] outline-none focus:border-[#c9972b]";

type ExameRealizado = {
  id: string;
  dataLabel: string;
  tipoExame: string;
  situacao: string;
};

type Evento = {
  id: string;
  requisitoId: string;
  situacao: SituacaoRequisito;
  motivoRecusa: string | null;
  observacao: string | null;
  responsavel: string | null;
  registradoEm: string;
};

function Selo({ children, className }: { children: string; className: string }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${className}`}>
      {children}
    </span>
  );
}

function PainelObra({
  hoje,
  responsavelSessao,
  obra,
  colaborador,
  plataformas,
  obras,
  alocacoes,
  requisitos,
  liberacoesAbertas,
  cursos,
  certificados,
  documentosRh,
  eventos,
  colaboradores,
  salvando,
  onFechar,
  onEnviar,
  onRecarregar,
  onEditarCadastro,
  onNovoRequisito,
}: {
  hoje: string;
  responsavelSessao: string;
  obra: ObraRegistro | null;
  colaborador: ClienteColaboradorLinha | null;
  plataformas: PlataformaRegistro[];
  obras: ObraRegistro[];
  alocacoes: { id: string; obraId: string; colaboradorId: string; encerradaEm: string | null }[];
  requisitos: RequisitoRegistro[];
  liberacoesAbertas: { obraId: string; colaboradorId: string }[];
  cursos: CursoCatalogo[];
  certificados: CertificadoRegistro[];
  documentosRh: DocumentoRhRegistro[];
  documentosRhEventos?: DocumentoRhEvento[];
  eventos: Evento[];
  colaboradores: ClienteColaboradorLinha[];
  salvando: boolean;
  onFechar: () => void;
  onEnviar: (acao: AcaoGestaoPlataformas) => void;
  onRecarregar: (painel: { escopo?: { clienteId: string } }) => void;
  onEditarCadastro: () => void;
  onNovoRequisito: (obraId: string) => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [cursoId, setCursoId] = useState("");
  const [realizadoEm, setRealizadoEm] = useState(hoje);
  const [validade, setValidade] = useState("");
  const [identificacao, setIdentificacao] = useState("");
  const [exames, setExames] = useState<ExameRealizado[]>([]);
  const [examesEstado, setExamesEstado] = useState<"carregando" | "ok" | "falha">("ok");
  const [examesErro, setExamesErro] = useState("");

  useEffect(() => {
    if (!colaborador) return;
    let ativo = true;
    setExamesEstado("carregando");
    setExamesErro("");
    void fetch(
      `/api/gestao-plataformas/exames?colaboradorId=${encodeURIComponent(colaborador.id)}`,
      { cache: "no-store" }
    )
      .then(async (resposta) => {
        const json = (await resposta.json()) as { exames?: ExameRealizado[]; error?: string };
        if (!ativo) return;
        if (!resposta.ok) {
          setExamesEstado("falha");
          setExamesErro(json.error || "Não foi possível carregar os exames.");
          return;
        }
        setExames(json.exames ?? []);
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
  }, [colaborador]);

  const certificadosPessoa = certificados.filter(
    (item) => colaborador && item.colaboradorId === colaborador.id
  );
  const documentosPessoa = documentosRh.filter(
    (item) => colaborador && item.colaboradorId === colaborador.id
  );
  const alocacoesVisiveis = alocacoes.filter((item) =>
    obra ? item.obraId === obra.id : item.colaboradorId === colaborador?.id
  );
  const requisitosVisiveis = requisitos.filter((item) =>
    obra
      ? item.obraId === obra.id
      : alocacoesVisiveis.some((alocacao) => alocacao.obraId === item.obraId)
  );

  async function enviarArquivo(tipo: "certificado" | "rh", arquivo: File) {
    const dados = new FormData();
    dados.set("tipo", tipo);
    dados.set("colaboradorId", colaborador?.id ?? "");
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
    setIdentificacao("");
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
    <aside className="fixed inset-0 z-40 flex flex-col bg-white sidebar:inset-y-4 sidebar:left-auto sidebar:right-4 sidebar:w-[440px] sidebar:rounded-2xl sidebar:border sidebar:border-[#e8edf5] sidebar:shadow-xl">
      <header className="flex items-start justify-between gap-3 border-b border-[#e8edf5] px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-[#c9972b]">
            {obra ? "Obra" : "Colaborador"}
          </p>
          <h2 className="text-lg font-semibold text-[#0b1f4d]">
            {obra?.nome ?? colaborador?.nome}
          </h2>
          <p className="text-xs text-slate-500">
            {obra
              ? `${plataformas.find((item) => item.id === obra.plataformaId)?.nome ?? "Plataforma"} · ${obra.empresaResponsavel}`
              : `${colaborador?.cargo || "Sem função"} · ${colaborador?.situacaoLabel ?? ""}`}
          </p>
        </div>
        <button type="button" className="btn" onClick={onFechar}>
          Fechar
        </button>
      </header>
      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
        {colaborador ? (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-[#0b1f4d]">Dados cadastrais</h3>
            <p className="text-sm text-slate-600">
              {colaborador.cpfMascarado} · admissão{" "}
              {colaborador.dataAdmissaoLabel ?? "não informada"}
            </p>
            <button type="button" className="btn" onClick={onEditarCadastro}>
              Editar cadastro
            </button>
          </section>
        ) : null}

        {colaborador ? (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-[#0b1f4d]">Cursos e certificados</h3>
            <form
              className="grid gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const arquivo = (event.currentTarget.elements.namedItem("certificado") as HTMLInputElement)
                  .files?.[0];
                if (!arquivo) return;
                void enviarArquivo("certificado", arquivo);
                event.currentTarget.reset();
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
              <input className={INPUT} type="date" value={realizadoEm} onChange={(event) => setRealizadoEm(event.target.value)} required />
              <input className={INPUT} type="date" value={validade} onChange={(event) => setValidade(event.target.value)} />
              <input className={INPUT} name="certificado" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required />
              <button type="submit" className="btn btn-primary" disabled={salvando}>
                Registrar treinamento
              </button>
            </form>
            <ul className="space-y-2">
              {certificadosPessoa.map((item) => {
                const curso = cursos.find((cursoItem) => cursoItem.id === item.cursoId);
                return (
                  <li key={item.id} className="rounded-xl border border-[#e8edf5] px-3 py-2 text-sm">
                    <p className="font-medium text-[#0b1f4d]">{curso?.nome ?? "Curso"}</p>
                    <p className="text-xs text-slate-500">
                      {formatDateIsoToBR(item.realizadoEm)}
                      {item.validade ? ` · validade ${formatDateIsoToBR(item.validade)}` : ""}
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
                <li className="text-sm text-slate-500">Nenhum certificado nesta ficha.</li>
              ) : null}
            </ul>
          </section>
        ) : null}

        {colaborador ? (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-[#0b1f4d]">Exames realizados</h3>
            {examesEstado === "carregando" ? <p className="text-sm text-slate-500">Carregando exames…</p> : null}
            {examesEstado === "falha" ? <p className="text-sm text-rose-700">{examesErro}</p> : null}
            {examesEstado === "ok" && exames.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum exame realizado para este colaborador.</p>
            ) : null}
            <ul className="space-y-1 text-sm text-slate-600">
              {exames.map((exame) => (
                <li key={exame.id}>
                  {exame.dataLabel} · {exame.tipoExame} · {exame.situacao}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {colaborador ? (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-[#0b1f4d]">Documentos de RH</h3>
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
              <input className={INPUT} name="rh" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required />
              <button type="submit" className="btn" disabled={salvando}>Anexar</button>
            </form>
            <ul className="space-y-2">
              {documentosPessoa.map((item) => (
                <li key={item.id} className="text-sm">
                  <button type="button" className="text-left text-[#0b1f4d] underline" onClick={() => void abrirArquivo("rh", item.id)}>
                    {item.identificacao}
                  </button>
                  <p className="text-xs text-slate-500">
                    {formatDateIsoToBR(item.incluidoEm.slice(0, 10))} · {item.arquivoNome}
                  </p>
                </li>
              ))}
              {documentosPessoa.length === 0 ? (
                <li className="text-sm text-slate-500">Nenhum documento de RH anexado.</li>
              ) : null}
            </ul>
          </section>
        ) : null}

        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-[#0b1f4d]">Obras e plataformas</h3>
          {obra ? (
            <form
              className="space-y-2"
              onSubmit={(event) => {
                event.preventDefault();
                onEnviar({ acao: "vincular_lote", obraId: obra.id, colaboradorIds: selecionados });
                setSelecionados([]);
              }}
            >
              <div className="grid max-h-40 gap-1 overflow-y-auto">
                {colaboradores.map((pessoa) => (
                  <label key={pessoa.id} className="flex items-center gap-2 text-sm text-[#0b1f4d]">
                    <input
                      type="checkbox"
                      checked={selecionados.includes(pessoa.id)}
                      onChange={() =>
                        setSelecionados((atual) =>
                          atual.includes(pessoa.id)
                            ? atual.filter((id) => id !== pessoa.id)
                            : [...atual, pessoa.id]
                        )
                      }
                    />
                    {pessoa.nome}
                  </label>
                ))}
              </div>
              <button type="submit" className="btn btn-primary" disabled={salvando || selecionados.length === 0}>
                Vincular selecionados
              </button>
            </form>
          ) : null}
          <ul className="space-y-2">
            {alocacoesVisiveis.map((alocacao) => {
              const pessoa = colaboradores.find((item) => item.id === alocacao.colaboradorId);
              const obraAlocacao = obras.find((item) => item.id === alocacao.obraId);
              const aberta = alocacaoAberta(alocacao);
              const liberado = liberacoesAbertas.some(
                (item) => item.obraId === alocacao.obraId && item.colaboradorId === alocacao.colaboradorId
              );
              return (
                <li key={alocacao.id} className="rounded-xl border border-[#e8edf5] px-3 py-2 text-sm">
                  <p className="font-medium text-[#0b1f4d]">{obra ? pessoa?.nome : obraAlocacao?.nome}</p>
                  <p className="text-xs text-slate-500">
                    {plataformas.find((item) => item.id === plataformaDaObra(obras, alocacao.obraId))?.nome ?? "Plataforma"}
                    {aberta ? " · em aberto" : " · encerrada"}
                    {liberado ? " · liberado" : ""}
                  </p>
                  {aberta ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn"
                        onClick={() =>
                          onEnviar({
                            acao: "liberar",
                            obraId: alocacao.obraId,
                            colaboradorId: alocacao.colaboradorId,
                            liberadoEm: hoje,
                            responsavel: responsavelSessao,
                          })
                        }
                      >
                        Registrar liberação
                      </button>
                      <button
                        type="button"
                        className="btn"
                        disabled={salvando}
                        onClick={() => {
                          if (window.confirm("Encerrar esta alocação? O histórico permanece.")) {
                            onEnviar({ acao: "encerrar_alocacao", id: alocacao.id });
                          }
                        }}
                      >
                        Encerrar alocação
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
            {alocacoesVisiveis.length === 0 ? (
              <li className="text-sm text-slate-500">Sem obra vinculada.</li>
            ) : null}
          </ul>
        </section>

        {obra ? (
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-[#0b1f4d]">Checklist da obra</h3>
              <button type="button" className="btn" onClick={() => onNovoRequisito(obra.id)}>
                Novo requisito
              </button>
            </div>
            <ul className="space-y-2">
              {requisitosVisiveis.map((requisito) => (
                <li key={requisito.id} className="rounded-xl border border-[#e8edf5] px-3 py-2">
                  <p className="text-sm font-medium text-[#0b1f4d]">{requisito.titulo}</p>
                  <p className="text-xs text-slate-500">
                    {TIPO_REQUISITO_LABEL[requisito.tipo]} · {ABRANGENCIA_REQUISITO_LABEL[requisito.abrangencia]}
                    {requisito.validade ? ` · validade ${formatDateIsoToBR(requisito.validade)}` : ""}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Selo className="bg-slate-50 text-slate-700 ring-slate-200">
                      {SITUACAO_REQUISITO_LABEL[requisito.situacao]}
                    </Selo>
                    {requisitoVencido(requisito, hoje) ? (
                      <Selo className="bg-orange-50 text-orange-800 ring-orange-200">Vencido</Selo>
                    ) : null}
                  </div>
                  <select
                    className={`${INPUT} mt-2`}
                    value={requisito.certificadoId ?? ""}
                    onChange={(event) =>
                      onEnviar({
                        acao: "salvar_requisito",
                        id: requisito.id,
                        obraId: requisito.obraId,
                        abrangencia: requisito.abrangencia,
                        cargo: requisito.cargo,
                        colaboradorId: requisito.colaboradorId,
                        tipo: requisito.tipo,
                        titulo: requisito.titulo,
                        recorrente: requisito.recorrente,
                        competencia: requisito.competencia,
                        responsavel: requisito.responsavel,
                        prazo: requisito.prazo,
                        validade: requisito.validade,
                        postadoEm: requisito.postadoEm,
                        situacao: requisito.situacao,
                        motivoRecusa: requisito.motivoRecusa,
                        agendamentoId: requisito.agendamentoId,
                        certificadoId: event.target.value || null,
                      })
                    }
                  >
                    <option value="">Sem certificado da ficha</option>
                    {certificados
                      .filter((item) => !requisito.colaboradorId || item.colaboradorId === requisito.colaboradorId)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {cursos.find((curso) => curso.id === item.cursoId)?.nome ?? "Certificado"} · {formatDateIsoToBR(item.realizadoEm)}
                        </option>
                      ))}
                  </select>
                  <select
                    className={`${INPUT} mt-2`}
                    key={`${requisito.id}-${requisito.situacao}`}
                    defaultValue={requisito.situacao}
                    onChange={(event) => {
                      const situacao = event.target.value as SituacaoRequisito;
                      if (situacao === "recusado" && !motivo.trim()) {
                        window.alert("Informe o motivo da recusa.");
                        event.target.value = requisito.situacao;
                        return;
                      }
                      onEnviar({
                        acao: "situacao_requisito",
                        id: requisito.id,
                        situacao,
                        motivoRecusa: situacao === "recusado" ? motivo : null,
                        postadoEm: situacao === "enviado" || situacao === "aprovado" ? hoje : requisito.postadoEm,
                      });
                    }}
                  >
                    {SITUACOES_REQUISITO.map((situacao) => (
                      <option key={situacao} value={situacao}>
                        {SITUACAO_REQUISITO_LABEL[situacao]}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
              {requisitosVisiveis.length === 0 ? (
                <li className="text-sm text-slate-500">Nenhum requisito nesta obra.</li>
              ) : null}
            </ul>
            <input
              className={INPUT}
              placeholder="Motivo da recusa"
              value={motivo}
              onChange={(event) => setMotivo(event.target.value)}
            />
            <ul className="space-y-1 text-xs text-slate-600">
              {eventos
                .filter((evento) => requisitosVisiveis.some((item) => item.id === evento.requisitoId))
                .map((evento) => (
                  <li key={evento.id}>
                    {formatDateIsoToBR(evento.registradoEm.slice(0, 10))} · {SITUACAO_REQUISITO_LABEL[evento.situacao]}
                    {evento.observacao ? ` · ${evento.observacao}` : ""}
                    {evento.motivoRecusa ? ` · ${evento.motivoRecusa}` : ""}
                  </li>
                ))}
            </ul>
          </section>
        ) : null}
      </div>
    </aside>
  );
}

export function GestaoFichaPainel(
  props: Parameters<typeof PainelObra>[0] & { escBloqueado?: boolean }
) {
  if (props.colaborador && !props.obra) {
    return (
      <GestaoFichaColaborador
        colaborador={props.colaborador}
        plataformas={props.plataformas}
        obras={props.obras}
        alocacoes={props.alocacoes}
        liberacoesAbertas={props.liberacoesAbertas}
        cursos={props.cursos}
        certificados={props.certificados}
        documentosRh={props.documentosRh}
        documentosRhEventos={props.documentosRhEventos}
        salvando={props.salvando}
        escBloqueado={props.escBloqueado}
        onFechar={props.onFechar}
        onEnviar={props.onEnviar}
        onRecarregar={props.onRecarregar}
        onEditarCadastro={props.onEditarCadastro}
      />
    );
  }
  const { escBloqueado: _escBloqueado, ...obra } = props;
  return <PainelObra {...obra} />;
}
