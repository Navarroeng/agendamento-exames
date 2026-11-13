"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { RequiredMark } from "@/components/ui/Field";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import {
  ALTERACAO_PARCELAS_EXISTENTES_MSG,
  MOTIVO_PRESERVAR_PARCELA,
  sugerirMensalidadeContratacao,
  type MotivoPreservarParcela,
} from "@/lib/alterar-contratacao";
import { isPerfilAdmin } from "@/lib/permissions";
import { formatCurrency, maskMoneyInput, parseMoney } from "@/lib/money";
import { valorMensalContratado } from "@/lib/mensalidade-parcelas";
import type { OrcamentoAprovacaoRecord } from "@/lib/orcamento-aprovacao";
import type { OrcamentoComItens } from "@/lib/orcamento-types";
import { formatClienteNomeDisplay } from "@/lib/cliente-display";
import {
  aplicarAlteracaoContratacao,
  preverAlteracaoContratacao,
  type PreviaAlteracaoContratacao,
} from "@/services/alterar-contratacao.service";
import { listarParcelasMensalidade } from "@/services/mensalidade-parcelas.service";
import { obterVigenciaContratualOrcamento } from "@/services/orcamento-aprovacao.service";

type ParcelaOpcao = {
  numero: number;
  vencimentoIso: string;
  valor: number;
};

function rotuloMotivo(codigo: string | null | undefined): string {
  if (!codigo) return "Preservada";
  if (codigo in MOTIVO_PRESERVAR_PARCELA) {
    return MOTIVO_PRESERVAR_PARCELA[codigo as MotivoPreservarParcela];
  }
  return codigo;
}

export function AlterarContratacaoButton({
  orcamento,
  aprovacao,
  onAtualizada,
}: {
  orcamento: OrcamentoComItens;
  aprovacao: OrcamentoAprovacaoRecord;
  onAtualizada?: (aprovacao: OrcamentoAprovacaoRecord) => void;
}) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  if (!isPerfilAdmin(profile?.perfil)) return null;

  return (
    <>
      <button
        type="button"
        className="btn justify-center text-[12px] sm:w-auto"
        onClick={() => setOpen(true)}
      >
        Alterar contratação
      </button>
      {open ? (
        <AlterarContratacaoDialog
          orcamento={orcamento}
          aprovacao={aprovacao}
          onClose={() => setOpen(false)}
          onAtualizada={onAtualizada}
        />
      ) : null}
    </>
  );
}

