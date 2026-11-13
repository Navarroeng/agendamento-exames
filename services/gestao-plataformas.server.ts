import "server-only";

import { todayIsoSaoPaulo } from "@/lib/agendamento-datetime";
import type { AuditoriaUsuarioContext } from "@/lib/auditoria";
import {
  ABRANGENCIAS_REQUISITO,
  ORCAMENTO_GESTAO_PLATAFORMAS_NUMERO,
  SITUACOES_REQUISITO,
  TIPOS_REQUISITO,
  type AcaoGestaoPlataformas,
  type AbrangenciaRequisito,
  type AlocacaoRegistro,
  type CertificadoRegistro,
  type CursoCatalogo,
  type DocumentoRhRegistro,
  type LiberacaoRegistro,
  type ObraRegistro,
  type PlataformaRegistro,
  type RequisitoRegistro,
  type SituacaoRequisito,
  type TipoRequisito,
  idsParaVincular,
  validarCursoEntrada,
  validarObraEntrada,
  validarPlataformaEntrada,
  validarRequisitoEntrada,
  podeAtivarPlataforma,
} from "@/lib/gestao-plataformas";
import type { ClienteColaboradorLinha } from "@/lib/portal-colaboradores";
import { createAdminClient } from "@/lib/supabase/admin";
import { listarColaboradoresPortal } from "@/services/portal-colaboradores.server";

type ErroPostgrest = { code?: string; message?: string } | null;

export type EscopoGestaoPlataformas = {
  clienteId: string;
  clienteNome: string;
  orcamentoId: string;
  orcamentoNumero: string;
};

export type EventoRequisito = {
  id: string;
  requisitoId: string;
  situacao: SituacaoRequisito;
  motivoRecusa: string | null;
  postadoEm: string | null;
  responsavel: string | null;
  observacao: string | null;
  registradoEm: string;
};

export type AgendamentoVinculavel = {
  id: string;
  colaborador: string;
  cpf: string;
  data: string;
  aso: string;
};

export type PainelGestaoPlataformas = {
  escopo: EscopoGestaoPlataformas;
  hoje: string;
  responsavelSessao: string;
  plataformas: PlataformaRegistro[];
  obras: ObraRegistro[];
  alocacoes: AlocacaoRegistro[];
  requisitos: RequisitoRegistro[];
  eventos: EventoRequisito[];
  liberacoes: LiberacaoRegistro[];
  colaboradores: ClienteColaboradorLinha[];
  cursos: CursoCatalogo[];
  certificados: CertificadoRegistro[];
  documentosRh: DocumentoRhRegistro[];
  agendamentos: AgendamentoVinculavel[];
};

function texto(valor: unknown): string {
  return String(valor ?? "").trim();
}

function dataOuNull(valor: unknown): string | null {
  const bruto = texto(valor);
  return bruto ? bruto.slice(0, 10) : null;
}

function mensagemBanco(error: ErroPostgrest, fallback: string): string {
  const message = error?.message ?? "";
  const util =
    message.includes("ORC-2026-0087") ||
    message.includes("plataformas ativas") ||
    message.includes("AGROVIAS") ||
    message.includes("alocação") ||
    message.includes("requisito") ||
    message.includes("liberação") ||
    message.includes("exame vinculado") ||
    message.includes("certificado") ||
    message.includes("curso");
  if (!util) return fallback;
  return message.replace(/^.*ERROR:\s*/i, "").split("\n")[0] || fallback;
}

function tabelaAusente(error: ErroPostgrest): boolean {
  return (
    error?.code === "42P01" ||
    error?.code === "42703" ||
    /does not exist|schema cache|não existe/i.test(error?.message ?? "")
  );
}

export async function resolverEscopoGestaoPlataformas(): Promise<
  | { ok: true; escopo: EscopoGestaoPlataformas }
  | { ok: false; status: number; error: string }
> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orcamentos")
    .select("id, numero, cliente_id, cliente_nome")
    .eq("numero", ORCAMENTO_GESTAO_PLATAFORMAS_NUMERO)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      status: 500,
      error: "Não foi possível localizar o orçamento da Gestão de Plataformas.",
    };
  }
  if (!data?.id || !data.cliente_id) {
    return {
      ok: false,
      status: 409,
      error: `O orçamento ${ORCAMENTO_GESTAO_PLATAFORMAS_NUMERO} ainda não está vinculado a um cliente.`,
    };
  }
  return {
    ok: true,
    escopo: {
      clienteId: String(data.cliente_id),
      clienteNome: texto(data.cliente_nome) || "AGROVIAS",
      orcamentoId: String(data.id),
      orcamentoNumero: String(data.numero),
    },
  };
}

function mapPlataforma(row: Record<string, unknown>): PlataformaRegistro {
  return {
    id: String(row.id),
    nome: texto(row.nome),
    linkAcesso: texto(row.link_acesso),
    arquivadaEm: row.arquivada_em ? String(row.arquivada_em) : null,
  };
}

function mapObra(row: Record<string, unknown>): ObraRegistro {
  return {
    id: String(row.id),
    plataformaId: String(row.plataforma_id),
    nome: texto(row.nome),
    empresaResponsavel: texto(row.empresa_responsavel),
    inicioPrevisto: dataOuNull(row.inicio_previsto),
    responsavelAcompanhamento: texto(row.responsavel_acompanhamento),
  };
}

function mapAlocacao(row: Record<string, unknown>): AlocacaoRegistro {
  return {
    id: String(row.id),
    obraId: String(row.obra_id),
    colaboradorId: texto(row.colaborador_id),
    encerradaEm: row.encerrada_em ? String(row.encerrada_em) : null,
  };
}

function mapRequisito(row: Record<string, unknown>): RequisitoRegistro {
  return {
    id: String(row.id),
    obraId: String(row.obra_id),
    abrangencia: texto(row.abrangencia) as AbrangenciaRequisito,
    cargo: row.cargo ? texto(row.cargo) : null,
    colaboradorId: row.colaborador_id ? texto(row.colaborador_id) : null,
    tipo: texto(row.tipo) as TipoRequisito,
    titulo: texto(row.titulo),
    recorrente: Boolean(row.recorrente),
    competencia: row.competencia ? texto(row.competencia) : null,
    responsavel: row.responsavel ? texto(row.responsavel) : null,
    prazo: dataOuNull(row.prazo),
    validade: dataOuNull(row.validade),
    postadoEm: dataOuNull(row.postado_em),
    situacao: texto(row.situacao) as SituacaoRequisito,
    motivoRecusa: row.motivo_recusa ? texto(row.motivo_recusa) : null,
    agendamentoId: row.agendamento_id ? String(row.agendamento_id) : null,
    certificadoId: row.certificado_id ? String(row.certificado_id) : null,
  };
}

function mapEvento(row: Record<string, unknown>): EventoRequisito {
  return {
    id: String(row.id),
    requisitoId: String(row.requisito_id),
    situacao: texto(row.situacao) as SituacaoRequisito,
    motivoRecusa: row.motivo_recusa ? texto(row.motivo_recusa) : null,
    postadoEm: dataOuNull(row.postado_em),
    responsavel: row.responsavel ? texto(row.responsavel) : null,
    observacao: row.observacao ? texto(row.observacao) : null,
    registradoEm: String(row.registrado_em),
  };
}

function mapLiberacao(row: Record<string, unknown>): LiberacaoRegistro {
  return {
    id: String(row.id),
    obraId: String(row.obra_id),
    colaboradorId: texto(row.colaborador_id),
    liberadoEm: dataOuNull(row.liberado_em) ?? "",
    responsavel: texto(row.responsavel),
  };
}

export async function carregarGestaoPlataformas(params: {
  actor: AuditoriaUsuarioContext;
}): Promise<
  | { ok: true; painel: PainelGestaoPlataformas }
  | { ok: false; status: number; error: string }
