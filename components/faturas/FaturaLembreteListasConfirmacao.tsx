"use client";

import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import { formatCurrency } from "@/lib/money";

export type LinhaLembreteConfirmacao = {
  id: string;
  numero: string;
  empresa: string;
  email: string;
  valor: number;
  vencimento?: string;
  diasAtraso?: number;
};

function textoAtraso(dias: number): string {
  return dias === 1 ? "1 dia" : `${dias} dias`;
}

function Tabela({
  linhas,
  mostrarPrazo,
}: {
  linhas: LinhaLembreteConfirmacao[];
  mostrarPrazo: boolean;
}) {
  return (
    <>
      <ul className="space-y-2 md:hidden">
        {linhas.map((item) => (
          <li
            key={item.id}
            className="rounded-[10px] border border-[#e8edf5] px-3 py-2"
          >
            <p className="font-semibold text-navy">{item.numero}</p>
            <p>{item.empresa}</p>
            <p className="break-words text-[#52617a]">{item.email}</p>
            <p className="mt-1 tabular-nums">{formatCurrency(item.valor)}</p>
            {mostrarPrazo && item.vencimento && (
              <p className="text-xs text-[#64748b]">
                Vence {formatDateIsoToBR(item.vencimento)}
                {item.diasAtraso != null ? ` · ${textoAtraso(item.diasAtraso)}` : ""}
              </p>
            )}
          </li>
        ))}
      </ul>
      <table className="hidden w-full table-fixed text-left text-sm md:table">
        <thead>
          <tr className="text-[11px] uppercase tracking-wide text-[#64748b]">
            <th className="w-[18%] py-2 pr-2 font-semibold">Fatura</th>
            <th className="w-[22%] py-2 pr-2 font-semibold">Empresa</th>
            <th className="py-2 pr-2 font-semibold">Destinatário</th>
            <th className="w-[16%] py-2 pr-2 font-semibold">Valor</th>
            {mostrarPrazo && (
              <>
                <th className="w-[14%] py-2 pr-2 font-semibold">Vencimento</th>
                <th className="w-[10%] py-2 font-semibold">Atraso</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {linhas.map((item) => (
            <tr key={item.id} className="border-t border-[#eef2f7]">
              <td className="break-words py-2 pr-2 align-top">{item.numero}</td>
              <td className="break-words py-2 pr-2 align-top">{item.empresa}</td>
              <td className="break-words py-2 pr-2 align-top">{item.email}</td>
              <td className="py-2 pr-2 align-top tabular-nums">
                {formatCurrency(item.valor)}
              </td>
              {mostrarPrazo && (
                <>
                  <td className="py-2 pr-2 align-top">
                    {item.vencimento ? formatDateIsoToBR(item.vencimento) : "—"}
                  </td>
                  <td className="py-2 align-top">
                    {item.diasAtraso != null ? textoAtraso(item.diasAtraso) : "—"}
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export function FaturaLembreteListasConfirmacao({
  comEmail,
  semEmail,
  mostrarPrazo = false,
}: {
  comEmail: LinhaLembreteConfirmacao[];
  semEmail: LinhaLembreteConfirmacao[];
  mostrarPrazo?: boolean;
}) {
  return (
    <div className="space-y-4">
      <section>
        <h3 className="text-sm font-semibold text-navy">
          Disponíveis para envio ({comEmail.length})
        </h3>
        {comEmail.length === 0 ? (
          <p className="mt-1 text-sm text-[#64748b]">
            Nenhuma fatura possui destinatário válido para envio.
          </p>
        ) : (
          <div className="mt-2">
            <Tabela linhas={comEmail} mostrarPrazo={mostrarPrazo} />
          </div>
        )}
      </section>
      {semEmail.length > 0 && (
        <section className="rounded-[10px] border border-amber-200 bg-amber-50 p-3 text-amber-950">
          <h3 className="text-sm font-semibold">
            Sem e-mail válido ({semEmail.length}) — serão ignoradas
          </h3>
          <div className="mt-2">
            <Tabela linhas={semEmail} mostrarPrazo={mostrarPrazo} />
          </div>
        </section>
      )}
    </div>
  );
}

export function classeBotaoLembrete(habilitado: boolean): string {
  return habilitado
    ? "btn btn-primary mt-auto w-full justify-center"
    : "btn mt-auto w-full cursor-not-allowed justify-center border-[#e2e8f0] bg-[#f1f5f9] text-[#64748b] shadow-none hover:translate-y-0 hover:border-[#e2e8f0] hover:bg-[#f1f5f9] hover:shadow-none disabled:opacity-100";
}
