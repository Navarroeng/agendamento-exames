"use client";

import { useCallback, useEffect, useState } from "react";
import { PortalEmpresaIdentidade } from "@/components/portal-cliente/PortalEmpresaIdentidade";
import { PortalFaturaDetalheModal } from "@/components/portal-cliente/PortalFaturaDetalheModal";
import { PortalFaturasKpis } from "@/components/portal-cliente/PortalFaturasKpis";
import { PortalFaturasListagem } from "@/components/portal-cliente/PortalFaturasListagem";
import { calcPortalFaturasResumo } from "@/lib/portal-faturas";
import type { PortalFaturaLinha, PortalFaturasResumo } from "@/lib/portal-faturas";

type FaturasState =
  | { fase: "carregando" }
  | { fase: "erro"; mensagem: string }
  | { fase: "ok"; faturas: PortalFaturaLinha[]; resumo: PortalFaturasResumo };

type FaturasResponse = {
  ok?: boolean;
  faturas?: PortalFaturaLinha[];
  resumo?: PortalFaturasResumo;
  error?: string;
};

export function PortalFaturas({
  clienteId,
  clienteNome,
  logoUrl,
  onVoltar,
}: {
  clienteId: string;
  clienteNome: string;
  logoUrl: string | null;
  onVoltar: () => void;
}) {
  const [estado, setEstado] = useState<FaturasState>({ fase: "carregando" });
  const [faturaDetalheId, setFaturaDetalheId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setEstado({ fase: "carregando" });
    try {
      const res = await fetch(
        `/api/portal/faturas?cliente_id=${encodeURIComponent(clienteId)}&cliente_nome=${encodeURIComponent(clienteNome)}`,
        { cache: "no-store" }
      );
      const json = (await res.json().catch(() => ({}))) as FaturasResponse;
      if (!res.ok) {
        setEstado({
          fase: "erro",
          mensagem: json.error ?? "Erro ao carregar faturas.",
        });
        return;
      }
      const faturas = json.faturas ?? [];
      const resumo = json.resumo ?? calcPortalFaturasResumo([]);
      setEstado({ fase: "ok", faturas, resumo });
    } catch {
      setEstado({ fase: "erro", mensagem: "Erro ao carregar faturas." });
    }
  }, [clienteId, clienteNome]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return (
    <div className="flex flex-col gap-5">
      {/* Identidade */}
      <PortalEmpresaIdentidade
        nome={clienteNome}
        logoUrl={logoUrl}
        variante="sst"
      />

      {/* Cabeçalho do módulo */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onVoltar}
          className="text-sm text-[#64748b] underline-offset-2 hover:underline"
        >
          ← Voltar
        </button>
      </div>

      <div>
        <h2 className="text-base font-semibold tracking-tight text-[#0b1f4d]">
          Faturas
        </h2>
        <p className="mt-1 text-sm text-[#64748b]">
          Acompanhe as faturas emitidas para sua empresa.
        </p>
      </div>

      {/* Conteúdo */}
      {estado.fase === "carregando" && (
        <p className="py-12 text-center text-sm text-[#64748b]">
          Carregando faturas...
        </p>
      )}

      {estado.fase === "erro" && (
        <div className="rounded-2xl border border-[#e8edf5] bg-white px-8 py-14 text-center">
          <p className="text-sm text-[#dc2626]">{estado.mensagem}</p>
        </div>
      )}

      {estado.fase === "ok" && (
        <>
          {estado.faturas.length === 0 ? (
            <div className="rounded-2xl border border-[#e8edf5] bg-white px-8 py-14 text-center">
              <p className="text-sm text-[#64748b]">
                Nenhuma fatura disponível para esta empresa.
              </p>
            </div>
          ) : (
            <>
              <PortalFaturasKpis resumo={estado.resumo} />
              <PortalFaturasListagem
                faturas={estado.faturas}
                onVisualizarFatura={setFaturaDetalheId}
              />
            </>
          )}
        </>
      )}

      {/* Modal de detalhe */}
      {faturaDetalheId && (
        <PortalFaturaDetalheModal
          faturaId={faturaDetalheId}
          clienteId={clienteId}
          clienteNome={clienteNome}
          onFechar={() => setFaturaDetalheId(null)}
        />
      )}
    </div>
  );
}
