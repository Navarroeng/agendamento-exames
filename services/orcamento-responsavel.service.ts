import { createClient } from "@/lib/supabase/client";
import type { OrcamentoComItens, OrcamentoRecord } from "@/lib/orcamento-types";
import { buscarOrcamentoComItens } from "@/services/orcamento.service";
import {
  ORCAMENTO_RESPONSAVEL_BLOQUEADO_MSG,
  ORCAMENTO_RESPONSAVEL_SEM_PERMISSAO_MSG,
  podeAlterarResponsavelProcesso,
  statusPermiteAlterarResponsavel,
} from "@/lib/orcamento-responsavel";
import { buscarPerfilUsuarioLogado } from "@/services/perfil.service";
import type { PerfilUsuario } from "@/lib/types";

export type AlterarResponsavelResult = {
  orcamento: OrcamentoComItens;
  responsavelAnterior: string;
  responsavelNovo: string;
  motivo: string;
  numeroContrato: string | null;
};

function parseRpcError(error: unknown): Error {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "object" &&
          error !== null &&
          "message" in error &&
          typeof (error as { message: unknown }).message === "string"
        ? (error as { message: string }).message
        : "";

  if (raw.includes("cancelado ou encerrado")) {
    return new Error(ORCAMENTO_RESPONSAVEL_BLOQUEADO_MSG);
  }
  if (raw.includes("não possui permissão")) {
    return new Error(ORCAMENTO_RESPONSAVEL_SEM_PERMISSAO_MSG);
  }
  return new Error(raw || "Erro ao alterar o responsável do processo.");
}

export async function listarUsuariosAtivosParaResponsavel(): Promise<
  PerfilUsuario[]
> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("perfis_usuarios")
    .select("*")
    .eq("ativo", true)
    .order("nome", { ascending: true });
  if (error) throw error;
  return (data ?? []) as PerfilUsuario[];
}

/**
 * Transfere o responsável atual do processo (não altera o criador).
 * Fonte única: orcamentos.responsavel / responsavel_user_id.
 */
export async function alterarResponsavelProcesso(params: {
  orcamentoId: string;
  novoResponsavelUserId: string;
  novoResponsavelNome: string;
  motivo: string;
}): Promise<AlterarResponsavelResult> {
  const perfil = await buscarPerfilUsuarioLogado();
  if (!perfil) {
    throw new Error(ORCAMENTO_RESPONSAVEL_SEM_PERMISSAO_MSG);
  }

  const atual = await buscarOrcamentoComItens(params.orcamentoId);
  if (!atual) {
    throw new Error("Orçamento não encontrado.");
  }

  if (!statusPermiteAlterarResponsavel(atual.status)) {
    throw new Error(ORCAMENTO_RESPONSAVEL_BLOQUEADO_MSG);
  }

  if (
    !podeAlterarResponsavelProcesso({
      perfil: perfil.perfil,
      usuarioId: perfil.user_id,
      usuarioNome: perfil.nome,
      orcamento: atual,
    })
  ) {
    throw new Error(ORCAMENTO_RESPONSAVEL_SEM_PERMISSAO_MSG);
  }

  const motivo = params.motivo.trim();
  if (!motivo) {
    throw new Error("Informe o motivo da alteração.");
  }

  const supabase = createClient();
  const { data, error } = await supabase.rpc("alterar_responsavel_orcamento", {
    p_orcamento_id: params.orcamentoId,
    p_novo_responsavel_user_id: params.novoResponsavelUserId,
    p_novo_responsavel_nome: params.novoResponsavelNome.trim(),
    p_motivo: motivo,
  });

  if (error) throw parseRpcError(error);

  const rpc = data as {
    responsavel_anterior?: string;
    responsavel_novo?: string;
    motivo?: string;
  };

  const refreshed = await buscarOrcamentoComItens(params.orcamentoId);
  if (!refreshed) {
    throw new Error("Orçamento não encontrado após a alteração.");
  }

  const { data: contrato } = await supabase
    .from("cliente_contratos")
    .select("numero")
    .eq("orcamento_id", params.orcamentoId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    orcamento: refreshed,
    responsavelAnterior:
      rpc.responsavel_anterior?.trim() || atual.responsavel,
    responsavelNovo:
      rpc.responsavel_novo?.trim() || refreshed.responsavel,
    motivo: rpc.motivo?.trim() || motivo,
    numeroContrato: (contrato?.numero as string | null) ?? null,
  };
}

export function patchOrcamentoResponsavelNaLista(
  lista: OrcamentoRecord[],
  orcamento: OrcamentoComItens
): OrcamentoRecord[] {
  return lista.map((item) =>
    item.id === orcamento.id
      ? {
          ...item,
          responsavel: orcamento.responsavel,
          responsavel_user_id: orcamento.responsavel_user_id ?? null,
          criado_por: orcamento.criado_por ?? item.criado_por ?? null,
          criado_por_user_id:
            orcamento.criado_por_user_id ?? item.criado_por_user_id ?? null,
          updated_at: orcamento.updated_at,
        }
      : item
  );
}