> {
  const escopoResultado = await resolverEscopoGestaoPlataformas();
  if (!escopoResultado.ok) return escopoResultado;
  const escopo = escopoResultado.escopo;
  const admin = createAdminClient();
  const clienteId = escopo.clienteId;

  const [
    plataformasRes,
    obrasRes,
    alocacoesRes,
    requisitosRes,
    eventosRes,
    liberacoesRes,
    cursosRes,
    certificadosRes,
    documentosRes,
    colaboradoresRes,
    agendamentosRes,
  ] = await Promise.all([
    admin
      .from("gestao_plataformas")
      .select("id, nome, link_acesso, arquivada_em")
      .eq("cliente_id", clienteId)
      .order("nome"),
    admin
      .from("gestao_plataforma_obras")
      .select(
        "id, plataforma_id, nome, empresa_responsavel, inicio_previsto, responsavel_acompanhamento"
      )
      .eq("cliente_id", clienteId)
      .order("inicio_previsto"),
    admin
      .from("gestao_plataforma_alocacoes")
      .select("id, obra_id, colaborador_id, encerrada_em")
      .eq("cliente_id", clienteId)
      .order("criado_em", { ascending: false }),
    admin
      .from("gestao_plataforma_requisitos")
      .select(
        "id, obra_id, abrangencia, cargo, colaborador_id, tipo, titulo, recorrente, competencia, responsavel, prazo, validade, postado_em, situacao, motivo_recusa, agendamento_id, certificado_id"
      )
      .eq("cliente_id", clienteId)
      .order("titulo"),
    admin
      .from("gestao_plataforma_requisito_eventos")
      .select(
        "id, requisito_id, situacao, motivo_recusa, postado_em, responsavel, observacao, registrado_em"
      )
      .eq("cliente_id", clienteId)
      .order("registrado_em", { ascending: false })
      .limit(400),
    admin
      .from("gestao_plataforma_liberacoes")
      .select("id, obra_id, colaborador_id, liberado_em, responsavel")
      .eq("cliente_id", clienteId)
      .order("liberado_em", { ascending: false }),
    admin
      .from("gestao_plataforma_cursos")
      .select("id, nome, valor_centavos, inativado_em")
      .eq("cliente_id", clienteId)
      .order("nome"),
    admin
      .from("gestao_plataforma_certificados")
      .select(
        "id, colaborador_id, curso_id, realizado_em, validade, arquivo_nome, arquivo_path"
      )
      .eq("cliente_id", clienteId)
      .order("realizado_em", { ascending: false }),
    admin
      .from("gestao_plataforma_documentos_rh")
      .select("id, colaborador_id, identificacao, incluido_em, arquivo_nome, arquivo_path")
      .eq("cliente_id", clienteId)
      .order("incluido_em", { ascending: false }),
    listarColaboradoresPortal(clienteId),
    admin
      .from("agendamentos")
      .select("id, colaborador, colaborador_cpf, data_agendamento, aso")
      .eq("cliente_id", clienteId)
      .order("data_agendamento", { ascending: false })
      .limit(120),
  ]);

  const consulta = [
    plataformasRes.error,
    obrasRes.error,
    alocacoesRes.error,
    requisitosRes.error,
    eventosRes.error,
    liberacoesRes.error,
    cursosRes.error,
    certificadosRes.error,
    documentosRes.error,
  ].find(Boolean);
  if (consulta) {
    if (tabelaAusente(consulta)) {
      return {
        ok: false,
        status: 503,
        error:
          "A estrutura da Gestão de Plataformas ainda não foi aplicada no banco.",
      };
    }
    return {
      ok: false,
      status: 500,
      error: "Não foi possível carregar a Gestão de Plataformas.",
    };
  }

  return {
    ok: true,
    painel: {
      escopo,
      hoje: todayIsoSaoPaulo(),
      responsavelSessao: params.actor.usuarioNome,
      plataformas: ((plataformasRes.data ?? []) as Record<string, unknown>[]).map(
        mapPlataforma
      ),
      obras: ((obrasRes.data ?? []) as Record<string, unknown>[]).map(mapObra),
      alocacoes: ((alocacoesRes.data ?? []) as Record<string, unknown>[]).map(
        mapAlocacao
      ),
      requisitos: ((requisitosRes.data ?? []) as Record<string, unknown>[]).map(
        mapRequisito
      ),
      eventos: ((eventosRes.data ?? []) as Record<string, unknown>[]).map(
        mapEvento
      ),
      liberacoes: ((liberacoesRes.data ?? []) as Record<string, unknown>[]).map(
        mapLiberacao
      ),
      colaboradores: colaboradoresRes.colaboradores,
      cursos: ((cursosRes.data ?? []) as Record<string, unknown>[]).map((row) => ({
        id: String(row.id),
        nome: texto(row.nome),
        valorCentavos: Number(row.valor_centavos) || 0,
        inativadoEm: row.inativado_em ? String(row.inativado_em) : null,
      })),
      certificados: ((certificadosRes.data ?? []) as Record<string, unknown>[]).map(
        (row) => ({
          id: String(row.id),
          colaboradorId: texto(row.colaborador_id),
          cursoId: String(row.curso_id),
          realizadoEm: dataOuNull(row.realizado_em) ?? "",
          validade: dataOuNull(row.validade),
          arquivoNome: row.arquivo_nome ? texto(row.arquivo_nome) : null,
          arquivoPath: row.arquivo_path ? texto(row.arquivo_path) : null,
        })
      ),
      documentosRh: ((documentosRes.data ?? []) as Record<string, unknown>[]).map(
        (row) => ({
          id: String(row.id),
          colaboradorId: texto(row.colaborador_id),
          identificacao: texto(row.identificacao),
          incluidoEm: String(row.incluido_em),
          arquivoNome: texto(row.arquivo_nome),
          arquivoPath: texto(row.arquivo_path),
        })
      ),
      agendamentos: agendamentosRes.error
        ? []
        : ((agendamentosRes.data ?? []) as Record<string, unknown>[]).map(
            (row) => ({
              id: String(row.id),
              colaborador: texto(row.colaborador),
              cpf: texto(row.colaborador_cpf),
              data: dataOuNull(row.data_agendamento) ?? "",
              aso: texto(row.aso),
            })
          ),
    },
  };
}

