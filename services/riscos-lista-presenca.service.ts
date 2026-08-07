import { createClient } from "@/lib/supabase/client";
import {
  isListaPresencaEtapaConcluida,
  isSolicitacaoListaConcluida,
  isValidEmailListaPresenca,
  mapListaPresencaFromTracking,
  type RiscosListaPresencaAnexoMeta,
  type RiscosListaPresencaDados,
} from "@/lib/riscos-lista-presenca";
import type { OrcamentoRiscosPsicossociaisRecord } from "@/lib/riscos-psicossociais";
import {
  removerArquivoRiscosListaPresenca,
  uploadRiscosListaPresencaAnexo,
} from "@/services/riscos-lista-presenca-storage.service";

const RISCOS_TRACKING_SELECT =
  "orcamento_id, etapa_atual, etapas_concluidas, status, entrada_em, concluido_em, created_at, updated_at, lista_solicitada, lista_solicitada_em, lista_solicitada_email, lista_solicitada_por, lista_solicitada_registrado_em, lista_recebida, lista_anexo_path, lista_anexo_nome, lista_anexo_tipo, lista_anexo_tamanho, lista_recebida_em, lista_recebida_por";

async function buscarTracking(
  orcamentoId: string
): Promise<OrcamentoRiscosPsicossociaisRecord | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("orcamento_riscos_psicossociais")
    .select(RISCOS_TRACKING_SELECT)
    .eq("orcamento_id", orcamentoId)
    .maybeSingle();

  if (error) throw error;
  return (data as OrcamentoRiscosPsicossociaisRecord | null) ?? null;
}

