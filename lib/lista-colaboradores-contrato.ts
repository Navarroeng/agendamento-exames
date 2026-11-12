/**
 * Preenchimento da Lista de funcionários a partir da relação de Clientes.
 * Só grava vaga livre quando a quantidade ativa é igual à contratada.
 * Não cria colaborador, não duplica ocupante e não mexe em vaga já usada.
 */

import { isNomeFuncionarioReal } from "@/lib/contrato-vagas";
import { isValidCPF, normalizeCpfDigits } from "@/lib/cpf";

export type ColaboradorListaCliente = {
  id: string;
  cadastroId?: string | null;
  nome: string;
  cpfDigits: string;
  cargo: string;
  situacao: "ativo" | "demitido";
};

export type VagaListaCliente = {
  indice: number;
  status: string;
  colaborador: string | null;
  colaboradorCpf: string | null;
  colaboradorOrigemId: string | null;
};

export type AtribuicaoListaCliente = {
  indice: number;
  nome: string;
  cpfDigits: string;
  cargo: string;
  origemId: string;
};

export type ResultadoUsoListaCliente =
  | {
      ok: true;
      atribuicoes: AtribuicaoListaCliente[];
      mensagem: string | null;
    }
  | { ok: false; mensagem: string };

export function mensagemQuantidadeListaCliente(
  ativos: number,
  contratada: number
): string {
  return `A lista do cliente tem ${ativos} colaboradores ativos e este contrato prevê ${contratada}. Revise a lista em Clientes → Colaboradores e tente novamente.`;
}

export const MENSAGEM_LISTA_SEM_CPF =
  "A lista do cliente tem colaborador ativo sem CPF. A vaga do contrato exige um CPF válido. Complete o cadastro em Clientes → Colaboradores e tente novamente.";

export const MENSAGEM_LISTA_NAO_APLICADA =
  "As vagas já preenchidas, programadas ou agendadas foram mantidas. A lista não foi aplicada porque isso duplicaria colaboradores ou ocuparia vagas extras. Revise a lista em Clientes → Colaboradores.";

export const MENSAGEM_LISTA_JA_VINCULADA =
  "As vagas deste contrato já estão vinculadas a estes colaboradores. Nenhum colaborador foi duplicado.";

function origemDoColaborador(colaborador: ColaboradorListaCliente): string {
  const cadastroId = String(colaborador.cadastroId ?? "").trim();
  if (cadastroId) return cadastroId;
  return colaborador.id;
}

function vagaOcupada(vaga: VagaListaCliente): boolean {
  if (
    isNomeFuncionarioReal(vaga.colaborador) ||
    isValidCPF(normalizeCpfDigits(vaga.colaboradorCpf))
  ) {
    return true;
  }
  return vaga.status !== "aberta";
}

function vagaCorresponde(
  vaga: VagaListaCliente,
  colaborador: ColaboradorListaCliente
): boolean {
  const origem = String(vaga.colaboradorOrigemId ?? "").trim();
  const cadastroId = String(colaborador.cadastroId ?? "").trim();
  if (origem && cadastroId && origem === cadastroId) return true;
  if (origem && origem === colaborador.id) return true;
  const cpfVaga = normalizeCpfDigits(vaga.colaboradorCpf);
  const cpf = normalizeCpfDigits(colaborador.cpfDigits);
  return isValidCPF(cpf) && cpfVaga === cpf;
}

/**
 * Compara a lista ativa com as vagas do contrato.
 * Quantidade diferente bloqueia. Vaga ocupada permanece como está.
 */
export function avaliarUsoListaColaboradoresCliente(input: {
  colaboradores: ColaboradorListaCliente[];
  quantidadeContratada: number;
  vagas: VagaListaCliente[];
}): ResultadoUsoListaCliente {
  const contratada = Math.max(0, Math.floor(Number(input.quantidadeContratada) || 0));
  const ativos = input.colaboradores.filter((item) => item.situacao === "ativo");
  if (ativos.length !== contratada) {
    return {
      ok: false,
      mensagem: mensagemQuantidadeListaCliente(ativos.length, contratada),
    };
  }
  if (ativos.some((item) => !isValidCPF(normalizeCpfDigits(item.cpfDigits)))) {
    return { ok: false, mensagem: MENSAGEM_LISTA_SEM_CPF };
  }

  const porIndice = input.vagas
    .filter((vaga) => vaga.indice >= 1 && vaga.indice <= contratada)
    .slice()
    .sort((a, b) => a.indice - b.indice);
  const ocupadas = porIndice.filter(vagaOcupada);
  const livres = porIndice.filter((vaga) => !vagaOcupada(vaga));
  const usados = new Set<string>();

  for (const vaga of ocupadas) {
    const pessoa = ativos.find(
      (item) => !usados.has(origemDoColaborador(item)) && vagaCorresponde(vaga, item)
    );
    if (!pessoa) {
      return { ok: false, mensagem: MENSAGEM_LISTA_NAO_APLICADA };
    }
    usados.add(origemDoColaborador(pessoa));
  }

  const restantes = ativos.filter(
    (item) => !usados.has(origemDoColaborador(item))
  );
  if (restantes.length !== livres.length) {
    return { ok: false, mensagem: MENSAGEM_LISTA_NAO_APLICADA };
  }
  if (restantes.length === 0) {
    return {
      ok: true,
      atribuicoes: [],
      mensagem: MENSAGEM_LISTA_JA_VINCULADA,
    };
  }

  return {
    ok: true,
    mensagem: null,
    atribuicoes: restantes.map((pessoa, index) => ({
      indice: livres[index].indice,
      nome: pessoa.nome,
      cpfDigits: normalizeCpfDigits(pessoa.cpfDigits),
      cargo: pessoa.cargo === "—" ? "" : pessoa.cargo,
      origemId: origemDoColaborador(pessoa),
    })),
  };
}
