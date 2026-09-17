"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuditoriaUsuario } from "@/contexts/AuthContext";
import { AUDITORIA_ACOES, AUDITORIA_MODULOS } from "@/lib/auditoria";
import {
  type ImplantacaoAetDocumentoRecord,
  type ImplantacaoAetElaboracaoStatus,
  type ImplantacaoAetRecord,
  type ImplantacaoAetVisitaStatus,
} from "@/lib/implantacao-aet";
import { registrarAuditoria } from "@/services/auditoria.service";
import {
  garantirImplantacaoAet,
  inserirDocumentoAet,
  listarDocumentosAet,
  removerDocumentoAet,
  removerLaudoAet,
  salvarDocumentosConferidosAet,
  salvarElaboracaoAet,
  salvarEnvioAet,
  salvarLaudoAet,
  salvarVisitaAet,
} from "@/services/implantacao-aet.service";
import {
  obterUrlOrcamentoOnboarding,
  removerArquivoOrcamentoOnboarding,
  uploadAetDocumentoEmpresa,
  uploadAetLaudoPdf,
} from "@/services/orcamento-onboarding-storage.service";

export function emptyAetVisitaForm() {
  return {
    visita_status: "aguardando_agendamento" as ImplantacaoAetVisitaStatus,
    visita_data: "",
    visita_horario: "",
    visita_responsavel: "",
    visita_observacao: "",
  };
}

export function emptyAetElaboracaoForm() {
  return {
    elaboracao_status: "aguardando" as ImplantacaoAetElaboracaoStatus,
    elaboracao_observacao: "",
  };
}

export function emptyAetEnvioForm() {
  return {
    enviado_cliente: false,
    enviado_em: "",
    envio_observacao: "",
  };
}

function formsFromAet(aet: ImplantacaoAetRecord | null) {
  return {
    visita: aet
      ? {
          visita_status: aet.visita_status,
          visita_data: aet.visita_data ?? "",
          visita_horario: aet.visita_horario ?? "",
          visita_responsavel: aet.visita_responsavel ?? "",
          visita_observacao: aet.visita_observacao ?? "",
        }
      : emptyAetVisitaForm(),
    elaboracao: aet
      ? {
          elaboracao_status: aet.elaboracao_status,
          elaboracao_observacao: aet.elaboracao_observacao ?? "",
        }
      : emptyAetElaboracaoForm(),
    envio: aet
      ? {
          enviado_cliente: Boolean(aet.enviado_cliente),
          enviado_em: aet.enviado_em ?? "",
          envio_observacao: aet.envio_observacao ?? "",
        }
      : emptyAetEnvioForm(),
  };
}

