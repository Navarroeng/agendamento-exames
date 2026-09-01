export const ASO_PONTUAL = "Pontual";

/** Reavaliação extraordinária solicitada pela clínica/médico. */
export function isAsoPontual(aso: string | null | undefined): boolean {
  return (aso ?? "").trim().toLocaleLowerCase("pt-BR") === "pontual";
}
