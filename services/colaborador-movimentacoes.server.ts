/**
 * Desligamento administrativo de colaborador (sem exame).
 * Server-only. Não altera contrato_vagas, agendamentos, faturas nem eSocial.
 */

import {
  TIPO_DESLIGAMENTO_ADMIN,
  isUuid,
  podeDemitirColaborador,
  podeDesfazerDesligamentoAdmin,
  validarPayloadDesfazerDesligamento,
  validarPayloadDesligamentoAdmin,
} from "@/lib/colaborador-movimentacoes";
import {
  AUDITORIA_ACOES,
  AUDITORIA_MODULOS,
  auditoriaActorFromSessionPerfil,
  type AuditoriaUsuarioContext,
} from "@/lib/auditoria";
import { isPerfilStaffNavarro } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { registrarAuditoria } from "@/services/auditoria.service";
import { listarColaboradoresPortal } from "@/services/portal-colaboradores.server";

export type StaffActorResult =
  | { ok: true; actor: AuditoriaUsuarioContext }
  | { ok: false; status: 401 | 403; error: string };

export async function requireClientesStaffActor(): Promise<StaffActorResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, status: 401, error: "Não autenticado." };
  }

  const { data: perfil, error: perfilErr } = await supabase
    .from("perfis_usuarios")
    .select("perfil, ativo, nome, email")
    .eq("user_id", user.id)
    .maybeSingle();

  if (perfilErr) {
    return {
      ok: false,
      status: 403,
      error: "Acesso restrito à equipe Navarro.",
    };
  }

  if (
    !perfil ||
    perfil.ativo === false ||
    !isPerfilStaffNavarro(perfil.perfil)
  ) {
    return {
      ok: false,
      status: 403,
      error: "Acesso restrito à equipe Navarro.",
    };
  }

  return {
    ok: true,
    actor: auditoriaActorFromSessionPerfil({ user, perfil }),
  };
}

