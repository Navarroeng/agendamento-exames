import "server-only";

import { randomUUID } from "node:crypto";
import {
  acessoExternoVigente,
  agendamentosVisiveisExternos,
  arquivoRhLiberado,
  colaboradorNoCadastro,
  cursosVisiveisExternos,
  podeEnviarDocumentoRh,
} from "@/lib/acesso-externo-agrovias";
import { todayIsoSaoPaulo } from "@/lib/agendamento-datetime";
import {
  alocacaoAberta,
  caminhoAnexoGestaoPermitido,
  liberacoesVigentes,
  SITUACAO_DOCUMENTO_RH_LABEL,
  validarAnexoGestao,
  type AlocacaoRegistro,
  type LiberacaoRegistro,
  type SituacaoDocumentoRh,
} from "@/lib/gestao-plataformas";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { resolverEscopoGestaoPlataformas } from "@/services/gestao-plataformas.server";
import { listarColaboradoresPortal } from "@/services/portal-colaboradores.server";

const BUCKET = "gestao-plataformas-anexos";

export type AcessoExternoResolvido = {
  userId: string;
  nome: string;
  email: string;
  clienteId: string;
  clienteNome: string;
};

function nomeSeguro(nome: string): string {
  const base = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-80);
  return base || "arquivo";
}

export async function resolverAcessoExternoAgrovias(): Promise<
  | { ok: true; acesso: AcessoExternoResolvido }
  | { ok: false; status: number; error: string }
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, error: "Não autenticado." };

  const escopo = await resolverEscopoGestaoPlataformas();
  if (!escopo.ok) return escopo;
  const admin = createAdminClient();
  const [{ data: perfil }, { data: concessao }] = await Promise.all([
    admin
      .from("perfis_usuarios")
      .select("perfil, ativo, nome, email")
      .eq("user_id", user.id)
      .maybeSingle(),
    admin
      .from("gestao_plataforma_acessos_externos")
      .select("cliente_id, revogado_em")
      .eq("user_id", user.id)
      .is("revogado_em", null)
      .maybeSingle(),
  ]);
  if (
    !acessoExternoVigente({
      perfil: perfil?.perfil,
      ativo: Boolean(perfil) && perfil?.ativo !== false,
      clienteId: concessao?.cliente_id ? String(concessao.cliente_id) : null,
      clienteEscopo: escopo.escopo.clienteId,
      revogadoEm: concessao?.revogado_em ? String(concessao.revogado_em) : null,
    })
  ) {
    return { ok: false, status: 403, error: "Acesso externo indisponível." };
  }
  return {
    ok: true,
    acesso: {
      userId: user.id,
      nome: String(perfil?.nome ?? user.email ?? "AGROVIAS"),
      email: String(perfil?.email ?? user.email ?? ""),
      clienteId: escopo.escopo.clienteId,
      clienteNome: escopo.escopo.clienteNome,
    },
  };
}

async function colaboradorDoEscopo(clienteId: string, colaboradorId: string) {
  const { colaboradores } = await listarColaboradoresPortal(clienteId);
  const colaborador = colaboradores.find((linha) => linha.id === colaboradorId.trim());
  if (!colaborador || !colaboradorNoCadastro(colaboradores.map((linha) => linha.id), colaboradorId)) {
    return null;
  }
  return colaborador;
}

export async function listarPortalAgrovias() {
  const acesso = await resolverAcessoExternoAgrovias();
  if (!acesso.ok) return acesso;
  const admin = createAdminClient();
  const { colaboradores } = await listarColaboradoresPortal(acesso.acesso.clienteId);
  const { data: alocacoes } = await admin
    .from("gestao_plataforma_alocacoes")
    .select("colaborador_id, encerrada_em")
    .eq("cliente_id", acesso.acesso.clienteId);
  const comObra = new Set(
    (alocacoes ?? [])
      .filter((linha) => !linha.encerrada_em)
      .map((linha) => String(linha.colaborador_id))
  );
  return {
    ok: true as const,
    clienteNome: acesso.acesso.clienteNome,
    colaboradores: colaboradores.map((linha) => ({
      id: linha.id,
      nome: linha.nome,
      cargo: linha.cargo,
      situacao: linha.situacaoLabel,
      semObra: !comObra.has(linha.id),
    })),
  };
}

