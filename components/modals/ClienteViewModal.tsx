"use client";

import { useState } from "react";
import { toast } from "sonner";

import { ClienteContratoAtualCard } from "@/components/clientes/ClienteContratoAtualCard";
import { ClienteContratoFormModal } from "@/components/clientes/ClienteContratoFormModal";
import { ClienteContratosHistoricoTable } from "@/components/clientes/ClienteContratosHistoricoTable";
import { ClienteEncerrarContratoModal } from "@/components/clientes/ClienteEncerrarContratoModal";
import { ClienteIncluirRiscosModal } from "@/components/clientes/ClienteIncluirRiscosModal";
import { Field, RequiredMark } from "@/components/ui/Field";
import { IconUsers } from "@/components/ui/icons/OutlineIcons";
import { useAuditoriaUsuario } from "@/contexts/AuthContext";
import { useClienteContratos } from "@/hooks/useClienteContratos";
import { useClienteEdit } from "@/hooks/useClienteEdit";
import { AUDITORIA_ACOES, AUDITORIA_MODULOS } from "@/lib/auditoria";
import { resolveClienteCnpjError } from "@/lib/cliente-cnpj";
import { formatVigenciaContrato } from "@/lib/cliente-contrato-mappers";
import {
  CLIENTE_PROCURACAO_OPTIONS,
  formatClienteProcuracaoLabel,
  normalizeClienteProcuracao,
} from "@/lib/cliente-procuracao";
import {
  boolToDisponivelAgendamentoForm,
  formatClienteAgendamentoBadgeLabel,
  isClienteDisponivelAgendamento,
} from "@/lib/cliente-disponivel-agendamento";
import { SIM_NAO } from "@/lib/constants";
import { formatCNPJ, maskCNPJInput } from "@/lib/cnpj";
import { formatClienteNomeDisplay } from "@/lib/cliente-display";
import type { ClienteRecord } from "@/lib/types";
import { registrarAuditoria } from "@/services/auditoria.service";
import {
  registrarDisponivelAgendamentoClienteAlterada,
  registrarProcuracaoClienteAlterada,
} from "@/services/cliente-procuracao-audit.service";
import { atualizarCliente } from "@/services/cliente.service";

interface ClienteViewModalProps {
  cliente: ClienteRecord | null;
  onClose: () => void;
  onUpdated?: (cliente: ClienteRecord) => void;
}

const VALIDATION_MESSAGE =
  "Preencha Nome da empresa e CNPJ antes de salvar.";

function InfoItem({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#8b95a8]">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-[#1f2937]">
        {value || "—"}
      </p>
    </div>
  );
}

