import type { AuditoriaUsuarioContext } from "@/lib/auditoria";
import {
  AUDITORIA_ACOES,
  AUDITORIA_MODULOS,
} from "@/lib/auditoria";
import {
  escolherLogoRelatorio,
  isRiscosCampanhaLogoOrigem,
  type RiscosCampanhaLogoOrigem,
} from "@/lib/riscos-campanha-logo";
import type { RiscosCampanhaRecord } from "@/lib/riscos-campanha";
import { createClient } from "@/lib/supabase/client";
import { registrarAuditoria } from "@/services/auditoria.service";
import {
  buscarCampanhaPorId,
} from "@/services/riscos-campanha.service";
import {
  copiarLogoEmpresaParaCampanha,
  obterUrlLogoOnboardingEmpresa,
  obterUrlRiscosCampanhaLogo,
  removerArquivoRiscosCampanhaLogo,
  uploadRiscosCampanhaLogo,
} from "@/services/riscos-campanha-logo-storage.service";

const LOGO_SELECT =
  "id, logo_url, logo_storage_path, logo_origem, logo_nome, logo_tipo, logo_tamanho, orcamento_id, cliente_id, empresa_nome, codigo_publico";

export type LogoEmpresaFonte = {
  path: string;
  nome: string | null;
};

export async function buscarLogoEmpresaPorOrcamento(
  orcamentoId: string
): Promise<LogoEmpresaFonte | null> {
  const id = orcamentoId.trim();
  if (!id) return null;
  const supabase = createClient();
  const { data, error } = await supabase
    .from("orcamento_aprovacoes")
    .select("logo_path, logo_nome, possui_logo")
    .eq("orcamento_id", id)
    .maybeSingle();
  if (error) {
    console.warn("buscarLogoEmpresaPorOrcamento:", error.message);
    return null;
  }
  const path = data?.logo_path ? String(data.logo_path).trim() : "";
  if (!path) return null;
  if (data?.possui_logo === false) return null;
  return {
    path,
    nome: data?.logo_nome ? String(data.logo_nome) : null,
  };
}

/** Melhor esforço: último orçamento do cliente com logo na aprovação. */
export async function buscarLogoEmpresaPorCliente(
  clienteId: string
): Promise<LogoEmpresaFonte | null> {
  const id = clienteId.trim();
  if (!id) return null;
  const supabase = createClient();
  const { data: orcs, error: orcErr } = await supabase
    .from("orcamentos")
    .select("id")
    .eq("cliente_id", id)
    .order("created_at", { ascending: false })
    .limit(20);
  if (orcErr || !orcs?.length) return null;

  for (const row of orcs) {
    const oid = String((row as { id?: string }).id ?? "");
    const logo = await buscarLogoEmpresaPorOrcamento(oid);
    if (logo) return logo;
  }
  return null;
}

async function atualizarLogoCampanhaDb(
  campanhaId: string,
  fields: {
    logo_url: string | null;
    logo_storage_path: string | null;
    logo_origem: RiscosCampanhaLogoOrigem | null;
    logo_nome: string | null;
    logo_tipo: string | null;
    logo_tamanho: number | null;
  }
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("riscos_campanhas")
    .update(fields)
    .eq("id", campanhaId);
  if (error) {
    if (/logo_/i.test(error.message) || error.code === "42703") {
      throw new Error(
        "Migration do logo da campanha ainda não aplicada no banco (107)."
      );
    }
    throw error;
  }
}

/**
 * Após criar a campanha: copia o logo da empresa (onboarding) para a campanha.
 * Não altera o cadastro oficial.
 */
export async function precarregarLogoEmpresaNaCampanha(
  campanha: Pick<
    RiscosCampanhaRecord,
    "id" | "orcamento_id" | "cliente_id"
  >
): Promise<RiscosCampanhaRecord | null> {
  let fonte: LogoEmpresaFonte | null = null;
  if (campanha.orcamento_id) {
    fonte = await buscarLogoEmpresaPorOrcamento(campanha.orcamento_id);
  }
  if (!fonte && campanha.cliente_id) {
    fonte = await buscarLogoEmpresaPorCliente(campanha.cliente_id);
  }
  if (!fonte) return null;

  const copied = await copiarLogoEmpresaParaCampanha(
    campanha.id,
    fonte.path,
    fonte.nome
  );
  if (!copied) return null;

  await atualizarLogoCampanhaDb(campanha.id, {
    logo_url: null,
    logo_storage_path: copied.path,
    logo_origem: "empresa",
    logo_nome: copied.nome,
    logo_tipo: copied.tipo,
    logo_tamanho: copied.tamanho,
  });

  return buscarCampanhaPorId(campanha.id);
}

