import {
  formatDiasAtendimentoLabel,
  normalizeHorario,
  parseJanelasAdicionais,
  tipoAtendimentoToForm,
} from "@/lib/clinica-regras-atendimento";
import type { ClinicaRecord } from "@/lib/types";

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#e8edf5] bg-white p-4 shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8b95a8]">
        {label}
      </p>
      <p className="mt-1 text-[14px] font-bold text-[#1f2937]">{value || "—"}</p>
    </div>
  );
}

function formatHorarioRange(
  inicio: string | null | undefined,
  fim: string | null | undefined
): string {
  const start = normalizeHorario(inicio ?? "");
  const end = normalizeHorario(fim ?? "");
  if (start && end) return `${start} às ${end}`;
  if (start || end) return start || end;
  return "—";
}

interface ClinicaRegrasAtendimentoViewSectionProps {
  clinica: ClinicaRecord;
}

export function ClinicaRegrasAtendimentoViewSection({
  clinica,
}: ClinicaRegrasAtendimentoViewSectionProps) {
  const janelaAdicional = parseJanelasAdicionais(clinica.janelas_adicionais)[0];

  return (
    <div className="rounded-[20px] border border-[#e8edf5] bg-gradient-to-b from-white to-[#fbfdff] p-5 shadow-[0_6px_22px_rgba(15,23,42,0.04)]">
      <h4 className="mb-4 text-[15px] font-extrabold text-[#2d2a4a]">
        Regras de atendimento
      </h4>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <InfoCard
          label="Tipo de atendimento"
          value={tipoAtendimentoToForm(clinica.tipo_atendimento)}
        />
        <InfoCard
          label="Dias permitidos"
          value={
            clinica.dias_atendimento?.length
              ? formatDiasAtendimentoLabel(clinica.dias_atendimento)
              : "—"
          }
        />
        <InfoCard
          label="Horário padrão"
          value={formatHorarioRange(
            clinica.horario_padrao_inicio,
            clinica.horario_padrao_fim
          )}
        />
        <InfoCard
          label="Horário exame Clínico"
          value={formatHorarioRange(
            clinica.horario_clinico_inicio,
            clinica.horario_clinico_fim
          )}
        />
        <InfoCard
          label="Horário Clínico + complementares"
          value={formatHorarioRange(
            clinica.horario_complementar_inicio,
            clinica.horario_complementar_fim
          )}
        />
        <InfoCard
          label="Janela adicional"
          value={formatHorarioRange(
            janelaAdicional?.inicio,
            janelaAdicional?.fim
          )}
        />
      </div>

      {clinica.observacao_operacional?.trim() ? (
        <div className="mt-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#8b95a8]">
            Observação operacional para mensagem
          </p>
          <p className="rounded-xl bg-[#f8faff] p-3 text-sm leading-relaxed text-[#52617a]">
            {clinica.observacao_operacional.trim()}
          </p>
        </div>
      ) : null}
    </div>
  );
}
