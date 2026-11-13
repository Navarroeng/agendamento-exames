import "server-only";

import { randomUUID } from "node:crypto";
import { todayIsoSaoPaulo } from "@/lib/agendamento-datetime";
import {
  caminhoAnexoGestaoPermitido,
  examesRealizadosDoColaborador,
  validarAnexoGestao,
} from "@/lib/gestao-plataformas";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolverEscopoGestaoPlataformas } from "@/services/gestao-plataformas.server";
import {
  listarColaboradoresPortal,
  listarHistoricoExamesColaborador,
} from "@/services/portal-colaboradores.server";

const BUCKET = "gestao-plataformas-anexos";

function nomeSeguro(nome: string): string {
  const base = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-80);
  return base || "arquivo";
}

export async function listarExamesRealizadosGestao(colaboradorId: string): Promise<
  | { ok: true; exames: { id: string; dataIso: string | null; dataLabel: string; tipoExame: string; situacao: string }[] }
  | { ok: false; status: number; error: string }
> {
  const escopo = await resolverEscopoGestaoPlataformas();
  if (!escopo.ok) return escopo;
  const { colaboradores } = await listarColaboradoresPortal(escopo.escopo.clienteId);
  const linha = colaboradores.find((item) => item.id === colaboradorId.trim());
  if (!linha) {
    return { ok: false, status: 404, error: "Colaborador não encontrado no cadastro da AGROVIAS." };
  }
  const historico = await listarHistoricoExamesColaborador({
    clienteId: escopo.escopo.clienteId,
    cpf: linha.cpfDigits,
    agendamentoId: linha.historicoAgendamentoId,
  });
  return {
    ok: true,
    exames: examesRealizadosDoColaborador({
      exames: historico,
      hoje: todayIsoSaoPaulo(),
    }),
  };
}

export async function gravarAnexoGestao(params: {
  tipo: "certificado" | "rh";
  colaboradorId: string;
  cursoId?: string | null;
  realizadoEm?: string | null;
  validade?: string | null;
  identificacao?: string | null;
  arquivo: { nome: string; tipo: string; bytes: Uint8Array };
}): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const escopo = await resolverEscopoGestaoPlataformas();
  if (!escopo.ok) return escopo;
  const clienteId = escopo.escopo.clienteId;
  const colaboradorId = params.colaboradorId.trim();
  const { colaboradores } = await listarColaboradoresPortal(clienteId);
  if (!colaboradores.some((linha) => linha.id === colaboradorId)) {
    return { ok: false, status: 400, error: "Colaborador não encontrado no cadastro da AGROVIAS." };
  }
  const erroArquivo = validarAnexoGestao({
    nome: params.arquivo.nome,
    tipo: params.arquivo.tipo,
    tamanho: params.arquivo.bytes.byteLength,
  });
  if (erroArquivo) return { ok: false, status: 400, error: erroArquivo };

  const admin = createAdminClient();
  const id = randomUUID();
  const pasta = params.tipo === "certificado" ? "certificados" : "rh";
  const path = `${clienteId}/${pasta}/${id}/${nomeSeguro(params.arquivo.nome)}`;
  if (!caminhoAnexoGestaoPermitido({ path, clienteId })) {
    return { ok: false, status: 400, error: "Caminho de arquivo inválido." };
  }

  if (params.tipo === "certificado") {
    const realizadoEm = String(params.realizadoEm ?? "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(realizadoEm)) {
      return { ok: false, status: 400, error: "Informe a data de realização do curso." };
    }
    const cursoId = String(params.cursoId ?? "").trim();
    const { data: curso, error: cursoErro } = await admin
      .from("gestao_plataforma_cursos")
      .select("id")
      .eq("id", cursoId)
      .eq("cliente_id", clienteId)
      .maybeSingle();
    if (cursoErro || !curso) {
      return { ok: false, status: 400, error: "Selecione um curso do catálogo da AGROVIAS." };
    }
    const { error: uploadErro } = await admin.storage.from(BUCKET).upload(path, params.arquivo.bytes, {
      contentType: params.arquivo.tipo || "application/octet-stream",
      upsert: false,
    });
    if (uploadErro) {
      return { ok: false, status: 500, error: "Não foi possível guardar o certificado." };
    }
    const { error } = await admin.from("gestao_plataforma_certificados").insert({
      id,
      cliente_id: clienteId,
      colaborador_id: colaboradorId,
      curso_id: cursoId,
      realizado_em: realizadoEm,
      validade: params.validade ? String(params.validade).slice(0, 10) : null,
      arquivo_path: path,
      arquivo_nome: params.arquivo.nome,
      arquivo_tipo: params.arquivo.tipo || null,
      arquivo_tamanho: params.arquivo.bytes.byteLength,
    });
    if (error) {
      return { ok: false, status: 409, error: "Não foi possível registrar o certificado." };
    }
    return { ok: true };
  }

  const identificacao = String(params.identificacao ?? "").trim();
  if (identificacao.length < 2) {
    return { ok: false, status: 400, error: "Informe a identificação do documento de RH." };
  }
  const { error: uploadErro } = await admin.storage.from(BUCKET).upload(path, params.arquivo.bytes, {
    contentType: params.arquivo.tipo || "application/octet-stream",
    upsert: false,
  });
  if (uploadErro) {
    return { ok: false, status: 500, error: "Não foi possível guardar o documento de RH." };
  }
  const { error } = await admin.from("gestao_plataforma_documentos_rh").insert({
    id,
    cliente_id: clienteId,
    colaborador_id: colaboradorId,
    identificacao,
    arquivo_path: path,
    arquivo_nome: params.arquivo.nome,
    arquivo_tipo: params.arquivo.tipo || null,
    arquivo_tamanho: params.arquivo.bytes.byteLength,
  });
  if (error) {
    return { ok: false, status: 409, error: "Não foi possível registrar o documento de RH." };
  }
  return { ok: true };
}

export async function urlAnexoGestao(params: {
  tipo: "certificado" | "rh";
  id: string;
}): Promise<{ ok: true; url: string } | { ok: false; status: number; error: string }> {
  const escopo = await resolverEscopoGestaoPlataformas();
  if (!escopo.ok) return escopo;
  const admin = createAdminClient();
  const tabela =
    params.tipo === "certificado"
      ? "gestao_plataforma_certificados"
      : "gestao_plataforma_documentos_rh";
  const { data, error } = await admin
    .from(tabela)
    .select("arquivo_path, cliente_id")
    .eq("id", params.id)
    .eq("cliente_id", escopo.escopo.clienteId)
    .maybeSingle();
  if (error || !data?.arquivo_path) {
    return { ok: false, status: 404, error: "Arquivo não encontrado." };
  }
  const path = String(data.arquivo_path);
  if (!caminhoAnexoGestaoPermitido({ path, clienteId: escopo.escopo.clienteId })) {
    return { ok: false, status: 403, error: "Arquivo fora do vínculo da AGROVIAS." };
  }
  const { data: assinado, error: urlErro } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(path, 120);
  if (urlErro || !assinado?.signedUrl) {
    return { ok: false, status: 500, error: "Não foi possível abrir o arquivo." };
  }
  return { ok: true, url: assinado.signedUrl };
}
