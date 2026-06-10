"use client";

import { Modal } from "@/components/ui/Modal";
import type { CargoComExames } from "@/lib/types";

interface CargoViewModalProps {
  cargo: CargoComExames | null;
  onClose: () => void;
}

export function CargoViewModal({ cargo, onClose }: CargoViewModalProps) {
  if (!cargo) return null;

  const exames = cargo.cargo_exames ?? [];

  return (
    <Modal
      open={Boolean(cargo)}
      onClose={onClose}
      title={`Exames do cargo: ${cargo.nome}`}
      wide
    >
      {cargo.descricao ? (
        <p className="mb-4 text-sm text-[#64748b]">{cargo.descricao}</p>
      ) : null}

      {exames.length === 0 ? (
        <p className="py-6 text-center text-sm text-app-muted">
          Nenhum exame obrigatório vinculado.
        </p>
      ) : (
        <ul className="space-y-2">
          {exames.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between rounded-xl border border-[#e8edf5] bg-[#f8fafc] px-4 py-3"
            >
              <div>
                <p className="text-sm font-bold text-navy">
                  {item.exames?.nome ?? "Exame"}
                </p>
                {item.exames?.categoria ? (
                  <p className="text-[11px] text-[#64748b]">
                    {item.exames.categoria}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="rounded-full bg-brand-green-soft px-2 py-0.5 text-[10px] font-bold text-brand-green">
                  Obrigatório
                </span>
                {item.gerar_alerta_6m ? (
                  <span className="rounded-full bg-brand-blue-soft px-2 py-0.5 text-[10px] font-bold text-brand-blue">
                    Alerta 6 meses
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
