import "server-only";

import { randomUUID } from "node:crypto";
import {
  asosDoColaborador,
  caminhoPublicacaoAgroviasPermitido,
  documentosSstVigentes,
  eventosEsocialPortal,
  examesDaFichaPortal,
  isTipoDocumentoSstPortal,
  montarPeriodicosPortal,
  TIPO_DOCUMENTO_SST_LABEL,
  validarPdfPublicacao,
  type AgendamentoFontePortal,
  type AsoPublicadoFonte,
  type DocumentoSstVersao,
  type PeriodicoFontePortal,
  type TipoDocumentoSstPortal,
} from "@/lib/portal-agrovias-consulta";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "gestao-plataformas-anexos";

type ErroPostgrest = { code?: string; message?: string } | null;

function tabelaAusente(error: ErroPostgrest): boolean {
  return (
    error?.code === "42P01" ||
    error?.code === "42703" ||
    /does not exist|schema cache|não existe/i.test(error?.message ?? "")
  );
}

function nomeSeguro(nome: string): string {
  const base = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-80);
  return base || "arquivo.pdf";
}

function iso(valor: unknown): string | null {
  const texto = String(valor ?? "").trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) ? texto : null;
}

export type DocumentoSstPainel = {
  id: string;
  tipo: TipoDocumentoSstPortal;
  tipoLabel: string;
  arquivoNome: string;
  publicadoEm: string;
  vigente: boolean;
};

export type AsoPainel = {
  id: string;
  agendamentoId: string;
  arquivoNome: string;
  publicadoEm: string;
};

function mapDocumento(row: Record<string, unknown>): DocumentoSstVersao | null {
  const tipo = String(row.tipo ?? "");
  if (!isTipoDocumentoSstPortal(tipo)) return null;
  return {
    id: String(row.id),
    tipo,
    arquivoPath: String(row.arquivo_path ?? ""),
    arquivoNome: String(row.arquivo_nome ?? "documento.pdf"),
    publicadoEm: String(row.publicado_em ?? ""),
    vigente: row.vigente === true,
  };
}

export async function listarPublicacoesInternas(clienteId: string): Promise<{
  documentosSst: DocumentoSstPainel[];
  asosPublicados: AsoPainel[];
}> {
  const admin = createAdminClient();
  const [documentosRes, asosRes] = await Promise.all([
    admin
      .from("gestao_plataforma_documentos_sst")
      .select("id, tipo, arquivo_nome, publicado_em, vigente")
      .eq("cliente_id", clienteId)
      .order("publicado_em", { ascending: false }),
    admin
      .from("gestao_plataforma_asos_publicados")
      .select("id, agendamento_id, arquivo_nome, publicado_em")
      .eq("cliente_id", clienteId)
      .order("publicado_em", { ascending: false }),
  ]);
  const documentos = documentosRes.error && tabelaAusente(documentosRes.error)
    ? []
    : ((documentosRes.data ?? []) as Record<string, unknown>[]);
  const asos = asosRes.error && tabelaAusente(asosRes.error)
    ? []
    : ((asosRes.data ?? []) as Record<string, unknown>[]);
  return {
    documentosSst: documentos.flatMap((row) => {
      const tipo = String(row.tipo ?? "");
      if (!isTipoDocumentoSstPortal(tipo)) return [];
      return [{
        id: String(row.id),
        tipo,
        tipoLabel: TIPO_DOCUMENTO_SST_LABEL[tipo],
        arquivoNome: String(row.arquivo_nome ?? "documento.pdf"),
        publicadoEm: String(row.publicado_em ?? ""),
        vigente: row.vigente === true,
      }];
    }),
    asosPublicados: asos.map((row) => ({
      id: String(row.id),
      agendamentoId: String(row.agendamento_id),
      arquivoNome: String(row.arquivo_nome ?? "aso.pdf"),
      publicadoEm: String(row.publicado_em ?? ""),
    })),
  };
}