async function registrarEvento(params: {
  clienteId: string;
  requisitoId: string;
  situacao: SituacaoRequisito;
  motivoRecusa: string | null;
  postadoEm: string | null;
  responsavel: string;
  observacao: string | null;
}): Promise<ErroPostgrest> {
  const admin = createAdminClient();
  const { error } = await admin.from("gestao_plataforma_requisito_eventos").insert({
    cliente_id: params.clienteId,
    requisito_id: params.requisitoId,
    situacao: params.situacao,
    motivo_recusa: params.motivoRecusa,
    postado_em: params.postadoEm,
    responsavel: params.responsavel,
    observacao: params.observacao,
  });
  return error;
}

function observacaoTransicao(
  anterior: SituacaoRequisito | null,
  proxima: SituacaoRequisito
): string | null {
  if (anterior === "recusado" && proxima !== "recusado") {
    return "Reenvio após recusa";
  }
  if (anterior === "aprovado" && proxima !== "aprovado") {
    return "Nova entrega após aprovação anterior";
  }
  if (!anterior) return "Requisito registrado";
  return null;
}

export async function executarGestaoPlataformas(params: {
  acao: AcaoGestaoPlataformas;
  actor: AuditoriaUsuarioContext;
}): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const escopoResultado = await resolverEscopoGestaoPlataformas();
  if (!escopoResultado.ok) return escopoResultado;
  const escopo = escopoResultado.escopo;
  const admin = createAdminClient();
  const agora = new Date().toISOString();
  const acao = params.acao;

  if (acao.acao === "salvar_plataforma") {
    const erroEntrada = validarPlataformaEntrada(acao);
    if (erroEntrada) return { ok: false, status: 400, error: erroEntrada };
    if (!acao.id) {
      const { data: atuais, error: leituraErro } = await admin
        .from("gestao_plataformas")
        .select("id, nome, link_acesso, arquivada_em")
        .eq("cliente_id", escopo.clienteId);
      if (leituraErro) {
        return { ok: false, status: 500, error: "Não foi possível validar o limite." };
      }
      const limite = podeAtivarPlataforma({
        plataformas: ((atuais ?? []) as Record<string, unknown>[]).map(mapPlataforma),
      });
      if (!limite.ok) return { ok: false, status: 409, error: limite.erro };
    }
    const payload = {
      nome: acao.nome.trim(),
      link_acesso: acao.linkAcesso.trim(),
      atualizado_em: agora,
    };
    const { error } = acao.id
      ? await admin
          .from("gestao_plataformas")
          .update(payload)
          .eq("id", acao.id)
          .eq("cliente_id", escopo.clienteId)
      : await admin.from("gestao_plataformas").insert({
          ...payload,
          cliente_id: escopo.clienteId,
          orcamento_id: escopo.orcamentoId,
          criado_por: params.actor.usuarioId,
        });
    if (error) {
      return {
        ok: false,
        status: 409,
        error: mensagemBanco(error, "Não foi possível salvar a plataforma."),
      };
    }
    return { ok: true };
  }

  if (acao.acao === "arquivar_plataforma" || acao.acao === "reativar_plataforma") {
    if (acao.acao === "reativar_plataforma") {
      const { data: atuais, error: leituraErro } = await admin
        .from("gestao_plataformas")
        .select("id, nome, link_acesso, arquivada_em")
        .eq("cliente_id", escopo.clienteId);
      if (leituraErro) {
        return { ok: false, status: 500, error: "Não foi possível validar o limite." };
      }
      const limite = podeAtivarPlataforma({
        plataformas: ((atuais ?? []) as Record<string, unknown>[]).map(mapPlataforma),
        plataformaId: acao.id,
      });
      if (!limite.ok) return { ok: false, status: 409, error: limite.erro };
    }
    const { error } = await admin
      .from("gestao_plataformas")
      .update({
        arquivada_em: acao.acao === "arquivar_plataforma" ? agora : null,
        atualizado_em: agora,
      })
      .eq("id", acao.id)
      .eq("cliente_id", escopo.clienteId);
    if (error) {
      return {
        ok: false,
        status: 409,
        error: mensagemBanco(error, "Não foi possível atualizar a plataforma."),
      };
    }
    return { ok: true };
  }

  if (acao.acao === "salvar_obra") {
    const erroEntrada = validarObraEntrada(acao);
    if (erroEntrada) return { ok: false, status: 400, error: erroEntrada };
    const { data: plataforma, error: plataformaErro } = await admin
      .from("gestao_plataformas")
      .select("id")
      .eq("id", acao.plataformaId)
      .eq("cliente_id", escopo.clienteId)
      .maybeSingle();
    if (plataformaErro || !plataforma) {
      return { ok: false, status: 400, error: "Selecione uma plataforma da AGROVIAS." };
    }
    const payload = {
      plataforma_id: acao.plataformaId,
      nome: acao.nome.trim(),
      empresa_responsavel: acao.empresaResponsavel.trim(),
      inicio_previsto: acao.inicioPrevisto,
      responsavel_acompanhamento: acao.responsavelAcompanhamento.trim(),
      atualizado_em: agora,
    };
    const { error } = acao.id
      ? await admin
          .from("gestao_plataforma_obras")
          .update(payload)
          .eq("id", acao.id)
          .eq("cliente_id", escopo.clienteId)
      : await admin.from("gestao_plataforma_obras").insert({
          ...payload,
          cliente_id: escopo.clienteId,
        });
    if (error) {
      return {
        ok: false,
        status: 409,
        error: mensagemBanco(error, "Não foi possível salvar a obra."),
      };
    }
    return { ok: true };
  }

  if (acao.acao === "vincular") {
    const colaboradorId = texto(acao.colaboradorId);
    const obraIds = Array.from(new Set(acao.obraIds.map((id) => texto(id)).filter(Boolean)));
    if (!colaboradorId || obraIds.length === 0) {
      return { ok: false, status: 400, error: "Selecione o colaborador e ao menos uma obra." };
    }
    const { colaboradores } = await listarColaboradoresPortal(escopo.clienteId);
    if (!colaboradores.some((linha) => linha.id === colaboradorId)) {
      return {
        ok: false,
        status: 400,
        error: "Colaborador não encontrado no cadastro da AGROVIAS.",
      };
    }
    const { data: obras, error: obrasErro } = await admin
      .from("gestao_plataforma_obras")
      .select("id")
      .eq("cliente_id", escopo.clienteId)
      .in("id", obraIds);
    if (obrasErro) {
      return { ok: false, status: 500, error: "Não foi possível validar as obras." };
    }
    const obrasValidas = new Set((obras ?? []).map((obra) => String(obra.id)));
    if (obrasValidas.size !== obraIds.length) {
      return { ok: false, status: 400, error: "Uma das obras não pertence à AGROVIAS." };
    }
    const { data: abertas, error: abertasErro } = await admin
      .from("gestao_plataforma_alocacoes")
      .select("obra_id")
      .eq("cliente_id", escopo.clienteId)
      .eq("colaborador_id", colaboradorId)
      .is("encerrada_em", null)
      .in("obra_id", obraIds);
    if (abertasErro) {
      return { ok: false, status: 500, error: "Não foi possível consultar as alocações." };
    }
    const jaVinculadas = new Set((abertas ?? []).map((item) => String(item.obra_id)));
    const novas = obraIds.filter((obraId) => !jaVinculadas.has(obraId));
    if (novas.length === 0) {
      return {
        ok: false,
        status: 409,
        error: "Este colaborador já está vinculado às obras selecionadas.",
      };
    }
    const { error } = await admin.from("gestao_plataforma_alocacoes").insert(
      novas.map((obraId) => ({
        cliente_id: escopo.clienteId,
        obra_id: obraId,
        colaborador_id: colaboradorId,
      }))
    );
    if (error) {
      return {
        ok: false,
        status: 409,
        error: mensagemBanco(error, "Não foi possível vincular o colaborador."),
      };
    }
    return { ok: true };
  }

  if (acao.acao === "vincular_lote") {
    const obraId = texto(acao.obraId);
    const { colaboradores } = await listarColaboradoresPortal(escopo.clienteId);
    const conhecidos = new Set(colaboradores.map((linha) => linha.id));
    const pedidos = acao.colaboradorIds.map((id) => texto(id)).filter(Boolean);
    if (!obraId || pedidos.length === 0) {
      return { ok: false, status: 400, error: "Selecione a obra e ao menos um colaborador." };
    }
    if (pedidos.some((id) => !conhecidos.has(id))) {
      return {
        ok: false,
        status: 400,
        error: "Um dos colaboradores não está no cadastro da AGROVIAS.",
      };
    }
    const { data: obra, error: obraErro } = await admin
      .from("gestao_plataforma_obras")
      .select("id")
      .eq("id", obraId)
      .eq("cliente_id", escopo.clienteId)
      .maybeSingle();
    if (obraErro || !obra) {
      return { ok: false, status: 400, error: "A obra não pertence à AGROVIAS." };
    }
    const { data: abertas, error: abertasErro } = await admin
      .from("gestao_plataforma_alocacoes")
      .select("id, obra_id, colaborador_id, encerrada_em")
      .eq("cliente_id", escopo.clienteId)
      .eq("obra_id", obraId)
      .is("encerrada_em", null);
    if (abertasErro) {
      return { ok: false, status: 500, error: "Não foi possível consultar as alocações." };
    }
    const novas = idsParaVincular({
      alocacoes: ((abertas ?? []) as Record<string, unknown>[]).map(mapAlocacao),
      obraId,
      colaboradorIds: pedidos,
    });
    if (novas.length === 0) {
      return {
        ok: false,
        status: 409,
        error: "Esses colaboradores já possuem um vínculo ativo nesta obra.",
      };
    }
    const { error } = await admin.from("gestao_plataforma_alocacoes").insert(
      novas.map((colaboradorId) => ({
        cliente_id: escopo.clienteId,
        obra_id: obraId,
        colaborador_id: colaboradorId,
      }))
    );
    if (error) {
      return {
        ok: false,
        status: 409,
        error: mensagemBanco(error, "Não foi possível vincular os colaboradores."),
      };
    }
    return { ok: true };
  }

  if (acao.acao === "salvar_curso" || acao.acao === "inativar_curso" || acao.acao === "reativar_curso") {
    if (acao.acao === "inativar_curso" || acao.acao === "reativar_curso") {
      const { error } = await admin
        .from("gestao_plataforma_cursos")
        .update({
          inativado_em: acao.acao === "inativar_curso" ? agora : null,
          atualizado_em: agora,
        })
        .eq("id", acao.id)
        .eq("cliente_id", escopo.clienteId);
      if (error) {
        return {
          ok: false,
          status: 409,
          error: mensagemBanco(error, "Não foi possível atualizar o curso."),
        };
      }
      return { ok: true };
    }
    const erroCurso = validarCursoEntrada(acao);
    if (erroCurso) return { ok: false, status: 400, error: erroCurso };
    const payload = {
      nome: acao.nome.trim(),
      valor_centavos: acao.valorCentavos,
      atualizado_em: agora,
    };
    const { error } = acao.id
      ? await admin
          .from("gestao_plataforma_cursos")
          .update(payload)
          .eq("id", acao.id)
          .eq("cliente_id", escopo.clienteId)
      : await admin.from("gestao_plataforma_cursos").insert({
          ...payload,
          cliente_id: escopo.clienteId,
        });
    if (error) {
      return {
        ok: false,
        status: 409,
        error: mensagemBanco(error, "Não foi possível salvar o curso."),
      };
    }
    return { ok: true };
  }

  if (acao.acao === "encerrar_alocacao") {
    const { error } = await admin
      .from("gestao_plataforma_alocacoes")
      .update({ encerrada_em: agora })
      .eq("id", acao.id)
      .eq("cliente_id", escopo.clienteId)
      .is("encerrada_em", null);
    if (error) {
      return {
        ok: false,
        status: 409,
        error: mensagemBanco(error, "Não foi possível encerrar a alocação."),
      };
    }
    return { ok: true };
  }

  if (acao.acao === "salvar_requisito" || acao.acao === "situacao_requisito") {
    const adminAtual = createAdminClient();
    let atual: RequisitoRegistro | null = null;
    if (acao.id) {
      const { data, error } = await adminAtual
        .from("gestao_plataforma_requisitos")
        .select(
          "id, obra_id, abrangencia, cargo, colaborador_id, tipo, titulo, recorrente, competencia, responsavel, prazo, validade, postado_em, situacao, motivo_recusa, agendamento_id, certificado_id"
        )
        .eq("id", acao.id)
        .eq("cliente_id", escopo.clienteId)
        .maybeSingle();
      if (error || !data) {
        return { ok: false, status: 404, error: "Requisito não encontrado." };
      }
      atual = mapRequisito(data as Record<string, unknown>);
    }

    const entrada =
      acao.acao === "salvar_requisito"
        ? acao
        : {
            abrangencia: atual?.abrangencia ?? "equipe",
            cargo: atual?.cargo ?? null,
            colaboradorId: atual?.colaboradorId ?? null,
            tipo: atual?.tipo ?? "documento_sst",
            titulo: atual?.titulo ?? "",
            recorrente: atual?.recorrente ?? false,
            competencia: atual?.competencia ?? null,
            situacao: acao.situacao,
            motivoRecusa: acao.motivoRecusa ?? null,
          };
    if (
      !ABRANGENCIAS_REQUISITO.includes(entrada.abrangencia) ||
      !TIPOS_REQUISITO.includes(entrada.tipo) ||
      !SITUACOES_REQUISITO.includes(entrada.situacao)
    ) {
      return { ok: false, status: 400, error: "Requisito inválido." };
    }
    const erroEntrada = validarRequisitoEntrada(entrada);
    if (erroEntrada) return { ok: false, status: 400, error: erroEntrada };

    if (acao.acao === "situacao_requisito") {
      const postadoEm =
        acao.postadoEm !== undefined ? dataOuNull(acao.postadoEm) : atual?.postadoEm ?? null;
      const { error } = await admin
        .from("gestao_plataforma_requisitos")
        .update({
          situacao: acao.situacao,
          motivo_recusa:
            acao.situacao === "recusado" ? texto(acao.motivoRecusa) : null,
          postado_em: postadoEm,
          atualizado_em: agora,
        })
        .eq("id", acao.id)
        .eq("cliente_id", escopo.clienteId);
      if (error) {
        return {
          ok: false,
          status: 409,
          error: mensagemBanco(error, "Não foi possível atualizar a situação."),
        };
      }
      const eventoErro = await registrarEvento({
        clienteId: escopo.clienteId,
        requisitoId: acao.id,
        situacao: acao.situacao,
        motivoRecusa: acao.situacao === "recusado" ? texto(acao.motivoRecusa) : null,
        postadoEm,
        responsavel: params.actor.usuarioNome,
        observacao: observacaoTransicao(atual?.situacao ?? null, acao.situacao),
      });
      if (eventoErro) {
        return {
          ok: false,
          status: 500,
          error: "A situação foi salva, mas o histórico não pôde ser registrado.",
        };
      }
      return { ok: true };
    }

    const payload = {
      obra_id: acao.obraId,
      abrangencia: acao.abrangencia,
      cargo: acao.abrangencia === "funcao" ? texto(acao.cargo) : null,
      colaborador_id:
        acao.abrangencia === "colaborador" ? texto(acao.colaboradorId) : null,
      tipo: acao.tipo,
      titulo: acao.titulo.trim(),
      recorrente: acao.recorrente,
      competencia: acao.recorrente ? texto(acao.competencia) : null,
      responsavel: texto(acao.responsavel) || null,
      prazo: dataOuNull(acao.prazo),
      validade: dataOuNull(acao.validade),
      postado_em: dataOuNull(acao.postadoEm),
      situacao: acao.situacao,
      motivo_recusa: acao.situacao === "recusado" ? texto(acao.motivoRecusa) : null,
      agendamento_id: texto(acao.agendamentoId) || null,
      certificado_id: texto(acao.certificadoId) || null,
      atualizado_em: agora,
    };
    if (acao.id) {
      const { error } = await admin
        .from("gestao_plataforma_requisitos")
        .update(payload)
        .eq("id", acao.id)
        .eq("cliente_id", escopo.clienteId);
      if (error) {
        return {
          ok: false,
          status: 409,
          error: mensagemBanco(error, "Não foi possível salvar o requisito."),
        };
      }
      if (atual && atual.situacao !== acao.situacao) {
        await registrarEvento({
          clienteId: escopo.clienteId,
          requisitoId: acao.id,
          situacao: acao.situacao,
          motivoRecusa: payload.motivo_recusa,
          postadoEm: payload.postado_em,
          responsavel: params.actor.usuarioNome,
          observacao: observacaoTransicao(atual.situacao, acao.situacao),
        });
      }
      return { ok: true };
    }

    const { data: criado, error } = await admin
      .from("gestao_plataforma_requisitos")
      .insert({ ...payload, cliente_id: escopo.clienteId })
      .select("id")
      .single();
    if (error || !criado?.id) {
      return {
        ok: false,
        status: 409,
        error: mensagemBanco(error, "Não foi possível salvar o requisito."),
      };
    }
    await registrarEvento({
      clienteId: escopo.clienteId,
      requisitoId: String(criado.id),
      situacao: acao.situacao,
      motivoRecusa: payload.motivo_recusa,
      postadoEm: payload.postado_em,
      responsavel: params.actor.usuarioNome,
      observacao: "Requisito registrado",
    });
    return { ok: true };
  }

  const liberadoEm = dataOuNull(acao.liberadoEm);
  const responsavel = texto(acao.responsavel);
  if (!liberadoEm || responsavel.length < 2) {
    return {
      ok: false,
      status: 400,
      error: "Informe a data e o responsável pela liberação.",
    };
  }
  const { data: alocacao, error: alocacaoErro } = await admin
    .from("gestao_plataforma_alocacoes")
    .select("id")
    .eq("cliente_id", escopo.clienteId)
    .eq("obra_id", acao.obraId)
    .eq("colaborador_id", acao.colaboradorId)
    .is("encerrada_em", null)
    .maybeSingle();
  if (alocacaoErro || !alocacao) {
    return {
      ok: false,
      status: 409,
      error: "A liberação exige uma alocação em aberto nesta obra.",
    };
  }
  const { error } = await admin.from("gestao_plataforma_liberacoes").insert({
    cliente_id: escopo.clienteId,
    obra_id: acao.obraId,
    colaborador_id: acao.colaboradorId,
    liberado_em: liberadoEm,
    responsavel,
  });
  if (error) {
    return {
      ok: false,
      status: 409,
      error: mensagemBanco(error, "Não foi possível registrar a liberação."),
    };
  }
  return { ok: true };
}