function AlterarContratacaoDialog({
  orcamento,
  aprovacao,
  onClose,
  onAtualizada,
}: {
  orcamento: OrcamentoComItens;
  aprovacao: OrcamentoAprovacaoRecord;
  onClose: () => void;
  onAtualizada?: (aprovacao: OrcamentoAprovacaoRecord) => void;
}) {
  const quantidadeAtual = Math.max(
    0,
    Math.floor(Number(aprovacao.quantidade_colaboradores) || 0)
  );
  const mensalidadeAtual =
    valorMensalContratado({
      mensalidadeValorMensal: aprovacao.mensalidade_valor_mensal,
      valorFinal: aprovacao.valor_final,
    }) ?? 0;
  const [quantidade, setQuantidade] = useState(String(quantidadeAtual || ""));
  const [valorTexto, setValorTexto] = useState(
    maskMoneyInput(String(Math.round(sugerirMensalidadeContratacao(quantidadeAtual || 1) * 100)))
  );
  const valorEditado = useRef(false);
  const [numeroInicio, setNumeroInicio] = useState("");
  const [motivo, setMotivo] = useState("");
  const [opcoes, setOpcoes] = useState<ParcelaOpcao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [previa, setPrevia] = useState<PreviaAlteracaoContratacao | null>(null);
  const [previaChave, setPreviaChave] = useState("");
  const [idempotencia, setIdempotencia] = useState("");
  const [busy, setBusy] = useState(false);

  const quantidadeNova = Math.floor(Number(quantidade) || 0);
  const valorNovo = parseMoney(valorTexto);
  const sugestao = sugerirMensalidadeContratacao(quantidadeNova);
  const chave = `${quantidadeNova}|${valorNovo}|${numeroInicio}|${motivo.trim()}`;

  useEffect(() => {
    let cancelado = false;
    void (async () => {
      try {
        const [vigencia, parcelas] = await Promise.all([
          obterVigenciaContratualOrcamento(orcamento.id),
          listarParcelasMensalidade(aprovacao.id),
        ]);
        if (cancelado) return;
        const inicio = vigencia?.inicio ?? "";
        const lista = parcelas
          .filter((item) => item.vigenciaInicio === inicio)
          .sort((a, b) => a.numero - b.numero)
          .map((item) => ({
            numero: item.numero,
            vencimentoIso: item.vencimentoIso,
            valor: item.valor,
          }));
        setOpcoes(lista);
        setNumeroInicio(lista[0] ? String(lista[0].numero) : "");
      } catch (err) {
        if (!cancelado) {
          toast.error(
            err instanceof Error
              ? err.message
              : "Não foi possível carregar as mensalidades."
          );
        }
      } finally {
        if (!cancelado) setCarregando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [aprovacao.id, orcamento.id]);

  useEffect(() => {
    if (valorEditado.current) return;
    if (quantidadeNova < 1) return;
    setValorTexto(
      maskMoneyInput(String(Math.round(sugerirMensalidadeContratacao(quantidadeNova) * 100)))
    );
  }, [quantidadeNova]);

  const previaValida = previa != null && previaChave === chave && previa.impedimentos.length === 0;

  const resumoContrato = useMemo(() => {
    if (!previa) return null;
    return "A alteração abre uma nova versão completa do contrato na aba Contrato. O PDF anterior permanece no histórico, com o envio e a assinatura daquela versão. A nova versão começa sem envio e sem assinatura, e só é gerada depois, nesta tela.";
  }, [previa]);

  async function verPrevia() {
    setBusy(true);
    try {
      const resultado = await preverAlteracaoContratacao({
        aprovacaoId: aprovacao.id,
        quantidade: quantidadeNova,
        valorMensal: valorNovo,
        numeroInicio: Number(numeroInicio),
        motivo,
      });
      setPrevia(resultado);
      setPreviaChave(chave);
      setIdempotencia(crypto.randomUUID());
      if (resultado.impedimentos.length > 0) {
        toast.error(resultado.impedimentos[0]);
      }
    } catch (err) {
      setPrevia(null);
      toast.error(err instanceof Error ? err.message : "Não foi possível montar a prévia.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmar() {
    if (!previa || !previaValida || !idempotencia) return;
    setBusy(true);
    try {
      const resultado = await aplicarAlteracaoContratacao({
        aprovacaoId: aprovacao.id,
        orcamentoId: orcamento.id,
        quantidade: quantidadeNova,
        valorMensal: valorNovo,
        numeroInicio: Number(numeroInicio),
        motivo,
        token: previa.token,
        idempotencia,
      });
      onAtualizada?.(resultado.aprovacao);
      toast.success("Contratação alterada. As parcelas elegíveis foram atualizadas no mesmo registro.");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível alterar a contratação.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Alterar contratação"
      subtitle={formatClienteNomeDisplay(orcamento.cliente_nome)}
      size="wide"
      closeOnOverlayClick={!busy}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="btn justify-center sm:w-auto" disabled={busy} onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn justify-center sm:w-auto" disabled={busy || carregando} onClick={() => void verPrevia()}>
            Ver prévia
          </button>
          <button type="button" className="btn btn-primary justify-center sm:w-auto" disabled={busy || !previaValida} onClick={() => void confirmar()}>
            {busy ? "Salvando..." : "Confirmar alteração"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <p className="text-[13px] text-[#334155]">
            <span className="block text-[11px] font-extrabold uppercase tracking-wide text-navy">Cliente</span>
            {formatClienteNomeDisplay(orcamento.cliente_nome)}
          </p>
          <p className="text-[13px] text-[#334155]">
            <span className="block text-[11px] font-extrabold uppercase tracking-wide text-navy">Orçamento</span>
            {orcamento.numero}
          </p>
          <p className="text-[13px] text-[#334155]">
            <span className="block text-[11px] font-extrabold uppercase tracking-wide text-navy">Colaboradores</span>
            {quantidadeAtual} atuais
          </p>
          <p className="text-[13px] text-[#334155]">
            <span className="block text-[11px] font-extrabold uppercase tracking-wide text-navy">Mensalidade atual</span>
            {formatCurrency(mensalidadeAtual)}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-navy">
            <span>Nova quantidade de colaboradores <RequiredMark /></span>
            <input
              className="field-input"
              inputMode="numeric"
              value={quantidade}
              disabled={busy}
              onChange={(event) => {
                setQuantidade(event.target.value.replace(/\D/g, ""));
                setPrevia(null);
              }}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-navy">
            <span>Nova mensalidade <RequiredMark /></span>
            <input
              className="field-input"
              value={valorTexto}
              disabled={busy}
              onChange={(event) => {
                valorEditado.current = true;
                setValorTexto(maskMoneyInput(event.target.value));
                setPrevia(null);
              }}
            />
            <span className="text-[11px] font-medium text-[#64748b]">
              Sugestão: {formatCurrency(sugestao)}. Mínimo de R$ 130,00.
            </span>
            <button
              type="button"
              className="self-start text-[11px] font-bold text-brand-blue hover:underline"
              disabled={busy || quantidadeNova < 1}
              onClick={() => {
                valorEditado.current = false;
                setValorTexto(
                  maskMoneyInput(String(Math.round(sugerirMensalidadeContratacao(quantidadeNova) * 100)))
                );
                setPrevia(null);
              }}
            >
              Recalcular sugestão
            </button>
          </label>
          <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-navy">
            <span>A partir da parcela <RequiredMark /></span>
            <select
              className="field-input"
              value={numeroInicio}
              disabled={busy || carregando}
              onChange={(event) => {
                setNumeroInicio(event.target.value);
                setPrevia(null);
              }}
            >
              {opcoes.length === 0 ? <option value="">Sem parcelas nesta vigência</option> : null}
              {opcoes.map((parcela) => (
                <option key={parcela.numero} value={parcela.numero}>
                  {parcela.numero} · {formatDateIsoToBR(parcela.vencimentoIso)} · {formatCurrency(parcela.valor)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-navy sm:col-span-2">
            <span>Motivo <RequiredMark /></span>
            <textarea
              className="field-input min-h-[72px]"
              value={motivo}
              disabled={busy}
              onChange={(event) => {
                setMotivo(event.target.value);
                setPrevia(null);
              }}
            />
          </label>
        </div>

        {previa ? (
          <div className="space-y-3 rounded-xl border border-[#dbe4f0] bg-[#f8fbff] p-3 text-[12px] text-[#334155]">
            <p>
              Quantidade: <strong>{previa.quantidadeAnterior}</strong> → <strong>{previa.quantidadeNova}</strong>
            </p>
            <p>
              Mensalidade: <strong>{formatCurrency(previa.valorAnterior)}</strong> → <strong>{formatCurrency(previa.valorNovo)}</strong>
            </p>
            <p>
              Início: mensalidade {previa.efeitoNumero}
              {previa.efeitoVencimento ? ` · ${formatDateIsoToBR(previa.efeitoVencimento)}` : ""}
            </p>
            <p className="font-semibold text-navy">{ALTERACAO_PARCELAS_EXISTENTES_MSG}</p>
            <p>{resumoContrato}</p>
            {previa.vagasNovas > 0 ? (
              <p>
                Serão abertas {previa.vagasNovas} vaga{previa.vagasNovas === 1 ? "" : "s"} em branco.
                Nenhum funcionário fictício é cadastrado.
              </p>
            ) : null}
            {previa.providencias.map((item) => (
              <p key={item} className="font-semibold text-[#92400e]">{item}</p>
            ))}
            {previa.ajustes.map((item) => (
              <p key={`ajuste-${item.numero}`} className="font-semibold text-[#92400e]">
                Parcela {item.numero}: {item.mensagem}
              </p>
            ))}
            {previa.impedimentos.map((item) => (
              <p key={item} className="font-semibold text-[#b91c1c]">{item}</p>
            ))}
            {previa.parcelasAtualizar.length > 0 ? (
              <div>
                <p className="font-extrabold uppercase tracking-wide text-navy">Parcelas que serão atualizadas</p>
                <ul className="mt-1 space-y-1">
                  {previa.parcelasAtualizar.map((parcela) => (
                    <li key={parcela.id}>
                      {parcela.numero} · {formatDateIsoToBR(parcela.vencimento)} · {formatCurrency(parcela.valorAnterior ?? 0)} → {formatCurrency(parcela.valorNovo ?? 0)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p>Nenhuma parcela em aberto será alterada.</p>
            )}
            {previa.parcelasPreservar.length > 0 ? (
              <div>
                <p className="font-extrabold uppercase tracking-wide text-navy">Parcelas preservadas</p>
                <ul className="mt-1 space-y-1">
                  {previa.parcelasPreservar.map((parcela) => (
                    <li key={parcela.id}>
                      {parcela.numero} · {formatDateIsoToBR(parcela.vencimento)} · {formatCurrency(parcela.valor ?? 0)} · {rotuloMotivo(parcela.motivo)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
