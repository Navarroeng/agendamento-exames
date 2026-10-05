"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Panel } from "@/components/ui/Panel";
import { IconReceipt } from "@/components/ui/icons/OutlineIcons";
import {
  FATURA_LEMBRETE_ENTREGA_NAO_CONFIRMADA,
  chaveEmpresaLembrete,
  explicacaoBotaoLembretesHoje,
  montarConfirmacaoLembretesHoje,
} from "@/lib/fatura-lembrete";
import { formatCurrency } from "@/lib/money";
import {
  consultarLembretesHojeCliente,
  enviarLembreteHojeCliente,
  type LembreteHojeItemCliente,
  type LembretesHojePainelCliente,
} from "@/services/fatura-lembrete.service";

interface FaturaLembretesHojeBarProps {
  atualizarEm?: number;
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
  atualizarEm = 0,
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

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErroConsulta(null);
    try {
      const dados = await consultarLembretesHojeCliente();
      setPainel(dados);
      return dados;
    } catch (err) {
      setPainel(null);
      setErroConsulta(
        err instanceof Error
          ? err.message
          : "Não foi possível consultar as faturas que vencem hoje."
      );
      return null;
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (fase === "enviando") return;
    void carregar();
  }, [atualizarEm, carregar, fase]);

  const pendentes = painel?.pendentes ?? [];
  const habilitado = !carregando && !erroConsulta && pendentes.length > 0 && fase !== "enviando";
  const explicacao = carregando
    ? "Verificando faturas que vencem hoje…"
    : erroConsulta
      ? erroConsulta
      : explicacaoBotaoLembretesHoje(painel?.elegiveis ?? 0, pendentes.length);

  async function abrir() {
    if (fase === "enviando") return;
    const dados = await carregar();
    if (!dados || dados.pendentes.length === 0) return;
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
    enviandoRef.current = true;
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
          const item = await enviarLembreteHojeCliente(pendente.id);
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
      : "Enviar lembretes de hoje";

  return (
    <>
      <Panel
        title="Lembretes de hoje"
        icon={<IconReceipt size={16} />}
        clipContent={false}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-[#52617a]">{explicacao}</p>
            <p className="mt-1 text-xs text-[#64748b]">
              O envio é manual e acontece só depois da confirmação. Cada fatura
              recebe um e-mail separado, com o destinatário e o PDF da própria
              empresa. {FATURA_LEMBRETE_ENTREGA_NAO_CONFIRMADA}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary shrink-0"
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
        title="Enviar lembretes de hoje"
        subtitle="Um e-mail por fatura, somente para a empresa correspondente."
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
        {fase !== "resultado" && confirmacao && (
          <div className="space-y-4 text-sm text-[#1f2937]">
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

            {confirmacao.semEmail.length > 0 && (
              <div className="rounded-[10px] border border-amber-200 bg-amber-50 p-3">
                <p className="font-semibold text-amber-950">
                  Sem e-mail válido — estas faturas serão ignoradas
                </p>
                <ul className="mt-2 space-y-1 text-amber-950">
                  {confirmacao.semEmail.map((item) => (
                    <li key={item.id}>
                      {item.numero} — {item.empresa} — {formatCurrency(item.valor)}
                    </li>
                  ))}
                </ul>
              </div>
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
              vazio="Nenhuma."
              itens={resultado.semEmail.map(
                (item) => `${item.numero} — ${item.empresa}`
              )}
            />
            <ResultadoBloco
              titulo="Já lembradas hoje"
              vazio="Nenhuma."
              itens={resultado.jaLembradas.map(
                (item) => `${item.numero} — ${item.empresa}`
              )}
            />
            <ResultadoBloco
              titulo="Falhas"
              vazio="Nenhuma."
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

function ResultadoBloco({
  titulo,
  vazio,
  itens,
}: {
  titulo: string;
  vazio: string;
  itens: string[];
}) {
  return (
    <div>
      <p className="font-semibold">
        {titulo} ({itens.length})
      </p>
      {itens.length === 0 ? (
        <p className="text-[#64748b]">{vazio}</p>
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
