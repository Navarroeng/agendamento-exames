import {
  resolverProcuracaoEfetiva,
  type ProcuracaoEfetiva,
} from "@/lib/cliente-procuracao-efetiva";
import { normalizeProcuracaoStatus } from "@/lib/cliente-procuracao";
import {
  complementarContratosComCobranca,
  listarContratosPorCliente,
} from "@/services/cliente-contrato.service";

/**
 * Lê a procuração de cada contratação na hora.
 * Não grava o cadastro do cliente e não reaproveita a procuração de outro contrato.
 */
export async function obterProcuracaoEfetivaCliente(
  clienteId: string,
  procuracaoCadastro?: string | null
): Promise<ProcuracaoEfetiva | null> {
  const id = clienteId.trim();
  if (!id) return null;
  const contratos = await complementarContratosComCobranca(
    await listarContratosPorCliente(id)
  );
  const efetivo = resolverProcuracaoEfetiva(contratos);
  if (efetivo) return efetivo;
  if (
    contratos.length === 0 &&
    procuracaoCadastro != null &&
    String(procuracaoCadastro).trim() !== ""
  ) {
    return normalizeProcuracaoStatus(procuracaoCadastro);
  }
  return null;
}
