"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { formatDateBR } from "@/lib/format";
import {
  RISCOS_PARTICIPANTE_STATUS_LABELS,
  buildParticipantesResumo,
  maskCpfParticipante,
  type RiscosCampanhaParticipanteRecord,
  type RiscosParticipanteInput,
  type RiscosParticipanteStatus,
} from "@/lib/riscos-campanha-participantes";
import { precisaConfirmacaoForteRemocao } from "@/lib/riscos-remocao-participante";
import type { RiscosCampanhaRecord } from "@/lib/riscos-campanha";
import { RiscosParticipanteFormModal } from "@/components/riscos-psicossociais/RiscosParticipanteFormModal";

interface RiscosCampanhaParticipantesSectionProps {
  campanha: RiscosCampanhaRecord;
  participantes: RiscosCampanhaParticipanteRecord[];
  saving?: boolean;
  /** Somente admin vê/usa Remover participante. */
  podeRemoverParticipante?: boolean;
  onCriar: (input: RiscosParticipanteInput) => Promise<void>;
  onRemover: (participanteId: string) => Promise<void>;
  onImportarExcel?: (file: File) => Promise<void>;
}

export function RiscosCampanhaParticipantesSection({
  campanha,
  participantes,
  saving = false,
  podeRemoverParticipante = false,
  onCriar,
  onRemover,
  onImportarExcel,
}: RiscosCampanhaParticipantesSectionProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resumo = useMemo(
    () =>
      buildParticipantesResumo(campanha.quantidade_prevista, participantes),
    [campanha.quantidade_prevista, participantes]
  );

  async function handleSalvar(input: RiscosParticipanteInput) {
    await onCriar(input);
    setFormOpen(false);
  }

  async function handleRemover(p: RiscosCampanhaParticipanteRecord) {
    if (!podeRemoverParticipante) return;
    setMenuOpenId(null);
    const forte = precisaConfirmacaoForteRemocao(p.status);
    const ok = window.confirm(
      forte
        ? `Este participante já concluiu a pesquisa.\n\nAo remover este participante, sua participação deixará de compor os resultados desta campanha e ele não poderá mais acessar esta pesquisa.\n\nDeseja continuar?`
        : `Remover o participante ${p.nome_completo}?\n\nEle deixará de estar autorizado nesta campanha.`
    );
    if (!ok) return;
    await onRemover(p.id);
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            void (async () => {
              try {
                if (onImportarExcel) {
                  await onImportarExcel(file);
                } else {
                  toast.message(
                    "Importação por Excel será disponibilizada em etapa futura."
                  );
                }
              } catch (err) {
                toast.error(
                  err instanceof Error
                    ? err.message
                    : "Falha ao importar a planilha."
                );
              }
            })();
          }}
        />
        <button
          type="button"
          className="rounded-xl border border-[#e2e8f0] px-3 py-2 text-xs font-bold text-navy disabled:opacity-40"
          disabled={saving || !onImportarExcel}
          onClick={() => fileInputRef.current?.click()}
          title={
            onImportarExcel
              ? "Importar planilha (Nome | CPF | Data de nascimento | E-mail)"
              : "Importação indisponível"
          }
        >
          Importar Excel
        </button>
        <button
          type="button"
          className="rounded-xl bg-brand-blue px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
          disabled={saving}
          onClick={() => setFormOpen(true)}
        >
          + Cadastrar participante
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <ResumoCard label="Cadastrados" value={resumo.cadastrados} />
        <ResumoCard label="Responderam" value={resumo.respondidos} />
      </div>

      {participantes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#e2e8f0] bg-[#f8fafc] px-4 py-6 text-center text-sm text-app-muted">
          Nenhum participante cadastrado. Use “+ Cadastrar participante” para
          incluir.
        </p>
      ) : (
        <div className="w-full overflow-x-auto rounded-xl border border-[#e8edf5] bg-white">
          <table className="w-full min-w-[720px] table-fixed text-left text-xs">
            <thead>
              <tr className="border-b border-[#eef2f7] bg-[#f8fafc] text-[10px] font-bold uppercase tracking-wide text-[#64748b]">
                <th className="w-[28%] px-3 py-2.5">Nome</th>
                <th className="w-[16%] px-3 py-2.5">CPF</th>
                <th className="w-[14%] px-3 py-2.5">Data de nasc.</th>
                <th className="w-[14%] px-3 py-2.5">Status</th>
                <th className="w-[14%] px-3 py-2.5">Cadastro</th>
                <th className="w-[72px] px-3 py-2.5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {participantes.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-[#f1f5f9] last:border-0"
                >
                  <td className="px-3 py-2.5 font-medium text-navy">
                    <span className="line-clamp-2 break-words">
                      {p.nome_completo}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">
                    {maskCpfParticipante(p.cpf)}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap tabular-nums text-[#64748b]">
                    {p.data_nascimento
                      ? formatDateBR(p.data_nascimento.slice(0, 10))
                      : "-"}
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap tabular-nums text-[#64748b]">
                    {p.created_at
                      ? formatDateBR(p.created_at.slice(0, 10))
                      : "-"}
                  </td>
                  <td className="relative px-3 py-2.5 text-center">
                    {podeRemoverParticipante ? (
                      <ParticipanteActionsMenu
                        open={menuOpenId === p.id}
                        disabled={saving}
                        onToggle={() =>
                          setMenuOpenId((id) => (id === p.id ? null : p.id))
                        }
                        onClose={() => setMenuOpenId(null)}
                        onRemover={() => void handleRemover(p)}
                      />
                    ) : (
                      <span className="text-[11px] text-[#94a3b8]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <RiscosParticipanteFormModal
        open={formOpen}
        mode="create"
        saving={saving}
        onClose={() => {
          if (saving) return;
          setFormOpen(false);
        }}
        onSave={handleSalvar}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: RiscosParticipanteStatus }) {
  const className =
    status === "respondido"
      ? "bg-brand-green-soft text-brand-green"
      : status === "iniciado"
        ? "bg-brand-blue-soft text-brand-blue"
        : "bg-[#fef3c7] text-[#b45309]";
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-extrabold ${className}`}
    >
      {RISCOS_PARTICIPANTE_STATUS_LABELS[status] ?? status}
    </span>
  );
}

function ResumoCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[#e8edf5] bg-[#f8fafc] px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
        {label}
      </p>
      <p className="mt-1 text-lg font-extrabold tabular-nums text-navy">
        {value}
      </p>
    </div>
  );
}

function ParticipanteActionsMenu({
  open,
  disabled,
  onToggle,
  onClose,
  onRemover,
}: {
  open: boolean;
  disabled?: boolean;
  onToggle: () => void;
  onClose: () => void;
  onRemover: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <div ref={rootRef} className="relative inline-flex justify-center">
      <button
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-lg font-bold text-[#64748b] hover:bg-[#f1f5f9] hover:text-navy disabled:opacity-40"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Ações do participante"
        onClick={onToggle}
      >
        ⋮
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-xl border border-[#e8edf5] bg-white py-1 text-left shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-2 text-left text-xs font-semibold text-brand-red transition hover:bg-[#fef2f2]"
            onClick={onRemover}
          >
            Remover participante
          </button>
        </div>
      ) : null}
    </div>
  );
}
