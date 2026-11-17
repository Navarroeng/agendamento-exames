/**
 * A vaga do contrato só ocupa um colaborador que já existe na empresa.
 * Liberar a vaga não apaga o cadastro. Se a pessoa existia só na vaga,
 * o cadastro da empresa é gravado antes, sem data de admissão.
 */

import { isNomeFuncionarioReal, normalizeNomeOcupante, vagaTemReservaValida } from "@/lib/contrato-vagas";
import { isValidCPF, normalizeCpfDigits } from "@/lib/cpf";
import {
  consolidarPortalColaboradores,
  type ClienteColaboradorLinha,
  type PortalColaboradorAgendamentoFonte,
  type PortalColaboradorMovimentacaoFonte,
  type PortalColaboradorVagaFonte,
} from "@/lib/portal-colaboradores";

export const MENSAGEM_CADASTRE_COLABORADOR =
  "Cadastre o colaborador em Clientes → Colaboradores para preencher esta vaga";

export const MENSAGEM_ALTERACAO_DIRETA_IMPLANTACAO =
  "Nome, CPF e cargo não podem ser alterados na Implantação. Corrija em Clientes → Colaboradores.";

export const MENSAGEM_CONFLITO_LISTA_VAGAS =
  "A vaga ou o cadastro mudou depois que esta lista foi aberta. Atualize a lista e tente novamente.";

export type PropostaOcupacaoVaga = {
  indice: number;
  colaborador: string | null;
  colaboradorCpf: string | null;
  colaboradorOrigemId: string | null;
  cargoNome?: string | null;
  manterAsoAberto?: boolean;
  vagaId?: string | null;
};

export type VagaAtualParaVinculo = PropostaOcupacaoVaga & {
  id?: string | null;
  status?: string | null;
  agendamentoId?: string | null;
  periodicoFuturoId?: string | null;
  creditoAsoId?: string | null;
};

export type AtivoParaOcuparVaga = {
  id: string;
  cadastroId?: string | null;
  cpfDigits: string;
  situacao: "ativo" | "demitido";
  nome?: string | null;
  cargo?: string | null;
};

export type FontesColaboradorEmpresa = {
  vagas: PortalColaboradorVagaFonte[];
  agendamentos: PortalColaboradorAgendamentoFonte[];
  movimentacoes: PortalColaboradorMovimentacaoFonte[];
};

export type CadastroLegadoAoLiberarVaga = {
  nome: string;
  cpf: string | null;
  cargo: string | null;
  vagaId: string;
  agendamentoId: string | null;
};

function cpfValido(value: string | null | undefined): string | null {
  const digits = normalizeCpfDigits(value);
  return isValidCPF(digits) ? digits : null;
}

function temPessoa(ocupante: {
  colaborador: string | null;
  colaboradorCpf: string | null;
}): boolean {
  return (
    isNomeFuncionarioReal(ocupante.colaborador) ||
    Boolean(cpfValido(ocupante.colaboradorCpf))
  );
}

function origem(value: string | null | undefined): string {
  return String(value ?? "").trim();
}

function textoNome(value: string | null | undefined): string {
  return isNomeFuncionarioReal(value) ? normalizeNomeOcupante(value) : "";
}

function textoCargo(value: string | null | undefined): string {
  const nome = normalizeNomeOcupante(value);
  if (!nome || nome === "—") return "";
  return nome;
}

function camposIdentidadeInalterados(
  atual: PropostaOcupacaoVaga,
  proposta: PropostaOcupacaoVaga
): boolean {
  const cargoOk =
    proposta.cargoNome === undefined ||
    textoCargo(atual.cargoNome) === textoCargo(proposta.cargoNome);
  return (
    textoNome(atual.colaborador) === textoNome(proposta.colaborador) &&
    (cpfValido(atual.colaboradorCpf) ?? "") ===
      (cpfValido(proposta.colaboradorCpf) ?? "") &&
    cargoOk
  );
}

function vagaSemOcupante(vaga: PropostaOcupacaoVaga): boolean {
  return !temPessoa(vaga) && !origem(vaga.colaboradorOrigemId);
}

