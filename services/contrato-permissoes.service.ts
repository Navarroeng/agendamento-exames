import { buscarPerfilUsuarioLogado } from "@/services/perfil.service";
import {
  CONTRATO_ENCERRAR_SEM_PERMISSAO_MSG,
  podeEncerrarContrato,
} from "@/lib/contrato-permissoes";
import type { PerfilUsuario } from "@/lib/types";

/**
 * Valida no backend (perfil real em `perfis_usuarios`) se o usuário autenticado
 * pode encerrar contrato / cancelar orçamento convertido.
 */
export async function assertPodeEncerrarContrato(): Promise<PerfilUsuario> {
  const perfil = await buscarPerfilUsuarioLogado();
  if (!perfil || !podeEncerrarContrato(perfil.perfil)) {
    throw new Error(CONTRATO_ENCERRAR_SEM_PERMISSAO_MSG);
  }
  return perfil;
}
