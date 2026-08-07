"use client";

import { useEffect, useMemo, useState } from "react";
import { Field, RequiredMark } from "@/components/ui/Field";
import { formatDateBR } from "@/lib/format";
import { maskCPFInput } from "@/lib/cpf";
import {
  RISCOS_PARTICIPANTE_STATUS_LABELS,
  buildParticipantesResumo,
  maskCpfParticipante,
  type RiscosCampanhaParticipanteRecord,
  type RiscosParticipanteInput,
} from "@/lib/riscos-campanha-participantes";
import type { RiscosCampanhaRecord } from "@/lib/riscos-campanha";

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

const EMPTY_FORM: RiscosParticipanteInput = {
  nomeCompleto: "",
  cpf: "",
  cargo: "",
  setor: "",
  email: "",
};

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
  const [form, setForm] = useState<RiscosParticipanteInput>(EMPTY_FORM);
  const [cpfMasked, setCpfMasked] = useState("");
  const [error, setError] = useState<string | null>(null);

  const resumo = useMemo(
    () =>
      buildParticipantesResumo(campanha.quantidade_prevista, participantes),
    [campanha.quantidade_prevista, participantes]
  );

  useEffect(() => {
    if (!formOpen) {
      setEditingId(null);
      setForm(EMPTY_FORM);
      setCpfMasked("");
      setError(null);
    }
  }, [formOpen]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setCpfMasked("");
    setError(null);
    setFormOpen(true);
  }

  function openEdit(p: RiscosCampanhaParticipanteRecord) {
    setEditingId(p.id);
    setForm({
      nomeCompleto: p.nome_completo,
      cpf: p.cpf,
      cargo: p.cargo ?? "",
      setor: p.setor ?? "",
      email: p.email ?? "",
    });
    setCpfMasked(maskCPFInput(p.cpf));
    setError(null);
    setFormOpen(true);
  }

  async function handleSalvar() {
    setError(null);
    try {
      if (editingId) {
        await onEditar(editingId, form);
      } else {
        await onCriar(form);
      }
      setFormOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    }
  }

  async function handleRemover(p: RiscosCampanhaParticipanteRecord) {
    const ok = window.confirm(
      `Remover o participante ${p.nome_completo}? Esta ação não pode ser desfeita.`
    );
    if (!ok) return;
    await onRemover(p.id);
  }

  return (
    <div className="space-y-4 border-t border-[#e8edf5] pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
            Participantes da Pesquisa
          </p>
          <p className="mt-0.5 text-sm font-extrabold text-navy">
            Colaboradores autorizados a responder
          </p>
        </div>
        <button
          type="button"
          className="rounded-xl bg-brand-blue px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
          disabled={saving}
          onClick={openCreate}
        >
          + Adicionar colaborador
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-4">
        <ResumoCard label="Participantes previstos" value={resumo.previstos} />
        <ResumoCard
          label="Participantes cadastrados"
          value={resumo.cadastrados}
        />
        <ResumoCard label="Pendentes" value={resumo.pendentes} />
        <ResumoCard label="Respondidos" value={resumo.respondidos} />
      </div>

      {formOpen ? (
        <div className="rounded-xl border border-[#dbeafe] bg-[#f8fbff] p-4">
          <p className="mb-3 text-xs font-extrabold text-navy">
            {editingId ? "Editar participante" : "Novo participante"}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label={
                <>
                  Nome completo <RequiredMark />
                </>
              }
              className="sm:col-span-2"
            >
              <input
                className="field-input w-full"
                value={form.nomeCompleto}
                disabled={saving}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    nomeCompleto: e.target.value,
                  }))
                }
              />
            </Field>
            <Field
              label={
                <>
                  CPF <RequiredMark />
                </>
              }
            >
              <input
                className="field-input w-full"
                inputMode="numeric"
                value={cpfMasked}
                disabled={saving}
                onChange={(e) => {
                  const masked = maskCPFInput(e.target.value);
                  setCpfMasked(masked);
                  setForm((prev) => ({ ...prev, cpf: masked }));
                }}
              />
            </Field>
            <Field label="E-mail (opcional)">
              <input
                type="email"
                className="field-input w-full"
                value={form.email ?? ""}
                disabled={saving}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, email: e.target.value }))
                }
              />
            </Field>
            <Field label="Cargo">
              <input
                className="field-input w-full"
                value={form.cargo ?? ""}
                disabled={saving}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, cargo: e.target.value }))
                }
              />
            </Field>
            <Field label="Setor">
              <input
                className="field-input w-full"
                value={form.setor ?? ""}
                disabled={saving}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, setor: e.target.value }))
                }
              />
            </Field>
          </div>
          {error ? (
            <p className="mt-2 text-xs font-medium text-brand-red">{error}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-xl border border-[#e2e8f0] px-3 py-1.5 text-xs font-bold text-navy disabled:opacity-40"
              disabled={saving}
              onClick={() => setFormOpen(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="rounded-xl bg-brand-blue px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
              disabled={saving}
              onClick={() => void handleSalvar()}
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      ) : null}

      {participantes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#e2e8f0] bg-[#f8fafc] px-4 py-8 text-center text-sm text-app-muted">
          Nenhum participante cadastrado. Use “+ Adicionar colaborador” para
          incluir.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#e8edf5] bg-white">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead>
              <tr className="border-b border-[#eef2f7] bg-[#f8fafc] text-[10px] font-bold uppercase tracking-wide text-[#64748b]">
                <th className="px-3 py-2.5">Nome</th>
                <th className="px-3 py-2.5">CPF</th>
                <th className="px-3 py-2.5">Cargo</th>
                <th className="px-3 py-2.5">Setor</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Cadastro</th>
                <th className="w-[120px] px-3 py-2.5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {participantes.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-[#f1f5f9] last:border-0"
                >
                  <td className="px-3 py-2.5 font-medium text-navy">
                    {p.nome_completo}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">
                    {maskCpfParticipante(p.cpf)}
                  </td>
                  <td className="px-3 py-2.5">{p.cargo?.trim() || "—"}</td>
                  <td className="px-3 py-2.5">{p.setor?.trim() || "—"}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                        p.status === "respondido"
                          ? "bg-brand-green-soft text-brand-green"
                          : "bg-[#fef3c7] text-[#b45309]"
                      }`}
                    >
                      {RISCOS_PARTICIPANTE_STATUS_LABELS[p.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-[#64748b]">
                    {p.created_at
                      ? formatDateBR(p.created_at.slice(0, 10))
                      : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        className="text-[10px] font-bold text-brand-blue disabled:opacity-40"
                        disabled={saving}
                        onClick={() => openEdit(p)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="text-[10px] font-bold text-brand-red disabled:opacity-40"
                        disabled={saving}
                        onClick={() => void handleRemover(p)}
                      >
                        Remover
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[11px] text-[#94a3b8]">
        Importação por Excel será disponibilizada em etapa futura.
      </p>
    </div>
  );
}

function ResumoCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[#e8edf5] bg-white px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
        {label}
      </p>
      <p className="mt-1 text-lg font-extrabold tabular-nums text-navy">
        {value}
      </p>
    </div>
  );
}