function ativoDoVinculo(
  ativos: AtivoParaOcuparVaga[],
  proposta: PropostaOcupacaoVaga
): AtivoParaOcuparVaga | null {
  const cpf = cpfValido(proposta.colaboradorCpf);
  const origemId = origem(proposta.colaboradorOrigemId);
  return (
    ativos.find((ativo) => {
      if (ativo.situacao !== "ativo") return false;
      if (cpf && ativo.cpfDigits === cpf) return true;
      if (!origemId) return false;
      return (
        origemId === String(ativo.cadastroId ?? "").trim() || origemId === ativo.id
      );
    }) ?? null
  );
}

function vinculoConfereComCadastro(
  proposta: PropostaOcupacaoVaga,
  ativo: AtivoParaOcuparVaga
): boolean {
  if (textoNome(proposta.colaborador) !== textoNome(ativo.nome)) return false;
  if ((cpfValido(proposta.colaboradorCpf) ?? "") !== (cpfValido(ativo.cpfDigits) ?? "")) {
    return false;
  }
  if (proposta.cargoNome === undefined) return true;
  return textoCargo(proposta.cargoNome) === textoCargo(ativo.cargo);
}

/**
 * A Implantação não corrige nome, CPF nem cargo.
 * Vaga vazia pode receber o vínculo de um colaborador já ativo, com os dados do cadastro.
 * Limpar a vaga ou manter ASO em aberto não é alteração desses campos.
 */
export function mensagemAlteracaoDiretaImplantacao(input: {
  atuais: PropostaOcupacaoVaga[];
  propostas: PropostaOcupacaoVaga[];
  ativos: AtivoParaOcuparVaga[];
}): string | null {
  const porIndice = new Map(input.atuais.map((atual) => [atual.indice, atual]));
  for (const proposta of input.propostas) {
    if (proposta.manterAsoAberto) continue;
    const atual = porIndice.get(proposta.indice) ?? {
      indice: proposta.indice,
      colaborador: null,
      colaboradorCpf: null,
      colaboradorOrigemId: null,
      cargoNome: null,
    };
    if (camposIdentidadeInalterados(atual, proposta)) continue;
    if (!temPessoa(proposta)) {
      if (
        proposta.cargoNome !== undefined &&
        textoCargo(proposta.cargoNome) &&
        textoCargo(proposta.cargoNome) !== textoCargo(atual.cargoNome)
      ) {
        return MENSAGEM_ALTERACAO_DIRETA_IMPLANTACAO;
      }
      continue;
    }
    if (vagaSemOcupante(atual)) {
      const ativo = ativoDoVinculo(input.ativos, proposta);
      if (ativo && vinculoConfereComCadastro(proposta, ativo)) continue;
      if (!ativo) return MENSAGEM_CADASTRE_COLABORADOR;
      return MENSAGEM_ALTERACAO_DIRETA_IMPLANTACAO;
    }
    return MENSAGEM_ALTERACAO_DIRETA_IMPLANTACAO;
  }
  return null;
}

function vagaLivreNoContrato(atual: VagaAtualParaVinculo): boolean {
  if (
    vagaTemReservaValida({
      status: atual.status,
      colaborador: atual.colaborador,
      colaboradorCpf: atual.colaboradorCpf,
      colaboradorOrigemId: atual.colaboradorOrigemId,
      agendamentoId: atual.agendamentoId,
      periodicoFuturoId: atual.periodicoFuturoId,
      creditoAsoId: atual.creditoAsoId,
    })
  ) {
    return false;
  }
  return !temPessoa(atual) && !origem(atual.colaboradorOrigemId);
}

function pessoaNaEmpresa(
  pessoas: AtivoParaOcuparVaga[],
  proposta: PropostaOcupacaoVaga
): AtivoParaOcuparVaga | null {
  const cpf = cpfValido(proposta.colaboradorCpf);
  const origemId = origem(proposta.colaboradorOrigemId);
  return (
    pessoas.find((pessoa) => {
      if (cpf && pessoa.cpfDigits === cpf) return true;
      if (!origemId) return false;
      return (
        origemId === String(pessoa.cadastroId ?? "").trim() || origemId === pessoa.id
      );
    }) ?? null
  );
}

