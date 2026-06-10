"use client";

import Link from "next/link";
import type { PeriodicoRow } from "@/lib/relatorios/types";
import { RelatoriosDataTable } from "./RelatoriosDataTable";
import { RelatoriosSection } from "./RelatoriosSection";

function statusLabel(status: PeriodicoRow["status"]): string {
  if (status === "vencido") return "Vencido";
  if (status === "vence_30") return "Vence em 30 dias";
  return "Em dia";
}

function statusClass(status: PeriodicoRow["status"]): string {
  if (status === "vencido") return "text-brand-red";
  if (status === "vence_30") return "text-[#b45309]";
  return "text-brand-green";
}

interface RelatoriosPeriodicosSectionProps {
  periodicos: PeriodicoRow[];
}

export function RelatoriosPeriodicosSection({
  periodicos,
}: RelatoriosPeriodicosSectionProps) {
  const rows = periodicos.map((r) => [
    r.empresa,
    r.colaborador,
    r.exame,
    r.ultimaRealizacao,
    r.proximaData,
    <span key={r.id} className={`font-bold ${statusClass(r.status)}`}>
      {statusLabel(r.status)}
    </span>,
    <span key={`${r.id}-actions`} className="flex gap-2">
      <Link href="/" className="text-[10px] font-bold text-brand-blue">
        Agendar
      </Link>
    </span>,
  ]);

  return (
    <RelatoriosSection
      title="Periódicos"
      subtitle="Acompanhamento de exames periódicos e próximas datas."
    >
      <RelatoriosDataTable
        headers={[
          "Empresa",
          "Colaborador",
          "Exame",
          "Última realização",
          "Próxima data",
          "Status",
          "Ações",
        ]}
        rows={rows}
        maxHeight="360px"
      />
    </RelatoriosSection>
  );
}
