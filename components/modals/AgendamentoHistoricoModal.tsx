"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { formatDateTimeBR } from "@/lib/format-datetime";
import type { AgendamentoHistoricoRecord } from "@/lib/types";
import { listarHistoricoAgendamento } from "@/services/historico.service";

interface AgendamentoHistoricoModalProps {
  open: boolean;
  agendamentoId: string | null;
  onClose: () => void;
}

export function AgendamentoHistoricoModal({
  open,
  agendamentoId,
  onClose,
}: AgendamentoHistoricoModalProps) {
  const [items, setItems] = useState<AgendamentoHistoricoRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !agendamentoId) {
      setItems([]);
      setError(null);
      return;
    }

    let cancelled = false;

    async function load() {
      const id = agendamentoId;
      if (!id) return;

      setLoading(true);
      setError(null);
      try {
        const data = await listarHistoricoAgendamento(id);
        if (!cancelled) {
          setItems(data);
        }
      } catch (err) {
        console.error("Erro ao carregar histórico:", err);
        if (!cancelled) {
          const message =
            err && typeof err === "object" && "message" in err
              ? String((err as { message: unknown }).message)
              : "Erro ao carregar histórico";
          setError(message);
          setItems([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [open, agendamentoId]);

  return (
    <Modal open={open} onClose={onClose} title="Histórico de alterações" wide>
      {loading && (
        <p className="py-8 text-center text-sm text-app-muted">
          Carregando histórico...
        </p>
      )}

      {!loading && error && (
        <p className="py-8 text-center text-sm text-brand-red">{error}</p>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="py-8 text-center text-sm text-app-muted">
          Nenhum registro de histórico para este agendamento.
        </p>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-[#e1e7f2] bg-gradient-to-b from-white to-[#fbfdff] p-4"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-extrabold text-navy">
                  {item.usuario}
                </span>
                <span className="text-xs font-semibold text-app-muted">
                  {formatDateTimeBR(item.created_at)}
                </span>
              </div>
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-brand-blue">
                {item.acao}
              </p>
              <p className="text-sm leading-relaxed text-[#1f2937]">
                {item.detalhes ?? "—"}
              </p>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
