import { isValidCPF, maskCPFInput, normalizeCpfDigits } from "@/lib/cpf";
import { nomesColaboradorEquivalentes } from "@/lib/periodico-agrupamento";

export type PeriodicoCpfConflito = {
  colaborador: string;
  cliente_nome: string;
  origem: "periodico" | "agendamento" | "vaga";
};

export type PeriodicoCpfRegularizacaoErro =
  | { tipo: "invalido"; message: string }
  | { tipo: "conflito"; message: string; conflito: PeriodicoCpfConflito };

export function validarCpfRegularizacaoPeriodico(
  cpf: string | null | undefined
): { ok: true; digits: string; masked: string } | { ok: false; message: string } {
  const digits = normalizeCpfDigits(cpf);
  if (!isValidCPF(digits)) {
    return { ok: false, message: "Informe um CPF válido." };
  }
  return { ok: true, digits, masked: maskCPFInput(digits) };
}

export function resolverConflitoCpfRegularizacao(params: {
  colaboradorAtual: string;
  ocorrencias: Array<{
    colaborador: string;
    cliente_nome: string;
    origem: PeriodicoCpfConflito["origem"];
  }>;
}): PeriodicoCpfConflito | null {
  for (const item of params.ocorrencias) {
    if (!nomesColaboradorEquivalentes(item.colaborador, params.colaboradorAtual)) {
      return {
        colaborador: item.colaborador,
        cliente_nome: item.cliente_nome,
        origem: item.origem,
      };
    }
  }
  return null;
}

export function mensagemConflitoCpf(conflito: PeriodicoCpfConflito): string {
  return `Este CPF já está vinculado a outro colaborador.\n\nColaborador: ${conflito.colaborador}\nEmpresa: ${conflito.cliente_nome}`;
}

export class PeriodicoCpfConflitoError extends Error {
  conflito: PeriodicoCpfConflito;
  constructor(conflito: PeriodicoCpfConflito) {
    super(mensagemConflitoCpf(conflito));
    this.name = "PeriodicoCpfConflitoError";
    this.conflito = conflito;
  }
}
