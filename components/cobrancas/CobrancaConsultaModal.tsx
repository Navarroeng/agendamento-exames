"use client";

import { Modal } from "@/components/ui/Modal";
import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import {
  rotuloContratoCobranca,
  rotuloParcelaCobranca,
  valorRecebidoEfetivo,
  type CobrancaParcela,
} from "@/lib/cobrancas-mensalidades";
import { SITUACAO_PARCELA_MENSALIDADE_LABEL } from "@/lib/mensalidade-parcelas";
import { formatCurrency } from "@/lib/money";

export function CobrancaConsultaModal({
  parcela,
  onClose,
  onVerComprovante,
}: {
  parcela: CobrancaParcela | null;
  onClose: () => void;
  onVerComprovante: (path: string) => void;
}) {
  return (
    <Modal
      open={parcela != null}
      onClose={onClose}
      title="Pagamento da parcela"
      subtitle={
        parcela
          ? `${parcela.empresa} · ${rotuloContratoCobranca(parcela.numeroOrcamento, parcela.numeroContrato)} · ${rotuloParcelaCobranca(parcela.numero)}`
          : undefined
      }
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            className="btn justify-center sm:w-auto"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>
      }
    >
      {parcela ? (
        <dl className="grid grid-cols-1 gap-3 text-[13px] sm:grid-cols-2">
          <Item label="Empresa" value={parcela.empresa} />
          <Item
            label="Contrato"
            value={rotuloContratoCobranca(
              parcela.numeroOrcamento,
              parcela.numeroContrato
            )}
          />
          <Item label="Parcela" value={rotuloParcelaCobranca(parcela.numero)} />
          <Item label="Valor previsto" value={formatCurrency(parcela.valor)} />
          <Item
            label="Data do pagamento"
            value={
              parcela.pagoEmIso ? formatDateIsoToBR(parcela.pagoEmIso) : "—"
            }
          />
          <Item
            label="Valor recebido"
            value={formatCurrency(valorRecebidoEfetivo(parcela))}
          />
          <Item
            label="Situação"
            value={SITUACAO_PARCELA_MENSALIDADE_LABEL[parcela.situacao]}
          />
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-[#64748b]">
              Comprovante
            </dt>
            <dd className="mt-0.5">
              {parcela.comprovantePath ? (
                <button
                  type="button"
                  className="text-[13px] font-semibold text-brand-blue hover:underline"
                  onClick={() => onVerComprovante(parcela.comprovantePath!)}
                >
                  {parcela.comprovanteNome || "Ver comprovante"}
                </button>
              ) : (
                <span className="text-[#64748b]">Não anexado</span>
              )}
            </dd>
          </div>
        </dl>
      ) : null}
    </Modal>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-wide text-[#64748b]">
        {label}
      </dt>
      <dd className="mt-0.5 font-semibold text-navy">{value}</dd>
    </div>
  );
}