function chavesPessoa(pessoa: {
  colaboradorCpf?: string | null;
  colaboradorOrigemId?: string | null;
  cpfDigits?: string | null;
}): string[] {
  const chaves: string[] = [];
  const cpf = cpfValido(pessoa.colaboradorCpf ?? pessoa.cpfDigits);
  if (cpf) chaves.push(`cpf:${cpf}`);
  const origemId = origem(pessoa.colaboradorOrigemId);
  if (origemId) chaves.push(`origem:${origemId}`);
  return chaves;
}

function chavesConflitam(esquerda: string[], direita: string[]): boolean {
  return esquerda.some((chave) => direita.includes(chave));
}

/**
 * Novo vínculo só entra se a vaga continua livre, o colaborador continua ativo
 * e ele ainda não ocupa outra vaga deste contrato.
 * Mudança de vaga ou de cadastro depois da abertura pede atualização da lista.
 * Limpar, desvincular e manter ASO em aberto não passam por esta trava.
 */
export function mensagemConflitoVinculoLista(input: {
  atuais: VagaAtualParaVinculo[];
  propostas: PropostaOcupacaoVaga[];
  pessoas: AtivoParaOcuparVaga[];
}): string | null {
  const porIndice = new Map(input.atuais.map((atual) => [atual.indice, atual]));
  for (const proposta of input.propostas) {
    if (proposta.manterAsoAberto || !temPessoa(proposta)) continue;
    const atual = porIndice.get(proposta.indice) ?? {
      indice: proposta.indice,
      colaborador: null,
      colaboradorCpf: null,
      colaboradorOrigemId: null,
      cargoNome: null,
      status: "aberta",
    };
    if (camposIdentidadeInalterados(atual, proposta)) continue;
    const idAtual = origem(atual.id);
    const idProposta = origem(proposta.vagaId);
    if (idAtual && idProposta && idAtual !== idProposta) {
      return MENSAGEM_CONFLITO_LISTA_VAGAS;
    }
    if (!vagaLivreNoContrato(atual)) return MENSAGEM_CONFLITO_LISTA_VAGAS;
    const pessoa = pessoaNaEmpresa(input.pessoas, proposta);
    if (!pessoa) return MENSAGEM_CADASTRE_COLABORADOR;
    if (pessoa.situacao !== "ativo" || !vinculoConfereComCadastro(proposta, pessoa)) {
      return MENSAGEM_CONFLITO_LISTA_VAGAS;
    }
    const chaves = chavesPessoa(proposta);
    const duplicadaNoContrato = input.atuais.some((outra) => {
      if (outra.indice === proposta.indice) return false;
      if (!temPessoa(outra) && !origem(outra.colaboradorOrigemId)) return false;
      return chavesConflitam(chaves, chavesPessoa(outra));
    });
    const duplicadaNaSelecao = input.propostas.some((outra) => {
      if (outra.indice === proposta.indice || !temPessoa(outra)) return false;
      return chavesConflitam(chaves, chavesPessoa(outra));
    });
    if (duplicadaNoContrato || duplicadaNaSelecao) {
      return MENSAGEM_CONFLITO_LISTA_VAGAS;
    }
  }
  return null;
}

/** Mesma pessoa já ocupava a vaga. Correção de nome ou cargo não é inclusão. */
export function mesmaPessoaNaVaga(
  atual: PropostaOcupacaoVaga,
  proposta: PropostaOcupacaoVaga
): boolean {
  if (!temPessoa(atual) || !temPessoa(proposta)) return false;
  const cpfAtual = cpfValido(atual.colaboradorCpf);
  const cpfProposta = cpfValido(proposta.colaboradorCpf);
  if (cpfAtual && cpfProposta && cpfAtual === cpfProposta) return true;
  const origemAtual = origem(atual.colaboradorOrigemId);
  const origemProposta = origem(proposta.colaboradorOrigemId);
  if (origemAtual && origemProposta && origemAtual === origemProposta) return true;
  if (
    !cpfAtual &&
    !cpfProposta &&
    !origemProposta &&
    isNomeFuncionarioReal(atual.colaborador) &&
    normalizeNomeOcupante(atual.colaborador) ===
      normalizeNomeOcupante(proposta.colaborador)
  ) {
    return true;
  }
  return false;
}

