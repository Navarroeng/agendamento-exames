import type { CopsoqEscala } from "@/lib/copsoq/types";

/**
 * Escalas oficiais do Formulário COPSOQ II-Br.
 * Pontuações conforme impressas no formulário (0–4 ou 0–3).
 */
export const COPSOQ_ESCALAS: readonly CopsoqEscala[] = [
  {
    id: "frequencia",
    nome: "Frequência",
    alternativas: [
      { id: "freq-sempre", label: "Sempre", pontuacao: 4, ordem: 1 },
      {
        id: "freq-frequentemente",
        label: "Frequentemente",
        pontuacao: 3,
        ordem: 2,
      },
      { id: "freq-as-vezes", label: "Às vezes", pontuacao: 2, ordem: 3 },
      { id: "freq-raramente", label: "Raramente", pontuacao: 1, ordem: 4 },
      { id: "freq-nunca", label: "Nunca", pontuacao: 0, ordem: 5 },
    ],
  },
  {
    id: "intensidade",
    nome: "Intensidade",
    alternativas: [
      {
        id: "int-grande",
        label: "Em grande parte",
        pontuacao: 4,
        ordem: 1,
      },
      { id: "int-boa", label: "Em boa parte", pontuacao: 3, ordem: 2 },
      {
        id: "int-certa",
        label: "De certa forma",
        pontuacao: 2,
        ordem: 3,
      },
      { id: "int-pouco", label: "Pouco", pontuacao: 1, ordem: 4 },
      {
        id: "int-muito-pouco",
        label: "Muito pouco",
        pontuacao: 0,
        ordem: 5,
      },
    ],
  },
  {
    id: "satisfacao",
    nome: "Satisfação",
    alternativas: [
      {
        id: "sat-muito-satisfeito",
        label: "Muito satisfeito",
        pontuacao: 3,
        ordem: 1,
      },
      { id: "sat-satisfeito", label: "Satisfeito", pontuacao: 2, ordem: 2 },
      {
        id: "sat-insatisfeito",
        label: "Insatisfeito",
        pontuacao: 1,
        ordem: 3,
      },
      {
        id: "sat-muito-insatisfeito",
        label: "Muito insatisfeito",
        pontuacao: 0,
        ordem: 4,
      },
    ],
  },
  {
    id: "saude",
    nome: "Saúde",
    alternativas: [
      { id: "sau-excelente", label: "Excelente", pontuacao: 4, ordem: 1 },
      { id: "sau-muito-boa", label: "Muito boa", pontuacao: 3, ordem: 2 },
      { id: "sau-boa", label: "Boa", pontuacao: 2, ordem: 3 },
      { id: "sau-razoavel", label: "Razoável", pontuacao: 1, ordem: 4 },
      { id: "sau-ruim", label: "Ruim", pontuacao: 0, ordem: 5 },
    ],
  },
  {
    id: "exposicao",
    nome: "Exposição",
    alternativas: [
      {
        id: "exp-diariamente",
        label: "Sim, diariamente",
        pontuacao: 4,
        ordem: 1,
      },
      {
        id: "exp-semanalmente",
        label: "Sim, semanalmente",
        pontuacao: 3,
        ordem: 2,
      },
      {
        id: "exp-mensalmente",
        label: "Sim, mensalmente",
        pontuacao: 2,
        ordem: 3,
      },
      {
        id: "exp-poucas",
        label: "Sim, poucas vezes",
        pontuacao: 1,
        ordem: 4,
      },
      { id: "exp-nao", label: "Não", pontuacao: 0, ordem: 5 },
    ],
  },
  {
    id: "impacto_vida_particular",
    nome: "Impacto na vida particular",
    alternativas: [
      {
        id: "imp-certeza",
        label: "Sim, com certeza",
        pontuacao: 3,
        ordem: 1,
      },
      {
        id: "imp-certo-ponto",
        label: "Sim, até certo ponto",
        pontuacao: 2,
        ordem: 2,
      },
      {
        id: "imp-pouco",
        label: "Sim, mas muito pouco",
        pontuacao: 1,
        ordem: 3,
      },
      {
        id: "imp-nao",
        label: "Não, realmente não",
        pontuacao: 0,
        ordem: 4,
      },
    ],
  },
  {
    id: "fonte_exposicao",
    nome: "Fonte da exposição",
    alternativas: [
      { id: "fonte-colegas", label: "Colegas", pontuacao: 0, ordem: 1 },
      {
        id: "fonte-gerente",
        label: "Gerente, supervisor",
        pontuacao: 0,
        ordem: 2,
      },
      {
        id: "fonte-subordinados",
        label: "Subordinados",
        pontuacao: 0,
        ordem: 3,
      },
      {
        id: "fonte-clientes",
        label: "Clientes, fregueses, pacientes",
        pontuacao: 0,
        ordem: 4,
      },
    ],
  },
] as const;

export function getCopsoqEscala(id: string): CopsoqEscala | undefined {
  return COPSOQ_ESCALAS.find((e) => e.id === id);
}
