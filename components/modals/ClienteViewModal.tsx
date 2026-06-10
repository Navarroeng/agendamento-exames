"use client";

import { ClienteContratoAtualCard } from "@/components/clientes/ClienteContratoAtualCard";
import { ClienteContratoFormModal } from "@/components/clientes/ClienteContratoFormModal";
import { ClienteContratosHistoricoTable } from "@/components/clientes/ClienteContratosHistoricoTable";
import { ClienteEncerrarContratoModal } from "@/components/clientes/ClienteEncerrarContratoModal";
import { IconUsers } from "@/components/ui/icons/OutlineIcons";
import { useClienteContratos } from "@/hooks/useClienteContratos";
import { formatVigenciaContrato } from "@/lib/cliente-contrato-mappers";
import { formatCNPJ } from "@/lib/cnpj";
import type { ClienteRecord } from "@/lib/types";

interface ClienteViewModalProps {
  cliente: ClienteRecord | null;
  onClose: () => void;
}

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

export function ClienteViewModal({ cliente, onClose }: ClienteViewModalProps) {
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
    handleNovoContrato,
    handleEditarContrato,
    handleSave,
    handleEncerrar,
    confirmEncerrar,
    closeForm,
    closeEncerrar,
  } = useClienteContratos(cliente?.id ?? null);

  if (!cliente) return null;

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
                    {cliente.nome}
                  </h2>
                  <p className="truncate text-sm text-[#64748b]">
                    {formatCNPJ(cliente.cnpj)}
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
              <h4 className="mb-4 text-[15px] font-extrabold text-[#2d2a4a]">
                Dados do cliente
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <InfoItem label="Nome" value={cliente.nome} />
                <InfoItem label="CNPJ" value={formatCNPJ(cliente.cnpj)} />
              </div>
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
                      <button
                        type="button"
                        className="btn !px-4 !py-2 text-xs"
                        onClick={() => handleEncerrar(contratoAtual)}
                      >
                        Encerrar contrato
                      </button>
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
                  onEditar={handleEditarContrato}
                  onEncerrar={handleEncerrar}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

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