export async function publicarDocumentoSst(params: {
  clienteId: string;
  userId: string;
  tipo: string;
  arquivo: { nome: string; tipo: string; bytes: Uint8Array };
}) {
  if (!isTipoDocumentoSstPortal(params.tipo)) {
    return { ok: false as const, status: 400, error: "Tipo de documento inválido." };
  }
  const erroArquivo = validarPdfPublicacao({
    nome: params.arquivo.nome,
    tipo: params.arquivo.tipo,
    tamanho: params.arquivo.bytes.byteLength,
  });
  if (erroArquivo) return { ok: false as const, status: 400, error: erroArquivo };

  const clienteId = params.clienteId;
  const path = `${clienteId}/sst/${params.tipo}/${randomUUID()}-${nomeSeguro(params.arquivo.nome)}`;
  if (!caminhoPublicacaoAgroviasPermitido({ path, clienteId, pasta: "sst" })) {
    return { ok: false as const, status: 400, error: "Caminho de arquivo inválido." };
  }
  const admin = createAdminClient();
  const { error: uploadErro } = await admin.storage.from(BUCKET).upload(path, params.arquivo.bytes, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (uploadErro) return { ok: false as const, status: 500, error: "Não foi possível guardar o PDF." };

  const { error: baixaErro } = await admin
    .from("gestao_plataforma_documentos_sst")
    .update({ vigente: false })
    .eq("cliente_id", clienteId)
    .eq("tipo", params.tipo)
    .eq("vigente", true);
  if (baixaErro) {
    if (tabelaAusente(baixaErro)) {
      return {
        ok: false as const,
        status: 503,
        error: "Aplique a migration 166_portal_agrovias_publicacoes.sql antes de publicar.",
      };
    }
    return { ok: false as const, status: 500, error: "Não foi possível substituir a versão vigente." };
  }
  const { error } = await admin.from("gestao_plataforma_documentos_sst").insert({
    cliente_id: clienteId,
    tipo: params.tipo,
    arquivo_path: path,
    arquivo_nome: params.arquivo.nome,
    publicado_por: params.userId || null,
    vigente: true,
  });
  if (error) {
    return { ok: false as const, status: 500, error: "Não foi possível publicar o documento." };
  }
  return { ok: true as const };
}

export async function publicarAsoCliente(params: {
  clienteId: string;
  userId: string;
  agendamentoId: string;
  arquivo: { nome: string; tipo: string; bytes: Uint8Array };
}) {
  const agendamentoId = params.agendamentoId.trim();
  if (!agendamentoId) return { ok: false as const, status: 400, error: "Selecione o agendamento do ASO." };
  const erroArquivo = validarPdfPublicacao({
    nome: params.arquivo.nome,
    tipo: params.arquivo.tipo,
    tamanho: params.arquivo.bytes.byteLength,
  });
  if (erroArquivo) return { ok: false as const, status: 400, error: erroArquivo };

  const clienteId = params.clienteId;
  const admin = createAdminClient();
  const { data: agendamento } = await admin
    .from("agendamentos")
    .select("id")
    .eq("id", agendamentoId)
    .eq("cliente_id", clienteId)
    .maybeSingle();
  if (!agendamento) {
    return { ok: false as const, status: 404, error: "Agendamento não encontrado para a AGROVIAS." };
  }
  const path = `${clienteId}/aso/${agendamentoId}/${randomUUID()}-${nomeSeguro(params.arquivo.nome)}`;
  if (!caminhoPublicacaoAgroviasPermitido({ path, clienteId, pasta: "aso" })) {
    return { ok: false as const, status: 400, error: "Caminho de arquivo inválido." };
  }
  const { error: uploadErro } = await admin.storage.from(BUCKET).upload(path, params.arquivo.bytes, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (uploadErro) return { ok: false as const, status: 500, error: "Não foi possível guardar o ASO." };
  const { error } = await admin.from("gestao_plataforma_asos_publicados").insert({
    cliente_id: clienteId,
    agendamento_id: agendamentoId,
    arquivo_path: path,
    arquivo_nome: params.arquivo.nome,
    publicado_por: params.userId || null,
  });
  if (error) {
    if (tabelaAusente(error)) {
      return {
        ok: false as const,
        status: 503,
        error: "Aplique a migration 166_portal_agrovias_publicacoes.sql antes de publicar.",
      };
    }
    return { ok: false as const, status: 500, error: "Não foi possível publicar o ASO." };
  }
  return { ok: true as const };
}

async function urlAssinada(path: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(path, 120);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function urlDocumentoSstPortal(clienteId: string, id: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("gestao_plataforma_documentos_sst")
    .select("arquivo_path, cliente_id, vigente")
    .eq("id", id)
    .eq("cliente_id", clienteId)
    .eq("vigente", true)
    .maybeSingle();
  const path = String(data?.arquivo_path ?? "");
  if (!data || !caminhoPublicacaoAgroviasPermitido({
    path,
    clienteId,
    pasta: "sst",
  })) {
    return { ok: false as const, status: 404, error: "Documento não publicado." };
  }
  const url = await urlAssinada(path);
  if (!url) return { ok: false as const, status: 404, error: "Arquivo não encontrado." };
  return { ok: true as const, url };
}

export async function urlAsoPortal(clienteId: string, id: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("gestao_plataforma_asos_publicados")
    .select("arquivo_path, cliente_id, agendamento_id")
    .eq("id", id)
    .eq("cliente_id", clienteId)
    .maybeSingle();
  const path = String(data?.arquivo_path ?? "");
  if (!data || !caminhoPublicacaoAgroviasPermitido({
    path,
    clienteId,
    pasta: "aso",
  })) {
    return { ok: false as const, status: 404, error: "ASO não publicado." };
  }
  const { data: agendamento } = await admin
    .from("agendamentos")
    .select("id")
    .eq("id", data.agendamento_id)
    .eq("cliente_id", clienteId)
    .maybeSingle();
  if (!agendamento) return { ok: false as const, status: 404, error: "ASO não publicado." };
  const url = await urlAssinada(path);
  if (!url) return { ok: false as const, status: 404, error: "Arquivo não encontrado." };
  return { ok: true as const, url };
}

export async function urlPublicacaoInterna(params: {
  clienteId: string;
  id: string;
  origem: "sst" | "aso";
}) {
  const admin = createAdminClient();
  const tabela = params.origem === "sst"
    ? "gestao_plataforma_documentos_sst"
    : "gestao_plataforma_asos_publicados";
  const { data } = await admin
    .from(tabela)
    .select("arquivo_path, cliente_id")
    .eq("id", params.id)
    .eq("cliente_id", params.clienteId)
    .maybeSingle();
  const path = String(data?.arquivo_path ?? "");
  if (!data || !caminhoPublicacaoAgroviasPermitido({
    path,
    clienteId: params.clienteId,
    pasta: params.origem === "sst" ? "sst" : "aso",
  })) {
    return { ok: false as const, status: 404, error: "Arquivo não encontrado." };
  }
  const url = await urlAssinada(path);
  if (!url) return { ok: false as const, status: 404, error: "Arquivo não encontrado." };
  return { ok: true as const, url };
}

function mapAgendamento(row: Record<string, unknown>): AgendamentoFontePortal {
  return {
    id: String(row.id),
    colaborador: row.colaborador ? String(row.colaborador) : null,
    colaboradorCpf: row.colaborador_cpf ? String(row.colaborador_cpf) : null,
    aso: row.aso ? String(row.aso) : null,
    status: row.status ? String(row.status) : null,
    data: iso(row.data_agendamento),
    horario: row.horario ? String(row.horario) : null,
    envioEsocial: row.envio_esocial as boolean | string | null,
    dataEnvioEsocial: iso(row.data_envio_esocial),
    esocialRecibo: row.esocial_recibo ? String(row.esocial_recibo) : null,
    esocialEnvioCancelado: row.esocial_envio_cancelado === true,
  };
}

const SELECT_AGENDAMENTO =
  "id, colaborador, colaborador_cpf, aso, status, data_agendamento, horario, clinica_nome, envio_esocial, data_envio_esocial, esocial_recibo, esocial_envio_cancelado";

export async function consultaPortalAgrovias(clienteId: string, clienteNome: string) {
  const admin = createAdminClient();
  const [agendamentosRes, documentosRes] = await Promise.all([
    admin
      .from("agendamentos")
      .select(SELECT_AGENDAMENTO)
      .eq("cliente_id", clienteId)
      .order("data_agendamento", { ascending: false })
      .limit(400),
    admin
      .from("gestao_plataforma_documentos_sst")
      .select("id, tipo, arquivo_path, arquivo_nome, publicado_em, vigente")
      .eq("cliente_id", clienteId)
      .eq("vigente", true),
  ]);
  const agendamentos = ((agendamentosRes.data ?? []) as Record<string, unknown>[]).map(mapAgendamento);
  const ids = agendamentos.map((item) => item.id).filter(Boolean);
  const porNome = await admin
    .from("periodicos_futuros")
    .select(
      "id, colaborador, colaborador_cpf, cargo_nome, tipo_exame, exame_nome, proxima_data, status, cancelado_em, motivo_cancelamento, agendamento_vinculado_id, cliente_nome"
    )
    .ilike("cliente_nome", clienteNome)
    .limit(400);
  let porVinculo: Record<string, unknown>[] = [];
  if (ids.length > 0) {
    const vinculados = await admin
      .from("periodicos_futuros")
      .select(
        "id, colaborador, colaborador_cpf, cargo_nome, tipo_exame, exame_nome, proxima_data, status, cancelado_em, motivo_cancelamento, agendamento_vinculado_id, cliente_nome"
      )
      .in("agendamento_vinculado_id", ids.slice(0, 200));
    if (!vinculados.error) porVinculo = (vinculados.data ?? []) as Record<string, unknown>[];
  }
  const periodicosFonte = new Map<string, PeriodicoFontePortal>();
  for (const row of [...((porNome.data ?? []) as Record<string, unknown>[]), ...porVinculo]) {
    periodicosFonte.set(String(row.id), {
      id: String(row.id),
      colaborador: String(row.colaborador ?? ""),
      colaboradorCpf: row.colaborador_cpf ? String(row.colaborador_cpf) : null,
      cargo: row.cargo_nome ? String(row.cargo_nome) : null,
      tipoExame: String(row.tipo_exame || row.exame_nome || "Exame"),
      proximaData: String(row.proxima_data ?? ""),
      status: String(row.status ?? ""),
      canceladoEm: row.cancelado_em ? String(row.cancelado_em) : null,
      motivoCancelamento: row.motivo_cancelamento ? String(row.motivo_cancelamento) : null,
      agendamentoVinculadoId: row.agendamento_vinculado_id ? String(row.agendamento_vinculado_id) : null,
    });
  }
  const documentos = documentosRes.error && tabelaAusente(documentosRes.error)
    ? []
    : documentosSstVigentes(
        ((documentosRes.data ?? []) as Record<string, unknown>[]).flatMap((row) => {
          const versao = mapDocumento(row);
          return versao ? [versao] : [];
        })
      );
  return {
    agendamentos,
    periodicos: montarPeriodicosPortal({
      periodicos: Array.from(periodicosFonte.values()),
      agendamentos,
    }),
    documentos: documentos.map((item) => ({
      id: item.id,
      tipo: item.tipo,
      tipoLabel: TIPO_DOCUMENTO_SST_LABEL[item.tipo],
      publicadoEm: item.publicadoEm,
    })),
  };
}

export async function complementosFichaPortal(params: {
  clienteId: string;
  clienteNome: string;
  cpf: string;
  nome: string;
  agendamentosVisiveis: {
    id: string;
    tipoExame: string;
    dataLabel: string;
    horarioLabel: string;
    situacao: string;
  }[];
}) {
  const consulta = await consultaPortalAgrovias(params.clienteId, params.clienteNome);
  const admin = createAdminClient();
  const asosRes = await admin
    .from("gestao_plataforma_asos_publicados")
    .select("id, agendamento_id, arquivo_nome")
    .eq("cliente_id", params.clienteId);
  const publicados: AsoPublicadoFonte[] =
    asosRes.error && tabelaAusente(asosRes.error)
      ? []
      : ((asosRes.data ?? []) as Record<string, unknown>[]).map((row) => ({
          id: String(row.id),
          agendamentoId: String(row.agendamento_id),
          arquivoNome: String(row.arquivo_nome ?? "aso.pdf"),
        }));
  return {
    exames: examesDaFichaPortal({
      periodicos: consulta.periodicos,
      agendamentos: params.agendamentosVisiveis,
      cpf: params.cpf,
      nome: params.nome,
    }),
    asos: asosDoColaborador({
      publicados,
      agendamentos: consulta.agendamentos,
      cpf: params.cpf,
    }).map((item) => ({
      id: item.id,
      tipoExame: item.tipoExame,
      data: item.data,
      arquivoNome: item.arquivoNome,
    })),
    esocial: eventosEsocialPortal({
      agendamentos: consulta.agendamentos,
      cpf: params.cpf,
    }).map((item) => ({
      id: item.id,
      tipoEvento: item.tipoEvento,
      dataTransmissao: item.dataTransmissao,
      recibo: item.recibo,
    })),
  };
}
