"use client";

import { type ReactNode } from "react";
import {
  IconReceipt,
  IconTag,
  IconWallet,
} from "@/components/ui/icons/OutlineIcons";
import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import { resolveItemValorServico } from "@/lib/orcamento-calculo";
import { calcCondicoesPagamentoProposta } from "@/lib/orcamento-pagamento";
import { resolveValidadePropostaIso } from "@/lib/orcamento-validade";
import { formatCurrency } from "@/lib/money";
import {
  formatOrcamentoOrigemCliente,
  type OrcamentoComItens,
  type ServicoSstRecord,
} from "@/lib/orcamento-types";
import { formatClienteNomeDisplay } from "@/lib/cliente-display";
import { resolveItensInclusosServico } from "@/lib/servico-sst-pacote";

function displayValue(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

function ClientField({
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
      <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#94a3b8]">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-bold leading-snug text-navy">
        {value}
      </p>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span className="h-4 w-1 rounded-full bg-[#c9972b]" aria-hidden />
      <h4 className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-navy">
        {children}
      </h4>
    </div>
  );
}

interface OrcamentoViewBodyProps {
  orcamento: OrcamentoComItens;
  servicos: ServicoSstRecord[];
}

/** Conteúdo somente leitura do orçamento (Visualizar / aba Resumo). */
export function OrcamentoViewBody({
  orcamento,
  servicos,
}: OrcamentoViewBodyProps) {
  const itens = [...(orcamento.orcamento_itens ?? [])].sort(
    (a, b) => a.ordem - b.ordem
  );
  const condicoesPagamento = calcCondicoesPagamentoProposta(
    Number(orcamento.valor_total)
  );
  const validadeIso = resolveValidadePropostaIso(orcamento.data_proposta);
  const validadeLabel = validadeIso ? formatDateIsoToBR(validadeIso) : null;

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="rounded-2xl border border-[#e4ebf4] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-5">
        <SectionTitle>Dados do cliente</SectionTitle>
        <div className="grid grid-cols-1 gap-x-8 gap-y-3.5 md:grid-cols-2">
          <ClientField
            label="Cliente"
            value={
              orcamento.cliente_nome?.trim()
                ? formatClienteNomeDisplay(orcamento.cliente_nome)
                : "—"
            }
          />
          <ClientField label="CNPJ" value={displayValue(orcamento.cliente_cnpj)} />
          <ClientField label="Setor" value={displayValue(orcamento.cliente_setor)} />
          <ClientField label="Contato" value={displayValue(orcamento.contato)} />
          <ClientField
            label="Endereço"
            value={displayValue(orcamento.cliente_endereco)}
            className="md:col-span-2 border-t border-[#eef2f7] pt-3.5"
          />
          <ClientField label="E-mail" value={displayValue(orcamento.email)} />
          <ClientField label="Telefone" value={displayValue(orcamento.telefone)} />
          <ClientField
            label="Origem do cliente"
            value={formatOrcamentoOrigemCliente(orcamento.origem_cliente)}
          />
          <ClientField
            label="Responsável"
            value={displayValue(orcamento.responsavel)}
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#e4ebf4] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="border-b border-[#e4ebf4] px-4 py-3 sm:px-5">
          <SectionTitle>Serviços do orçamento</SectionTitle>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="bg-[#082b63] text-left text-[10px] font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3 font-semibold sm:px-5">Serviço</th>
                <th className="px-3 py-3 text-center font-semibold">
                  Quantidade de colaboradores
                </th>
                <th className="px-4 py-3 text-right font-semibold sm:px-5">
                  Valor
                </th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item, index) => {
                const servicoCatalogo = servicos.find(
                  (servico) => servico.id === item.servico_id
                );
                const itensInclusos = resolveItensInclusosServico(
                  servicoCatalogo,
                  item.servico_nome
                );

                return (
                  <tr
                    key={item.id}
                    className={`border-t border-[#eef2f7] ${
                      index % 2 === 1 ? "bg-[#f8fafc]" : "bg-white"
                    }`}
                  >
                    <td className="px-4 py-3.5 align-top sm:px-5">
                      <p className="font-bold text-navy">{item.servico_nome}</p>
                      {itensInclusos.length > 0 ? (
                        <ul className="mt-1.5 space-y-0.5 text-[11px] leading-snug text-[#64748b]">
                          {itensInclusos.map((incluso) => (
                            <li key={incluso} className="flex gap-1.5">
                              <span className="text-[#c9972b]">•</span>
                              <span>{incluso}</span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </td>
                    <td className="px-3 py-3.5 text-center align-top font-semibold text-[#334155]">
                      {item.quantidade}
                    </td>
                    <td className="px-4 py-3.5 text-right align-top font-extrabold text-navy sm:px-5">
                      {formatCurrency(resolveItemValorServico(item))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {orcamento.observacoes?.trim() ? (
        <section className="rounded-2xl border border-[#e4ebf4] bg-white px-4 py-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:px-5">
          <SectionTitle>Observações</SectionTitle>
          <p className="text-sm leading-relaxed text-[#475569]">
            {orcamento.observacoes}
          </p>
        </section>
      ) : null}

      {orcamento.status === "cancelado" && orcamento.motivo_cancelamento ? (
        <section className="rounded-2xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3.5 sm:px-5">
          <SectionTitle>Cancelamento</SectionTitle>
          <p className="text-sm font-semibold text-[#991b1b]">
            {orcamento.motivo_cancelamento}
          </p>
          {orcamento.observacao_cancelamento?.trim() ? (
            <p className="mt-1 text-sm text-[#7f1d1d]">
              {orcamento.observacao_cancelamento}
            </p>
          ) : null}
          <p className="mt-2 text-[11px] text-[#9f1239]">
            {orcamento.cancelado_por
              ? `Por ${orcamento.cancelado_por}`
              : null}
            {orcamento.cancelado_em
              ? ` · ${formatDateIsoToBR(orcamento.cancelado_em.split("T")[0])}`
              : null}
          </p>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-[#e8d7a8] bg-gradient-to-br from-[#fffbeb] via-[#fff8e8] to-white shadow-[0_10px_28px_rgba(201,151,43,0.12)]">
        <div className="bg-[#082b63] px-4 py-3 sm:px-5">
          <h4 className="text-center text-[11px] font-extrabold uppercase tracking-[0.1em] text-white">
            Resumo financeiro
          </h4>
        </div>
        <div className="divide-y divide-[#f1e4c0] px-4 py-1 sm:px-5">
          <div className="flex items-start gap-3 py-4">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#082b63]/10 text-[#082b63]">
              <IconWallet size={16} />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">
                Valor total
              </p>
              <p className="mt-0.5 text-2xl font-extrabold tracking-[-0.4px] text-[#082b63]">
                {formatCurrency(Number(orcamento.valor_total))}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 py-4">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#082b63]/10 text-[#082b63]">
              <IconReceipt size={16} />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">
                Pagamento parcelado
              </p>
              <p className="mt-0.5 text-base font-extrabold text-[#0a3578]">
                {condicoesPagamento.textoParcelado}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 py-4">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#c9972b]/15 text-[#a07820]">
              <IconTag size={16} />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">
                Valor à vista
              </p>
              <p className="mt-0.5 text-xl font-extrabold tracking-[-0.3px] text-[#a07820]">
                {condicoesPagamento.textoAVista}
              </p>
            </div>
          </div>
        </div>
        {validadeLabel ? (
          <div className="border-t border-[#f1e4c0] bg-[#fff8e8]/80 px-4 py-2.5 sm:px-5">
            <p className="text-center text-[11px] text-[#78716c]">
              Proposta válida até{" "}
              <span className="font-semibold text-[#57534e]">{validadeLabel}</span>.
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