export async function fichaPortalAgrovias(colaboradorId: string) {
  const acesso = await resolverAcessoExternoAgrovias();
  if (!acesso.ok) return acesso;
  const colaborador = await colaboradorDoEscopo(acesso.acesso.clienteId, colaboradorId);
  if (!colaborador) return { ok: false as const, status: 404, error: "Colaborador não encontrado." };

  const admin = createAdminClient();
  const clienteId = acesso.acesso.clienteId;
  const hoje = todayIsoSaoPaulo();
  const [obrasRes, plataformasRes, alocacoesRes, liberacoesRes, agendamentosRes, cursosRes, certificadosRes, documentosRes, eventosRes] =
    await Promise.all([
      admin.from("gestao_plataforma_obras").select("id, plataforma_id, nome").eq("cliente_id", clienteId),
      admin.from("gestao_plataformas").select("id, nome").eq("cliente_id", clienteId),
      admin
        .from("gestao_plataforma_alocacoes")
        .select("id, obra_id, colaborador_id, encerrada_em")
        .eq("cliente_id", clienteId)
        .eq("colaborador_id", colaborador.id),
      admin
        .from("gestao_plataforma_liberacoes")
        .select("id, obra_id, colaborador_id, liberado_em, responsavel")
        .eq("cliente_id", clienteId)
        .eq("colaborador_id", colaborador.id),
      admin
        .from("agendamentos")
        .select("id, colaborador, colaborador_cpf, aso, status, data_agendamento, horario, clinica_nome")
        .eq("cliente_id", clienteId)
        .order("data_agendamento", { ascending: false })
        .limit(200),
      admin.from("gestao_plataforma_cursos").select("id, nome").eq("cliente_id", clienteId),
      admin
        .from("gestao_plataforma_certificados")
        .select("id, curso_id, realizado_em, validade")
        .eq("cliente_id", clienteId)
        .eq("colaborador_id", colaborador.id),
      admin
        .from("gestao_plataforma_documentos_rh")
        .select("id, identificacao, incluido_em, arquivo_nome, arquivo_path, situacao, observacao")
        .eq("cliente_id", clienteId)
        .eq("colaborador_id", colaborador.id)
        .order("incluido_em", { ascending: false }),
      admin
        .from("gestao_plataforma_documento_rh_eventos")
        .select("id, documento_id, situacao, observacao, responsavel, registrado_em")
        .eq("cliente_id", clienteId)
        .order("registrado_em", { ascending: false })
        .limit(200),
    ]);

  const alocacoes: AlocacaoRegistro[] = (alocacoesRes.data ?? []).map((row) => ({
    id: String(row.id),
    obraId: String(row.obra_id),
    colaboradorId: String(row.colaborador_id),
    encerradaEm: row.encerrada_em ? String(row.encerrada_em) : null,
  }));
  const liberacoes: LiberacaoRegistro[] = (liberacoesRes.data ?? []).map((row) => ({
    id: String(row.id),
    obraId: String(row.obra_id),
    colaboradorId: String(row.colaborador_id),
    liberadoEm: String(row.liberado_em ?? "").slice(0, 10),
    responsavel: String(row.responsavel ?? ""),
  }));
  const vigentes = new Set(
    liberacoesVigentes({ liberacoes, alocacoes }).map((item) => item.obraId)
  );
  const obras = (obrasRes.data ?? []).map((row) => ({
    id: String(row.id),
    nome: String(row.nome ?? "Obra"),
    plataformaId: String(row.plataforma_id),
  }));
  const plataformas = new Map((plataformasRes.data ?? []).map((row) => [String(row.id), String(row.nome)]));
  const exames = agendamentosVisiveisExternos({
    agendamentos: agendamentosRes.data ?? [],
    cpf: colaborador.cpfDigits,
    agendamentoId: colaborador.historicoAgendamentoId,
    hoje,
  });
  const cursos = cursosVisiveisExternos({
    cursos: (cursosRes.data ?? []).map((row) => ({ id: String(row.id), nome: String(row.nome) })),
    certificados: (certificadosRes.data ?? []).map((row) => ({
      id: String(row.id),
      cursoId: String(row.curso_id),
      realizadoEm: String(row.realizado_em ?? "").slice(0, 10),
      validade: row.validade ? String(row.validade).slice(0, 10) : null,
    })),
  });
  const eventos = eventosRes.data ?? [];
  return {
    ok: true as const,
    ficha: {
      colaborador: { id: colaborador.id, nome: colaborador.nome, cargo: colaborador.cargo },
      obras: alocacoes.filter(alocacaoAberta).map((alocacao) => {
        const obra = obras.find((item) => item.id === alocacao.obraId);
        return {
          id: alocacao.id,
          nome: obra?.nome ?? "Obra",
          plataforma: plataformas.get(obra?.plataformaId ?? "") ?? "Plataforma",
          liberado: vigentes.has(alocacao.obraId),
        };
      }),
      proximos: exames.proximos,
      realizados: exames.realizados,
      cursos,
      documentos: (documentosRes.data ?? []).map((row) => {
        const situacao = (String(row.situacao || "recebido") as SituacaoDocumentoRh);
        const historico = eventos
          .filter((evento) => String(evento.documento_id) === String(row.id))
          .map((evento) => ({
            id: String(evento.id),
            situacao: SITUACAO_DOCUMENTO_RH_LABEL[String(evento.situacao) as SituacaoDocumentoRh] ?? "Recebido",
            observacao: evento.observacao ? String(evento.observacao) : null,
            responsavel: evento.responsavel ? String(evento.responsavel) : null,
            registradoEm: String(evento.registrado_em),
          }));
        return {
          id: String(row.id),
          identificacao: String(row.identificacao),
          situacao,
          situacaoLabel: SITUACAO_DOCUMENTO_RH_LABEL[situacao] ?? "Recebido",
          observacao: row.observacao ? String(row.observacao) : null,
          arquivoNome: row.arquivo_nome ? String(row.arquivo_nome) : "",
          podeEnviar: podeEnviarDocumentoRh(situacao),
          podeAbrir: Boolean(row.arquivo_path),
          historico,
        };
      }),
    },
  };
}

