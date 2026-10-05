"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Panel } from "@/components/ui/Panel";
import { IconReceipt } from "@/components/ui/icons/OutlineIcons";
import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import { isEmailValido } from "@/lib/email-validacao";
import {
  FATURA_LEMBRETE_ENTREGA_NAO_CONFIRMADA,
  chaveEmpresaLembrete,
  explicacaoBotaoLembretesVencidas,
  lembretesVencidasBotaoHabilitado,
  montarConfirmacaoLembretesHoje,
  normalizarCompetenciaIso,
  previaLembretesVencidasAindaValida,
} from "@/lib/fatura-lembrete";
import { formatCurrency } from "@/lib/money";
import {
  consultarLembretesVencidasCliente,
  enviarLembreteVencidaCliente,
  type LembreteHojeItemCliente,
  type LembretesVencidasPainelCliente,
  type LembretesVencidasPendenteCliente,
} from "@/services/fatura-lembrete.service";

interface FaturaLembretesVencidasBarProps {
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
  pendente: LembretesVencidasPendenteCliente,
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

function textoAtraso(dias: number): string {
  return dias === 1 ? "1 dia" : `${dias} dias`;
}

export function FaturaLembretesVencidasBar({
  competencia,
  atualizarEm = 0,
  pagamentoEm = 0,
  bloqueado = false,
  onOcupacaoChange,
  onEnviado,
}: FaturaLembretesVencidasBarProps) {
  const [painel, setPainel] = useState<LembretesVencidasPainelCliente | null>(
    null
  );
  const [erroConsulta, setErroConsulta] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [aberto, setAberto] = useState(false);
  const [fase, setFase] = useState<Fase>("confirmar");
  const [andamento, setAndamento] = useState({ atual: 0, total: 0 });
  const [resultado, setResultado] = useState<ResultadoTela | null>(null);
  const [snapshot, setSnapshot] = useState<LembretesVencidasPainelCliente | null>(
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
      const dados = await consultarLembretesVencidasCliente(iso);
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
          : "Não foi possível consultar as faturas vencidas."
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
  const habilitado = lembretesVencidasBotaoHabilitado({
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
        ? "Verificando faturas vencidas…"
        : erroConsulta
          ? erroConsulta
          : explicacaoBotaoLembretesVencidas(pendentes.length, pendentesComEmail);

  async function abrir() {
    if (fase === "enviando" || bloqueado || !competenciaIso) return;
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
      !previaLembretesVencidasAindaValida(
        snapshot.competenciaIso,
        competenciaIso
      )
    ) {
      setSnapshot(null);
      setAberto(false);
      return;
    }
    enviandoRef.current = true;
    onOcupacaoChange?.(true);
    const competenciaConfirmada = snapshot.competenciaIso;
    const fila = snapshot.pendentes;
    setFase("enviando");
    setAndamento({ atual: 0, total: fila.length });

    const acumulado: ResultadoTela = {
      aceitos: [],
      semEmail: [],
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
          const item = await enviarLembreteVencidaCliente(
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

  const rotuloBotao =
    fase === "enviando"
      ? `Enviando ${andamento.atual} de ${andamento.total}`
      : "Enviar lembretes de faturas vencidas";

  return (
    <>
      <Panel
        title="Faturas vencidas"
        icon={<IconReceipt size={16} />}
        clipContent={false}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-[#52617a]">{explicacao}</p>
            <p className="mt-1 text-xs text-[#64748b]">
              O envio é manual e acontece só depois da confirmação, somente para
              a competência selecionada na página. Cada fatura vencida recebe
              um e-mail separado, com o destinatário e o PDF da própria
              empresa. Faturas que vencem hoje ficam no outro lote.{" "}
              {FATURA_LEMBRETE_ENTREGA_NAO_CONFIRMADA}
            </p>
          </div>
          <button
            type="button"
            className={
              habilitado
                ? "btn btn-primary shrink-0"
                : "btn shrink-0 cursor-not-allowed opacity-40 saturate-50"
            }
            disabled={!habilitado}
            title={habilitado ? undefined : explicacao}
            onClick={() => void abrir()}
          >
            {rotuloBotao}
          </button>
        </div>
      </Panel>

      <Modal
        open={aberto}
        onClose={fechar}
        title="Enviar lembretes de faturas vencidas"
        subtitle="Um e-mail por fatura, somente para a empresa correspondente."
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
                disabled={fase === "enviando" || !confirmacao}
                onClick={() => void confirmar()}
              >
                {fase === "enviando" ? rotuloBotao : "Confirmar envio"}
              </button>
            </div>
          )
        }
      >
        {fase !== "resultado" && confirmacao && snapshot && (
          <div className="space-y-4 text-sm text-[#1f2937]">
            <p>
              Competência:{" "}
              <span className="font-semibold">
                {snapshot.competenciaTitulo || snapshot.competenciaIso}
              </span>
            </p>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <dt className="text-xs text-[#64748b]">Faturas</dt>
                <dd className="text-base font-semibold">{confirmacao.faturas}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#64748b]">Empresas</dt>
                <dd className="text-base font-semibold">{confirmacao.empresas}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#64748b]">Destinatários</dt>
                <dd className="text-base font-semibold">
                  {confirmacao.destinatarios}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#64748b]">Valor total</dt>
                <dd className="text-base font-semibold">
                  {formatCurrency(confirmacao.valorTotal)}
                </dd>
              </div>
            </dl>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-[#64748b]">
                    <th className="py-2 pr-3 font-semibold">Fatura</th>
                    <th className="py-2 pr-3 font-semibold">Empresa</th>
                    <th className="py-2 pr-3 font-semibold">Destinatário</th>
                    <th className="py-2 pr-3 font-semibold">Valor</th>
                    <th className="py-2 pr-3 font-semibold">Vencimento</th>
                    <th className="py-2 font-semibold">Atraso</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.pendentes.map((item) => {
                    const semEmail = !isEmailValido(item.email);
                    return (
                      <tr
                        key={item.id}
                        className={
                          semEmail
                            ? "bg-amber-50 text-amber-950"
                            : "border-t border-[#eef2f7]"
                        }
                      >
                        <td className="py-2 pr-3">{item.numero}</td>
                        <td className="py-2 pr-3">{item.empresa}</td>
                        <td className="py-2 pr-3">
                          {semEmail ? "Sem e-mail válido" : item.email}
                        </td>
                        <td className="py-2 pr-3">{formatCurrency(item.valor)}</td>
                        <td className="py-2 pr-3">
                          {formatDateIsoToBR(item.vencimento)}
                        </td>
                        <td className="py-2">{textoAtraso(item.diasAtraso)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {confirmacao.semEmail.length > 0 && (
              <p className="font-semibold text-amber-950">
                As faturas sem e-mail válido serão ignoradas e não impedem as
                demais.
              </p>
            )}

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
