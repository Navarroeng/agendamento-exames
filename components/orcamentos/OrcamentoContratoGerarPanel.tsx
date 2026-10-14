"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { useAuditoriaUsuario } from "@/contexts/AuthContext";
import { formatDateTimeBR } from "@/lib/format-datetime";
import { AUDITORIA_ACOES, AUDITORIA_MODULOS } from "@/lib/auditoria";
import {
  buildContratoNavarroDocumento,
  hojeIsoLocal,
  motivoBloqueioGeracaoContrato,
  podeGerarContratoNavarro,
  resumoConferenciaContrato,
  type ContratoNavarroDocumento,
} from "@/lib/contrato-modelo";
import {
  gerarPdfContratoNavarro,
  nomeArquivoContratoNavarro,
} from "@/lib/contrato-pdf";
import {
  DIA_VENCIMENTO_MENSALIDADE_PENDENTE_MSG,
  DIAS_VENCIMENTO_MENSALIDADE,
  diaVencimentoMensalidadeValido,
  type DiaVencimentoMensalidade,
} from "@/lib/contrato-navarro";
import { isOrcamentoMensalidade } from "@/lib/orcamento-modalidade";
import {
  resolveTipoDocumentoContrato,
} from "@/lib/servico-aet";
import { montarParcelasPontual } from "@/lib/contrato-pagamento";
import {
  PARECER_PAGAMENTO_ESCOLHA_PENDENTE_MSG,
  lerParecerPagamentoEscolhido,
  type ParecerPagamentoEscolhido,
} from "@/lib/contrato-parecer-tecnico";
import { formatCurrency } from "@/lib/money";
import {
  parecerMostraAlternativaAvista,
  parseQuantidadeParcelasInteira,
} from "@/lib/servico-parecer-tecnico";
import {
  CONTRATO_ASSINADO_BLOQUEIA_REGENERACAO_MSG,
  contratoUsaCronogramaVencimentos,
  mesclarVencimentosSalvos,
  sugerirDatasVencimento,
  validarCronogramaVencimentos,
} from "@/lib/contrato-vencimentos";
import { mensagemErroContratoDocumento } from "@/lib/contrato-documento-erro";
import {
  pdfContratoEstaDesatualizado,
  revisaoCondicoesAprovacao,
} from "@/lib/contrato-documento-revisao";
import type { OrcamentoAprovacaoRecord } from "@/lib/orcamento-aprovacao";
import type { OrcamentoContratoDocumentoRecord } from "@/lib/orcamento-contrato-documento";
import type { OrcamentoComItens } from "@/lib/orcamento-types";
import { registrarAuditoria } from "@/services/auditoria.service";
import { salvarCondicaoContratoParecer } from "@/services/orcamento-aprovacao.service";
import {
  obterVigenciaContratualOrcamento,
  salvarParametrosContratoMensalidade,
} from "@/services/orcamento-aprovacao.service";
import {
  listarContratoDocumentos,
  obterUrlContratoDocumento,
  persistirContratoDocumentoGerado,
} from "@/services/orcamento-contrato-documento.service";
import {
  listarContratoVencimentos,
  salvarContratoVencimentos,
} from "@/services/orcamento-contrato-vencimento.service";

type EtapaFluxo = "idle" | "conferencia" | "preview";