export async function enviarDocumentoPortalAgrovias(params: {
  documentoId: string;
  arquivo: { nome: string; tipo: string; bytes: Uint8Array };
}) {
  const acesso = await resolverAcessoExternoAgrovias();
  if (!acesso.ok) return acesso;
  const erroArquivo = validarAnexoGestao({
    nome: params.arquivo.nome,
    tipo: params.arquivo.tipo,
    tamanho: params.arquivo.bytes.byteLength,
  });
  if (erroArquivo) return { ok: false as const, status: 400, error: erroArquivo };

  const admin = createAdminClient();
  const { data: documento } = await admin
    .from("gestao_plataforma_documentos_rh")
    .select("id, colaborador_id, situacao, cliente_id")
    .eq("id", params.documentoId)
    .eq("cliente_id", acesso.acesso.clienteId)
    .maybeSingle();
  if (!documento) return { ok: false as const, status: 404, error: "Documento não encontrado." };
  const colaborador = await colaboradorDoEscopo(acesso.acesso.clienteId, String(documento.colaborador_id));
  if (!colaborador) return { ok: false as const, status: 404, error: "Colaborador não encontrado." };
  if (!podeEnviarDocumentoRh(String(documento.situacao) as SituacaoDocumentoRh)) {
    return { ok: false as const, status: 409, error: "Este documento não está aguardando envio." };
  }

  const path = `${acesso.acesso.clienteId}/rh/${documento.id}/${randomUUID()}-${nomeSeguro(params.arquivo.nome)}`;
  if (!caminhoAnexoGestaoPermitido({ path, clienteId: acesso.acesso.clienteId })) {
    return { ok: false as const, status: 400, error: "Caminho de arquivo inválido." };
  }
  const { error: uploadErro } = await admin.storage.from(BUCKET).upload(path, params.arquivo.bytes, {
    contentType: params.arquivo.tipo || "application/octet-stream",
    upsert: false,
  });
  if (uploadErro) {
    return { ok: false as const, status: 500, error: "Não foi possível guardar o documento." };
  }
  const agora = new Date().toISOString();
  const { error } = await admin
    .from("gestao_plataforma_documentos_rh")
    .update({
      arquivo_path: path,
      arquivo_nome: params.arquivo.nome,
      arquivo_tipo: params.arquivo.tipo || null,
      arquivo_tamanho: params.arquivo.bytes.byteLength,
      situacao: "recebido",
      observacao: null,
      enviado_em: agora,
      enviado_por: acesso.acesso.nome,
    })
    .eq("id", documento.id)
    .eq("cliente_id", acesso.acesso.clienteId);
  if (error) return { ok: false as const, status: 409, error: "Não foi possível registrar o envio." };
  await admin.from("gestao_plataforma_documento_rh_eventos").insert({
    cliente_id: acesso.acesso.clienteId,
    documento_id: documento.id,
    situacao: "recebido",
    responsavel: acesso.acesso.nome,
  });
  return { ok: true as const };
}

export async function urlDocumentoPortalAgrovias(documentoId: string) {
  const acesso = await resolverAcessoExternoAgrovias();
  if (!acesso.ok) return acesso;
  const admin = createAdminClient();
  const { data } = await admin
    .from("gestao_plataforma_documentos_rh")
    .select("arquivo_path, colaborador_id, cliente_id")
    .eq("id", documentoId)
    .eq("cliente_id", acesso.acesso.clienteId)
    .maybeSingle();
  if (!data?.arquivo_path) return { ok: false as const, status: 404, error: "Arquivo não encontrado." };
  const colaborador = await colaboradorDoEscopo(acesso.acesso.clienteId, String(data.colaborador_id));
  if (!colaborador) return { ok: false as const, status: 404, error: "Colaborador não encontrado." };
  const path = String(data.arquivo_path);
  if (!arquivoRhLiberado({ path, clienteId: acesso.acesso.clienteId })) {
    return { ok: false as const, status: 403, error: "Arquivo fora do envio de RH." };
  }
  const { data: assinado, error } = await admin.storage.from(BUCKET).createSignedUrl(path, 120);
  if (error || !assinado?.signedUrl) {
    return { ok: false as const, status: 404, error: "Arquivo não encontrado." };
  }
  return { ok: true as const, url: assinado.signedUrl };
}