async function assertClienteExiste(
  clienteId: string
): Promise<{ ok: true; nome: string } | { ok: false; error: string; status: 404 }> {
  if (!isUuid(clienteId)) {
    return { ok: false, error: "Cliente inválido.", status: 404 };
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("clientes")
    .select("id, nome")
    .eq("id", clienteId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.id) {
    return { ok: false, error: "Cliente não encontrado.", status: 404 };
  }
  return { ok: true, nome: String(data.nome ?? "") };
}

export async function registrarDesligamentoAdmin(params: {
  clienteId: string;
  cpf: string;
  dataEvento: string;
  motivo?: string | null;
  actor: AuditoriaUsuarioContext;
}): Promise<
  | {
      ok: true;
      colaboradores: Awaited<
        ReturnType<typeof listarColaboradoresPortal>
      >["colaboradores"];
      resumo: Awaited<ReturnType<typeof listarColaboradoresPortal>>["resumo"];
    }
  | { ok: false; error: string; status: number }
> {
  const payload = validarPayloadDesligamentoAdmin({
    clienteId: params.clienteId,
    cpf: params.cpf,
    dataEvento: params.dataEvento,
    motivo: params.motivo,
  });
  if (!payload.ok) return payload;

  const cliente = await assertClienteExiste(payload.clienteId);
  if (!cliente.ok) return cliente;

  const { colaboradores } = await listarColaboradoresPortal(
    payload.clienteId
  );
  const linha = colaboradores.find((l) => l.cpfDigits === payload.cpfDigits);
  if (!linha) {
    return {
      ok: false,
      error: "Colaborador não encontrado nesta empresa.",
      status: 404,
    };
  }
  if (!podeDemitirColaborador(linha)) {
    return {
      ok: false,
      error: "Só é possível registrar desligamento de colaborador ativo.",
      status: 409,
    };
  }

  const admin = createAdminClient();
  const insert = await admin
    .from("colaborador_movimentacoes")
    .insert({
      cliente_id: payload.clienteId,
      cpf_digits: payload.cpfDigits,
      tipo: TIPO_DESLIGAMENTO_ADMIN,
      data_evento: payload.dataEvento,
      motivo: payload.motivo,
      colaborador_nome: linha.nome,
      cargo_nome: linha.cargo === "—" ? null : linha.cargo,
      criado_por: params.actor.usuarioId,
      criado_por_nome: params.actor.usuarioNome,
    })
    .select("id")
    .maybeSingle();

  if (insert.error) {
    if (insert.error.code === "23505") {
      return {
        ok: false,
        error: "Já existe um desligamento administrativo nesta data.",
        status: 409,
      };
    }
    throw insert.error;
  }

  await registrarAuditoria({
    usuarioId: params.actor.usuarioId,
    usuarioNome: params.actor.usuarioNome,
    usuarioEmail: params.actor.usuarioEmail,
    modulo: AUDITORIA_MODULOS.clientes,
    acao: AUDITORIA_ACOES.colaborador_desligamento_admin,
    registroId: insert.data?.id ?? payload.clienteId,
    registroNome: linha.nome,
    descricao: `${params.actor.usuarioNome} registrou desligamento administrativo de ${linha.nome} (CPF ${payload.cpfDigits}) em ${payload.dataEvento}.`,
    dadosDepois: {
      cliente_id: payload.clienteId,
      cliente_nome: cliente.nome,
      cpf_digits: payload.cpfDigits,
      colaborador_nome: linha.nome,
      data_evento: payload.dataEvento,
      motivo: payload.motivo,
    },
  });

  return {
    ok: true,
    ...(await listarColaboradoresPortal(payload.clienteId)),
  };
}

export async function desfazerDesligamentoAdmin(params: {
  clienteId: string;
  movimentacaoId: string;
  motivo?: string | null;
  actor: AuditoriaUsuarioContext;
}): Promise<
  | {
      ok: true;
      colaboradores: Awaited<
        ReturnType<typeof listarColaboradoresPortal>
      >["colaboradores"];
      resumo: Awaited<ReturnType<typeof listarColaboradoresPortal>>["resumo"];
    }
  | { ok: false; error: string; status: number }
> {
  const payload = validarPayloadDesfazerDesligamento({
    clienteId: params.clienteId,
    movimentacaoId: params.movimentacaoId,
  });
  if (!payload.ok) return payload;

  const cliente = await assertClienteExiste(payload.clienteId);
  if (!cliente.ok) return cliente;

  const admin = createAdminClient();
  const { data: mov, error: errMov } = await admin
    .from("colaborador_movimentacoes")
    .select(
      "id, cliente_id, cpf_digits, tipo, data_evento, motivo, colaborador_nome, cancelado_em"
    )
    .eq("id", payload.movimentacaoId)
    .eq("cliente_id", payload.clienteId)
    .maybeSingle();

  if (errMov) throw errMov;
  if (!mov?.id) {
    return { ok: false, error: "Movimentação não encontrada.", status: 404 };
  }
  if (String(mov.tipo) !== TIPO_DESLIGAMENTO_ADMIN) {
    return { ok: false, error: "Movimentação inválida.", status: 409 };
  }
  if (mov.cancelado_em) {
    return {
      ok: false,
      error: "Este desligamento administrativo já foi desfeito.",
      status: 409,
    };
  }

  const { colaboradores } = await listarColaboradoresPortal(payload.clienteId);
  const linha = colaboradores.find((l) => l.cpfDigits === mov.cpf_digits);
  if (!podeDesfazerDesligamentoAdmin(linha)) {
    return {
      ok: false,
      error:
        "Só é possível desfazer o desligamento administrativo vigente deste colaborador.",
      status: 409,
    };
  }
  if (linha?.desligamentoMovimentacaoId !== payload.movimentacaoId) {
    return {
      ok: false,
      error:
        "Só é possível desfazer o desligamento administrativo vigente deste colaborador.",
      status: 409,
    };
  }

  const motivo = String(params.motivo ?? "").trim().slice(0, 500) || null;
  const agora = new Date().toISOString();
  const { error: errUp } = await admin
    .from("colaborador_movimentacoes")
    .update({
      cancelado_em: agora,
      cancelado_por: params.actor.usuarioId,
      cancelado_por_nome: params.actor.usuarioNome,
      cancelado_motivo: motivo,
    })
    .eq("id", payload.movimentacaoId)
    .eq("cliente_id", payload.clienteId)
    .is("cancelado_em", null);

  if (errUp) throw errUp;

  await registrarAuditoria({
    usuarioId: params.actor.usuarioId,
    usuarioNome: params.actor.usuarioNome,
    usuarioEmail: params.actor.usuarioEmail,
    modulo: AUDITORIA_MODULOS.clientes,
    acao: AUDITORIA_ACOES.colaborador_desligamento_admin_desfeito,
    registroId: payload.movimentacaoId,
    registroNome: String(mov.colaborador_nome ?? linha?.nome ?? ""),
    descricao: `${params.actor.usuarioNome} desfez o desligamento administrativo de ${mov.colaborador_nome ?? linha?.nome ?? "colaborador"} (CPF ${mov.cpf_digits}) em ${mov.data_evento}.`,
    dadosAntes: {
      cliente_id: payload.clienteId,
      cliente_nome: cliente.nome,
      cpf_digits: mov.cpf_digits,
      colaborador_nome: mov.colaborador_nome,
      data_evento: mov.data_evento,
      motivo: mov.motivo,
    },
    dadosDepois: {
      cancelado_em: agora,
      cancelado_motivo: motivo,
    },
  });

  return {
    ok: true,
    ...(await listarColaboradoresPortal(payload.clienteId)),
  };
}