async function registrarHistoricoAnexo(params: {
  orcamentoId: string;
  acao: "anexado" | "substituido" | "removido";
  anexo: Partial<RiscosListaPresencaAnexoMeta> | null;
  usuarioNome: string;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("orcamento_riscos_lista_presenca_anexos_hist")
    .insert({
      orcamento_id: params.orcamentoId,
      acao: params.acao,
      anexo_path: params.anexo?.path ?? null,
      anexo_nome: params.anexo?.nome ?? null,
      anexo_tipo: params.anexo?.tipo ?? null,
      anexo_tamanho: params.anexo?.tamanho ?? null,
      usuario_nome: params.usuarioNome,
    });
  if (error) {
    console.warn("falha ao registrar histórico de anexo:", error.message);
  }
}

function syncProgressoAposLista(
  lista: RiscosListaPresencaDados,
  atual: OrcamentoRiscosPsicossociaisRecord
): {
  etapas_concluidas: number;
  etapa_atual: OrcamentoRiscosPsicossociaisRecord["etapa_atual"];
} {
  const concluida = isListaPresencaEtapaConcluida(lista);
  const stored = Math.max(0, Number(atual.etapas_concluidas) || 0);

  if (concluida) {
    return {
      etapas_concluidas: Math.max(1, stored),
      etapa_atual:
        atual.etapa_atual === "lista_presenca"
          ? "cadastro_empresa"
          : atual.etapa_atual,
    };
  }

  return {
    etapas_concluidas: 0,
    etapa_atual: "lista_presenca",
  };
}

export async function salvarSolicitacaoListaPresenca(params: {
  orcamentoId: string;
  dataSolicitacaoIso: string;
  email: string;
  usuarioNome: string;
}): Promise<OrcamentoRiscosPsicossociaisRecord> {
  const email = params.email.trim();
  if (!params.dataSolicitacaoIso.trim()) {
    throw new Error("Informe a data da solicitação.");
  }
  if (!isValidEmailListaPresenca(email)) {
    throw new Error("Informe um e-mail válido do cliente.");
  }

  const atual = await buscarTracking(params.orcamentoId);
  if (!atual) {
    throw new Error("Tracking de Riscos Psicossociais não encontrado.");
  }

  const now = new Date().toISOString();
  const listaPreview: RiscosListaPresencaDados = {
    ...mapListaPresencaFromTracking(atual),
    lista_solicitada: true,
    lista_solicitada_em: params.dataSolicitacaoIso.slice(0, 10),
    lista_solicitada_email: email,
  };

  if (!isSolicitacaoListaConcluida(listaPreview)) {
    throw new Error("Preencha data e e-mail para salvar a solicitação.");
  }

  const progresso = syncProgressoAposLista(listaPreview, atual);
  const supabase = createClient();
  const { data, error } = await supabase
    .from("orcamento_riscos_psicossociais")
    .update({
      lista_solicitada: true,
      lista_solicitada_em: params.dataSolicitacaoIso.slice(0, 10),
      lista_solicitada_email: email,
      lista_solicitada_por: params.usuarioNome,
      lista_solicitada_registrado_em: now,
      ...progresso,
    })
    .eq("orcamento_id", params.orcamentoId)
    .select(RISCOS_TRACKING_SELECT)
    .single();

  if (error) throw error;
  return data as OrcamentoRiscosPsicossociaisRecord;
}

export async function salvarRecebimentoListaPresenca(params: {
  orcamentoId: string;
  file: File;
  usuarioNome: string;
}): Promise<OrcamentoRiscosPsicossociaisRecord> {
  const atual = await buscarTracking(params.orcamentoId);
  if (!atual) {
    throw new Error("Tracking de Riscos Psicossociais não encontrado.");
  }

  const listaAtual = mapListaPresencaFromTracking(atual);
  if (!isSolicitacaoListaConcluida(listaAtual)) {
    throw new Error(
      "Salve a solicitação da lista (data e e-mail) antes do recebimento."
    );
  }

  const uploaded = await uploadRiscosListaPresencaAnexo(
    params.orcamentoId,
    params.file
  );

  const pathAnterior = listaAtual.lista_anexo_path;
  const acaoHist = pathAnterior ? "substituido" : "anexado";

  const listaPreview: RiscosListaPresencaDados = {
    ...listaAtual,
    lista_recebida: true,
    lista_anexo_path: uploaded.path,
    lista_anexo_nome: uploaded.nome,
    lista_anexo_tipo: uploaded.tipo,
    lista_anexo_tamanho: uploaded.tamanho,
  };
  const progresso = syncProgressoAposLista(listaPreview, atual);
  const now = new Date().toISOString();

  const supabase = createClient();
  const { data, error } = await supabase
    .from("orcamento_riscos_psicossociais")
    .update({
      lista_recebida: true,
      lista_anexo_path: uploaded.path,
      lista_anexo_nome: uploaded.nome,
      lista_anexo_tipo: uploaded.tipo,
      lista_anexo_tamanho: uploaded.tamanho,
      lista_recebida_em: now,
      lista_recebida_por: params.usuarioNome,
      ...progresso,
    })
    .eq("orcamento_id", params.orcamentoId)
    .select(RISCOS_TRACKING_SELECT)
    .single();

  if (error) {
    await removerArquivoRiscosListaPresenca(uploaded.path);
    throw error;
  }

  await registrarHistoricoAnexo({
    orcamentoId: params.orcamentoId,
    acao: acaoHist,
    anexo: uploaded,
    usuarioNome: params.usuarioNome,
  });

  if (pathAnterior && pathAnterior !== uploaded.path) {
    await registrarHistoricoAnexo({
      orcamentoId: params.orcamentoId,
      acao: "removido",
      anexo: {
        path: pathAnterior,
        nome: listaAtual.lista_anexo_nome ?? pathAnterior,
        tipo: listaAtual.lista_anexo_tipo ?? "",
        tamanho: listaAtual.lista_anexo_tamanho ?? 0,
      },
      usuarioNome: params.usuarioNome,
    });
    await removerArquivoRiscosListaPresenca(pathAnterior);
  }

  return data as OrcamentoRiscosPsicossociaisRecord;
}

export async function removerAnexoListaPresenca(params: {
  orcamentoId: string;
  usuarioNome: string;
}): Promise<OrcamentoRiscosPsicossociaisRecord> {
  const atual = await buscarTracking(params.orcamentoId);
  if (!atual) {
    throw new Error("Tracking de Riscos Psicossociais não encontrado.");
  }

  const listaAtual = mapListaPresencaFromTracking(atual);
  const pathAnterior = listaAtual.lista_anexo_path;

  const listaPreview: RiscosListaPresencaDados = {
    ...listaAtual,
    lista_recebida: false,
    lista_anexo_path: null,
    lista_anexo_nome: null,
    lista_anexo_tipo: null,
    lista_anexo_tamanho: null,
    lista_recebida_em: null,
    lista_recebida_por: null,
  };
  const progresso = syncProgressoAposLista(listaPreview, atual);

  const supabase = createClient();
  const { data, error } = await supabase
    .from("orcamento_riscos_psicossociais")
    .update({
      lista_recebida: false,
      lista_anexo_path: null,
      lista_anexo_nome: null,
      lista_anexo_tipo: null,
      lista_anexo_tamanho: null,
      lista_recebida_em: null,
      lista_recebida_por: null,
      ...progresso,
    })
    .eq("orcamento_id", params.orcamentoId)
    .select(RISCOS_TRACKING_SELECT)
    .single();

  if (error) throw error;

  if (pathAnterior) {
    await registrarHistoricoAnexo({
      orcamentoId: params.orcamentoId,
      acao: "removido",
      anexo: {
        path: pathAnterior,
        nome: listaAtual.lista_anexo_nome ?? pathAnterior,
        tipo: listaAtual.lista_anexo_tipo ?? "",
        tamanho: listaAtual.lista_anexo_tamanho ?? 0,
      },
      usuarioNome: params.usuarioNome,
    });
    await removerArquivoRiscosListaPresenca(pathAnterior);
  }

  return data as OrcamentoRiscosPsicossociaisRecord;
}

export { RISCOS_TRACKING_SELECT };
