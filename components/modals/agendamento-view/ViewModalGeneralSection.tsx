"use client";

import { useEffect, useState } from "react";
import { formatCargoVisualizacao } from "@/lib/agendamento-cargo";
import { formatClienteNomeDisplay } from "@/lib/cliente-display";
import { formatCPF } from "@/lib/cpf";
import { formatDateBR } from "@/lib/format";
import { formatHorarioDisplay } from "@/lib/format-datetime";
import type { AgendamentoStatus, AgendamentoWithExames } from "@/lib/types";
import { buscarContratoPorId } from "@/services/contrato-agendamentos.service";
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
  const [contratoNumero, setContratoNumero] = useState<string | null>(null);
  const [orcamentoNumero, setOrcamentoNumero] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!agendamento.contrato_id) {
      setContratoNumero(null);
      setOrcamentoNumero(null);
      return;
    }
    void (async () => {
      try {
        const contrato = await buscarContratoPorId(agendamento.contrato_id!);
        if (cancelled) return;
        setContratoNumero(contrato?.numero ?? agendamento.contrato_id!);
        setOrcamentoNumero(contrato?.numero_orcamento ?? null);
      } catch {
        if (!cancelled) {
          setContratoNumero(agendamento.contrato_id!);
          setOrcamentoNumero(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [agendamento.contrato_id]);

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
            {agendamento.contrato_id ? (
              <>
                <DataRow
                  icon={<IconDoc />}
                  label="Contrato vinculado"
                  value={contratoNumero ?? "—"}
                />
                <DataRow
                  icon={<IconDoc />}
                  label="Origem"
                  value={orcamentoNumero ?? "—"}
                />
                <DataRow
                  icon={<IconDoc />}
                  label="Consome saldo da implantação"
                  value={
                    agendamento.consome_saldo_contrato === false ? "Não" : "Sim"
                  }
                />
              </>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
