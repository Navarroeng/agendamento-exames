"use client";

import { PortalEmpresaIdentidade } from "@/components/portal-cliente/PortalEmpresaIdentidade";
import { PortalResumoContrato } from "@/components/portal-cliente/PortalResumoContrato";
import type { PortalContratoResumo } from "@/lib/portal-contrato";

export function PortalEmpresaHeader({
  nome,
  logoUrl,
  contrato,
}: {
  nome: string;
  logoUrl: string | null;
  contrato: PortalContratoResumo;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#d5deed] shadow-[0_8px_24px_rgba(11,31,77,0.06)]">
      <div className="h-[3px] bg-[#0b1f4d]" />
      <div className="bg-[#F4F7FD] px-5 py-5 sm:px-6 sm:py-5">
        <PortalEmpresaIdentidade nome={nome} logoUrl={logoUrl} variante="sst" />
      </div>
      <PortalResumoContrato contrato={contrato} />
    </div>
  );
}
