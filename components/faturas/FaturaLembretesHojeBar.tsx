"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { IconClock } from "@/components/ui/icons/OutlineIcons";
import { isEmailValido } from "@/lib/email-validacao";
import {
  FATURA_LEMBRETE_ENTREGA_NAO_CONFIRMADA,
  chaveEmpresaLembrete,
  explicacaoBotaoLembretesHoje,
  lembretesLoteBotaoHabilitado,
  montarConfirmacaoLembretesHoje,
  normalizarCompetenciaIso,
  previaLembretesVencidasAindaValida,
} from "@/lib/fatura-lembrete";
import { formatCurrency } from "@/lib/money";
import {
  consultarLembretesHojeCliente,
  enviarLembreteHojeCliente,
  type LembreteHojeItemCliente,
  type LembretesHojePainelCliente,
} from "@/services/fatura-lembrete.service";
import {
  FaturaLembreteListasConfirmacao,
  classeBotaoLembrete,
} from "./FaturaLembreteListasConfirmacao";

interface FaturaLembretesHojeBarProps {
  competencia: string;
  atualizarEm?: number;
  pagamentoEm?: number;
  bloqueado?: boolean;
  onOcupacaoChange?: (ocupado: boolean) => void;
  onEnviado: (params: {
    faturaId: string;
    enviadoEm: string;
    email: string;
  }) => void;
}

type Fase = "confirmar" | "enviando" | "resultado";

type ResultadoTela = {
  aceitos: LembreteHojeItemCliente[];
  semEmail: LembreteHojeItemCliente[];
  jaLembradas: LembreteHojeItemCliente[];
  falhas: LembreteHojeItemCliente[];
};

function itemDePendente(
  pendente: LembretesHojePainelCliente["pendentes"][number],
  tipo: LembreteHojeItemCliente["tipo"],
  motivo?: string
): LembreteHojeItemCliente {
  return {
    faturaId: pendente.id,
    numero: pendente.numero,
    empresa: pendente.empresa,
    valor: pendente.valor,
    tipo,
    email: pendente.email,
    motivo,
  };
}