export function ativoCompativelComOcupante(
  ativos: AtivoParaOcuparVaga[],
  proposta: PropostaOcupacaoVaga
): boolean {
  const cpf = cpfValido(proposta.colaboradorCpf);
  const origemId = origem(proposta.colaboradorOrigemId);
  return ativos.some((ativo) => {
    if (ativo.situacao !== "ativo") return false;
    if (cpf && ativo.cpfDigits === cpf) return true;
    if (!origemId) return false;
    return origemId === String(ativo.cadastroId ?? "").trim() || origemId === ativo.id;
  });
}

/**
 * Inclusão nova só passa se a pessoa já está ativa na empresa.
 * Limpar a vaga e editar o mesmo ocupante não geram este aviso.
 */
export function mensagemOcupacaoForaDaEmpresa(input: {
  atuais: PropostaOcupacaoVaga[];
  propostas: PropostaOcupacaoVaga[];
  ativos: AtivoParaOcuparVaga[];
}): string | null {
  const porIndice = new Map(input.atuais.map((atual) => [atual.indice, atual]));
  for (const proposta of input.propostas) {
    if (!temPessoa(proposta)) continue;
    const atual = porIndice.get(proposta.indice) ?? {
      indice: proposta.indice,
      colaborador: null,
      colaboradorCpf: null,
      colaboradorOrigemId: null,
    };
    if (mesmaPessoaNaVaga(atual, proposta)) continue;
    if (ativoCompativelComOcupante(input.ativos, proposta)) continue;
    return MENSAGEM_CADASTRE_COLABORADOR;
  }
  return null;
}

export function planilhaTemPessoaForaDaEmpresa(
  linhas: Array<{ cpfDigits: string }>,
  ativos: AtivoParaOcuparVaga[]
): boolean {
  return linhas.some((linha) => {
    const cpf = cpfValido(linha.cpfDigits);
    if (!cpf) return true;
    return !ativos.some(
      (ativo) => ativo.situacao === "ativo" && ativo.cpfDigits === cpf
    );
  });
}

function linhaDaVaga(
  linhas: ClienteColaboradorLinha[],
  vaga: PortalColaboradorVagaFonte
): ClienteColaboradorLinha | null {
  const cpf = cpfValido(vaga.colaborador_cpf);
  if (cpf) return linhas.find((linha) => linha.cpfDigits === cpf) ?? null;
  const vagaId = String(vaga.id ?? "").trim();
  if (!vagaId) return null;
  return (
    linhas.find(
      (linha) =>
        linha.vinculoVagaId === vagaId || linha.id === `semcpf:vaga:${vagaId}`
    ) ?? null
  );
}

function chaveLinha(linha: ClienteColaboradorLinha): string {
  return linha.cpfDigits || linha.id;
}

/**
 * Quando a vaga é a única origem da pessoa, devolve os dados já gravados
 * para criar o cadastro da empresa. Não inventa admissão.
 * Se a pessoa continuar visível por cadastro, exame ou outra vaga, não duplica.
 */
export function snapshotAoLiberarVagaLegada(input: {
  vagaId: string;
  fontes: FontesColaboradorEmpresa;
}): CadastroLegadoAoLiberarVaga | null {
  const vagaId = input.vagaId.trim();
  const vaga = input.fontes.vagas.find((item) => String(item.id ?? "").trim() === vagaId);
  if (!vaga || !isNomeFuncionarioReal(vaga.colaborador)) return null;

  const antes = consolidarPortalColaboradores(input.fontes);
  const linha = linhaDaVaga(antes, vaga);
  if (!linha) return null;

  const depois = consolidarPortalColaboradores({
    ...input.fontes,
    vagas: input.fontes.vagas.map((item) =>
      String(item.id ?? "").trim() === vagaId
        ? {
            ...item,
            colaborador: null,
            colaborador_cpf: null,
            colaborador_origem: null,
          }
        : item
    ),
  });
  const chave = chaveLinha(linha);
  if (depois.some((item) => chaveLinha(item) === chave)) return null;

  const cargo = normalizeNomeOcupante(vaga.cargo_nome) || null;
  return {
    nome: normalizeNomeOcupante(vaga.colaborador),
    cpf: cpfValido(vaga.colaborador_cpf),
    cargo: cargo && cargo !== "—" ? cargo : null,
    vagaId,
    agendamentoId: String(vaga.agendamento_id ?? "").trim() || null,
  };
}
