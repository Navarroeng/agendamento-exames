/**
 * Identidade do colaborador dentro de uma empresa.
 * Une pelo CPF normalizado ou por um vínculo já gravado (vaga ou exame).
 * Nome igual não associa pessoas.
 */

import { isValidCPF, normalizeCpfDigits } from "@/lib/cpf";

export const MENSAGEM_CPF_DUPLICADO =
  "Este CPF já está cadastrado para outro colaborador desta empresa.";

export type OrigemVinculoColaborador =
  | "vaga"
  | "agendamento"
  | "periodico"
  | "movimentacao";

export type VinculoColaborador = {
  id: string;
  origem: OrigemVinculoColaborador;
  cpf: string | null;
  nome: string | null;
  cargo: string | null;
  agendamentoId: string | null;
  vagaId: string | null;
  /** Id do cadastro manual gravado na vaga ou no próprio evento. */
  chaveOrigem?: string | null;
};

export type IdentidadeColaborador = {
  cpf: string | null;
  agendamentoId: string | null;
  vagaId: string | null;
  /** Id do evento de cadastro manual, quando a pessoa nasceu por ele. */
  cadastroId?: string | null;
};

export type CadastroColaborador = {
  nome: string | null;
  cpf: string | null;
  cargo: string | null;
};

function cpfOuNulo(value: string | null | undefined): string | null {
  const digits = normalizeCpfDigits(value);
  return isValidCPF(digits) ? digits : null;
}

function mesmo(a: string | null | undefined, b: string | null | undefined): boolean {
  return String(a ?? "").trim() === String(b ?? "").trim();
}

/**
 * Registros da mesma pessoa. CPF válido inclui os demais registros desse CPF.
 * Sem CPF, entra só o vínculo informado e o exame ou a vaga já apontados por ele.
 */
export function registrosDoMesmoColaborador(
  registros: VinculoColaborador[],
  identidade: IdentidadeColaborador
): VinculoColaborador[] {
  const cpf = cpfOuNulo(identidade.cpf);
  const agendamentoId = String(identidade.agendamentoId ?? "").trim();
  const vagaId = String(identidade.vagaId ?? "").trim();
  const cadastroId = String(identidade.cadastroId ?? "").trim();
  const escolhidos = new Set<string>();

  const chave = (registro: VinculoColaborador) =>
    `${registro.origem}:${registro.id}`;

  const aceita = (registro: VinculoColaborador): boolean => {
    const cpfRegistro = cpfOuNulo(registro.cpf);
    if (cpf && cpfRegistro && cpfRegistro !== cpf) return false;
    return true;
  };

  for (const registro of registros) {
    const id = registro.id.trim();
    if (vagaId && registro.origem === "vaga" && id === vagaId) {
      escolhidos.add(chave(registro));
      continue;
    }
    if (cadastroId && registro.origem === "movimentacao" && id === cadastroId) {
      escolhidos.add(chave(registro));
      continue;
    }
    if (cadastroId && registro.chaveOrigem === cadastroId) {
      escolhidos.add(chave(registro));
      continue;
    }
    if (
      agendamentoId &&
      registro.origem === "agendamento" &&
      id === agendamentoId
    ) {
      escolhidos.add(chave(registro));
      continue;
    }
    if (!aceita(registro)) continue;
    const cpfRegistro = cpfOuNulo(registro.cpf);
    if (cpf && cpfRegistro === cpf) {
      escolhidos.add(chave(registro));
      continue;
    }
    if (agendamentoId && registro.origem === "agendamento" && id === agendamentoId) {
      escolhidos.add(chave(registro));
    }
    if (vagaId && registro.origem === "vaga" && id === vagaId) {
      escolhidos.add(chave(registro));
    }
    if (
      agendamentoId &&
      registro.agendamentoId === agendamentoId &&
      !cpfRegistro
    ) {
      escolhidos.add(chave(registro));
    }
    if (vagaId && registro.vagaId === vagaId && !cpfRegistro) {
      escolhidos.add(chave(registro));
    }
  }

  const incluidos = registros.filter((registro) => escolhidos.has(chave(registro)));
  const exames = new Set(
    incluidos
      .filter((registro) => registro.origem === "agendamento")
      .map((registro) => registro.id)
  );
  for (const registro of incluidos) {
    if (registro.agendamentoId) exames.add(registro.agendamentoId);
  }
  const vagas = new Set(
    incluidos.filter((registro) => registro.origem === "vaga").map((registro) => registro.id)
  );

  for (const registro of registros) {
    if (escolhidos.has(chave(registro)) || !aceita(registro)) continue;
    const cpfRegistro = cpfOuNulo(registro.cpf);
    if (cpfRegistro && cpfRegistro !== cpf) continue;
    if (registro.origem === "agendamento" && exames.has(registro.id) && !cpfRegistro) {
      escolhidos.add(chave(registro));
    }
    if (registro.agendamentoId && exames.has(registro.agendamentoId) && !cpfRegistro) {
      escolhidos.add(chave(registro));
    }
    if (registro.vagaId && vagas.has(registro.vagaId) && !cpfRegistro) {
      escolhidos.add(chave(registro));
    }
  }

  return registros.filter((registro) => escolhidos.has(chave(registro)));
}

export function mensagemCpfDuplicadoNaEmpresa(
  registros: VinculoColaborador[],
  identidade: IdentidadeColaborador,
  cpfNovo: string | null | undefined
): string | null {
  const cpf = cpfOuNulo(cpfNovo);
  if (!cpf) return null;
  const proprios = new Set(
    registrosDoMesmoColaborador(registros, identidade).map(
      (registro) => `${registro.origem}:${registro.id}`
    )
  );
  const conflito = registros.some((registro) => {
    if (proprios.has(`${registro.origem}:${registro.id}`)) return false;
    return cpfOuNulo(registro.cpf) === cpf;
  });
  return conflito ? MENSAGEM_CPF_DUPLICADO : null;
}

export function cadastroMudou(
  antes: CadastroColaborador,
  depois: CadastroColaborador
): boolean {
  return (
    !mesmo(antes.nome, depois.nome) ||
    cpfOuNulo(antes.cpf) !== cpfOuNulo(depois.cpf) ||
    !mesmo(antes.cargo, depois.cargo)
  );
}
