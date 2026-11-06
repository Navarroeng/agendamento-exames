"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { useAuditoriaUsuario, useAuth } from "@/contexts/AuthContext";
import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
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
  MENSALIDADE_VENCIMENTO_QUINTO_DIA_UTIL,
  RENOVACAO_CONTRATO_MIGRATION_MSG,
  RENOVACAO_CONTRATO_NOVA_VERSAO_MSG,
  RENOVACAO_CONTRATO_OPCOES,
  RENOVACAO_CONTRATO_PENDENTE_MSG,
  diaVencimentoMensalidadeValido,
  renovacaoContratoSalva,
  vencimentoMensalidadeQuintoDiaUtil,
  type DiaVencimentoMensalidade,
  type RenovacaoContratoGestao,
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
  modeloContratualDoPdfSalvo,
  nomeArquivoComModeloContrato,
  resolverModeloContratualParaGeracao,
  rotuloModeloContratualGestaoSst,
} from "@/lib/contrato-modelo-rotulo";
import {
  pdfContratoEstaDesatualizado,
  revisaoCondicoesAprovacao,
} from "@/lib/contrato-documento-revisao";
import {
  rotuloBotaoGerarContrato,
  type OrcamentoAprovacaoRecord,
} from "@/lib/orcamento-aprovacao";
import { isPerfilAdmin } from "@/lib/permissions";
import {
  textoAcompanhamentoVersaoAnterior,
  type OrcamentoContratoDocumentoRecord,
} from "@/lib/orcamento-contrato-documento";
import type { OrcamentoComItens } from "@/lib/orcamento-types";
import {
  existeAlteracaoContratacao,
  prepararNovaVersaoContrato,
} from "@/services/alterar-contratacao.service";
import { registrarAuditoria } from "@/services/auditoria.service";
import { salvarCondicaoContratoParecer } from "@/services/orcamento-aprovacao.service";
import {
  buscarAprovacaoPorOrcamentoId,
  obterVigenciaContratualOrcamento,
  salvarParametrosContratoMensalidade,
  salvarRenovacaoContratoMensalidade,
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
  const { profile } = useAuth();
  const [documentos, setDocumentos] = useState<
    OrcamentoContratoDocumentoRecord[]
  >([]);
  const [temAlteracao, setTemAlteracao] = useState(false);
  const preparandoRef = useRef(false);
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
  const [regraVencimento, setRegraVencimento] = useState<
    typeof MENSALIDADE_VENCIMENTO_QUINTO_DIA_UTIL | null
  >(() =>
    vencimentoMensalidadeQuintoDiaUtil(aprovacao.mensalidade_vencimento_regra)
      ? MENSALIDADE_VENCIMENTO_QUINTO_DIA_UTIL
      : null
  );
  const [renovacaoLocal, setRenovacaoLocal] =
    useState<RenovacaoContratoGestao | null>(null);
  const [avisoMigracaoRenovacao, setAvisoMigracaoRenovacao] = useState<
    string | null
  >(null);
  const [parametrosLocais, setParametrosLocais] =
    useState<OrcamentoAprovacaoRecord | null>(null);
  const loadSeq = useRef(0);
  const padraoRenovacaoRef = useRef<string | null>(null);

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
  const isPericulosidade = tipoDocumento === "periculosidade";
  const isPgr = tipoDocumento === "pgr";
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
  const pagamentoAvistaPlano =
    isMensalidadeDoc && aprovacaoContrato.mensalidade_pagamento === "avista";
  const diaEfetivo = regraVencimento
    ? null
    : diaVencimentoMensalidadeValido(diaVencimento) ??
      diaVencimentoMensalidadeValido(aprovacaoContrato.mensalidade_dia_vencimento);
  const regraEfetiva = regraVencimento
    ? MENSALIDADE_VENCIMENTO_QUINTO_DIA_UTIL
    : vencimentoMensalidadeQuintoDiaUtil(
          aprovacaoContrato.mensalidade_vencimento_regra
        ) && diaEfetivo == null
      ? MENSALIDADE_VENCIMENTO_QUINTO_DIA_UTIL
      : null;
  const diaPendente =
    isMensalidadeDoc &&
    !pagamentoAvistaPlano &&
    diaEfetivo == null &&
    regraEfetiva == null;
  const renovacaoSalva = renovacaoContratoSalva(
    aprovacaoContrato.mensalidade_renovacao_automatica
  );
  const renovacaoExibicao =
    renovacaoLocal ??
    renovacaoSalva ??
    (contratoAssinado ? null : "automatica");
  const renovacaoPendente = isMensalidadeDoc && renovacaoSalva == null;
  const parcelasValores = useMemo(
    () =>
      montarParcelasPontual({
        valorTotal: valorContrato,
        quantidadeParcelas: quantidadeCronograma,
        dataContrato: hojeIsoLocal(),
      }),
    [quantidadeCronograma, valorContrato]
  );
  const substituidos = documentos.filter(
    (doc) => !doc.sem_validade_em && Boolean(doc.substituido_em)
  );
  const vigentes = documentos.filter(
    (doc) => !doc.sem_validade_em && !doc.substituido_em
  );
  const semValidade = documentos.filter((doc) => Boolean(doc.sem_validade_em));
  const atual = vigentes[0] ?? null;
  const modeloPdfAtual =
    isMensalidadeDoc && atual ? modeloContratualDoPdfSalvo(atual) : null;
  const anteriores = vigentes.slice(1);
  const atualDesatualizado = atual
    ? pdfContratoEstaDesatualizado(atual, aprovacaoContrato)
    : false;

  const carregar = useCallback(async () => {
    const seq = ++loadSeq.current;
    setLoadingDocs(true);
    try {
      const rows = await listarContratoDocumentos(aprovacao.id);
      let alteracao = false;
      try {
        alteracao = await existeAlteracaoContratacao(aprovacao.id);
      } catch (alteracaoErr) {
        console.error(alteracaoErr);
      }
      if (seq !== loadSeq.current) return;
      setDocumentos(rows);
      setTemAlteracao(alteracao);
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
  }, [aprovacao.id, aprovacao.updated_at]);

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
    setRenovacaoLocal(null);
    setParametrosLocais(null);
    padraoRenovacaoRef.current = null;
  }, [aprovacao.id]);

  useEffect(() => {
    setDiaVencimento(
      diaVencimentoMensalidadeValido(aprovacao.mensalidade_dia_vencimento)
    );
    setRegraVencimento(
      vencimentoMensalidadeQuintoDiaUtil(aprovacao.mensalidade_vencimento_regra)
        ? MENSALIDADE_VENCIMENTO_QUINTO_DIA_UTIL
        : null
    );
  }, [
    aprovacao.id,
    aprovacao.mensalidade_dia_vencimento,
    aprovacao.mensalidade_vencimento_regra,
  ]);

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
          diaVencimentoMensalidade: pagamentoAvistaPlano ? null : diaEfetivo,
          vencimentoRegraMensalidade: pagamentoAvistaPlano ? null : regraEfetiva,
        })
      );
    } catch {
      return null;
    }
  }, [
    aprovacaoContrato,
    dataContrato,
    diaEfetivo,
    regraEfetiva,
    orcamentoContrato,
    pagamentoAvistaPlano,
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
    if (renovacaoPendente) {
      toast.error(RENOVACAO_CONTRATO_PENDENTE_MSG);
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
    if (renovacaoPendente) {
      toast.error(RENOVACAO_CONTRATO_PENDENTE_MSG);
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
        diaVencimentoMensalidade: pagamentoAvistaPlano ? null : diaEfetivo,
        vencimentoRegraMensalidade: pagamentoAvistaPlano ? null : regraEfetiva,
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
          arquivo_nome: nomeArquivoComModeloContrato(
            pdf.filename,
            resolverModeloContratualParaGeracao(previewDoc.modalidade)
          ),
          arquivo_tipo: "application/pdf",
          arquivo_tamanho: file.size,
          gerado_por: auditContext.usuarioNome,
          gerado_por_user_id: auditContext.usuarioId,
        },
      });

      aplicarDocumentoSalvo(saved);
      if (aprovacao.contrato_versao_situacao === "pendente_geracao") {
        const atualizada = await buscarAprovacaoPorOrcamentoId(orcamento.id);
        if (atualizada) onAprovacaoAtualizada?.(atualizada);
      }
      const regenerado = saved.versao > 1;
      const novaVersao =
        aprovacao.contrato_versao_situacao === "pendente_geracao";
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
            ? `${auditContext.usuarioNome} regenerou o PDF do contrato (PDF v${saved.versao}) do orçamento ${orcamento.numero} (${previewDoc.modalidade}).`
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
        novaVersao
          ? "Nova versão do contrato gerada. Envio e assinatura continuam como não."
          : regenerado
            ? "Novo PDF do contrato gerado. O arquivo anterior permanece no histórico, e o acompanhamento de envio/assinatura não foi alterado."
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

  async function handleEscolherRenovacao(escolha: RenovacaoContratoGestao) {
    if (contratoAssinado || working) return;
    if (escolha === renovacaoExibicao && renovacaoSalva === escolha) return;
    const anterior = renovacaoLocal;
    setRenovacaoLocal(escolha);
    setWorking(true);
    try {
      const atualizada = await salvarRenovacaoContratoMensalidade({
        aprovacaoId: aprovacao.id,
        renovacaoAutomatica: escolha === "automatica",
      });
      setParametrosLocais(atualizada);
      onAprovacaoAtualizada?.(atualizada);
      setAvisoMigracaoRenovacao(null);
      const revisao = revisaoCondicoesAprovacao(atualizada);
      if (revisao != null) setRevisaoVigente(revisao);
    } catch (err) {
      console.error(err);
      setRenovacaoLocal(anterior);
      const detalhe = mensagemErroContratoDocumento(
        err,
        "Não foi possível salvar a renovação do contrato."
      );
      const faltaColuna =
        /mensalidade_renovacao_automatica|schema cache|42703/i.test(detalhe);
      if (faltaColuna) {
        setAvisoMigracaoRenovacao(RENOVACAO_CONTRATO_MIGRATION_MSG);
      }
      toast.error(faltaColuna ? RENOVACAO_CONTRATO_MIGRATION_MSG : detalhe);
    } finally {
      setWorking(false);
    }
  }

  useEffect(() => {
    if (!isMensalidadeDoc || contratoAssinado) return;
    if (aprovacao.mensalidade_renovacao_automatica === false) return;
    if (renovacaoContratoSalva(aprovacao.mensalidade_renovacao_automatica)) {
      return;
    }
    if (padraoRenovacaoRef.current === aprovacao.id) return;
    padraoRenovacaoRef.current = aprovacao.id;
    void handleEscolherRenovacao("automatica");
  }, [
    aprovacao.id,
    aprovacao.mensalidade_renovacao_automatica,
    contratoAssinado,
    isMensalidadeDoc,
  ]);

  async function handleEscolherDia(dia: DiaVencimentoMensalidade) {
    if (contratoAssinado || working || (dia === diaEfetivo && !regraEfetiva)) return;
    const anterior = diaVencimento;
    const regraAnterior = regraVencimento;
    setDiaVencimento(dia);
    setRegraVencimento(null);
    setWorking(true);
    try {
      const atualizada = await salvarParametrosContratoMensalidade({
        aprovacaoId: aprovacao.id,
        vencimento: { tipo: "dia_fixo", dia },
      });
      setParametrosLocais(atualizada);
      onAprovacaoAtualizada?.(atualizada);
      const revisao = revisaoCondicoesAprovacao(atualizada);
      if (revisao != null) setRevisaoVigente(revisao);
    } catch (err) {
      console.error(err);
      setDiaVencimento(anterior);
      setRegraVencimento(regraAnterior);
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

  async function handleEscolherQuintoDiaUtil() {
    if (contratoAssinado || working || regraEfetiva) return;
    const anterior = diaVencimento;
    const regraAnterior = regraVencimento;
    setDiaVencimento(null);
    setRegraVencimento(MENSALIDADE_VENCIMENTO_QUINTO_DIA_UTIL);
    setWorking(true);
    try {
      const atualizada = await salvarParametrosContratoMensalidade({
        aprovacaoId: aprovacao.id,
        vencimento: { tipo: "quinto_dia_util" },
      });
      setParametrosLocais(atualizada);
      onAprovacaoAtualizada?.(atualizada);
      const revisao = revisaoCondicoesAprovacao(atualizada);
      if (revisao != null) setRevisaoVigente(revisao);
    } catch (err) {
      console.error(err);
      setDiaVencimento(anterior);
      setRegraVencimento(regraAnterior);
      const detalhe = mensagemErroContratoDocumento(
        err,
        "Não foi possível salvar o 5º dia útil das mensalidades."
      );
      const faltaColuna =
        /mensalidade_vencimento_regra|schema cache|42703/i.test(detalhe);
      toast.error(
        faltaColuna
          ? `${detalhe} Execute a migration 152_contrato_modelo_gestao_sst.sql.`
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

  const situacaoVersao = aprovacao.contrato_versao_situacao ?? null;
  const revisaoAberta =
    !contratoAssinado &&
    (situacaoVersao === "pendente_geracao" || situacaoVersao === "gerado");
  const podePrepararNovaVersao =
    isPerfilAdmin(profile?.perfil) &&
    temAlteracao &&
    !revisaoAberta &&
    (contratoAssinado || (substituidos.length > 0 && !atual));
  const rotuloGerar = rotuloBotaoGerarContrato({
    temPdfAtual: Boolean(atual),
    desatualizado: atualDesatualizado,
    situacao: situacaoVersao,
  });

  async function handlePrepararNovaVersao() {
    if (preparandoRef.current) return;
    preparandoRef.current = true;
    setWorking(true);
    try {
      const atualizada = await prepararNovaVersaoContrato({
        aprovacaoId: aprovacao.id,
        orcamentoId: orcamento.id,
      });
      onAprovacaoAtualizada?.(atualizada);
      toast.success(
        "Nova versão preparada. O PDF anterior permanece no histórico. Gere o contrato nesta aba."
      );
      await carregar();
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error
          ? err.message
          : "Não foi possível preparar a nova versão do contrato."
      );
    } finally {
      preparandoRef.current = false;
      setWorking(false);
    }
  }

  const busy = disabled || working;

  return (
    <section className="rounded-xl border border-[#dbe4f0] bg-[#f8fbff] px-4 py-3.5">
      <div>
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-navy">
            Contrato automático
          </p>
          <p className="mt-1 text-[12px] text-[#475569]">
            {motivoBloqueio
              ? motivoBloqueio
              : isParecer
                ? "Contrato específico do Laudo de Parecer Técnico. Gera o PDF da contratação. Não marca como enviado nem assinado e não altera o contrato SST."
                : isPericulosidade
                  ? "Contrato específico do Laudo Técnico de Periculosidade (NR-16). Gera o PDF da contratação pontual. Não marca como enviado nem assinado e não altera o contrato SST."
                  : isPgr
                    ? "Contrato específico do PGR – Programa de Gerenciamento de Riscos. Gera o PDF da contratação pontual. Não marca como enviado nem assinado e não altera o contrato SST."
                : isAet
                  ? "Contrato específico do Laudo AET – Análise Ergonômica do Trabalho. Gera o PDF da contratação pontual. Não marca como enviado nem assinado e não altera o contrato SST."
                  : "Gera o PDF a partir do orçamento aprovado. Não marca como enviado nem assinado."}
          </p>
          {atual ? (
            <p className="mt-1 text-[12px] text-[#334155]">
              Versão do PDF: <strong>v{atual.versao}</strong>
              {" · "}
              {formatDateTimeBR(atual.gerado_em)}
              {atual.gerado_por ? ` · ${atual.gerado_por}` : ""}
              {atualDesatualizado ? " · desatualizado" : ""}
            </p>
          ) : loadingDocs ? (
            <p className="mt-1 text-[12px] text-[#64748b]">Carregando…</p>
          ) : (
            <p className="mt-1 text-[12px] text-[#64748b]">
              {substituidos.length > 0
                ? "Nenhum PDF atual. A versão anterior foi substituída e permanece no histórico. Gere a nova versão nesta tela. Ela não é enviada ao cliente."
                : semValidade.length > 0
                  ? "Nenhum contrato vigente. O PDF da aprovação revertida permanece no histórico, sem validade."
                  : "Nenhum contrato gerado ainda."}
            </p>
          )}
          {atualDesatualizado ? (
            <p className="mt-1 text-[12px] font-semibold text-[#b45309]">
              Este PDF está desatualizado em relação às condições comerciais
              vigentes. Gere o PDF novamente. O arquivo anterior permanece no
              histórico.
            </p>
          ) : null}
          {modeloPdfAtual != null ? (
            <p className="mt-1 text-[12px] text-[#334155]">
              Modelo deste PDF:{" "}
              <strong>{rotuloModeloContratualGestaoSst(modeloPdfAtual)}</strong>
            </p>
          ) : null}
          {modeloPdfAtual === 1 && !contratoAssinado ? (
            <p className="mt-1 text-[12px] text-[#334155]">
              Gerar novamente cria outro PDF, com as condições atualizadas da
              Gestão SST e o Anexo I. Este arquivo permanece no histórico.
            </p>
          ) : null}
      </div>

      {isMensalidadeDoc ? (
        <div className="mt-3 rounded-lg border border-[#e4ebf4] bg-white px-3 py-2.5">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-navy">
            Renovação do contrato
          </p>
          <p className="mt-1 text-[11px] text-[#64748b]">
            Automática é o padrão das novas contratações. Use a outra opção
            quando a ausência de renovação automática tiver sido negociada.
          </p>
          {avisoMigracaoRenovacao ? (
            <p className="mt-1 text-[12px] font-semibold text-[#b45309]">
              {avisoMigracaoRenovacao}
            </p>
          ) : null}
          {contratoAssinado ? (
            <p className="mt-1 text-[12px] text-[#64748b]">
              Condição registrada apenas para consulta. A renovação não pode
              ser alterada.
            </p>
          ) : atual ? (
            <p className="mt-1 text-[12px] text-[#92400e]">
              {RENOVACAO_CONTRATO_NOVA_VERSAO_MSG}
            </p>
          ) : null}
          {renovacaoPendente && !contratoAssinado && !avisoMigracaoRenovacao ? (
            <p className="mt-1 text-[12px] font-semibold text-[#b45309]">
              {RENOVACAO_CONTRATO_PENDENTE_MSG}
            </p>
          ) : null}
          <div className="mt-2 flex flex-col gap-1.5 text-[12px] text-[#334155]">
            {RENOVACAO_CONTRATO_OPCOES.map((opcao) => (
              <label key={opcao.id} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`renovacao-contrato-${aprovacao.id}`}
                  checked={renovacaoExibicao === opcao.id}
                  disabled={busy || contratoAssinado}
                  onChange={() => void handleEscolherRenovacao(opcao.id)}
                />
                <span>{opcao.label}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
          {motivoBloqueio ? null : !atual ? (
            <button
              type="button"
              className="btn btn-primary justify-center text-[12px]"
              disabled={
                busy ||
                !podeGerar ||
                contratoAssinado ||
                parecerAguardandoEscolha ||
                diaPendente ||
                renovacaoPendente
              }
              onClick={() => void handleAbrirConferencia()}
            >
              {rotuloGerar}
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
                  diaPendente ||
                  renovacaoPendente
                }
                onClick={() => void handleAbrirConferencia()}
              >
                {rotuloGerar}
              </button>
            </>
          )}
      </div>

      {isMensalidadeDoc && !pagamentoAvistaPlano ? (
        <div className="mt-3 rounded-lg border border-[#e4ebf4] bg-white px-3 py-2.5">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-navy">
            Dia de vencimento das mensalidades
          </p>
          <p className="mt-1 text-[11px] text-[#64748b]">
            Escolha dia 10, dia 20 ou o 5º dia útil. A primeira mensalidade
            vence no mês seguinte ao início da vigência. O 5º dia útil não é o
            dia 05. As faturas de exames continuam vencendo no quinto dia útil
            do mês seguinte aos atendimentos, em cobrança separada.
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
                  checked={diaEfetivo === dia && !regraEfetiva}
                  disabled={busy || contratoAssinado}
                  onChange={() => void handleEscolherDia(dia)}
                />
                <span>Dia {dia}</span>
              </label>
            ))}
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name={`mensalidade-dia-vencimento-${aprovacao.id}`}
                checked={regraEfetiva === MENSALIDADE_VENCIMENTO_QUINTO_DIA_UTIL}
                disabled={busy || contratoAssinado}
                onChange={() => void handleEscolherQuintoDiaUtil()}
              />
              <span>5º dia útil</span>
            </label>
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

      {situacaoVersao === "pendente_geracao" && !contratoAssinado ? (
        <div className="mt-3 rounded-lg border border-[#f3d19c] bg-[#fff8eb] px-3 py-2 text-[12px] text-[#7c4a03]">
          <p className="font-semibold">
            A alteração da contratação abriu uma nova versão do contrato. Ela
            ainda não foi gerada nem assinada. O documento anterior permanece
            no histórico, com o envio e a assinatura daquela versão.
          </p>
        </div>
      ) : situacaoVersao === "gerado" && !contratoAssinado && !aprovacao.contrato_enviado ? (
        <div className="mt-3 rounded-lg border border-[#dbeafe] bg-[#f8fbff] px-3 py-2 text-[12px] text-[#1e3a8a]">
          <p className="font-semibold">
            A nova versão do contrato foi gerada e ainda não foi enviada nem
            assinada. A formalização só se conclui quando esta versão for
            assinada.
          </p>
        </div>
      ) : podePrepararNovaVersao ? (
        <div className="mt-3 rounded-lg border border-[#f3d19c] bg-[#fff8eb] px-3 py-2 text-[12px] text-[#7c4a03]">
          <p className="font-semibold">
            A alteração da contratação já está registrada. Prepare a nova
            versão para gerar o contrato atualizado, sem repetir a mudança de
            quantidade, mensalidade ou parcelas. O PDF anterior permanece no
            histórico.
          </p>
          <button
            type="button"
            className="btn mt-2 justify-center text-[12px]"
            disabled={busy}
            onClick={() => void handlePrepararNovaVersao()}
          >
            Preparar nova versão
          </button>
        </div>
      ) : null}

      {substituidos.length > 0 ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-[12px] font-semibold text-navy">
            PDFs substituídos ({substituidos.length})
          </summary>
          <ul className="mt-2 space-y-1.5">
            {substituidos.map((doc) => (
              <li
                key={doc.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#e4ebf4] bg-white px-3 py-2 text-[12px] text-[#475569]"
              >
                <span>
                  PDF v{doc.versao}
                  {isMensalidadeDoc
                    ? ` · ${rotuloModeloContratualGestaoSst(modeloContratualDoPdfSalvo(doc))}`
                    : ""}
                  {" · "}
                  {formatDateTimeBR(doc.gerado_em)}
                  {doc.gerado_por ? ` · ${doc.gerado_por}` : ""}
                  {" · Substituída"}
                  {textoAcompanhamentoVersaoAnterior(doc, formatDateIsoToBR)
                    ? ` · ${textoAcompanhamentoVersaoAnterior(doc, formatDateIsoToBR)}`
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

      {anteriores.length > 0 ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-[12px] font-semibold text-navy">
            PDFs anteriores ({anteriores.length})
          </summary>
          <ul className="mt-2 space-y-1.5">
            {anteriores.map((doc) => (
              <li
                key={doc.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#e4ebf4] bg-white px-3 py-2 text-[12px] text-[#475569]"
              >
                <span>
                  PDF v{doc.versao}
                  {isMensalidadeDoc
                    ? ` · ${rotuloModeloContratualGestaoSst(modeloContratualDoPdfSalvo(doc))}`
                    : ""}
                  {" · "}
                  {formatDateTimeBR(doc.gerado_em)}
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

      {semValidade.length > 0 ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-[12px] font-semibold text-navy">
            Aprovação revertida, sem validade ({semValidade.length})
          </summary>
          <ul className="mt-2 space-y-1.5">
            {semValidade.map((doc) => (
              <li
                key={doc.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#e4ebf4] bg-white px-3 py-2 text-[12px] text-[#475569]"
              >
                <span>
                  PDF v{doc.versao}
                  {isMensalidadeDoc
                    ? ` · ${rotuloModeloContratualGestaoSst(modeloContratualDoPdfSalvo(doc))}`
                    : ""}
                  {" · "}
                  {formatDateTimeBR(doc.gerado_em)}
                  {doc.gerado_por ? ` · ${doc.gerado_por}` : ""}
                  {" · sem validade"}
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
                      ? "O vencimento do pagamento à vista é a data do contrato. A quitação depende da confirmação do recebimento. O dia das mensalidades da renovação será definido na preparação da renovação."
                      : isMensalidadeDoc
                        ? "A data do contrato identifica o documento. A primeira mensalidade vence no dia escolhido, no mês seguinte ao início da vigência."
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
                        label={
                          isAet || isParecer || isPericulosidade || isPgr
                            ? "Serviço"
                            : "Modalidade"
                        }
                        value={resumo.modalidade}
                      />
                      {isAet || isParecer || isPericulosidade || isPgr ? null : (
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