export function ClienteViewModal({
  cliente,
  onClose,
  onUpdated,
}: ClienteViewModalProps) {
  const auditContext = useAuditoriaUsuario();
  const [incluirRiscosOpen, setIncluirRiscosOpen] = useState(false);

  const {
    editing: editingCliente,
    form: clienteForm,
    setField: setClienteField,
    startEditing,
    cancelEditing,
    buildPayload: buildClientePayload,
    validate: validateCliente,
    saving: savingCliente,
    setSaving: setSavingCliente,
  } = useClienteEdit(cliente);

  const {
    contratoAtual,
    historico,
    loading,
    formOpen,
    editingId,
    form,
    setField,
    saving,
    encerrarTarget,
    encerrarSaving,
    podeEncerrarContrato,
    handleNovoContrato,
    handleEditarContrato,
    handleSave,
    handleEncerrar,
    confirmEncerrar,
    closeForm,
    closeEncerrar,
  } = useClienteContratos(cliente?.id ?? null, cliente?.nome ?? null);

  if (!cliente) return null;

  const handleSaveCliente = async () => {
    if (!validateCliente()) {
      toast.error(VALIDATION_MESSAGE);
      return;
    }

    setSavingCliente(true);
    try {
      const payload = buildClientePayload();
      const procuracaoAnterior = normalizeClienteProcuracao(cliente.procuracao);
      const disponivelAnterior = isClienteDisponivelAgendamento(
        cliente.disponivel_agendamento
      );
      const updated = await atualizarCliente(cliente.id, payload, {
        usuarioNome: auditContext.usuarioNome,
      });
      if (procuracaoAnterior !== payload.procuracao) {
        await registrarProcuracaoClienteAlterada(auditContext, {
          clienteId: updated.id,
          clienteNome: updated.nome,
          procuracaoAnterior,
          procuracaoNova: payload.procuracao,
        });
      }
      if (disponivelAnterior !== payload.disponivel_agendamento) {
        await registrarDisponivelAgendamentoClienteAlterada(auditContext, {
          clienteId: updated.id,
          clienteNome: updated.nome,
          disponivelAnterior,
          disponivelNova: payload.disponivel_agendamento,
        });
      }
      await registrarAuditoria({
        usuarioId: auditContext.usuarioId,
        usuarioNome: auditContext.usuarioNome,
        usuarioEmail: auditContext.usuarioEmail,
        modulo: AUDITORIA_MODULOS.clientes,
        acao: AUDITORIA_ACOES.edicao,
        registroId: updated.id,
        registroNome: updated.nome,
        descricao: `${auditContext.usuarioNome} editou o cliente ${updated.nome}.`,
      });
      toast.success("Cliente atualizado com sucesso!");
      cancelEditing();
      onUpdated?.(updated);
    } catch (err) {
      console.error(err);
      const cnpjMessage = resolveClienteCnpjError(err);
      if (cnpjMessage) {
        toast.error(cnpjMessage);
        return;
      }
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "";
      toast.error(message || "Erro ao atualizar cliente");
    } finally {
      setSavingCliente(false);
    }
  };

  const displayNome = formatClienteNomeDisplay(
    editingCliente ? clienteForm.nome : cliente.nome
  );
  const displayCnpj = editingCliente
    ? clienteForm.cnpj
    : formatCNPJ(cliente.cnpj);

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
        <button
          type="button"
          className="absolute inset-0 bg-[#1a1333]/55 backdrop-blur-md"
          onClick={onClose}
          aria-label="Fechar"
        />

        <div
          className="animate-modal-in relative flex max-h-[92vh] w-full max-w-[980px] flex-col overflow-hidden rounded-t-[28px] bg-[#f6f8fc] shadow-[0_32px_64px_rgba(45,35,95,0.28)] sm:rounded-[28px]"
          role="dialog"
          aria-modal="true"
        >
          <div className="shrink-0 border-b border-[#e8edf5] bg-white px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#5668ff] to-[#4354e8] text-white shadow-[0_8px_24px_rgba(79,99,255,0.35)]">
                  <IconUsers size={24} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#8b95a8]">
                    Cliente
                  </p>
                  <h2 className="truncate text-xl font-extrabold text-[#2d2a4a] sm:text-2xl">
                    {displayNome}
                  </h2>
                  <p className="truncate text-sm text-[#64748b]">
                    {editingCliente ? maskCNPJInput(displayCnpj) : displayCnpj}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#e8edf5] text-xl text-[#8b95a8] transition-colors hover:bg-[#f4f6fb]"
              >
                ×
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            <div className="rounded-[20px] border border-[#e8edf5] bg-gradient-to-b from-white to-[#fbfdff] p-5 shadow-[0_6px_22px_rgba(15,23,42,0.04)]">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h4 className="text-[15px] font-extrabold text-[#2d2a4a]">
                  Dados do cliente
                </h4>
                {!editingCliente ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn !px-4 !py-2 text-xs"
                      onClick={startEditing}
                    >
                      Editar cliente
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary !px-4 !py-2 text-xs"
                      onClick={() => setIncluirRiscosOpen(true)}
                    >
                      Incluir em Riscos Psicossociais
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn !px-4 !py-2 text-xs"
                      onClick={cancelEditing}
                      disabled={savingCliente}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary !px-4 !py-2 text-xs"
                      onClick={handleSaveCliente}
                      disabled={savingCliente}
                    >
                      {savingCliente ? "Salvando…" : "Salvar"}
                    </button>
                  </div>
                )}
              </div>

              {editingCliente ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label={<>Nome da empresa <RequiredMark /></>}>
                    <input
                      className="field-input uppercase"
                      value={clienteForm.nome}
                      onChange={(e) => setClienteField("nome", e.target.value)}
                    />
                  </Field>
                  <Field label={<>CNPJ <RequiredMark /></>}>
                    <input
                      className="field-input"
                      value={clienteForm.cnpj}
                      onChange={(e) =>
                        setClienteField("cnpj", maskCNPJInput(e.target.value))
                      }
                    />
                  </Field>
                  <Field label="Procuração">
                    <select
                      className="field-input"
                      value={clienteForm.procuracao}
                      onChange={(e) =>
                        setClienteField("procuracao", e.target.value)
                      }
                    >
                      {CLIENTE_PROCURACAO_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Disponível para agendamento">
                    <select
                      className="field-input"
                      value={clienteForm.disponivel_agendamento}
                      onChange={(e) =>
                        setClienteField("disponivel_agendamento", e.target.value)
                      }
                    >
                      {SIM_NAO.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <InfoItem
                    label="Nome"
                    value={formatClienteNomeDisplay(cliente.nome)}
                  />
                  <InfoItem label="CNPJ" value={formatCNPJ(cliente.cnpj)} />
                  <InfoItem
                    label="Procuração"
                    value={formatClienteProcuracaoLabel(cliente.procuracao)}
                  />
                  <InfoItem
                    label="Disponível para agendamento"
                    value={formatClienteAgendamentoBadgeLabel(
                      cliente.disponivel_agendamento
                    )}
                  />
                </div>
              )}
            </div>

            <div className="mt-5 rounded-[20px] border border-[#e8edf5] bg-gradient-to-b from-white to-[#fbfdff] p-5 shadow-[0_6px_22px_rgba(15,23,42,0.04)]">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-[15px] font-extrabold text-[#2d2a4a]">
                    Contratos e renovações
                  </h4>
                  <p className="mt-0.5 text-xs text-[#8b95a8]">
                    Histórico completo de vigência, valores e condições
                    comerciais.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-primary !px-4 !py-2 text-xs"
                    onClick={handleNovoContrato}
                  >
                    Novo contrato
                  </button>
                  {contratoAtual ? (
                    <>
                      <button
                        type="button"
                        className="btn !px-4 !py-2 text-xs"
                        onClick={() => handleEditarContrato(contratoAtual)}
                      >
                        Editar contrato
                      </button>
                      {podeEncerrarContrato ? (
                        <button
                          type="button"
                          className="btn !px-4 !py-2 text-xs"
                          onClick={() => handleEncerrar(contratoAtual)}
                        >
                          Encerrar contrato
                        </button>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </div>

              <ClienteContratoAtualCard contrato={contratoAtual} />

              <div className="mt-5">
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[#8b95a8]">
                  Histórico de contratos
                </p>
                <ClienteContratosHistoricoTable
                  contratos={historico}
                  loading={loading}
                  podeEncerrarContrato={podeEncerrarContrato}
                  onEditar={handleEditarContrato}
                  onEncerrar={handleEncerrar}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {cliente ? (
        <ClienteIncluirRiscosModal
          open={incluirRiscosOpen}
          cliente={cliente}
          onClose={() => setIncluirRiscosOpen(false)}
        />
      ) : null}

      <ClienteContratoFormModal
        open={formOpen}
        saving={saving}
        editing={Boolean(editingId)}
        form={form}
        onChange={setField}
        onClose={closeForm}
        onSave={handleSave}
      />

      <ClienteEncerrarContratoModal
        open={Boolean(encerrarTarget)}
        saving={encerrarSaving}
        vigenciaLabel={
          encerrarTarget
            ? formatVigenciaContrato(
                encerrarTarget.data_inicio,
                encerrarTarget.data_fim
              )
            : ""
        }
        onClose={closeEncerrar}
        onConfirm={confirmEncerrar}
      />
    </>
  );
}
