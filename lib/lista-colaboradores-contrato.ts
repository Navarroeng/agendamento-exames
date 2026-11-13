/**
 * Preenchimento da Lista de funcionários a partir da relação de Clientes.
 * Ativos a menos preenchem as vagas livres e deixam o restante em aberto.
 * Ativos a mais bloqueiam. Não duplica ocupante nem mexe em vaga já usada.
 */

import {
  vagaComprometidaResidual,
  vagaTemColaboradorVinculado,
  vagaTemReservaValida,
} from "@/lib/contrato-vagas";
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
  agendamentoId?: string | null;
  periodicoFuturoId?: string | null;
  creditoAsoId?: string | null;
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
      /** Colaboradores da lista que não couberam nas vagas livres. */
      omitidos: number;
    }
  | { ok: false; mensagem: string };

export function mensagemQuantidadeListaCliente(
  ativos: number,
  contratada: number
): string {
  const lista =
    ativos === 1 ? "1 colaborador ativo" : `${ativos} colaboradores ativos`;
  return `A lista do cliente tem ${lista} e este contrato prevê ${contratada}. Revise a lista em Clientes → Colaboradores e tente novamente.`;
}

export const MENSAGEM_LISTA_SEM_CPF =
  "A lista do cliente tem colaborador ativo sem CPF. A vaga do contrato exige um CPF válido. Complete o cadastro em Clientes → Colaboradores e tente novamente.";

export const MENSAGEM_LISTA_NAO_APLICADA =
  "As vagas já preenchidas, programadas ou agendadas foram mantidas. A lista não foi aplicada porque isso duplicaria colaboradores ou ocuparia vagas extras. Revise a lista em Clientes → Colaboradores.";

export const MENSAGEM_LISTA_JA_VINCULADA =
  "As vagas deste contrato já estão vinculadas a estes colaboradores. Nenhum colaborador foi duplicado.";

export function mensagemBloqueioSalvarListaCliente(
  ativos: number,
  contratada: number
): string | null {
  if (ativos > contratada) {
    return mensagemQuantidadeListaCliente(ativos, contratada);
  }
  return null;
}

export function mensagemListaIncompleta(
  incluidos: number,
  omitidos: number
): string {
  const incluidosTxt =
    incluidos === 0
      ? "Nenhum colaborador da lista pôde ser incluído"
      : incluidos === 1
        ? "1 colaborador da lista pôde ser incluído"
        : `${incluidos} colaboradores da lista puderam ser incluídos`;
  const omitidosTxt =
    omitidos === 1 ? "1 não coube" : `${omitidos} não couberam`;
  return `${incluidosTxt}. ${omitidosTxt} porque as vagas já preenchidas, comprometidas, programadas ou agendadas foram mantidas.`;
}

function origemDoColaborador(colaborador: ColaboradorListaCliente): string {
  const cadastroId = String(colaborador.cadastroId ?? "").trim();
  if (cadastroId) return cadastroId;
  return colaborador.id;
}

function vagaOcupada(vaga: VagaListaCliente): boolean {
  const sinais = {
    status: vaga.status,
    colaborador: vaga.colaborador,
    colaboradorCpf: vaga.colaboradorCpf,
    colaboradorOrigemId: vaga.colaboradorOrigemId,
    agendamentoId: vaga.agendamentoId,
    periodicoFuturoId: vaga.periodicoFuturoId,
    creditoAsoId: vaga.creditoAsoId,
  };
  if (vagaComprometidaResidual(sinais)) return false;
  if (vagaTemColaboradorVinculado(sinais) || vagaTemReservaValida(sinais)) {
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
 * Ativos acima da quantidade contratada bloqueiam.
 * Vaga ocupada, programada, agendada ou reservada permanece como está.
 */
export function avaliarUsoListaColaboradoresCliente(input: {
  colaboradores: ColaboradorListaCliente[];
  quantidadeContratada: number;
  vagas: VagaListaCliente[];
}): ResultadoUsoListaCliente {
  const contratada = Math.max(0, Math.floor(Number(input.quantidadeContratada) || 0));
  const ativos = input.colaboradores.filter((item) => item.situacao === "ativo");
  if (ativos.length > contratada) {
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
    if (!pessoa) continue;
    usados.add(origemDoColaborador(pessoa));
  }

  const restantes = ativos.filter(
    (item) => !usados.has(origemDoColaborador(item))
  );
  if (restantes.length === 0) {
    return {
      ok: true,
      atribuicoes: [],
      omitidos: 0,
      mensagem: usados.size > 0 ? MENSAGEM_LISTA_JA_VINCULADA : null,
    };
  }

  const cabem = Math.min(restantes.length, livres.length);
  const escolhidos = restantes.slice(0, cabem);
  const omitidos = restantes.length - cabem;
  return {
    ok: true,
    omitidos,
    mensagem:
      omitidos > 0
        ? mensagemListaIncompleta(usados.size + cabem, omitidos)
        : null,
    atribuicoes: escolhidos.map((pessoa, index) => ({
      indice: livres[index].indice,
      nome: pessoa.nome,
      cpfDigits: normalizeCpfDigits(pessoa.cpfDigits),
      cargo: pessoa.cargo === "—" ? "" : pessoa.cargo,
      origemId: origemDoColaborador(pessoa),
    })),
  };
}
