/**
 * Gravação do cadastro a partir de Clientes.
 * A propagação em si fica em lib, para a Lista de funcionários usar o mesmo código.
 */

import { isNomeFuncionarioReal, normalizeNomeOcupante } from "@/lib/contrato-vagas";
import { MENSAGEM_CPF_DUPLICADO } from "@/lib/colaborador-cadastro";
import type { IdentidadeColaborador } from "@/lib/colaborador-cadastro";
import {
  MOTIVO_LOTE_PENDENTE,
  avaliarImportacaoColaboradores,
  lerMotivoLoteImportacao,
  motivoLoteImportacao,
  type LinhaImportacaoColaborador,
} from "@/lib/colaborador-importacao";
import { idLinhaImportacao } from "@/lib/colaborador-importacao-id";
import { TIPO_CADASTRO, isUuid } from "@/lib/colaborador-movimentacoes";
import { propagarCadastroColaborador } from "@/lib/colaborador-cadastro-gravacao";
import { isDataCalendarioIso } from "@/lib/colaborador-movimentacoes";
import { isValidCPF, normalizeCpfDigits } from "@/lib/cpf";
import type { AuditoriaUsuarioContext } from "@/lib/auditoria";
import { createAdminClient } from "@/lib/supabase/admin";
import { salvarAdmissaoColaborador } from "@/services/colaborador-movimentacoes.server";
import { listarColaboradoresPortal } from "@/services/portal-colaboradores.server";

function texto(value: string | null | undefined): string | null {
  const nome = normalizeNomeOcupante(value);
  return nome || null;
}

function cpfGravado(value: string | null | undefined): string | null {
  const digits = normalizeCpfDigits(value);
  return isValidCPF(digits) ? digits : null;
}

export async function salvarCadastroColaborador(params: {
  clienteId: string;
  identidade: IdentidadeColaborador;
  nome: string;
  cpf: string | null;
  cargo: string | null;
  dataAdmissao: string | null;
  dataDesligamento: string | null;
  desligamentoMovimentacaoId: string | null;
  actor: AuditoriaUsuarioContext;
}): Promise<
  | {
      ok: true;
      colaboradores: Awaited<ReturnType<typeof listarColaboradoresPortal>>["colaboradores"];
      resumo: Awaited<ReturnType<typeof listarColaboradoresPortal>>["resumo"];
    }
  | { ok: false; error: string; status: number }
