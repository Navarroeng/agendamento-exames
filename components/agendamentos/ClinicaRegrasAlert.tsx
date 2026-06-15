import {
  agendamentoPossuiComplementares,
  buildClinicaRegrasResumo,
  clinicaTemRegrasAtendimento,
  isOrdemChegada,
  suggestHorarioInicio,
} from "@/lib/clinica-regras-atendimento";
import type { ClinicaRecord, ExameFormItem } from "@/lib/types";

interface ClinicaRegrasAlertProps {
  clinica: ClinicaRecord | null;
  exams: ExameFormItem[];
}

export function ClinicaRegrasAlert({ clinica, exams }: ClinicaRegrasAlertProps) {
  if (!clinica || !clinicaTemRegrasAtendimento(clinica)) return null;

  const hasComplementar = agendamentoPossuiComplementares(exams);
  const lines = buildClinicaRegrasResumo(clinica, hasComplementar);
  const horarioSugerido = suggestHorarioInicio(clinica, hasComplementar);

  return (
    <div className="mt-3 rounded-[12px] border border-[#bfdbfe] bg-[#eff6ff] px-3.5 py-3">
      <p className="text-[11px] font-bold text-[#1d4ed8]">
        Regras de atendimento — {clinica.nome_fantasia}
      </p>
      <ul className="mt-2 space-y-1">
        {lines.map((line) => (
          <li key={line} className="text-[11px] leading-relaxed text-[#1e3a8a]">
            {line}
          </li>
        ))}
      </ul>
      {isOrdemChegada(clinica) && horarioSugerido ? (
        <p className="mt-2 text-[11px] font-medium text-[#1d4ed8]">
          Atendimento por ordem de chegada. Horário inicial sugerido: {horarioSugerido}.
        </p>
      ) : null}
    </div>
  );
}

export function getHorarioFieldHint(
  clinica: ClinicaRecord | null,
  exams: ExameFormItem[]
): string | null {
  if (!clinica || !isOrdemChegada(clinica)) return null;
  const suggested = suggestHorarioInicio(clinica, agendamentoPossuiComplementares(exams));
  return suggested
    ? `Ordem de chegada — informe um horário dentro da janela (início sugerido: ${suggested})`
    : "Ordem de chegada — informe um horário dentro da janela permitida";
}
