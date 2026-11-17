/**
 * Preenchimento da Lista de funcionários a partir da relação de Clientes.
 * Só vaga realmente livre recebe colaborador ainda não vinculado.
 * Se houver mais candidatos do que vagas livres, ninguém é escolhido automaticamente.
 * Vaga ocupada, programada, agendada, reservada ou em revisão permanece no mesmo ID.
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
  vagaId?: string | null;
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
  vagaId: string | null;
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

export function mensagemCandidatosAcimaDasVagasLivres(
  candidatos: number,
  livres: number
): string {
  const pessoas =
    candidatos === 1
      ? "1 colaborador ativo ainda sem vaga"
      : `${candidatos} colaboradores ativos ainda sem vaga`;
  const vagas = livres === 1 ? "1 vaga livre" : `${livres} vagas livres`;
  return `Há ${pessoas} e ${vagas}. Escolha cada colaborador em Definir colaborador. Nenhuma pessoa foi escolhida automaticamente.`;
}

export function mensagemPreviaPreenchimentoLista(
  atribuicoes: AtribuicaoListaCliente[]
): string {
  const linhas = atribuicoes
    .slice()
    .sort((a, b) => a.indice - b.indice)
    .map((item) => `Vaga ${item.indice}: ${item.nome}`);
  return `${linhas.join(". ")}. A seleção só é gravada ao clicar em Salvar lista.`;
}

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

export function origemDoColaboradorLista(
  colaborador: ColaboradorListaCliente
): string {
  return origemDoColaborador(colaborador);
}

function origemDoColaborador(colaborador: ColaboradorListaCliente): string {
  const cadastroId = String(colaborador.cadastroId ?? "").trim();
  if (cadastroId) return cadastroId;
  return colaborador.id;
}

export function vagaListaRealmenteLivre(vaga: VagaListaCliente): boolean {
  return !vagaOcupada(vaga);
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

function marcarOcupantes(
  vagas: VagaListaCliente[],
  ativos: ColaboradorListaCliente[]
): Set<string> {
  const usados = new Set<string>();
  for (const vaga of vagas.filter(vagaOcupada)) {
    const pessoa = ativos.find(
      (item) => !usados.has(origemDoColaborador(item)) && vagaCorresponde(vaga, item)
    );
    if (!pessoa) continue;
    usados.add(origemDoColaborador(pessoa));
  }
  return usados;
}

function atribuirPessoa(
  vaga: VagaListaCliente,
  pessoa: ColaboradorListaCliente
): AtribuicaoListaCliente {
  return {
    indice: vaga.indice,
    vagaId: vaga.vagaId ?? null,
    nome: pessoa.nome,
    cpfDigits: normalizeCpfDigits(pessoa.cpfDigits),
    cargo: pessoa.cargo === "—" ? "" : pessoa.cargo,
    origemId: origemDoColaborador(pessoa),
  };
}

/**
 * Colaboradores ativos que ainda não ocupam outra vaga deste contrato.
 * A vaga alvo continua podendo mostrar a seleção que já está em revisão nela.
 */
export function colaboradoresParaDefinirVaga(input: {
  colaboradores: ColaboradorListaCliente[];
  vagas: VagaListaCliente[];
  indice: number;
}): ColaboradorListaCliente[] {
  const ativos = input.colaboradores.filter((item) => item.situacao === "ativo");
  const outras = input.vagas.filter((vaga) => vaga.indice !== input.indice);
  const usados = marcarOcupantes(outras, ativos);
  return ativos.filter((item) => !usados.has(origemDoColaborador(item)));
}

/**
 * Compara a lista ativa com as vagas do contrato.
 * Preenche todas as vagas livres só quando cada candidato ainda sem vaga cabe.
 * Mais candidatos do que vagas livres não escolhe ninguém.
 * Ocupante já gravado ou em revisão permanece na própria vaga.
 */
export function avaliarUsoListaColaboradoresCliente(input: {
  colaboradores: ColaboradorListaCliente[];
  quantidadeContratada: number;
  vagas: VagaListaCliente[];
}): ResultadoUsoListaCliente {
  const contratada = Math.max(0, Math.floor(Number(input.quantidadeContratada) || 0));
  const ativos = input.colaboradores.filter((item) => item.situacao === "ativo");
  const porIndice = input.vagas
    .filter((vaga) => vaga.indice >= 1 && vaga.indice <= contratada)
    .slice()
    .sort((a, b) => a.indice - b.indice);
  const livres = porIndice.filter((vaga) => !vagaOcupada(vaga));
  const usados = marcarOcupantes(porIndice, ativos);
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
  if (restantes.length > livres.length) {
    return {
      ok: true,
      atribuicoes: [],
      omitidos: restantes.length,
      mensagem: mensagemCandidatosAcimaDasVagasLivres(
        restantes.length,
        livres.length
      ),
    };
  }
  if (restantes.some((item) => !isValidCPF(normalizeCpfDigits(item.cpfDigits)))) {
    return { ok: false, mensagem: MENSAGEM_LISTA_SEM_CPF };
  }

  const atribuicoes = restantes.map((pessoa, index) =>
    atribuirPessoa(livres[index], pessoa)
  );
  return {
    ok: true,
    omitidos: 0,
    mensagem: mensagemPreviaPreenchimentoLista(atribuicoes),
    atribuicoes,
  };
}