export async function salvarLogoCampanha(params: {
  campanhaId: string;
  file: File;
  /** Se já havia logo da empresa, substituição vira origem=campanha. */
  origem: Exclude<RiscosCampanhaLogoOrigem, "empresa">;
  auditContext?: AuditoriaUsuarioContext;
}): Promise<RiscosCampanhaRecord> {
  const atual = await buscarCampanhaPorId(params.campanhaId);
  if (!atual) throw new Error("Campanha não encontrada.");

  const pathAnterior = atual.logo_storage_path;
  const uploaded = await uploadRiscosCampanhaLogo(params.campanhaId, params.file);

  await atualizarLogoCampanhaDb(params.campanhaId, {
    logo_url: null,
    logo_storage_path: uploaded.path,
    logo_origem: params.origem,
    logo_nome: uploaded.nome,
    logo_tipo: uploaded.tipo,
    logo_tamanho: uploaded.tamanho,
  });

  if (pathAnterior && pathAnterior !== uploaded.path) {
    await removerArquivoRiscosCampanhaLogo(pathAnterior);
  }

  const nome =
    params.auditContext?.usuarioNome?.trim() ||
    params.auditContext?.usuarioEmail?.trim() ||
    "Sistema";
  await registrarAuditoria({
    usuarioId: params.auditContext?.usuarioId ?? null,
    usuarioNome: nome,
    usuarioEmail: params.auditContext?.usuarioEmail ?? "",
    modulo: AUDITORIA_MODULOS.riscos_psicossociais,
    acao: AUDITORIA_ACOES.riscos_campanha_logo_atualizado,
    registroId: atual.id,
    registroNome: atual.codigo_publico,
    descricao: `${nome} ${
      pathAnterior ? "substituiu" : "anexou"
    } o logo da campanha ${atual.codigo_publico}.`,
    dadosDepois: {
      logo_origem: params.origem,
      logo_nome: uploaded.nome,
    },
  });

  const fresh = await buscarCampanhaPorId(params.campanhaId);
  if (!fresh) throw new Error("Não foi possível atualizar o logo.");
  return fresh;
}

export async function removerLogoCampanha(params: {
  campanhaId: string;
  auditContext?: AuditoriaUsuarioContext;
}): Promise<RiscosCampanhaRecord> {
  const atual = await buscarCampanhaPorId(params.campanhaId);
  if (!atual) throw new Error("Campanha não encontrada.");

  const pathAnterior = atual.logo_storage_path;
  await atualizarLogoCampanhaDb(params.campanhaId, {
    logo_url: null,
    logo_storage_path: null,
    logo_origem: null,
    logo_nome: null,
    logo_tipo: null,
    logo_tamanho: null,
  });
  await removerArquivoRiscosCampanhaLogo(pathAnterior);

  const nome =
    params.auditContext?.usuarioNome?.trim() ||
    params.auditContext?.usuarioEmail?.trim() ||
    "Sistema";
  await registrarAuditoria({
    usuarioId: params.auditContext?.usuarioId ?? null,
    usuarioNome: nome,
    usuarioEmail: params.auditContext?.usuarioEmail ?? "",
    modulo: AUDITORIA_MODULOS.riscos_psicossociais,
    acao: AUDITORIA_ACOES.riscos_campanha_logo_removido,
    registroId: atual.id,
    registroNome: atual.codigo_publico,
    descricao: `${nome} removeu o logo da campanha ${atual.codigo_publico} (logo oficial da empresa permanece intacto).`,
    dadosAntes: {
      logo_storage_path: pathAnterior,
      logo_origem: atual.logo_origem,
    },
  });

  const fresh = await buscarCampanhaPorId(params.campanhaId);
  if (!fresh) throw new Error("Não foi possível remover o logo.");
  return fresh;
}

/**
 * URL para UI/relatório/PDF:
 * campanha → senão logo da empresa (onboarding) → null.
 */
export async function resolverUrlLogoCampanhaOuEmpresa(
  campanha: Pick<
    RiscosCampanhaRecord,
    "logo_storage_path" | "orcamento_id" | "cliente_id"
  >
): Promise<string | null> {
  const pathCampanha = (campanha.logo_storage_path ?? "").trim();
  if (pathCampanha) {
    try {
      return await obterUrlRiscosCampanhaLogo(pathCampanha);
    } catch (err) {
      console.warn("signed URL logo campanha:", err);
    }
  }

  let fonte: LogoEmpresaFonte | null = null;
  if (campanha.orcamento_id) {
    fonte = await buscarLogoEmpresaPorOrcamento(campanha.orcamento_id);
  }
  if (!fonte && campanha.cliente_id) {
    fonte = await buscarLogoEmpresaPorCliente(campanha.cliente_id);
  }
  if (!fonte) return null;
  return obterUrlLogoOnboardingEmpresa(fonte.path);
}

export { escolherLogoRelatorio, isRiscosCampanhaLogoOrigem };
