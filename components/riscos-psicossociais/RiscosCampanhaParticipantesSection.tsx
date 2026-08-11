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
  onCriar: (input: RiscosParticipanteInput) => Promise<void>;
  onEditar: (
    participanteId: string,
    input: RiscosParticipanteInput
  ) => Promise<void>;
  onRemover: (participanteId: string) => Promise<void>;
}

export function RiscosCampanhaParticipantesSection({
  campanha,
  participantes,
  saving = false,
  onCriar,
  onEditar,
  onRemover,
}: RiscosCampanhaParticipantesSectionProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const resumo = useMemo(
    () =>
      buildParticipantesResumo(campanha.quantidade_prevista, participantes),
    [campanha.quantidade_prevista, participantes]
  );
  const faltamCadastrar = Math.max(0, resumo.previstos - resumo.cadastrados);

  const editingInitial = useMemo(() => {
    if (!editingId) return null;
    const p = participantes.find((row) => row.id === editingId);
    if (!p) return null;
    return {
      nomeCompleto: p.nome_completo,
      cpf: p.cpf,
      dataNascimento: p.data_nascimento ?? "",
      cargo: p.cargo ?? "",
      setor: p.setor ?? "",
      email: p.email ?? "",
    } satisfies RiscosParticipanteInput;
  }, [editingId, participantes]);

  function openCreate() {
    setEditingId(null);
    setFormOpen(true);
  }

  function openEdit(p: RiscosCampanhaParticipanteRecord) {
    setMenuOpenId(null);
    setEditingId(p.id);
    setFormOpen(true);
  }

  async function handleSalvar(input: RiscosParticipanteInput) {
    if (editingId) {
      await onEditar(editingId, input);
    } else {
      await onCriar(input);
    }
    setFormOpen(false);
    setEditingId(null);
  }

  async function handleRemover(p: RiscosCampanhaParticipanteRecord) {
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

  function placeholderAction(label: string) {
    setMenuOpenId(null);
    toast.message(`${label} será disponibilizado em breve.`);
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-xl border border-[#e2e8f0] px-3 py-2 text-xs font-bold text-navy"
          onClick={() =>
            toast.message(
              "Importação por Excel será disponibilizada em etapa futura."
            )
          }
        >
          Importar Excel
        </button>
        <button
          type="button"
          className="rounded-xl bg-brand-blue px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
          disabled={saving}
          onClick={openCreate}
        >
          + Cadastrar participante
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <ResumoCard label="Previstos" value={resumo.previstos} />
        <ResumoCard label="Cadastrados" value={resumo.cadastrados} />
        <ResumoCard
          label="Faltam cadastrar"
          value={faltamCadastrar}
          emphasize={faltamCadastrar > 0}
        />
        <ResumoCard label="Responderam" value={resumo.respondidos} />
      </div>

      {participantes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#e2e8f0] bg-[#f8fafc] px-4 py-6 text-center text-sm text-app-muted">
          Nenhum participante cadastrado. Use “+ Cadastrar participante” para
          incluir.
        </p>
      ) : (
        <div className="w-full overflow-x-auto rounded-xl border border-[#e8edf5] bg-white">
          <table className="w-full min-w-0 table-fixed text-left text-xs lg:min-w-full">
            <thead>
              <tr className="border-b border-[#eef2f7] bg-[#f8fafc] text-[10px] font-bold uppercase tracking-wide text-[#64748b]">
                <th className="w-[28%] px-3 py-2.5">Nome</th>
                <th className="w-[12%] px-3 py-2.5">CPF</th>
                <th className="hidden w-[16%] px-3 py-2.5 sm:table-cell">
                  Cargo
                </th>
                <th className="hidden w-[14%] px-3 py-2.5 md:table-cell">
                  Setor
                </th>
                <th className="w-[14%] px-3 py-2.5">Status</th>
                <th className="hidden w-[12%] px-3 py-2.5 lg:table-cell">
                  Cadastro
                </th>
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
                  <td className="hidden px-3 py-2.5 sm:table-cell">
                    <span className="line-clamp-2 break-words">
                      {p.cargo?.trim() || "—"}
                    </span>
                  </td>
                  <td className="hidden px-3 py-2.5 md:table-cell">
                    <span className="line-clamp-2 break-words">
                      {p.setor?.trim() || "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="hidden px-3 py-2.5 tabular-nums text-[#64748b] lg:table-cell">
                    {p.created_at
                      ? formatDateBR(p.created_at.slice(0, 10))
                      : "—"}
                  </td>
                  <td className="relative px-3 py-2.5 text-center">
                    <ParticipanteActionsMenu
                      open={menuOpenId === p.id}
                      disabled={saving}
                      onToggle={() =>
                        setMenuOpenId((id) => (id === p.id ? null : p.id))
                      }
                      onClose={() => setMenuOpenId(null)}
                      onEditar={() => openEdit(p)}
                      onRemover={() => void handleRemover(p)}
                      onPlaceholder={placeholderAction}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <RiscosParticipanteFormModal
        open={formOpen}
        mode={editingId ? "edit" : "create"}
        saving={saving}
        initial={editingInitial}
        onClose={() => {
          if (saving) return;
          setFormOpen(false);
          setEditingId(null);
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
      : "bg-[#fef3c7] text-[#b45309]";
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-extrabold ${className}`}
    >
      {RISCOS_PARTICIPANTE_STATUS_LABELS[status] ?? status}
    </span>
  );
}

function ResumoCard({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: number;
  emphasize?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-2.5 ${
        emphasize
          ? "border-[#fde68a] bg-[#fffbeb]"
          : "border-[#e8edf5] bg-[#f8fafc]"
      }`}
    >
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
  onEditar,
  onRemover,
  onPlaceholder,
}: {
  open: boolean;
  disabled?: boolean;
  onToggle: () => void;
  onClose: () => void;
  onEditar: () => void;
  onRemover: () => void;
  onPlaceholder: (label: string) => void;
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
          className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-xl border border-[#e8edf5] bg-white py-1 text-left shadow-lg"
        >
          <MenuItem label="Editar" onClick={onEditar} />
          <MenuItem
            label="Redefinir senha"
            muted
            onClick={() => onPlaceholder("Redefinir senha")}
          />
          <MenuItem
            label="Copiar link individual"
            muted
            onClick={() => onPlaceholder("Copiar link individual")}
          />
          <MenuItem
            label="Enviar convite"
            muted
            onClick={() => onPlaceholder("Enviar convite")}
          />
          <MenuItem
            label="Ver histórico"
            muted
            onClick={() => onPlaceholder("Ver histórico")}
          />
          <div className="my-1 border-t border-[#eef2f7]" />
          <MenuItem label="Remover participante" danger onClick={onRemover} />
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  label,
  onClick,
  danger = false,
  muted = false,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className={`block w-full px-3 py-2 text-left text-xs font-semibold transition hover:bg-[#f8fafc] ${
        danger
          ? "text-brand-red"
          : muted
            ? "text-[#64748b]"
            : "text-navy"
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
