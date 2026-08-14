/**
 * Regras da importação automática ao receber a Lista de Presença em Excel.
 * Reutiliza a avaliação já usada em “Importar Excel” dos participantes.
 */

import type {
  LinhaAvaliacaoImportacao,
  SituacaoImportacaoParticipante,
} from "@/lib/riscos-participantes-excel";

export const MSG_IMPORTACAO_LISTA_FALHOU =
  "Não foi possível importar a lista de participantes. Verifique se o arquivo utiliza o modelo oficial.";

const SITUACAO_JA_EXISTENTE: SituacaoImportacaoParticipante =
  "cpf_ja_na_campanha";

export function resumirAvaliacaoImportacaoLista(
  avaliadas: ReadonlyArray<
    Pick<LinhaAvaliacaoImportacao, "pronto" | "situacao">
  >
): {
  prontos: number;
  jaExistentes: number;
  erros: number;
} {
  let prontos = 0;
  let jaExistentes = 0;
  let erros = 0;
  for (const linha of avaliadas) {
    if (linha.pronto) {
      prontos += 1;
      continue;
    }
    if (linha.situacao === SITUACAO_JA_EXISTENTE) {
      jaExistentes += 1;
      continue;
    }
    if (linha.situacao === "linha_vazia") continue;
    erros += 1;
  }
  return { prontos, jaExistentes, erros };
}

/** Só conclui o recebimento se houver linhas importáveis ou já cadastradas. */
export function podeConcluirRecebimentoComExcel(input: {
  parseOk: boolean;
  avaliadas: ReadonlyArray<
    Pick<LinhaAvaliacaoImportacao, "pronto" | "situacao">
  >;
}): boolean {
  if (!input.parseOk) return false;
  const { prontos, jaExistentes } = resumirAvaliacaoImportacaoLista(
    input.avaliadas
  );
  return prontos > 0 || jaExistentes > 0;
}

export function mensagemErroImportacaoLista(input: {
  parseError?: string | null;
  avaliadas?: ReadonlyArray<
    Pick<LinhaAvaliacaoImportacao, "linha" | "motivo" | "pronto" | "situacao">
  >;
}): string {
  const detalhes: string[] = [];
  if (input.parseError?.trim()) {
    detalhes.push(input.parseError.trim());
  }
  const erros = (input.avaliadas ?? []).filter(
    (a) =>
      !a.pronto &&
      a.situacao !== SITUACAO_JA_EXISTENTE &&
      a.situacao !== "linha_vazia"
  );
  for (const erro of erros.slice(0, 3)) {
    const linha = erro.linha ? `Linha ${erro.linha}: ` : "";
    detalhes.push(`${linha}${erro.motivo}`);
  }
  if (detalhes.length === 0) return MSG_IMPORTACAO_LISTA_FALHOU;
  return `${MSG_IMPORTACAO_LISTA_FALHOU} ${detalhes.join(" ")}`;
}

export function mensagemSucessoRecebimentoComImportacao(input: {
  importados: number;
  jaExistentes: number;
  erros: number;
}): { titulo: string; descricao?: string } {
  const { importados, jaExistentes, erros } = input;
  if (importados > 0 && jaExistentes === 0 && erros === 0) {
    const n = importados === 1 ? "participante importado" : "participantes importados";
    return {
      titulo: `Lista recebida. ${importados} ${n} com sucesso.`,
    };
  }
  return {
    titulo: "Lista recebida e participantes importados com sucesso.",
    descricao: `${importados} participante${importados === 1 ? "" : "s"} importado${importados === 1 ? "" : "s"} · ${jaExistentes} já existente${jaExistentes === 1 ? "" : "s"} · ${erros} erro${erros === 1 ? "" : "s"}`,
  };
}
