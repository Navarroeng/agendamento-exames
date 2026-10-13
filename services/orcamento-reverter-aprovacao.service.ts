import { createClient } from "@/lib/supabase/client";
import {
  mensagemErroReverterAprovacao,
  motivoReversaoInvalido,
} from "@/lib/orcamento-reverter-aprovacao";

export async function consultarBloqueioReverterAprovacao(
  orcamentoId: string
): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc(
    "motivo_bloqueio_reverter_aprovacao_orcamento",
    { p_orcamento_id: orcamentoId }
  );

  if (error) {
    throw new Error(mensagemErroReverterAprovacao(error));
  }

  if (typeof data !== "string") return null;
  const mensagem = data.trim();
  return mensagem || null;
}

export async function reverterAprovacaoOrcamento(
  orcamentoId: string,
  motivo: string
): Promise<void> {
  const motivoInvalido = motivoReversaoInvalido(motivo);
  if (motivoInvalido) {
    throw new Error(motivoInvalido);
  }

  const supabase = createClient();
  const { error } = await supabase.rpc("reverter_aprovacao_orcamento", {
    p_orcamento_id: orcamentoId,
    p_motivo: motivo.trim(),
  });

  if (error) {
    throw new Error(mensagemErroReverterAprovacao(error));
  }
}
