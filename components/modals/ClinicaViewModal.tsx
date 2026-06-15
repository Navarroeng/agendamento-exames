"use client";

import { useEffect, useState } from "react";
import { useAuditoriaUsuario } from "@/contexts/AuthContext";
import { ClinicaExamesTab } from "@/components/clinicas/ClinicaExamesTab";
import { ClinicaRegrasAtendimentoViewSection } from "@/components/clinicas/ClinicaRegrasAtendimentoViewSection";
import { IconBuilding } from "@/components/ui/icons/OutlineIcons";
import { formatDateBR } from "@/lib/format";
import { formatCreatedAtBR } from "@/lib/format-datetime";
import type { ClinicaListItem } from "@/lib/types";

interface ClinicaViewModalProps {
  clinica: ClinicaListItem | null;
  onClose: () => void;
}

function InfoCard({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-[#e8edf5] bg-white p-4 shadow-[0_4px_18px_rgba(15,23,42,0.04)] ${className}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8b95a8]">
        {label}
      </p>
      <p className="mt-1 text-[14px] font-bold text-[#1f2937]">{value || "—"}</p>
    </div>
  );
}

function SectionBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[20px] border border-[#e8edf5] bg-gradient-to-b from-white to-[#fbfdff] p-5 shadow-[0_6px_22px_rgba(15,23,42,0.04)]">
      <h4 className="mb-4 text-[15px] font-extrabold text-[#2d2a4a]">{title}</h4>
      {children}
    </div>
  );
}

export function ClinicaViewModal({ clinica, onClose }: ClinicaViewModalProps) {
  const auditContext = useAuditoriaUsuario();
  const [viewTab, setViewTab] = useState<"dados" | "exames">("dados");

  useEffect(() => {
    setViewTab("dados");
  }, [clinica?.id]);

  if (!clinica) return null;

  const isActive = clinica.status === "ativa";
  const endereco = [
    clinica.rua,
    clinica.numero && `nº ${clinica.numero}`,
    clinica.bairro,
    clinica.cidade && `${clinica.cidade}/${clinica.estado}`,
    clinica.cep && `CEP ${clinica.cep}`,
  ]
    .filter(Boolean)
    .join(", ");

  const qtdExames = clinica.qtdExames ?? 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[#1a1333]/55 backdrop-blur-md"
        onClick={onClose}
        aria-label="Fechar"
      />

      <div
        className="animate-modal-in relative flex max-h-[92vh] w-full max-w-[960px] flex-col overflow-hidden rounded-t-[28px] bg-[#f6f8fc] shadow-[0_32px_64px_rgba(45,35,95,0.28)] sm:rounded-[28px]"
        role="dialog"
        aria-modal="true"
      >
        <div className="shrink-0 border-b border-[#e8edf5] bg-white px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#5668ff] to-[#4354e8] text-white shadow-[0_8px_24px_rgba(79,99,255,0.35)]">
                <IconBuilding size={24} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#8b95a8]">
                  Clínica credenciada
                </p>
                <h2 className="truncate text-xl font-extrabold text-[#2d2a4a] sm:text-2xl">
                  {clinica.nome_fantasia}
                </h2>
                <p className="mt-0.5 truncate text-sm text-[#8b95a8]">
                  {clinica.razao_social}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-[11px] font-extrabold ${
                      isActive
                        ? "bg-[#ecfdf3] text-[#16a34a]"
                        : "bg-[#fef2f2] text-[#dc2626]"
                    }`}
                  >
                    {isActive ? "● Ativa" : "● Inativa"}
                  </span>
                  <span className="inline-flex rounded-full bg-[#f3edff] px-3 py-1 text-[11px] font-extrabold text-[#7c3aed]">
                    {qtdExames} exame{qtdExames !== 1 ? "s" : ""}
                  </span>
                  {clinica.ultimoAgendamento && (
                    <span className="inline-flex rounded-full bg-[#eff6ff] px-3 py-1 text-[11px] font-extrabold text-[#2563eb]">
                      Último agend.: {formatDateBR(clinica.ultimoAgendamento)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#e8edf5] bg-white text-lg text-[#52617a] hover:bg-[#f4f6fb]"
              aria-label="Fechar modal"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="mx-6 mb-2 flex gap-2 rounded-2xl border border-[#e8edf5] bg-white p-1">
          {(["dados", "exames"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setViewTab(tab)}
              className={`flex-1 rounded-xl py-2 text-xs font-extrabold transition-all ${
                viewTab === tab
                  ? "bg-[#5b4acb] text-white"
                  : "text-[#52617a] hover:bg-[#f4f6fb]"
              }`}
            >
              {tab === "dados" ? "Dados" : "Exames da clínica"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {viewTab === "exames" ? (
            <ClinicaExamesTab
              clinicaId={clinica.id}
              usuario={clinica.responsavel}
              auditContext={auditContext}
              clinicaNome={clinica.nome_fantasia}
            />
          ) : (
          <div className="space-y-4">
            <SectionBlock title="Dados principais">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <InfoCard label="CNPJ" value={clinica.cnpj} />
                <InfoCard label="Responsável" value={clinica.responsavel} />
                <InfoCard
                  label="Cadastrada em"
                  value={
                    clinica.created_at
                      ? formatCreatedAtBR(clinica.created_at)
                      : "—"
                  }
                />
              </div>
            </SectionBlock>

            <SectionBlock title="Contato">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <InfoCard label="Telefone" value={clinica.telefone} />
                <InfoCard label="WhatsApp" value={clinica.whatsapp ?? ""} />
                <InfoCard label="E-mail" value={clinica.email} />
                <InfoCard label="Site" value={clinica.site ?? ""} />
              </div>
            </SectionBlock>

            <SectionBlock title="Endereço">
              <InfoCard label="Endereço completo" value={endereco || "—"} />
            </SectionBlock>

            <ClinicaRegrasAtendimentoViewSection clinica={clinica} />
          </div>
          )}
        </div>

        <div className="shrink-0 border-t border-[#e8edf5] bg-white px-6 py-4">
          <button type="button" className="btn w-full sm:ml-auto sm:w-auto" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