export function useOrcamentoAetEtapas(params: {
  enabled: boolean;
  orcamentoId: string | null;
  aprovacaoId: string | null;
  orcamentoNumero: string | null;
}) {
  const auditContext = useAuditoriaUsuario();
  const [aet, setAet] = useState<ImplantacaoAetRecord | null>(null);
  const [documentos, setDocumentos] = useState<ImplantacaoAetDocumentoRecord[]>(
    []
  );
  const [visitaForm, setVisitaForm] = useState(emptyAetVisitaForm);
  const [elaboracaoForm, setElaboracaoForm] = useState(emptyAetElaboracaoForm);
  const [envioForm, setEnvioForm] = useState(emptyAetEnvioForm);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    if (!params.enabled || !params.orcamentoId || !params.aprovacaoId) {
      setAet(null);
      setDocumentos([]);
      return null;
    }
    const row = await garantirImplantacaoAet({
      orcamentoId: params.orcamentoId,
      aprovacaoId: params.aprovacaoId,
      usuarioNome: auditContext.usuarioNome,
    });
    const docs = await listarDocumentosAet(row.id);
    setAet(row);
    setDocumentos(docs);
    const forms = formsFromAet(row);
    setVisitaForm(forms.visita);
    setElaboracaoForm(forms.elaboracao);
    setEnvioForm(forms.envio);
    return row;
  }, [
    auditContext.usuarioNome,
    params.aprovacaoId,
    params.enabled,
    params.orcamentoId,
  ]);

  useEffect(() => {
    if (!params.enabled) {
      setAet(null);
      setDocumentos([]);
      return;
    }
    void reload().catch((err) => {
      console.error(err);
      toast.error("Não foi possível carregar o acompanhamento do AET.");
    });
  }, [params.enabled, reload]);

  async function audit(
    acao: (typeof AUDITORIA_ACOES)[keyof typeof AUDITORIA_ACOES],
    descricao: string,
    dadosDepois?: Record<string, unknown>
  ) {
    await registrarAuditoria({
      ...auditContext,
      modulo: AUDITORIA_MODULOS.implantacao_clientes,
      acao,
      registroId: params.orcamentoId,
      registroNome: params.orcamentoNumero,
      descricao,
      dadosDepois,
    });
  }

  async function handleToggleDocumentosConferidos(conferidos: boolean) {
    if (!aet) return;
    setSaving(true);
    try {
      const saved = await salvarDocumentosConferidosAet({
        aetId: aet.id,
        conferidos,
        usuarioNome: auditContext.usuarioNome,
      });
      setAet(saved);
      toast.success(
        conferidos
          ? "Documentos marcados como conferidos."
          : "Conferência de documentos desmarcada."
      );
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error
          ? err.message
          : "Não foi possível salvar a conferência dos documentos."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleUploadDocumento(file: File | null) {
    if (!file || !aet || !params.aprovacaoId) return;
    setSaving(true);
    try {
      const uploaded = await uploadAetDocumentoEmpresa(params.aprovacaoId, file);
      await inserirDocumentoAet({
        aetId: aet.id,
        storagePath: uploaded.path,
        arquivoNome: uploaded.nome,
        arquivoTipo: uploaded.tipo,
        arquivoTamanho: uploaded.tamanho,
        usuarioNome: auditContext.usuarioNome,
        usuarioId: auditContext.usuarioId,
      });
      await audit(
        AUDITORIA_ACOES.implantacao_aet_documento_anexado,
        `${auditContext.usuarioNome} anexou um documento da empresa no AET.`,
        { arquivo_nome: uploaded.nome }
      );
      setDocumentos(await listarDocumentosAet(aet.id));
      toast.success("Documento anexado.");
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Não foi possível anexar o documento."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoverDocumento(doc: ImplantacaoAetDocumentoRecord) {
    if (!aet) return;
    setSaving(true);
    try {
      await removerDocumentoAet(doc.id);
      await removerArquivoOrcamentoOnboarding(doc.storage_path);
      await audit(
        AUDITORIA_ACOES.implantacao_aet_documento_removido,
        `${auditContext.usuarioNome} removeu um documento da empresa do AET.`,
        { arquivo_nome: doc.arquivo_nome }
      );
      setDocumentos(await listarDocumentosAet(aet.id));
      toast.success("Documento removido.");
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível remover o documento.");
    } finally {
      setSaving(false);
    }
  }

  async function abrirArquivo(path: string, downloadName?: string) {
    const url = await obterUrlOrcamentoOnboarding(path);
    if (downloadName) {
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadName;
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleSalvarVisita() {
    if (!aet) return;
    setSaving(true);
    try {
      const saved = await salvarVisitaAet({
        aetId: aet.id,
        payload: {
          visita_status: visitaForm.visita_status,
          visita_data: visitaForm.visita_data || null,
          visita_horario: visitaForm.visita_horario.trim() || null,
          visita_responsavel: visitaForm.visita_responsavel.trim() || null,
          visita_observacao: visitaForm.visita_observacao.trim() || null,
        },
        usuarioNome: auditContext.usuarioNome,
      });
      setAet(saved);
      const acao =
        saved.visita_status === "realizada"
          ? AUDITORIA_ACOES.implantacao_aet_visita_realizada
          : AUDITORIA_ACOES.implantacao_aet_visita_agendada;
      await audit(
        acao,
        saved.visita_status === "realizada"
          ? `${auditContext.usuarioNome} registrou a visita do AET como realizada.`
          : `${auditContext.usuarioNome} atualizou o agendamento da visita do AET.`,
        { visita_status: saved.visita_status, visita_data: saved.visita_data }
      );
      toast.success("Visita salva.");
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Não foi possível salvar a visita."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleUploadLaudo(file: File | null) {
    if (!file || !aet || !params.aprovacaoId) return;
    setSaving(true);
    try {
      if (aet.laudo_path) {
        await removerArquivoOrcamentoOnboarding(aet.laudo_path);
      }
      const uploaded = await uploadAetLaudoPdf(params.aprovacaoId, file);
      const saved = await salvarLaudoAet({
        aetId: aet.id,
        fileMeta: uploaded,
        usuarioNome: auditContext.usuarioNome,
      });
      setAet(saved);
      await audit(
        AUDITORIA_ACOES.implantacao_aet_laudo_anexado,
        `${auditContext.usuarioNome} anexou o Laudo AET final.`,
        { arquivo_nome: uploaded.nome }
      );
      toast.success("Laudo AET anexado.");
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Não foi possível anexar o laudo."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoverLaudo() {
    if (!aet) return;
    setSaving(true);
    try {
      const path = aet.laudo_path;
      const saved = await removerLaudoAet({
        aetId: aet.id,
        usuarioNome: auditContext.usuarioNome,
      });
      if (path) await removerArquivoOrcamentoOnboarding(path);
      setAet(saved);
      setElaboracaoForm((prev) => ({
        ...prev,
        elaboracao_status: saved.elaboracao_status,
      }));
      toast.success("Laudo removido.");
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível remover o laudo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSalvarElaboracao() {
    if (!aet) return;
    setSaving(true);
    try {
      const saved = await salvarElaboracaoAet({
        aet,
        payload: {
          elaboracao_status: elaboracaoForm.elaboracao_status,
          elaboracao_observacao:
            elaboracaoForm.elaboracao_observacao.trim() || null,
        },
        usuarioNome: auditContext.usuarioNome,
      });
      setAet(saved);
      const acao =
        saved.elaboracao_status === "concluido"
          ? AUDITORIA_ACOES.implantacao_aet_elaboracao_concluida
          : AUDITORIA_ACOES.implantacao_aet_elaboracao_iniciada;
      await audit(
        acao,
        saved.elaboracao_status === "concluido"
          ? `${auditContext.usuarioNome} concluiu a elaboração do AET.`
          : `${auditContext.usuarioNome} atualizou a elaboração do AET.`,
        { elaboracao_status: saved.elaboracao_status }
      );
      toast.success("Elaboração salva.");
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error
          ? err.message
          : "Não foi possível salvar a elaboração."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSalvarEnvio() {
    if (!aet) return;
    setSaving(true);
    try {
      const saved = await salvarEnvioAet({
        aet,
        payload: {
          enviado_cliente: envioForm.enviado_cliente,
          enviado_em: envioForm.enviado_em || null,
          envio_observacao: envioForm.envio_observacao.trim() || null,
        },
        usuarioNome: auditContext.usuarioNome,
      });
      setAet(saved);
      if (saved.enviado_cliente) {
        await audit(
          AUDITORIA_ACOES.implantacao_aet_envio_confirmado,
          `${auditContext.usuarioNome} confirmou o envio do AET ao cliente.`,
          { enviado_em: saved.enviado_em }
        );
      }
      toast.success("Envio salvo.");
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Não foi possível salvar o envio."
      );
    } finally {
      setSaving(false);
    }
  }

  return {
    aet,
    documentos,
    visitaForm,
    setVisitaForm,
    elaboracaoForm,
    setElaboracaoForm,
    envioForm,
    setEnvioForm,
    saving,
    handleToggleDocumentosConferidos,
    handleUploadDocumento,
    handleRemoverDocumento,
    abrirArquivo,
    handleSalvarVisita,
    handleUploadLaudo,
    handleRemoverLaudo,
    handleSalvarElaboracao,
    handleSalvarEnvio,
  };
}