export function FaturaLembretesHojeBar({
  competencia,
  atualizarEm = 0,
  pagamentoEm = 0,
  bloqueado = false,
  onOcupacaoChange,
  onEnviado,
}: FaturaLembretesHojeBarProps) {
  const [painel, setPainel] = useState<LembretesHojePainelCliente | null>(null);
  const [erroConsulta, setErroConsulta] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [aberto, setAberto] = useState(false);
  const [fase, setFase] = useState<Fase>("confirmar");
  const [andamento, setAndamento] = useState({ atual: 0, total: 0 });
  const [resultado, setResultado] = useState<ResultadoTela | null>(null);
  const [snapshot, setSnapshot] = useState<LembretesHojePainelCliente | null>(
    null
  );
  const enviandoRef = useRef(false);
  const pedidoRef = useRef(0);
  const competenciaIso = normalizarCompetenciaIso(competencia);
  const escopoRef = useRef({ competenciaIso, pagamentoEm });

  const carregar = useCallback(async () => {
    const iso = normalizarCompetenciaIso(competencia);
    if (!iso) {
      setPainel(null);
      setErroConsulta(null);
      setCarregando(false);
      return null;
    }
    const pedido = ++pedidoRef.current;
    setCarregando(true);
    setErroConsulta(null);
    try {
      const dados = await consultarLembretesHojeCliente(iso);
      if (pedido !== pedidoRef.current) return null;
      if (dados.competenciaIso !== iso) return null;
      setPainel(dados);
      return dados;
    } catch (err) {
      if (pedido !== pedidoRef.current) return null;
      setPainel(null);
      setErroConsulta(
        err instanceof Error
          ? err.message
          : "Não foi possível consultar as faturas que vencem hoje."
      );
      return null;
    } finally {
      if (pedido === pedidoRef.current) setCarregando(false);
    }
  }, [competencia]);

  useEffect(() => {
    if (fase === "enviando") return;
    setCarregando(true);
    setPainel(null);
    void carregar();
  }, [atualizarEm, pagamentoEm, carregar, fase]);

  useEffect(() => {
    const anterior = escopoRef.current;
    const competenciaMudou = anterior.competenciaIso !== competenciaIso;
    const pagamentoMudou = anterior.pagamentoEm !== pagamentoEm;
    escopoRef.current = { competenciaIso, pagamentoEm };
    if (!competenciaMudou && !pagamentoMudou) return;
    if (fase === "enviando") return;
    if (fase === "resultado" && !competenciaMudou) return;
    setSnapshot(null);
    setAberto(false);
  }, [competenciaIso, pagamentoEm, fase]);

  const pendentes = painel?.pendentes ?? [];
  const pendentesComEmail = pendentes.filter((item) =>
    isEmailValido(item.email)
  ).length;
  const habilitado = lembretesLoteBotaoHabilitado({
    bloqueado,
    carregando,
    erro: Boolean(erroConsulta),
    enviando: fase === "enviando",
    pendentesComEmail,
  });
  const explicacao = bloqueado
    ? "Outro lote de lembretes está em andamento."
    : !competenciaIso
      ? "Selecione uma competência válida."
      : carregando
        ? "Verificando faturas que vencem hoje…"
        : erroConsulta
          ? erroConsulta
          : explicacaoBotaoLembretesHoje(
              painel?.elegiveis ?? 0,
              pendentes.length,
              pendentesComEmail
            );

  async function abrir() {
    if (!habilitado || fase === "enviando" || bloqueado || !competenciaIso) return;
    const dados = await carregar();
    if (!dados || dados.competenciaIso !== competenciaIso) return;
    if (!dados.pendentes.some((item) => isEmailValido(item.email))) return;
    setSnapshot(dados);
    setResultado(null);
    setFase("confirmar");
    setAberto(true);
  }

  function fechar() {
    if (fase === "enviando") return;
    setAberto(false);
  }

  async function confirmar() {
    if (!snapshot || enviandoRef.current) return;
    if (
      !previaLembretesVencidasAindaValida(snapshot.competenciaIso, competenciaIso)
    ) {
      setSnapshot(null);
      setAberto(false);
      return;
    }
    const competenciaConfirmada = snapshot.competenciaIso;
    const fila = snapshot.pendentes.filter((item) => isEmailValido(item.email));
    if (fila.length === 0) return;
    enviandoRef.current = true;
    onOcupacaoChange?.(true);
    setFase("enviando");
    setAndamento({ atual: 0, total: fila.length });

    const acumulado: ResultadoTela = {
      aceitos: [],
      semEmail: snapshot.pendentes
        .filter((item) => !isEmailValido(item.email))
        .map((item) => itemDePendente(item, "sem_email")),
      jaLembradas: snapshot.jaLembradas.map((item) => ({
        faturaId: item.id,
        numero: item.numero,
        empresa: item.empresa,
        valor: 0,
        tipo: "ja_lembrada",
      })),
      falhas: [],
    };

    try {
      for (let indice = 0; indice < fila.length; indice += 1) {
        const pendente = fila[indice];
        setAndamento({ atual: indice + 1, total: fila.length });
        try {
          const item = await enviarLembreteHojeCliente(
            pendente.id,
            competenciaConfirmada
          );
          if (item.tipo === "aceito") {
            acumulado.aceitos.push(item);
            if (item.enviadoEm && item.email) {
              onEnviado({
                faturaId: item.faturaId,
                enviadoEm: item.enviadoEm,
                email: item.email,
              });
            }
          } else if (item.tipo === "sem_email") {
            acumulado.semEmail.push(item);
          } else if (item.tipo === "ja_lembrada") {
            const jaExiste = acumulado.jaLembradas.some(
              (existente) => existente.faturaId === item.faturaId
            );
            if (!jaExiste) acumulado.jaLembradas.push(item);
          } else {
            acumulado.falhas.push(item);
          }
        } catch (err) {
          acumulado.falhas.push(
            itemDePendente(
              pendente,
              "falha",
              err instanceof Error
                ? err.message
                : "Não foi possível enviar o lembrete. O envio não foi registrado."
            )
          );
        }
      }

      setResultado(acumulado);
      setFase("resultado");
      await carregar();
    } finally {
      enviandoRef.current = false;
      onOcupacaoChange?.(false);
    }
  }

  const confirmacao = snapshot
    ? montarConfirmacaoLembretesHoje(
        snapshot.pendentes.map((item) => ({
          id: item.id,
          numero: item.numero,
          empresa: item.empresa,
          empresaChave: chaveEmpresaLembrete({
            referencia_id: item.referenciaId,
            referencia_nome: item.empresa,
          }),
          valor: item.valor,
          email: item.email,
        }))
      )
    : null;
  const tituloCompetencia =
    snapshot?.competenciaTitulo || snapshot?.competenciaIso || "";
  const rotuloBotao =
    fase === "enviando"
      ? `Enviando ${andamento.atual} de ${andamento.total}`
      : "Enviar lembretes de hoje";

  return (
    <>
      <article className="panel-card flex h-full flex-col border-l-4 border-l-[#5668ff] p-4">
        <div className="flex items-center gap-2 text-navy">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f0f4ff] text-brand-blue">
            <IconClock size={16} />
          </span>
          <h3 className="text-sm font-semibold">Vencem hoje</h3>
        </div>
        <p className="mt-3 text-2xl font-extrabold tabular-nums text-navy">
          {carregando ? "…" : pendentesComEmail}
        </p>
        <p className="mt-1 min-h-10 text-sm text-[#52617a]">{explicacao}</p>
        <button
          type="button"
          className={classeBotaoLembrete(habilitado)}
          disabled={!habilitado}
          title={habilitado ? undefined : explicacao}
          onClick={() => void abrir()}
        >
          {rotuloBotao}
        </button>
      </article>

      <Modal
        open={aberto}
        onClose={fechar}
        title={
          tituloCompetencia
            ? `Lembretes de hoje — ${tituloCompetencia}`
            : "Lembretes de hoje"
        }
        subtitle="Somente faturas da competência selecionada."
        size="wide"
        closeOnOverlayClick={fase !== "enviando"}
        footer={
          fase === "resultado" ? (
            <button type="button" className="btn btn-primary" onClick={fechar}>
              Fechar
            </button>
          ) : (
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn"
                disabled={fase === "enviando"}
                onClick={fechar}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={
                  fase === "enviando" ||
                  !confirmacao ||
                  confirmacao.destinatarios === 0
                }
                onClick={() => void confirmar()}
              >
                {fase === "enviando" ? rotuloBotao : "Confirmar envio"}
              </button>
            </div>
          )
        }
      >
        {fase !== "resultado" && confirmacao && (
          <div className="space-y-4 text-sm text-[#1f2937]">
            <p>
              <span className="text-[#64748b]">Valor das faturas a enviar</span>
              <span className="ml-2 text-base font-semibold">
                {formatCurrency(confirmacao.valorTotal)}
              </span>
            </p>
            <FaturaLembreteListasConfirmacao
              comEmail={confirmacao.comEmail}
              semEmail={confirmacao.semEmail}
            />
            {fase === "enviando" && (
              <p className="text-[#52617a]">{rotuloBotao}. Aguarde o término.</p>
            )}
          </div>
        )}

        {fase === "resultado" && resultado && (
          <div className="space-y-4 text-sm text-[#1f2937]">
            <p>
              <span className="font-semibold">{resultado.aceitos.length}</span>{" "}
              {resultado.aceitos.length === 1
                ? "envio aceito pelo Resend."
                : "envios aceitos pelo Resend."}{" "}
              {FATURA_LEMBRETE_ENTREGA_NAO_CONFIRMADA}
            </p>
            <ResultadoBloco
              titulo="Ignoradas por ausência de e-mail válido"
              itens={resultado.semEmail.map(
                (item) => `${item.numero} — ${item.empresa}`
              )}
            />
            <ResultadoBloco
              titulo="Já lembradas hoje"
              itens={resultado.jaLembradas.map(
                (item) => `${item.numero} — ${item.empresa}`
              )}
            />
            <ResultadoBloco
              titulo="Falhas"
              itens={resultado.falhas.map(
                (item) =>
                  `${item.numero} — ${item.empresa}: ${item.motivo || "Falha no envio."}`
              )}
            />
          </div>
        )}
      </Modal>
    </>
  );
}

function ResultadoBloco({ titulo, itens }: { titulo: string; itens: string[] }) {
  return (
    <div>
      <p className="font-semibold">
        {titulo} ({itens.length})
      </p>
      {itens.length === 0 ? (
        <p className="text-[#64748b]">Nenhuma.</p>
      ) : (
        <ul className="mt-1 space-y-1">
          {itens.map((linha, indice) => (
            <li key={`${indice}-${linha}`}>{linha}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