export function OrcamentoContratoGerarPanel({
  orcamento,
  aprovacao,
  disabled = false,
  onAprovacaoAtualizada,
}: {
  orcamento: OrcamentoComItens;
  aprovacao: OrcamentoAprovacaoRecord;
  disabled?: boolean;
  onAprovacaoAtualizada?: (aprovacao: OrcamentoAprovacaoRecord) => void;
}) {
  const auditContext = useAuditoriaUsuario();
  const [documentos, setDocumentos] = useState<
    OrcamentoContratoDocumentoRecord[]
  >([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [etapa, setEtapa] = useState<EtapaFluxo>("idle");
  const [dataContrato, setDataContrato] = useState(hojeIsoLocal());
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<ContratoNavarroDocumento | null>(
    null
  );
  const [working, setWorking] = useState(false);
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [vencimentos, setVencimentos] = useState<string[]>([]);
  const [loadingVencimentos, setLoadingVencimentos] = useState(false);
  const [condicoesRevisaoCapturada, setCondicoesRevisaoCapturada] = useState<
    number | null
  >(null);
  const [formaLocal, setFormaLocal] = useState<ParecerPagamentoEscolhido | null>(
    () => lerParecerPagamentoEscolhido(orcamento.parecer_pagamento_escolhido)
  );
  const [revisaoVigente, setRevisaoVigente] = useState<number | null>(null);
  const [diaVencimento, setDiaVencimento] = useState<DiaVencimentoMensalidade | null>(
    () => diaVencimentoMensalidadeValido(aprovacao.mensalidade_dia_vencimento)
  );
  const [parametrosLocais, setParametrosLocais] =
    useState<OrcamentoAprovacaoRecord | null>(null);
  const loadSeq = useRef(0);

  const podeGerar = podeGerarContratoNavarro(orcamento, aprovacao);
  const motivoBloqueio = motivoBloqueioGeracaoContrato(orcamento, aprovacao);
  const itensContrato =
    aprovacao.orcamento_aprovacao_itens?.length
      ? aprovacao.orcamento_aprovacao_itens
      : orcamento.orcamento_itens;
  const tipoDocumento = resolveTipoDocumentoContrato({
    itens: itensContrato,
    isMensalidade: isOrcamentoMensalidade(orcamento.modalidade),
  });
  const isAet = tipoDocumento === "aet";
  const isParecer = tipoDocumento === "parecer_tecnico";
  const isMensalidadeDoc = tipoDocumento === "mensalidade";
  const ofereceAvista =
    isParecer &&
    parecerMostraAlternativaAvista({
      oferecer_desconto_avista: orcamento.oferecer_desconto_avista,
      valor_avista: orcamento.valor_avista,
      valor_total: orcamento.valor_total,
      orcamento_itens: orcamento.orcamento_itens,
    });
  const formaEfetiva: ParecerPagamentoEscolhido | null = !isParecer
    ? null
    : ofereceAvista
      ? formaLocal
      : "parcelado";
  const parecerAguardandoEscolha = isParecer && ofereceAvista && formaLocal == null;
  const usaCronograma =
    contratoUsaCronogramaVencimentos(tipoDocumento) && !parecerAguardandoEscolha;
  const contratoAssinado = Boolean(aprovacao.contrato_assinado);
  const quantidadeParcelas = (() => {
    const fromAprovacao = Number(aprovacao.quantidade_parcelas);
    if (Number.isFinite(fromAprovacao) && fromAprovacao >= 1) {
      return Math.floor(fromAprovacao);
    }
    const fromOrcamento = Number(orcamento.quantidade_parcelas);
    if (Number.isFinite(fromOrcamento) && fromOrcamento >= 1) {
      return Math.floor(fromOrcamento);
    }
    return 1;
  })();
  const valorContrato = (() => {
    if (isParecer) {
      if (formaEfetiva === "avista") return Number(orcamento.valor_avista) || 0;
      return Number(orcamento.valor_total) || 0;
    }
    const fromAprovacao = Number(aprovacao.valor_final);
    if (Number.isFinite(fromAprovacao) && fromAprovacao > 0) return fromAprovacao;
    return Number(orcamento.valor_total) || 0;
  })();
  const quantidadeCronograma = isParecer
    ? formaEfetiva === "avista"
      ? 1
      : parseQuantidadeParcelasInteira(orcamento.quantidade_parcelas) ??
        quantidadeParcelas
    : quantidadeParcelas;
  const orcamentoContrato = useMemo(
    () =>
      isParecer
        ? {
            ...orcamento,
            parecer_pagamento_escolhido: formaEfetiva,
          }
        : orcamento,
    [formaEfetiva, isParecer, orcamento]
  );
  const aprovacaoBase = useMemo(() => {
    if (!parametrosLocais || parametrosLocais.id !== aprovacao.id) return aprovacao;
    return { ...aprovacao, ...parametrosLocais };
  }, [aprovacao, parametrosLocais]);
  const aprovacaoContrato = useMemo(
    () =>
      revisaoVigente == null
        ? aprovacaoBase
        : { ...aprovacaoBase, condicoes_revisao: revisaoVigente },
    [aprovacaoBase, revisaoVigente]
  );
  const diaEfetivo =
    diaVencimentoMensalidadeValido(diaVencimento) ??
    diaVencimentoMensalidadeValido(aprovacaoContrato.mensalidade_dia_vencimento);
  const diaPendente = isMensalidadeDoc && diaEfetivo == null;
  const parcelasValores = useMemo(
    () =>
      montarParcelasPontual({
        valorTotal: valorContrato,
        quantidadeParcelas: quantidadeCronograma,
        dataContrato: hojeIsoLocal(),
      }),
    [quantidadeCronograma, valorContrato]
  );
  const atual = documentos[0] ?? null;
  const anteriores = documentos.slice(1);
  const atualDesatualizado = atual
    ? pdfContratoEstaDesatualizado(atual, aprovacaoContrato)
    : false;

  const carregar = useCallback(async () => {
    const seq = ++loadSeq.current;
    setLoadingDocs(true);
    try {
      const rows = await listarContratoDocumentos(aprovacao.id);
      if (seq !== loadSeq.current) return;
      setDocumentos(rows);
    } catch (err) {
      if (seq !== loadSeq.current) return;
      console.error(err);
      toast.error(
        mensagemErroContratoDocumento(
          err,
          "Não foi possível carregar os contratos gerados."
        )
      );
    } finally {
      if (seq === loadSeq.current) setLoadingDocs(false);
    }
  }, [aprovacao.id]);

  function aplicarDocumentoSalvo(saved: OrcamentoContratoDocumentoRecord) {
    loadSeq.current += 1;
    setDocumentos((prev) =>
      [saved, ...prev.filter((doc) => doc.id !== saved.id)].sort(
        (a, b) => b.versao - a.versao
      )
    );
  }

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    setEtapa("idle");
    setPreviewDoc(null);
    setCondicoesRevisaoCapturada(null);
    setPreviewUrl((atualUrl) => {
      if (atualUrl) URL.revokeObjectURL(atualUrl);
      return null;
    });
  }, [aprovacao.updated_at]);

  const carregarVencimentos = useCallback(async () => {
    if (!usaCronograma) {
      setVencimentos([]);
      return;
    }
    setLoadingVencimentos(true);
    try {
      const salvas = await listarContratoVencimentos(aprovacao.id);
      const sugeridas = sugerirDatasVencimento(
        hojeIsoLocal(),
        quantidadeCronograma
      );
      setVencimentos(
        mesclarVencimentosSalvos({
          quantidade: quantidadeCronograma,
          sugeridas,
          salvas,
        })
      );
    } catch (err) {
      console.error(err);
      toast.error(
        mensagemErroContratoDocumento(
          err,
          "Não foi possível carregar as datas de vencimento."
        )
      );
      setVencimentos(
        sugerirDatasVencimento(hojeIsoLocal(), quantidadeCronograma)
      );
    } finally {
      setLoadingVencimentos(false);
    }
  }, [aprovacao.id, quantidadeCronograma, usaCronograma]);

  useEffect(() => {
    void carregarVencimentos();
  }, [carregarVencimentos]);

  useEffect(() => {
    setFormaLocal(
      lerParecerPagamentoEscolhido(orcamento.parecer_pagamento_escolhido)
    );
  }, [orcamento.id, orcamento.parecer_pagamento_escolhido]);

  useEffect(() => {
    setDiaVencimento(
      diaVencimentoMensalidadeValido(aprovacao.mensalidade_dia_vencimento)
    );
    setParametrosLocais(null);
  }, [aprovacao.id]);

  useEffect(() => {
    setRevisaoVigente(null);
  }, [aprovacao.id, aprovacao.condicoes_revisao]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (viewUrl?.startsWith("blob:")) URL.revokeObjectURL(viewUrl);
    };
  }, [viewUrl]);

  const resumo = useMemo(() => {
    if (!podeGerar) return null;
    try {
      return resumoConferenciaContrato(
        buildContratoNavarroDocumento({
          orcamento: orcamentoContrato,
          aprovacao: aprovacaoContrato,
          dataContrato,
          vencimentosIso: usaCronograma ? vencimentos : null,
          diaVencimentoMensalidade: diaEfetivo,
        })
      );
    } catch {
      return null;
    }
  }, [
    aprovacaoContrato,
    dataContrato,
    diaEfetivo,
    orcamentoContrato,
    podeGerar,
    usaCronograma,
    vencimentos,
  ]);

  function fecharFluxo() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewDoc(null);
    setCondicoesRevisaoCapturada(null);
    setEtapa("idle");
  }

  function erroVencimentos(): string | null {
    if (!usaCronograma) return null;
    return validarCronogramaVencimentos(vencimentos, quantidadeCronograma);
  }

  async function persistirVencimentosAtuais(datas: string[]) {
    if (!usaCronograma || contratoAssinado) return;
    await salvarContratoVencimentos({
      aprovacaoId: aprovacao.id,
      orcamentoId: orcamento.id,
      vencimentos: datas.map((data, i) => ({
        indice: i + 1,
        data_vencimento: data,
      })),
    });
  }

  async function handleAlterarVencimento(index: number, value: string) {
    const next = vencimentos.map((data, i) => (i === index ? value : data));
    setVencimentos(next);
    try {
      await persistirVencimentosAtuais(next);
    } catch (err) {
      console.error(err);
      toast.error(
        mensagemErroContratoDocumento(
          err,
          "Não foi possível salvar a data de vencimento."
        )
      );
    }
  }

  async function handleAbrirConferencia() {
    if (!podeGerar) {
      toast.error("É necessário um orçamento aprovado com dados do cliente.");
      return;
    }
    if (contratoAssinado) {
      toast.error(CONTRATO_ASSINADO_BLOQUEIA_REGENERACAO_MSG);
      return;
    }
    if (parecerAguardandoEscolha) {
      toast.error(PARECER_PAGAMENTO_ESCOLHA_PENDENTE_MSG);
      return;
    }
    if (diaPendente) {
      toast.error(DIA_VENCIMENTO_MENSALIDADE_PENDENTE_MSG);
      return;
    }
    const erroDatas = erroVencimentos();
    if (erroDatas) {
      toast.error(erroDatas);
      return;
    }
    setDataContrato(hojeIsoLocal());
    setEtapa("conferencia");
  }

  async function handleVisualizarRascunho() {
    if (!podeGerar) return;
    if (parecerAguardandoEscolha) {
      toast.error(PARECER_PAGAMENTO_ESCOLHA_PENDENTE_MSG);
      return;
    }
    if (diaPendente) {
      toast.error(DIA_VENCIMENTO_MENSALIDADE_PENDENTE_MSG);
      return;
    }
    const erroDatas = erroVencimentos();
    if (erroDatas) {
      toast.error(erroDatas);
      return;
    }
    const revisao = revisaoCondicoesAprovacao(aprovacaoContrato);
    if (revisao == null) {
      toast.error(
        "Não foi possível identificar a versão das condições aprovadas. Recarregue a tela. Se continuar, execute a migration 136_contrato_condicoes_revisao.sql."
      );
      return;
    }
    setWorking(true);
    try {
      if (usaCronograma) {
        await persistirVencimentosAtuais(vencimentos);
      }
      const vigencia = await obterVigenciaContratualOrcamento(orcamento.id);
      const documento = buildContratoNavarroDocumento({
        orcamento: orcamentoContrato,
        aprovacao: aprovacaoContrato,
        dataContrato,
        vencimentosIso: usaCronograma ? vencimentos : null,
        vigenciaInicio: vigencia?.inicio,
        vigenciaFim: vigencia?.fim,
        diaVencimentoMensalidade: diaEfetivo,
      });
      const pdf = await gerarPdfContratoNavarro(documento);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const file = new File([new Uint8Array(pdf.arrayBuffer)], pdf.filename, {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setPreviewDoc(documento);
      setCondicoesRevisaoCapturada(revisao);
      setEtapa("preview");
    } catch (err) {
      console.error(err);
      toast.error(
        mensagemErroContratoDocumento(err, "Não foi possível gerar a prévia.")
      );
    } finally {
      setWorking(false);
    }
  }

  async function handlePersistirPdf() {
    if (!previewDoc || !previewUrl) return;
    if (contratoAssinado) {
      toast.error(CONTRATO_ASSINADO_BLOQUEIA_REGENERACAO_MSG);
      return;
    }
    const erroDatas = erroVencimentos();
    if (erroDatas) {
      toast.error(erroDatas);
      return;
    }
    if (condicoesRevisaoCapturada == null) {
      toast.error(
        "Não foi possível identificar a versão das condições usadas nesta geração. Feche a prévia e gere o contrato novamente."
      );
      return;
    }
    setWorking(true);
    try {
      if (usaCronograma) {
        await persistirVencimentosAtuais(vencimentos);
      }
      const pdf = await gerarPdfContratoNavarro(previewDoc);
      const file = new File([new Uint8Array(pdf.arrayBuffer)], pdf.filename, {
        type: "application/pdf",
      });
      const saved = await persistirContratoDocumentoGerado({
        file,
        condicoesRevisao: condicoesRevisaoCapturada,
        payload: {
          orcamento_id: orcamento.id,
          aprovacao_id: aprovacao.id,
          cliente_id: orcamento.cliente_id,
          modalidade: previewDoc.modalidade,
          data_contrato: previewDoc.dataContrato,
          arquivo_nome: pdf.filename,
          arquivo_tipo: "application/pdf",
          arquivo_tamanho: file.size,
          gerado_por: auditContext.usuarioNome,
          gerado_por_user_id: auditContext.usuarioId,
        },
      });

      aplicarDocumentoSalvo(saved);
      const regenerado = saved.versao > 1;
      try {
        await registrarAuditoria({
          ...auditContext,
          modulo: AUDITORIA_MODULOS.implantacao_clientes,
          acao: regenerado
            ? AUDITORIA_ACOES.contrato_regenerado
            : AUDITORIA_ACOES.contrato_gerado,
          registroId: orcamento.id,
          registroNome: orcamento.numero,
          descricao: regenerado
            ? `${auditContext.usuarioNome} regenerou o contrato (versão ${saved.versao}) do orçamento ${orcamento.numero} (${previewDoc.modalidade}).`
            : `${auditContext.usuarioNome} gerou o contrato do orçamento ${orcamento.numero} (${previewDoc.modalidade}).`,
          dadosDepois: {
            orcamento_id: orcamento.id,
            cliente_id: orcamento.cliente_id,
            modalidade: previewDoc.modalidade,
            tipo_documento: previewDoc.tipoDocumento,
            data_contrato: previewDoc.dataContrato,
            versao: saved.versao,
            condicoes_revisao: saved.condicoes_revisao,
            vencimentos: usaCronograma ? vencimentos : undefined,
          },
        });
      } catch (auditErr) {
        console.error(auditErr);
      }

      toast.success(
        regenerado
          ? "Nova versão do contrato gerada. O acompanhamento de envio/assinatura não foi alterado."
          : "Contrato gerado. O acompanhamento de envio/assinatura não foi alterado."
      );
      fecharFluxo();
      await carregar();
    } catch (err) {
      console.error(err);
      toast.error(
        mensagemErroContratoDocumento(err, "Não foi possível salvar o contrato.")
      );
    } finally {
      setWorking(false);
    }
  }

  function nomeDownloadContrato(): string {
    return nomeArquivoContratoNavarro(orcamento.cliente_nome ?? "", tipoDocumento);
  }

  function substituirVisualizacao(url: string | null) {
    setViewUrl(url);
  }

  function fecharVisualizacao() {
    substituirVisualizacao(null);
  }

  async function abrirDocumento(doc: OrcamentoContratoDocumentoRecord) {
    setWorking(true);
    try {
      const filename = nomeDownloadContrato();
      const signedUrl = await obterUrlContratoDocumento(doc.storage_path);
      let nextUrl = signedUrl;
      try {
        const response = await fetch(signedUrl);
        if (response.ok) {
          const bytes = await response.arrayBuffer();
          const file = new File([new Uint8Array(bytes)], filename, {
            type: "application/pdf",
          });
          nextUrl = URL.createObjectURL(file);
        }
      } catch {
        nextUrl = signedUrl;
      }
      substituirVisualizacao(nextUrl);
    } catch (err) {
      console.error(err);
      toast.error(
        mensagemErroContratoDocumento(err, "Não foi possível abrir o contrato.")
      );
    } finally {
      setWorking(false);
    }
  }

  async function baixarDocumento(doc: OrcamentoContratoDocumentoRecord) {
    setWorking(true);
    const filename = nomeDownloadContrato();
    try {
      const signedUrl = await obterUrlContratoDocumento(doc.storage_path);
      try {
        const response = await fetch(signedUrl);
        if (!response.ok) throw new Error("download");
        const bytes = await response.arrayBuffer();
        const file = new File([new Uint8Array(bytes)], filename, {
          type: "application/pdf",
        });
        const objectUrl = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = file.name;
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
      } catch {
        const fallback = await obterUrlContratoDocumento(doc.storage_path, {
          download: filename,
        });
        const a = document.createElement("a");
        a.href = fallback;
        a.download = filename;
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (err) {
      console.error(err);
      toast.error(
        mensagemErroContratoDocumento(err, "Não foi possível baixar o contrato.")
      );
    } finally {
      setWorking(false);
    }
  }

  async function handleEscolherDia(dia: DiaVencimentoMensalidade) {
    if (contratoAssinado || working || dia === diaEfetivo) return;
    const anterior = diaVencimento;
    setDiaVencimento(dia);
    setWorking(true);
    try {
      const atualizada = await salvarParametrosContratoMensalidade({
        aprovacaoId: aprovacao.id,
        diaVencimento: dia,
      });
      setParametrosLocais(atualizada);
      onAprovacaoAtualizada?.(atualizada);
      const revisao = revisaoCondicoesAprovacao(atualizada);
      if (revisao != null) setRevisaoVigente(revisao);
    } catch (err) {
      console.error(err);
      setDiaVencimento(anterior);
      const detalhe = mensagemErroContratoDocumento(
        err,
        "Não foi possível salvar o dia de vencimento das mensalidades."
      );
      const faltaColuna = /mensalidade_dia_vencimento|schema cache/i.test(detalhe);
      toast.error(
        faltaColuna
          ? `${detalhe} Execute a migration 141_mensalidade_dia_vencimento.sql.`
          : detalhe
      );
    } finally {
      setWorking(false);
    }
  }

  async function handleEscolherPagamento(forma: ParecerPagamentoEscolhido) {
    if (contratoAssinado || working || forma === formaLocal) return;
    const anterior = formaLocal;
    setFormaLocal(forma);
    try {
      const atualizada = await salvarCondicaoContratoParecer({
        orcamentoId: orcamento.id,
        aprovacaoId: aprovacao.id,
        forma,
        valorTotal: Number(orcamento.valor_total) || 0,
        valorAvista: Number(orcamento.valor_avista) || 0,
        quantidadeParcelas:
          parseQuantidadeParcelasInteira(orcamento.quantidade_parcelas) ?? 1,
        alteradoPor: auditContext.usuarioNome,
      });
      const revisao = revisaoCondicoesAprovacao(atualizada);
      if (revisao != null) setRevisaoVigente(revisao);
    } catch (err) {
      console.error(err);
      setFormaLocal(anterior);
      toast.error(
        mensagemErroContratoDocumento(
          err,
          "Não foi possível salvar a condição de pagamento. Se a coluna ainda não existir, execute a migration 139_contrato_parecer_tecnico.sql."
        )
      );
    }
  }

  const busy = disabled || working;

  return (
    <section className="rounded-xl border border-[#dbe4f0] bg-[#f8fbff] px-4 py-3.5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-navy">
            Contrato automático
          </p>
          <p className="mt-1 text-[12px] text-[#475569]">
            {motivoBloqueio
              ? motivoBloqueio
              : isParecer
                ? "Contrato específico do Laudo de Parecer Técnico. Gera o PDF da contratação. Não marca como enviado nem assinado e não altera o contrato SST."
                : isAet
                  ? "Contrato específico do Laudo AET – Análise Ergonômica do Trabalho. Gera o PDF da contratação pontual. Não marca como enviado nem assinado e não altera o contrato SST."
                  : "Gera o PDF a partir do orçamento aprovado. Não marca como enviado nem assinado."}
          </p>
          {atual ? (
            <p className="mt-1 text-[12px] text-[#334155]">
              Versão atual: <strong>v{atual.versao}</strong>
              {" · "}
              {formatDateTimeBR(atual.gerado_em)}
              {atual.gerado_por ? ` · ${atual.gerado_por}` : ""}
              {atualDesatualizado ? " · desatualizado" : ""}
            </p>
          ) : loadingDocs ? (
            <p className="mt-1 text-[12px] text-[#64748b]">Carregando…</p>
          ) : (
            <p className="mt-1 text-[12px] text-[#64748b]">
              Nenhum contrato gerado ainda.
            </p>
          )}
          {atualDesatualizado ? (
            <p className="mt-1 text-[12px] font-semibold text-[#b45309]">
              Este PDF está desatualizado. Gere o contrato de novo para
              usar a versão vigente. O arquivo anterior permanece no
              histórico.
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {motivoBloqueio ? null : !atual ? (
            <button
              type="button"
              className="btn btn-primary justify-center text-[12px]"
              disabled={
                busy ||
                !podeGerar ||
                contratoAssinado ||
                parecerAguardandoEscolha ||
                diaPendente
              }
              onClick={() => void handleAbrirConferencia()}
            >
              Gerar contrato
            </button>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-primary justify-center text-[12px]"
                disabled={busy}
                onClick={() => void abrirDocumento(atual)}
              >
                Visualizar contrato
              </button>
              <button
                type="button"
                className="btn justify-center text-[12px]"
                disabled={busy}
                onClick={() => void baixarDocumento(atual)}
              >
                Baixar PDF
              </button>
              <button
                type="button"
                className="btn justify-center text-[12px]"
                disabled={
                  busy ||
                  !podeGerar ||
                  contratoAssinado ||
                  parecerAguardandoEscolha ||
                  diaPendente
                }
                onClick={() => void handleAbrirConferencia()}
              >
                {atualDesatualizado
                  ? "Gerar contrato atualizado"
                  : "Gerar novamente"}
              </button>
            </>
          )}
        </div>
      </div>

      {isMensalidadeDoc ? (
        <div className="mt-3 rounded-lg border border-[#e4ebf4] bg-white px-3 py-2.5">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-navy">
            Dia de vencimento das mensalidades
          </p>
          <p className="mt-1 text-[11px] text-[#64748b]">
            Escolha 10 ou 20 antes de gerar o contrato. A escolha vale também
            quando o período inicial for pago antecipadamente, porque define as
            mensalidades das renovações. Não é o prazo do pagamento antecipado
            nem o quinto dia útil das faturas de exames.
          </p>
          {contratoAssinado ? (
            <p className="mt-1 text-[12px] text-[#64748b]">
              {CONTRATO_ASSINADO_BLOQUEIA_REGENERACAO_MSG}
            </p>
          ) : null}
          {diaPendente && !contratoAssinado ? (
            <p className="mt-1 text-[12px] font-semibold text-[#b45309]">
              {DIA_VENCIMENTO_MENSALIDADE_PENDENTE_MSG}
            </p>
          ) : null}
          <div className="mt-2 flex flex-col gap-1.5 text-[12px] text-[#334155]">
            {DIAS_VENCIMENTO_MENSALIDADE.map((dia) => (
              <label key={dia} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`mensalidade-dia-vencimento-${aprovacao.id}`}
                  checked={diaEfetivo === dia}
                  disabled={busy || contratoAssinado}
                  onChange={() => void handleEscolherDia(dia)}
                />
                <span>Dia {dia}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {ofereceAvista ? (
        <div className="mt-3 rounded-lg border border-[#e4ebf4] bg-white px-3 py-2.5">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-navy">
            Condição de pagamento acordada
          </p>
          <p className="mt-1 text-[11px] text-[#64748b]">
            O orçamento oferece as duas alternativas. O contrato usa somente a
            condição escolhida.
          </p>
          {parecerAguardandoEscolha ? (
            <p className="mt-1 text-[12px] font-semibold text-[#b45309]">
              {PARECER_PAGAMENTO_ESCOLHA_PENDENTE_MSG}
            </p>
          ) : null}
          <div className="mt-2 flex flex-col gap-1.5 text-[12px] text-[#334155]">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="parecer-pagamento"
                checked={formaLocal === "parcelado"}
                disabled={busy || contratoAssinado}
                onChange={() => void handleEscolherPagamento("parcelado")}
              />
              <span>
                Parcelado · {formatCurrency(Number(orcamento.valor_total) || 0)}
              </span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="parecer-pagamento"
                checked={formaLocal === "avista"}
                disabled={busy || contratoAssinado}
                onChange={() => void handleEscolherPagamento("avista")}
              />
              <span>
                À vista · {formatCurrency(Number(orcamento.valor_avista) || 0)}
              </span>
            </label>
          </div>
        </div>
      ) : null}

      {usaCronograma ? (
        <div className="mt-3 rounded-lg border border-[#e4ebf4] bg-white px-3 py-2.5">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-navy">
            Vencimento das parcelas
          </p>
          {contratoAssinado ? (
            <p className="mt-1 text-[12px] text-[#64748b]">
              {CONTRATO_ASSINADO_BLOQUEIA_REGENERACAO_MSG}
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-[#64748b]">
              Valores vêm da condição aprovada. Ajuste só as datas antes de
              gerar o contrato.
            </p>
          )}
          {loadingVencimentos ? (
            <p className="mt-2 text-[12px] text-[#64748b]">Carregando datas…</p>
          ) : (
            <div className="mt-2 space-y-1">
              {parcelasValores.map((parcela, index) => (
                <div
                  key={parcela.indice}
                  className="grid grid-cols-1 items-center gap-1 text-[12px] text-[#334155] sm:grid-cols-[5.75rem_7.25rem_auto] sm:gap-x-3"
                >
                  <span className="font-semibold text-navy">
                    Parcela {parcela.indice}
                  </span>
                  <span>{formatCurrency(parcela.valor)}</span>
                  <label className="flex items-center gap-2">
                    <span className="text-[#64748b]">Vencimento</span>
                    <input
                      type="date"
                      className="field-input max-w-[168px] py-1 text-[12px]"
                      value={vencimentos[index] ?? ""}
                      disabled={busy || contratoAssinado}
                      onChange={(e) =>
                        void handleAlterarVencimento(index, e.target.value)
                      }
                    />
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {anteriores.length > 0 ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-[12px] font-semibold text-navy">
            Versões anteriores ({anteriores.length})
          </summary>
          <ul className="mt-2 space-y-1.5">
            {anteriores.map((doc) => (
              <li
                key={doc.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#e4ebf4] bg-white px-3 py-2 text-[12px] text-[#475569]"
              >
                <span>
                  v{doc.versao} · {formatDateTimeBR(doc.gerado_em)}
                  {doc.gerado_por ? ` · ${doc.gerado_por}` : ""}
                  {pdfContratoEstaDesatualizado(doc, aprovacaoContrato)
                    ? " · desatualizado"
                    : ""}
                </span>
                <span className="flex gap-2">
                  <button
                    type="button"
                    className="font-semibold text-brand-blue hover:underline"
                    disabled={busy}
                    onClick={() => void abrirDocumento(doc)}
                  >
                    Visualizar
                  </button>
                  <button
                    type="button"
                    className="font-semibold text-brand-blue hover:underline"
                    disabled={busy}
                    onClick={() => void baixarDocumento(doc)}
                  >
                    Baixar
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {etapa !== "idle" && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4">
              <button
                type="button"
                className="absolute inset-0 bg-black/40"
                aria-label="Fechar"
                onClick={() => !working && fecharFluxo()}
              />
              <div className="relative z-[81] flex max-h-[92vh] w-full max-w-[720px] flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
                <div className="border-b border-[#e4ebf4] px-5 py-4">
                  <h3 className="text-[15px] font-extrabold text-navy">
                    {etapa === "conferencia"
                      ? "Conferir dados do contrato"
                      : "Prévia do contrato"}
                  </h3>
                  <p className="mt-1 text-[12px] text-[#64748b]">
                    {resumo?.pagamentoAvista
                      ? "O vencimento do pagamento único é o das condições aprovadas. A data do contrato não quita o valor. O dia escolhido vale para as mensalidades das renovações."
                      : isMensalidadeDoc
                        ? "A data do contrato identifica o documento. A primeira mensalidade vence no dia escolhido, no mês seguinte ao início da vigência, quando essa data já estiver registrada."
                      : isParecer
                        ? "A data do contrato identifica o documento. Os vencimentos são as datas informadas e não são recalculados pela data de emissão."
                        : "A data do contrato define o documento, a primeira parcela e a vigência, quando aplicável."}
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4">
                  {etapa === "conferencia" && resumo ? (
                    <div className="space-y-3 text-[13px] text-[#334155]">
                      <Row label="Cliente" value={resumo.cliente} />
                      <Row label="CNPJ" value={resumo.cnpj} />
                      <Row label="Orçamento" value={resumo.orcamento} />
                      <Row
                        label={isAet || isParecer ? "Serviço" : "Modalidade"}
                        value={resumo.modalidade}
                      />
                      {isAet || isParecer ? null : (
                        <Row
                          label="Colaboradores"
                          value={resumo.colaboradores}
                        />
                      )}
                      {resumo.condicaoPagamento ? (
                        <Row label="Pagamento" value={resumo.condicaoPagamento} />
                      ) : null}
                      <Row
                        label={
                          isOrcamentoMensalidade(orcamento.modalidade)
                            ? "Valor mensal"
                            : "Valor"
                        }
                        value={resumo.valor}
                      />
                      {resumo.pagamentoAvista ? (
                        <>
                          <Row label="Pagamento" value="À vista" />
                          <Row
                            label="Valor bruto do período"
                            value={resumo.pagamentoAvista.bruto}
                          />
                          <Row
                            label="Desconto concedido"
                            value={resumo.pagamentoAvista.desconto}
                          />
                          <Row
                            label="Valor final a pagar"
                            value={resumo.pagamentoAvista.final}
                          />
                          <Row
                            label="Vencimento do pagamento único"
                            value={resumo.pagamentoAvista.vencimento}
                          />
                          <Row
                            label="Vigência do atendimento"
                            value={`${resumo.pagamentoAvista.meses} meses`}
                          />
                        </>
                      ) : null}
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-bold text-navy">
                          Data do contrato
                        </span>
                        <input
                          type="date"
                          className="field-input max-w-[220px]"
                          value={dataContrato}
                          disabled={working}
                          onChange={(e) => setDataContrato(e.target.value)}
                        />
                      </label>
                    </div>
                  ) : null}

                  {etapa === "preview" && previewUrl ? (
                    <iframe
                      title="Prévia do contrato"
                      src={previewUrl}
                      className="h-[62vh] w-full rounded-lg border border-[#e4ebf4]"
                    />
                  ) : null}
                </div>

                <div className="flex flex-wrap justify-end gap-2 border-t border-[#e4ebf4] px-5 py-3">
                  <button
                    type="button"
                    className="btn justify-center text-[12px]"
                    disabled={working}
                    onClick={() =>
                      etapa === "preview" ? setEtapa("conferencia") : fecharFluxo()
                    }
                  >
                    {etapa === "preview" ? "Voltar" : "Cancelar"}
                  </button>
                  {etapa === "conferencia" ? (
                    <button
                      type="button"
                      className="btn btn-primary justify-center text-[12px]"
                      disabled={working || !resumo}
                      onClick={() => void handleVisualizarRascunho()}
                    >
                      {working ? "Gerando prévia..." : "Visualizar contrato"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary justify-center text-[12px]"
                      disabled={working}
                      onClick={() => void handlePersistirPdf()}
                    >
                      {working ? "Salvando..." : "Gerar PDF"}
                    </button>
                  )}
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {viewUrl && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4">
              <button
                type="button"
                className="absolute inset-0 bg-black/40"
                aria-label="Fechar visualização"
                onClick={fecharVisualizacao}
              />
              <div className="relative z-[81] flex max-h-[92vh] w-full max-w-[860px] flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-[#e4ebf4] px-5 py-3">
                  <h3 className="text-[15px] font-extrabold text-navy">
                    Contrato gerado
                  </h3>
                  <button
                    type="button"
                    className="btn justify-center text-[12px]"
                    onClick={fecharVisualizacao}
                  >
                    Fechar
                  </button>
                </div>
                <iframe
                  title="Contrato gerado"
                  src={viewUrl}
                  className="h-[75vh] w-full"
                />
              </div>
            </div>,
            document.body
          )
        : null}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="font-semibold text-navy">{label}: </span>
      {value}
    </p>
  );
}