> {
  const clienteId = params.clienteId.trim();
  const nome = texto(params.nome);
  if (!isNomeFuncionarioReal(nome)) {
    return { ok: false, error: "Informe o nome do colaborador.", status: 400 };
  }
  const cpfInformado = normalizeCpfDigits(params.cpf);
  if (cpfInformado && !isValidCPF(cpfInformado)) {
    return { ok: false, error: "CPF inválido.", status: 400 };
  }
  const cpfAtual = cpfGravado(params.identidade.cpf);
  if (cpfAtual && !cpfInformado) {
    return { ok: false, error: "Informe o CPF do colaborador.", status: 400 };
  }
  const cpf = cpfGravado(cpfInformado);
  const dataAdmissao = String(params.dataAdmissao ?? "").trim();
  if (dataAdmissao && !isDataCalendarioIso(dataAdmissao)) {
    return { ok: false, error: "Data de admissão inválida.", status: 400 };
  }
  const cadastroId = String(params.identidade.cadastroId ?? "").trim();
  if (dataAdmissao && !cpf && !cadastroId) {
    return {
      ok: false,
      error: "Informe um CPF válido para registrar a data de admissão.",
      status: 400,
    };
  }
  const dataDesligamento = String(params.dataDesligamento ?? "").trim();
  if (dataDesligamento && !isDataCalendarioIso(dataDesligamento)) {
    return { ok: false, error: "Data de desligamento inválida.", status: 400 };
  }

  const admin = createAdminClient();
  try {
    await propagarCadastroColaborador(admin, {
      clienteId,
      identidade: {
        cpf: cpfAtual,
        agendamentoId: params.identidade.agendamentoId,
        vagaId: params.identidade.vagaId,
        cadastroId: cadastroId || null,
      },
      cadastro: { nome, cpf, cargo: texto(params.cargo) },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Colaborador não encontrado nesta empresa.") {
      return { ok: false, error: message, status: 404 };
    }
    if (
      message === MENSAGEM_CPF_DUPLICADO ||
      message.startsWith("Este CPF já está associado")
    ) {
      return { ok: false, error: message, status: 409 };
    }
    throw error;
  }

  if (cadastroId) {
    const dataGravada = dataAdmissao || null;
    const { error } = await admin
      .from("colaborador_movimentacoes")
      .update({ data_evento: dataGravada })
      .eq("id", cadastroId)
      .eq("cliente_id", clienteId)
      .eq("tipo", TIPO_CADASTRO)
      .is("cancelado_em", null);
    if (error) throw error;
  }

  if (dataAdmissao && cpf) {
    const admissao = await salvarAdmissaoColaborador({
      clienteId,
      cpf,
      dataAdmissao,
      actor: params.actor,
    });
    if (!admissao.ok) return admissao;
  }

  const movimentacaoId = String(params.desligamentoMovimentacaoId ?? "").trim();
  if (dataDesligamento && movimentacaoId) {
    const { error } = await admin
      .from("colaborador_movimentacoes")
      .update({ data_evento: dataDesligamento })
      .eq("id", movimentacaoId)
      .eq("cliente_id", clienteId)
      .eq("tipo", "desligamento_admin")
      .is("cancelado_em", null);
    if (error) {
      if (error.code === "23505") {
        return {
          ok: false,
          error: "Já existe um desligamento administrativo nesta data.",
          status: 409,
        };
      }
      throw error;
    }
  }

  return { ok: true, ...(await listarColaboradoresPortal(clienteId)) };
}

type ResultadoLista = {
  colaboradores: Awaited<ReturnType<typeof listarColaboradoresPortal>>["colaboradores"];
  resumo: Awaited<ReturnType<typeof listarColaboradoresPortal>>["resumo"];
};

function cadastroIndisponivel(error: { code?: string; message?: string }): boolean {
  return (
    error.code === "23514" ||
    error.code === "42703" ||
    error.code === "PGRST204"
  );
}

/**
 * Grava um colaborador novo, sem agendamento e sem vaga.
 * O mesmo caminho serve o botão manual e cada linha da importação.
 */
async function gravarColaboradorManual(params: {
  clienteId: string;
  nome: string;
  cpf: string | null;
  cargo: string | null;
  dataAdmissao: string | null;
  actor: AuditoriaUsuarioContext;
  id?: string | null;
  conferirCpfExistente?: boolean;
}): Promise<
  | { ok: true; repetido: boolean }
  | { ok: false; error: string; status: number }
> {
  const clienteId = params.clienteId.trim();
  const nome = texto(params.nome);
  if (!isNomeFuncionarioReal(nome)) {
    return { ok: false, error: "Informe o nome do colaborador.", status: 400 };
  }
  const cpfInformado = normalizeCpfDigits(params.cpf);
  if (cpfInformado && !isValidCPF(cpfInformado)) {
    return { ok: false, error: "CPF inválido.", status: 400 };
  }
  const cpf = cpfGravado(cpfInformado);
  const dataAdmissao = String(params.dataAdmissao ?? "").trim();
  if (dataAdmissao && !isDataCalendarioIso(dataAdmissao)) {
    return { ok: false, error: "Data de admissão inválida.", status: 400 };
  }
  const id = String(params.id ?? "").trim();
  if (id && !isUuid(id)) {
    return { ok: false, error: "Identificador inválido.", status: 400 };
  }

  if (params.conferirCpfExistente !== false && cpf) {
    const atual = await listarColaboradoresPortal(clienteId);
    if (atual.colaboradores.some((linha) => linha.cpfDigits === cpf)) {
      return { ok: false, error: MENSAGEM_CPF_DUPLICADO, status: 409 };
    }
  }

  const admin = createAdminClient();
  const insert = await admin
    .from("colaborador_movimentacoes")
    .insert({
      ...(id ? { id } : {}),
      cliente_id: clienteId,
      cpf_digits: cpf ?? "",
      tipo: TIPO_CADASTRO,
      data_evento: dataAdmissao || null,
      colaborador_nome: nome,
      cargo_nome: texto(params.cargo),
      criado_por: params.actor.usuarioId,
      criado_por_nome: params.actor.usuarioNome,
    })
    .select("id")
    .maybeSingle();

  if (insert.error) {
    const message = String(insert.error.message ?? "");
    if (insert.error.code === "23505" && /pkey|primary key/i.test(message)) {
      return { ok: true, repetido: true };
    }
    if (insert.error.code === "23505") {
      return { ok: false, error: MENSAGEM_CPF_DUPLICADO, status: 409 };
    }
    if (cadastroIndisponivel(insert.error)) {
      return {
        ok: false,
        error: "O cadastro manual de colaborador ainda não está disponível.",
        status: 503,
      };
    }
    throw insert.error;
  }

  if (dataAdmissao && cpf) {
    const admissao = await salvarAdmissaoColaborador({
      clienteId,
      cpf,
      dataAdmissao,
      actor: params.actor,
    });
    if (!admissao.ok) return admissao;
  }

  return { ok: true, repetido: false };
}

/**
 * Inclui o colaborador só na lista da empresa.
 * Não cria agendamento, vaga, fatura nem consome vaga contratual.
 */
export async function criarColaboradorManual(params: {
  clienteId: string;
  nome: string;
  cpf: string | null;
  cargo: string | null;
  dataAdmissao: string | null;
  actor: AuditoriaUsuarioContext;
}): Promise<
  | ({ ok: true } & ResultadoLista)
  | { ok: false; error: string; status: number }
> {
  const clienteId = params.clienteId.trim();
  if (!isUuid(clienteId)) {
    return { ok: false, error: "Cliente inválido.", status: 400 };
  }
  const gravado = await gravarColaboradorManual({
    ...params,
    clienteId,
    conferirCpfExistente: true,
  });
  if (!gravado.ok) return gravado;
  return { ok: true, ...(await listarColaboradoresPortal(clienteId)) };
}

async function lerMarcadorImportacao(
  clienteId: string,
  confirmacaoId: string
): Promise<{ motivo: string | null; cancelado_em: string | null } | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("colaborador_movimentacoes")
    .select("motivo, cancelado_em, cliente_id")
    .eq("id", confirmacaoId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  if (String(data.cliente_id ?? "") !== clienteId) {
    return { motivo: null, cancelado_em: "outra-empresa" };
  }
  return {
    motivo: data.motivo ? String(data.motivo) : null,
    cancelado_em: data.cancelado_em ? String(data.cancelado_em) : null,
  };
}

async function aguardarLoteConcluido(
  clienteId: string,
  confirmacaoId: string
): Promise<{ adicionados: number; jaCadastrados: number } | null> {
  for (let tentativa = 0; tentativa < 8; tentativa += 1) {
    const marcador = await lerMarcadorImportacao(clienteId, confirmacaoId);
    const concluido = lerMotivoLoteImportacao(marcador?.motivo);
    if (concluido && !marcador?.cancelado_em) return concluido;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return null;
}

/**
 * Grava a prévia confirmada na empresa indicada.
 * Reenviar a mesma confirmação devolve o resultado, sem duplicar pessoas.
 */
export async function importarColaboradoresLote(params: {
  clienteId: string;
  confirmacaoId: string;
  linhas: LinhaImportacaoColaborador[];
  actor: AuditoriaUsuarioContext;
}): Promise<
  | ({
      ok: true;
      adicionados: number;
      jaCadastrados: number;
      reenvio: boolean;
    } & ResultadoLista)
  | { ok: false; error: string; status: number; erros?: { linha: number; motivo: string }[] }
> {
  const clienteId = params.clienteId.trim();
  const confirmacaoId = params.confirmacaoId.trim();
  if (!isUuid(clienteId)) {
    return { ok: false, error: "Cliente inválido.", status: 400 };
  }
  if (!isUuid(confirmacaoId)) {
    return { ok: false, error: "Confirmação inválida.", status: 400 };
  }

  const atual = await listarColaboradoresPortal(clienteId);
  const previa = avaliarImportacaoColaboradores({
    linhas: params.linhas,
    cpfsDaEmpresa: atual.colaboradores.map((linha) => linha.cpfDigits),
  });
  if (!previa.podeConfirmar) {
    return {
      ok: false,
      error:
        previa.erros.length > 0
          ? "Corrija a planilha antes de confirmar."
          : "Nenhum colaborador para importar.",
      status: 400,
      erros: previa.erros,
    };
  }

  const admin = createAdminClient();
  const marcadorAtual = await lerMarcadorImportacao(clienteId, confirmacaoId);
  if (marcadorAtual?.cancelado_em === "outra-empresa") {
    return { ok: false, error: "Confirmação inválida.", status: 409 };
  }
  const jaConcluido =
    marcadorAtual && !marcadorAtual.cancelado_em
      ? lerMotivoLoteImportacao(marcadorAtual.motivo)
      : null;
  if (jaConcluido) {
    return {
      ok: true,
      adicionados: jaConcluido.adicionados,
      jaCadastrados: jaConcluido.jaCadastrados,
      reenvio: true,
      ...(await listarColaboradoresPortal(clienteId)),
    };
  }
  if (marcadorAtual && !marcadorAtual.cancelado_em) {
    const esperado = await aguardarLoteConcluido(clienteId, confirmacaoId);
    if (!esperado) {
      return {
        ok: false,
        error: "Esta importação já está em andamento.",
        status: 409,
      };
    }
    return {
      ok: true,
      adicionados: esperado.adicionados,
      jaCadastrados: esperado.jaCadastrados,
      reenvio: true,
      ...(await listarColaboradoresPortal(clienteId)),
    };
  }

  const reivindicacao = marcadorAtual
    ? await admin
        .from("colaborador_movimentacoes")
        .update({
          cancelado_em: null,
          motivo: MOTIVO_LOTE_PENDENTE,
          colaborador_nome: null,
          cargo_nome: null,
          cpf_digits: "",
          tipo: TIPO_CADASTRO,
        })
        .eq("id", confirmacaoId)
        .eq("cliente_id", clienteId)
    : await admin.from("colaborador_movimentacoes").insert({
        id: confirmacaoId,
        cliente_id: clienteId,
        cpf_digits: "",
        tipo: TIPO_CADASTRO,
        data_evento: null,
        colaborador_nome: null,
        cargo_nome: null,
        motivo: MOTIVO_LOTE_PENDENTE,
        criado_por: params.actor.usuarioId,
        criado_por_nome: params.actor.usuarioNome,
      });
  if (reivindicacao.error) {
    if (reivindicacao.error.code === "23505") {
      const esperado = await aguardarLoteConcluido(clienteId, confirmacaoId);
      if (esperado) {
        return {
          ok: true,
          adicionados: esperado.adicionados,
          jaCadastrados: esperado.jaCadastrados,
          reenvio: true,
          ...(await listarColaboradoresPortal(clienteId)),
        };
      }
      return {
        ok: false,
        error: "Esta importação já está em andamento.",
        status: 409,
      };
    }
    if (cadastroIndisponivel(reivindicacao.error)) {
      return {
        ok: false,
        error: "O cadastro manual de colaborador ainda não está disponível.",
        status: 503,
      };
    }
    throw reivindicacao.error;
  }

  let adicionados = 0;
  let jaCadastrados = previa.existentes.length;
  try {
    for (const linha of previa.novos) {
      const gravado = await gravarColaboradorManual({
        clienteId,
        nome: linha.nome,
        cpf: linha.cpf || null,
        cargo: linha.cargo || null,
        dataAdmissao: linha.dataAdmissao || null,
        actor: params.actor,
        id: idLinhaImportacao(confirmacaoId, linha.linha),
        conferirCpfExistente: false,
      });
      if (!gravado.ok) {
        if (gravado.status === 409) {
          jaCadastrados += 1;
          continue;
        }
        throw new Error(gravado.error);
      }
      adicionados += 1;
    }
    const { error } = await admin
      .from("colaborador_movimentacoes")
      .update({
        motivo: motivoLoteImportacao(adicionados, jaCadastrados),
        cancelado_em: null,
      })
      .eq("id", confirmacaoId)
      .eq("cliente_id", clienteId);
    if (error) throw error;
  } catch (error) {
    await admin
      .from("colaborador_movimentacoes")
      .update({
        cancelado_em: new Date().toISOString(),
        motivo: "importacao:erro",
      })
      .eq("id", confirmacaoId)
      .eq("cliente_id", clienteId);
    throw error;
  }

  return {
    ok: true,
    adicionados,
    jaCadastrados,
    reenvio: false,
    ...(await listarColaboradoresPortal(clienteId)),
  };
}
