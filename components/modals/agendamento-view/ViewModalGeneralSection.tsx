import { formatCargoVisualizacao } from "@/lib/agendamento-cargo";
import { formatClienteNomeDisplay } from "@/lib/cliente-display";
import { formatCPF } from "@/lib/cpf";
import { formatDateBR } from "@/lib/format";
import { formatHorarioDisplay } from "@/lib/format-datetime";
import type { AgendamentoStatus, AgendamentoWithExames } from "@/lib/types";
import {
  DataRow,
  IconBriefcase,
  IconBuilding,
  IconCalendar,
  IconClock,
  IconDoc,
  IconHospital,
  IconId,
  IconStethoscope,
  IconUser,
  SectionHeading,
  statusBadge,
} from "./ViewModalUi";

interface ViewModalGeneralSectionProps {
  agendamento: AgendamentoWithExames;
}

export function ViewModalGeneralSection({
  agendamento,
}: ViewModalGeneralSectionProps) {
  const status = statusBadge(agendamento.status as AgendamentoStatus);

  return (
    <section>
      <SectionHeading
        icon={<IconDoc />}
        iconBg="bg-[#5b4acb]"
        title="Dados gerais"
      />
      <div className="rounded-2xl border border-[#e8edf5] bg-white px-2 sm:px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 lg:divide-x lg:divide-[#eef1f6]">
          <div className="divide-y divide-[#eef1f6] px-2">
            <DataRow
              icon={<IconCalendar />}
              label="Data do agendamento"
              value={formatDateBR(agendamento.data_agendamento)}
            />
            <DataRow
              icon={<IconBuilding />}
              label="Cliente"
              value={formatClienteNomeDisplay(agendamento.cliente_nome)}
            />
            <DataRow
              icon={<IconStethoscope />}
              label="ASO"
              value={agendamento.aso}
            />
            <DataRow
              icon={<IconBriefcase />}
              label="Cargo"
              value={formatCargoVisualizacao(agendamento.cargo_nome)}
            />
            <DataRow
              icon={<IconUser />}
              label="Responsável"
              value={agendamento.responsavel}
            />
          </div>
          <div className="divide-y divide-[#eef1f6] px-2">
            <DataRow
              icon={<IconClock />}
              label="Horário"
              value={formatHorarioDisplay(agendamento.horario)}
            />
            <DataRow
              icon={<IconUser />}
              label="Colaborador"
              value={agendamento.colaborador}
            />
            <DataRow
              icon={<IconId />}
              label="CPF"
              value={formatCPF(agendamento.colaborador_cpf)}
            />
            <DataRow
              icon={<IconHospital />}
              label="Clínica"
              value={agendamento.clinica_nome}
            />
            <DataRow
              icon={<IconId />}
              label="Status"
              valueNode={
                <span
                  className={`mt-1 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold ${status.bg} ${status.text}`}
                >
                  {status.icon} {status.label}
                </span>
              }
            />
            <DataRow
              icon={<IconId />}
              label="Matrícula"
              value={agendamento.numero_matricula ?? "—"}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
