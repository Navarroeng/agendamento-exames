"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PortalEmpresaIdentidade } from "@/components/portal-cliente/PortalEmpresaIdentidade";
import { IconFileText } from "@/components/ui/icons/OutlineIcons";
import {
  calcPortalLaudosSstResumo,
  type PortalLaudoDocumento,
  type PortalLaudosSstResumo,
} from "@/lib/portal-laudos-sst";

type Estado =
  | { fase: "carregando" }
  | { fase: "erro"; mensagem: string }
  | {
      fase: "ok";
      documentos: PortalLaudoDocumento[];
      resumo: PortalLaudosSstResumo;
    };

type ListResponse = {
  ok?: boolean;
  documentos?: PortalLaudoDocumento[];
  resumo?: PortalLaudosSstResumo;
  error?: string;
};

export function PortalLaudosSst({
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
  const [estado, setEstado] = useState<Estado>({ fase: "carregando" });
  const [busyId, setBusyId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setEstado({ fase: "carregando" });
    try {
      const res = await fetch(
        `/api/portal/laudos-sst?cliente_id=${encodeURIComponent(clienteId)}`,
        { cache: "no-store" }
      );
      const json = (await res.json().catch(() => ({}))) as ListResponse;
      if (!res.ok) {
        setEstado({
          fase: "erro",
          mensagem: json.error ?? "Erro ao carregar laudos.",
        });
        return;
      }
      const documentos = json.documentos ?? [];
      const resumo = json.resumo ?? calcPortalLaudosSstResumo(documentos);
      setEstado({ fase: "ok", documentos, resumo });
    } catch {
      setEstado({ fase: "erro", mensagem: "Erro ao carregar laudos." });
    }
  }, [clienteId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const abrirAnexo = async (
    doc: PortalLaudoDocumento,
    modo: "visualizar" | "baixar"
  ) => {
    setBusyId(`${doc.id}:${modo}`);
    try {
      const res = await fetch(
        `/api/portal/laudos-sst/${encodeURIComponent(doc.orcamentoId)}/anexo?tipo=${encodeURIComponent(doc.tipo)}&cliente_id=${encodeURIComponent(clienteId)}`,
        { cache: "no-store" }
      );
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        url?: string;
        nomeArquivo?: string;
        error?: string;
      };
      if (!res.ok || !json.url) {
        toast.error(json.error ?? "Documento não encontrado.");
        return;
      }
      if (modo === "baixar") {
        const a = document.createElement("a");
        a.href = json.url;
        a.download = json.nomeArquivo || doc.nomeArquivo;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        window.open(json.url, "_blank", "noopener,noreferrer");
      }
    } catch {
      toast.error("Não foi possível abrir o documento.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <PortalEmpresaIdentidade
        nome={clienteNome}
        logoUrl={logoUrl}
        variante="sst"
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onVoltar}
          className="text-sm text-[#64748b] underline-offset-2 hover:underline"
        >
          ← Voltar
        </button>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#e8edf5] bg-white">
        <div className="flex items-center gap-3 border-b border-[#eef2f7] px-5 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0b1f4d] text-white">
            <IconFileText size={18} />
          </span>
          <div>
            <h2 className="text-lg font-bold text-[#0b1f4d]">Laudos SST</h2>
            <p className="text-sm text-[#64748b]">
              Documentos liberados pela Navarro para a sua empresa
            </p>
          </div>
        </div>

        <div className="px-5 py-5">
          {estado.fase === "carregando" ? (
            <p className="py-10 text-center text-sm text-[#94a3b8]">
              Carregando laudos...
            </p>
          ) : null}

          {estado.fase === "erro" ? (
            <p className="py-10 text-center text-sm text-[#b91c1c]">
              {estado.mensagem}
            </p>
          ) : null}

          {estado.fase === "ok" && estado.documentos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#e2e8f0] bg-[#fafbfc] px-5 py-10 text-center">
              <p className="text-sm font-semibold text-[#0b1f4d]">
                Nenhum laudo disponível
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#64748b]">
                Os documentos serão disponibilizados aqui após a conclusão e
                liberação pela Navarro.
              </p>
            </div>
          ) : null}

          {estado.fase === "ok" && estado.documentos.length > 0 ? (
            <>
              <div className="mb-4 text-sm text-[#64748b]">
                {estado.resumo.linhaResumo}
              </div>

              <div className="hidden overflow-hidden rounded-xl border border-[#e8edf5] md:block">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-[#0b1f4d] text-[10px] font-semibold uppercase tracking-[0.12em] text-white/90">
                      <th className="px-4 py-3">Documento</th>
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estado.documentos.map((doc) => (
                      <tr
                        key={doc.id}
                        className="border-b border-[#f1f5f9] last:border-0"
                      >
                        <td className="px-4 py-3.5">
                          <p className="text-sm font-semibold text-[#0b1f4d]">
                            {doc.tipoLabel}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-[#94a3b8]">
                            {doc.nomeArquivo}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-sm tabular-nums text-[#64748b]">
                          {doc.dataLabel}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="inline-flex flex-wrap justify-end gap-1.5">
                            <button
                              type="button"
                              className="rounded-lg border border-[#e2e8f0] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#475569] hover:bg-[#f8fafc] disabled:opacity-50"
                              disabled={busyId !== null}
                              onClick={() => void abrirAnexo(doc, "visualizar")}
                            >
                              Visualizar
                            </button>
                            <button
                              type="button"
                              className="rounded-lg bg-[#0b1f4d] px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-[#12316f] disabled:opacity-50"
                              disabled={busyId !== null}
                              onClick={() => void abrirAnexo(doc, "baixar")}
                            >
                              Baixar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-2.5 md:hidden">
                {estado.documentos.map((doc) => (
                  <div
                    key={doc.id}
                    className="rounded-xl border border-[#e8edf5] bg-[#fafbfc] px-4 py-3"
                  >
                    <p className="text-sm font-semibold text-[#0b1f4d]">
                      {doc.tipoLabel}
                    </p>
                    <p className="mt-0.5 text-xs text-[#94a3b8]">
                      {doc.nomeArquivo}
                    </p>
                    <p className="mt-1 text-xs tabular-nums text-[#64748b]">
                      {doc.dataLabel}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        className="rounded-lg border border-[#e2e8f0] bg-white px-3 py-1.5 text-xs font-semibold text-[#475569]"
                        disabled={busyId !== null}
                        onClick={() => void abrirAnexo(doc, "visualizar")}
                      >
                        Visualizar
                      </button>
                      <button
                        type="button"
                        className="rounded-lg bg-[#0b1f4d] px-3 py-1.5 text-xs font-semibold text-white"
                        disabled={busyId !== null}
                        onClick={() => void abrirAnexo(doc, "baixar")}
                      >
                        Baixar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}
