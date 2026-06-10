import {
  clienteContratoStatusBadgeClass,
  formatValorContrato,
  labelClienteContratoStatus,
  labelClienteContratoTipo,
} from "@/lib/cliente-contrato-mappers";
import { formatDateBR } from "@/lib/format";
import type { ClienteContratoRecord } from "@/lib/types";

interface ClienteContratosHistoricoTableProps {
  contratos: ClienteContratoRecord[];
  loading: boolean;
  onEditar: (contrato: ClienteContratoRecord) => void;
  onEncerrar: (contrato: ClienteContratoRecord) => void;
}

export function ClienteContratosHistoricoTable({
  contratos,
  loading,
  onEditar,
  onEncerrar,
}: ClienteContratosHistoricoTableProps) {
  if (loading) {
    return (
      <p className="py-6 text-center text-sm text-app-muted">
        Carregando histórico...
      </p>
    );
  }

  if (contratos.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-app-muted">
        Nenhum contrato anterior registrado.
      </p>
    );
  }

  return (
    <div className="table-wrap -mx-1 overflow-x-auto px-1">
      <table className="table-premium w-full min-w-[820px]">
        <thead>
          <tr>
            {[
              "Início",
              "Fim",
              "Colaboradores",
              "Valor",
              "Condição",
              "Tipo",
              "Status",
              "Ações",
            ].map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {contratos.map((contrato) => (
            <tr key={contrato.id}>
              <td>{formatDateBR(contrato.data_inicio)}</td>
              <td>{formatDateBR(contrato.data_fim)}</td>
              <td className="tabular-nums">
                {contrato.quantidade_colaboradores ?? "—"}
              </td>
              <td className="tabular-nums">
                {formatValorContrato(contrato.valor_contrato)}
              </td>
              <td className="max-w-[140px] truncate">
                {contrato.condicao_pagamento?.trim() || "—"}
              </td>
              <td>{labelClienteContratoTipo(contrato.tipo_contrato)}</td>
              <td>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-extrabold ${clienteContratoStatusBadgeClass(contrato.status)}`}
                >
                  {labelClienteContratoStatus(contrato.status)}
                </span>
              </td>
              <td>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    className="rounded-lg bg-brand-blue-soft px-2.5 py-1 text-[10px] font-bold text-brand-blue"
                    onClick={() => onEditar(contrato)}
                  >
                    Editar
                  </button>
                  {contrato.status === "ativo" ||
                  contrato.status === "em_renovacao" ? (
                    <button
                      type="button"
                      className="rounded-lg bg-[#f4f6fb] px-2.5 py-1 text-[10px] font-bold text-[#52617a]"
                      onClick={() => onEncerrar(contrato)}
                    >
                      Encerrar
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
