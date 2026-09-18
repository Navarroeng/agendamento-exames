"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { gerarPdfContratoNavarro } from "@/lib/contrato-pdf";
import { isOrcamentoMensalidade } from "@/lib/orcamento-modalidade";
import { orcamentoEhExclusivoAet } from "@/lib/servico-aet";
import { mensagemErroContratoDocumento } from "@/lib/contrato-documento-erro";
import type { OrcamentoAprovacaoRecord } from "@/lib/orcamento-aprovacao";
import type { OrcamentoContratoDocumentoRecord } from "@/lib/orcamento-contrato-documento";
import type { OrcamentoComItens } from "@/lib/orcamento-types";
import { registrarAuditoria } from "@/services/auditoria.service";
import {
  listarContratoDocumentos,
  obterUrlContratoDocumento,
  persistirContratoDocumentoGerado,
  proximaVersaoContratoDocumento,
} from "@/services/orcamento-contrato-documento.service";

type EtapaFluxo = "idle" | "conferencia" | "preview";

export function OrcamentoContratoGerarPanel({
  orcamento,
  aprovacao,
  disabled = false,
}: {
  orcamento: OrcamentoComItens;
  aprovacao: OrcamentoAprovacaoRecord;
  disabled?: boolean;
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

  const podeGerar = podeGerarContratoNavarro(orcamento, aprovacao);
  const motivoBloqueio = motivoBloqueioGeracaoContrato(orcamento, aprovacao);
  const isAet = orcamentoEhExclusivoAet(
    aprovacao.orcamento_aprovacao_itens?.length
      ? aprovacao.orcamento_aprovacao_itens
      : orcamento.orcamento_itens
  );
  const atual = documentos[0] ?? null;
  const anteriores = documentos.slice(1);

  const carregar = useCallback(async () => {
    setLoadingDocs(true);
    try {
      const rows = await listarContratoDocumentos(aprovacao.id);
      setDocumentos(rows);
    } catch (err) {
      console.error(err);
      toast.error(
        mensagemErroContratoDocumento(
          err,
          "Não foi possível carregar os contratos gerados."
        )
      );
    } finally {
      setLoadingDocs(false);
    }
  }, [aprovacao.id]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const resumo = useMemo(() => {
    if (!podeGerar) return null;
    try {
      return resumoConferenciaContrato(
        buildContratoNavarroDocumento({
          orcamento,
          aprovacao,
          dataContrato,
        })
      );
    } catch {
      return null;
    }
  }, [aprovacao, dataContrato, orcamento, podeGerar]);

  function fecharFluxo() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewDoc(null);
    setEtapa("idle");
  }

  async function handleAbrirConferencia() {
    if (!podeGerar) {
      toast.error("É necessário um orçamento aprovado com dados do cliente.");
      return;
    }
    setDataContrato(hojeIsoLocal());
    setEtapa("conferencia");
  }

  async function handleVisualizarRascunho() {
    if (!podeGerar) return;
    setWorking(true);
    try {
      const documento = buildContratoNavarroDocumento({
        orcamento,
        aprovacao,
        dataContrato,
      });
      const pdf = await gerarPdfContratoNavarro(documento);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const url = URL.createObjectURL(pdf.blob);
      setPreviewUrl(url);
      setPreviewDoc(documento);
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
    setWorking(true);
    try {
      const versao = await proximaVersaoContratoDocumento(aprovacao.id);
      const pdf = await gerarPdfContratoNavarro(previewDoc);
      const file = new File([new Uint8Array(pdf.arrayBuffer)], pdf.filename, {
        type: "application/pdf",
      });
      const saved = await persistirContratoDocumentoGerado({
        file,
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

      const regenerado = versao > 1;
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
        },
      });

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

  async function abrirDocumento(doc: OrcamentoContratoDocumentoRecord) {
    setWorking(true);
    try {
      const url = await obterUrlContratoDocumento(doc.storage_path);
      setViewUrl(url);
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
    try {
      const url = await obterUrlContratoDocumento(doc.storage_path);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.arquivo_nome;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.click();
    } catch (err) {
      console.error(err);
      toast.error(
        mensagemErroContratoDocumento(err, "Não foi possível baixar o contrato.")
      );
    } finally {
      setWorking(false);
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
            </p>
          ) : loadingDocs ? (
            <p className="mt-1 text-[12px] text-[#64748b]">Carregando…</p>
          ) : (
            <p className="mt-1 text-[12px] text-[#64748b]">
              Nenhum contrato gerado ainda.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {motivoBloqueio ? null : !atual ? (
            <button
              type="button"
              className="btn btn-primary justify-center text-[12px]"
              disabled={busy || !podeGerar}
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
                disabled={busy || !podeGerar}
                onClick={() => void handleAbrirConferencia()}
              >
                Gerar novamente
              </button>
            </>
          )}
        </div>
      </div>

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
                    A data do contrato define o documento, a primeira parcela e
                    a vigência, quando aplicável.
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4">
                  {etapa === "conferencia" && resumo ? (
                    <div className="space-y-3 text-[13px] text-[#334155]">
                      <Row label="Cliente" value={resumo.cliente} />
                      <Row label="CNPJ" value={resumo.cnpj} />
                      <Row label="Orçamento" value={resumo.orcamento} />
                      <Row
                        label={isAet ? "Serviço" : "Modalidade"}
                        value={resumo.modalidade}
                      />
                      {isAet ? null : (
                        <Row
                          label="Colaboradores"
                          value={resumo.colaboradores}
                        />
                      )}
                      <Row
                        label={
                          isOrcamentoMensalidade(orcamento.modalidade)
                            ? "Valor mensal"
                            : "Valor"
                        }
                        value={resumo.valor}
                      />
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
                onClick={() => setViewUrl(null)}
              />
              <div className="relative z-[81] flex max-h-[92vh] w-full max-w-[860px] flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-[#e4ebf4] px-5 py-3">
                  <h3 className="text-[15px] font-extrabold text-navy">
                    Contrato gerado
                  </h3>
                  <button
                    type="button"
                    className="btn justify-center text-[12px]"
                    onClick={() => setViewUrl(null)}
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
