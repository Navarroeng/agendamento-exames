"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PortalAvaliacaoRiscos } from "@/components/portal-cliente/PortalAvaliacaoRiscos";
import { PortalEmpresaIdentidade } from "@/components/portal-cliente/PortalEmpresaIdentidade";
import { PortalModulosSst } from "@/components/portal-cliente/PortalModulosSst";
import {
  PORTAL_PREVIEW_INTERNO_LABEL,
  PORTAL_SELECIONE_EMPRESA_MSG,
  PORTAL_SEM_AVALIACAO_MSG,
  type PortalEmpresaOpcao,
  type PortalResumo,
  portalResumoVazio,
} from "@/lib/portal-cliente";

type HomeResponse = {
  ok?: boolean;
  precisaSelecionar?: boolean;
  resumo?: PortalResumo;
  error?: string;
};

type EmpresasResponse = {
  ok?: boolean;
  empresas?: PortalEmpresaOpcao[];
};

export function PortalHome() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clienteId = (searchParams.get("cliente") ?? "").trim();
  const viewRiscos = searchParams.get("view") === "riscos";

  const [empresas, setEmpresas] = useState<PortalEmpresaOpcao[]>([]);
  const [resumo, setResumo] = useState<PortalResumo>(portalResumoVazio);
  const [carregandoEmpresas, setCarregandoEmpresas] = useState(true);
  const [carregandoHome, setCarregandoHome] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const atualizarQuery = useCallback(
    (next: { cliente?: string; view?: "riscos" | null }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.cliente !== undefined) {
        if (next.cliente) params.set("cliente", next.cliente);
        else params.delete("cliente");
      }
      if (next.view === "riscos") params.set("view", "riscos");
      if (next.view === null) params.delete("view");
      const qs = params.toString();
      router.replace(qs ? `/portal?${qs}` : "/portal");
    },
    [router, searchParams]
  );

  const selecionarEmpresa = useCallback(
    (id: string) => {
      atualizarQuery({ cliente: id, view: null });
    },
    [atualizarQuery]
  );

  useEffect(() => {
    let cancel = false;
    async function loadEmpresas() {
      setCarregandoEmpresas(true);
      try {
        const res = await fetch("/api/portal/empresas", { cache: "no-store" });
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        const json = (await res.json().catch(() => ({}))) as EmpresasResponse;
        if (!cancel) setEmpresas(json.empresas ?? []);
      } catch {
        if (!cancel) setEmpresas([]);
      } finally {
        if (!cancel) setCarregandoEmpresas(false);
      }
    }
    void loadEmpresas();
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    let cancel = false;
    async function loadHome() {
      setResumo(portalResumoVazio());
      setErro(null);
      if (!clienteId) {
        setCarregandoHome(false);
        return;
      }
      setCarregandoHome(true);
      try {
        const res = await fetch(
          `/api/portal/home?cliente_id=${encodeURIComponent(clienteId)}`,
          { cache: "no-store" }
        );
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        const json = (await res.json().catch(() => ({}))) as HomeResponse;
        if (cancel) return;
        if (!res.ok) {
          setResumo(portalResumoVazio());
          setErro(PORTAL_SEM_AVALIACAO_MSG);
          return;
        }
        setResumo(json.resumo ?? portalResumoVazio());
      } catch {
        if (!cancel) {
          setResumo(portalResumoVazio());
          setErro(PORTAL_SEM_AVALIACAO_MSG);
        }
      } finally {
        if (!cancel) setCarregandoHome(false);
      }
    }
    void loadHome();
    return () => {
      cancel = true;
    };
  }, [clienteId]);

  const mostrarPainel =
    Boolean(clienteId) &&
    !carregandoHome &&
    resumo.statusPortal !== "sem_avaliacao";
  const mostrarHomeSst =
    Boolean(clienteId) &&
    !carregandoHome &&
    Boolean(resumo.empresaNome || mostrarPainel);

  return (
    <div className="flex flex-col gap-6 text-[#0b1f4d]">
      <PreviewBar
        empresas={empresas}
        clienteId={clienteId}
        loading={carregandoEmpresas}
        onChange={selecionarEmpresa}
      />

      {carregandoHome ? (
        <p className="py-16 text-center text-sm text-[#64748b]">
          Carregando painel...
        </p>
      ) : null}

      {!carregandoHome && !clienteId ? (
        <EmptyState mensagem={PORTAL_SELECIONE_EMPRESA_MSG} />
      ) : null}

      {!carregandoHome && clienteId && !mostrarHomeSst ? (
        <EmptyState mensagem={erro ?? PORTAL_SEM_AVALIACAO_MSG} />
      ) : null}

      {mostrarPainel && viewRiscos ? (
        <PortalAvaliacaoRiscos
          resumo={resumo}
          onVoltar={() => atualizarQuery({ view: null })}
        />
      ) : null}

      {mostrarHomeSst && !viewRiscos ? (
        <div className="flex flex-col gap-6">
          <PortalEmpresaIdentidade
            nome={resumo.empresaNome || "Empresa"}
            logoUrl={resumo.logoUrl}
            variante="sst"
          />
          <PortalModulosSst
            resumo={resumo}
            onVerAvaliacao={() => atualizarQuery({ view: "riscos" })}
          />
        </div>
      ) : null}

      {mostrarHomeSst && viewRiscos && !mostrarPainel ? (
        <EmptyState mensagem={erro ?? PORTAL_SEM_AVALIACAO_MSG} />
      ) : null}
    </div>
  );
}

function PreviewBar({
  empresas,
  clienteId,
  loading,
  onChange,
}: {
  empresas: PortalEmpresaOpcao[];
  clienteId: string;
  loading: boolean;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-[#e8edf5] bg-white px-5 py-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#94a3b8]">
          Modo de visualização
        </p>
        <p className="mt-1 text-xs text-[#64748b]">{PORTAL_PREVIEW_INTERNO_LABEL}</p>
      </div>
      <label className="flex min-w-[240px] flex-1 flex-col gap-1.5 sm:max-w-sm">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94a3b8]">
          Visualizar portal de
        </span>
        <select
          className="h-10 rounded-lg border border-[#e2e8f0] bg-white px-3 text-sm text-[#0b1f4d] outline-none focus:border-[#0b1f4d]"
          value={clienteId}
          disabled={loading}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Selecionar empresa</option>
          {empresas.map((empresa) => (
            <option key={empresa.id} value={empresa.id}>
              {empresa.nome}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function EmptyState({ mensagem }: { mensagem: string }) {
  return (
    <div className="rounded-2xl border border-[#e8edf5] bg-white px-8 py-20 text-center">
      <p className="text-sm text-[#64748b]">{mensagem}</p>
    </div>
  );
}
