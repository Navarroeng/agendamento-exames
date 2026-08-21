"use client";

import {
  labelEtapaAtualProcessoRiscos,
  riscosPsicossociaisEtapaAtualBadgeClass,
  type RiscosPsicossociaisProcesso,
} from "@/lib/riscos-psicossociais";

type RiscosEtapaAtualBadgeProps = {
  processo: Pick<RiscosPsicossociaisProcesso, "status" | "etapaAtual">;
};

/** Badge da etapa atual — mesma variante na tabela e no modal. */
export function RiscosEtapaAtualBadge({ processo }: RiscosEtapaAtualBadgeProps) {
  const label = labelEtapaAtualProcessoRiscos(processo);
  return (
    <span
      className={riscosPsicossociaisEtapaAtualBadgeClass(
        processo.etapaAtual,
        processo.status
      )}
      title={label}
    >
      {label}
    </span>
  );
}
