"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { filtrarExamesCatalogoPorBusca } from "@/lib/agendamento-exames-adicionais";
import type { ExameRecord } from "@/lib/types";

interface AgendamentoExamesAdicionaisModalProps {
  open: boolean;
  loading?: boolean;
  catalogLoading?: boolean;
  exames: ExameRecord[];
  onClose: () => void;
  onConfirm: (selectedIds: string[]) => void;
}

export function AgendamentoExamesAdicionaisModal({
  open,
  loading = false,
  catalogLoading = false,
  exames,
  onClose,
  onConfirm,
}: AgendamentoExamesAdicionaisModalProps) {
  const [busca, setBusca] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) {
      setBusca("");
      setSelectedIds(new Set());
    }
  }, [open]);

  const examesFiltrados = useMemo(
    () => filtrarExamesCatalogoPorBusca(exames, busca),
    [busca, exames]
  );

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  const toggleExame = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    if (loading || selectedIds.size === 0) return;
    onConfirm(Array.from(selectedIds));
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Adicionar exames adicionais"
      wide
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="btn"
            onClick={handleClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={loading || selectedIds.size === 0}
          >
            {loading ? "Adicionando..." : "Adicionar selecionados"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label
            htmlFor="busca-exames-adicionais"
            className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#64748b]"
          >
            Pesquisar exame
          </label>
          <input
            id="busca-exames-adicionais"
            type="search"
            className="field-input"
            placeholder="Buscar por nome ou categoria..."
            value={busca}
            disabled={loading}
            onChange={(event) => setBusca(event.target.value)}
          />
        </div>

        {catalogLoading && (
          <p className="py-6 text-center text-sm text-app-muted">
            Carregando catálogo de exames...
          </p>
        )}

        {!catalogLoading && exames.length === 0 && (
          <p className="py-6 text-center text-sm text-app-muted">
            Todos os exames do catálogo já fazem parte deste agendamento.
          </p>
        )}

        {!catalogLoading && exames.length > 0 && examesFiltrados.length === 0 && (
          <p className="py-6 text-center text-sm text-app-muted">
            Nenhum exame encontrado para a pesquisa informada.
          </p>
        )}

        {!catalogLoading && examesFiltrados.length > 0 && (
          <div className="max-h-[320px] overflow-y-auto rounded-xl border border-[#e8edf5] bg-[#f8fafc] p-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {examesFiltrados.map((exame) => {
                const checked = selectedIds.has(exame.id);
                return (
                  <label
                    key={exame.id}
                    className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors ${
                      checked
                        ? "border-brand-blue/30 bg-white shadow-[0_2px_8px_rgba(79,99,255,0.08)]"
                        : "border-transparent bg-white/70 hover:border-[#e2e8f0]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-[#cbd5e1] text-brand-blue focus:ring-brand-blue/20"
                      checked={checked}
                      disabled={loading}
                      onChange={() => toggleExame(exame.id)}
                    />
                    <span className="min-w-0">
                      <span className="block text-xs font-bold text-navy">
                        {exame.nome}
                      </span>
                      {exame.categoria ? (
                        <span className="mt-0.5 block text-[10px] text-[#64748b]">
                          {exame.categoria}
                        </span>
                      ) : null}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {selectedIds.size > 0 ? (
          <p className="text-[11px] font-medium text-[#64748b]">
            {selectedIds.size} exame(s) selecionado(s)
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
